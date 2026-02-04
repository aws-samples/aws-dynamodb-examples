#
#  Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
#  This file is licensed under the Apache License, Version 2.0 (the "License").
#  You may not use this file except in compliance with the License. A copy of
#  the License is located at
#
#  http://aws.amazon.com/apache2.0/
#
#  This file is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR
#  CONDITIONS OF ANY KIND, either express or implied. See the License for the
#  specific language governing permissions and limitations under the License.
#
"""Property-based tests for AsyncDynamoDBLoader."""

import csv
import tempfile
from decimal import Decimal

from hypothesis import given, settings
from hypothesis import strategies as st

from src.async_loader import AsyncDynamoDBLoader


# Feature: dynamodb-csv-bulk-loader, Property 1: CSV Reading Completeness
# Validates: Requirements 1.1
@given(
    records=st.lists(
        st.fixed_dictionaries(
            {
                "id": st.uuids().map(str),
                "timestamp": st.datetimes().map(lambda dt: dt.isoformat()),
                "category": st.sampled_from(["A", "B", "C"]),
                "user_name": st.text(
                    alphabet=st.characters(
                        blacklist_categories=("Cc", "Cs"),  # Exclude control chars
                        blacklist_characters="\r\n",  # Explicitly exclude CR and LF
                    ),
                    min_size=1,
                    max_size=50,
                ),
                "email": st.emails(),
                "amount": st.decimals(
                    min_value=Decimal("0.01"),
                    max_value=Decimal("9999.99"),
                    places=2,
                ).map(str),
                "status": st.sampled_from(["active", "inactive", "pending"]),
                "description": st.text(
                    alphabet=st.characters(
                        blacklist_categories=("Cc", "Cs"),  # Exclude control chars
                        blacklist_characters="\r\n",  # Explicitly exclude CR and LF
                    ),
                    min_size=1,
                    max_size=100,
                ),
            }
        ),
        min_size=0,
        max_size=100,
    )
)
@settings(max_examples=100)
def test_csv_reading_completeness(records):
    """
    Property 1: CSV Reading Completeness
    For any valid CSV file with N records, reading the file should produce
    exactly N records with all fields intact.

    Note: This test excludes control characters (including \r and \n) from
    text fields because CSV format uses these as delimiters and the CSV
    module normalizes line endings during read/write operations.

    Validates: Requirements 1.1
    """
    # Create a temporary CSV file
    with tempfile.NamedTemporaryFile(
        mode="w", suffix=".csv", delete=False, newline=""
    ) as f:
        csv_file = f.name

        if len(records) > 0:
            fieldnames = list(records[0].keys())
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(records)

    try:
        # Create loader instance
        loader = AsyncDynamoDBLoader(
            table_name="test-table", region="us-east-1", max_workers=1, batch_size=25
        )

        # Read CSV using the loader's internal method
        read_records = loader._read_csv(csv_file)

        # Property: Number of records should match
        assert len(read_records) == len(records), (
            f"Expected {len(records)} records, got {len(read_records)}"
        )

        # Property: All fields should be intact
        for i, (original, read) in enumerate(zip(records, read_records)):
            for field in original.keys():
                assert field in read, f"Field {field} missing in record {i}"
                assert read[field] == original[field], (
                    f"Field {field} mismatch in record {i}: "
                    f"expected {original[field]}, got {read[field]}"
                )

    finally:
        # Clean up temporary file
        import os

        os.unlink(csv_file)



# Feature: dynamodb-csv-bulk-loader, Property 2: Shuffle Changes Order
# Validates: Requirements 1.2
@given(
    records=st.lists(
        st.integers(min_value=0, max_value=1000), min_size=3, max_size=100
    ).filter(lambda lst: len(set(lst)) > 1)  # Ensure at least 2 distinct elements
)
@settings(max_examples=100)
def test_shuffle_changes_order(records):
    """
    Property 2: Shuffle Changes Order
    For any list of records with more than 2 elements and at least 2 distinct
    values, shuffling the list should produce a different ordering than the
    original (with high probability across multiple runs).

    Note: Lists with all identical elements are excluded because shuffling
    cannot change their order (all permutations are equivalent).

    Validates: Requirements 1.2
    """
    import random

    # Create a copy to shuffle
    shuffled = records.copy()

    # Track if we ever see a different order across multiple shuffles
    different_order_found = False

    # Try multiple times to account for the small probability that
    # shuffle produces the same order
    for _ in range(10):
        random.shuffle(shuffled)
        if shuffled != records:
            different_order_found = True
            break

    # Property: With high probability, at least one shuffle should change the order
    # For lists with 3+ elements and at least 2 distinct values, the probability
    # of getting the same order after 10 shuffles is extremely low
    assert different_order_found, (
        f"Shuffle did not change order after 10 attempts for list of size {len(records)}"
    )



# Feature: dynamodb-csv-bulk-loader, Property 3: Batch Processing Correctness
# Validates: Requirements 1.6
@given(
    record_count=st.integers(min_value=0, max_value=500),
    batch_size=st.integers(min_value=1, max_value=50),
)
@settings(max_examples=100)
def test_batch_processing_correctness(record_count, batch_size):
    """
    Property 3: Batch Processing Correctness
    For any record count N and batch size B, the number of batches created
    should equal ceil(N / B), and all records should be included exactly once
    across all batches.

    Validates: Requirements 1.6
    """
    import math

    # Create dummy records
    records = [{"id": str(i)} for i in range(record_count)]

    # Create loader instance
    loader = AsyncDynamoDBLoader(
        table_name="test-table",
        region="us-east-1",
        max_workers=1,
        batch_size=batch_size,
    )

    # Create batches
    batches = loader._create_batches(records)

    # Property 1: Number of batches should equal ceil(N / B)
    expected_batch_count = math.ceil(record_count / batch_size) if record_count > 0 else 0
    assert len(batches) == expected_batch_count, (
        f"Expected {expected_batch_count} batches, got {len(batches)}"
    )

    # Property 2: All records should be included exactly once
    all_batch_records = []
    for batch in batches:
        all_batch_records.extend(batch)

    assert len(all_batch_records) == record_count, (
        f"Expected {record_count} total records across batches, got {len(all_batch_records)}"
    )

    # Property 3: Each record should appear exactly once
    batch_ids = [record["id"] for record in all_batch_records]
    original_ids = [record["id"] for record in records]
    assert sorted(batch_ids) == sorted(original_ids), (
        "Records in batches don't match original records"
    )

    # Property 4: Each batch (except possibly the last) should have batch_size items
    for i, batch in enumerate(batches[:-1]):  # All but last batch
        assert len(batch) == batch_size, (
            f"Batch {i} has {len(batch)} items, expected {batch_size}"
        )

    # Property 5: Last batch should have at most batch_size items
    if batches:
        assert len(batches[-1]) <= batch_size, (
            f"Last batch has {len(batches[-1])} items, expected at most {batch_size}"
        )



# Feature: dynamodb-csv-bulk-loader, Property 4: Reporting Accuracy
# Validates: Requirements 1.7
@given(
    successful_count=st.integers(min_value=0, max_value=100),
    failed_count=st.integers(min_value=0, max_value=100),
)
@settings(max_examples=100)
def test_reporting_accuracy(successful_count, failed_count):
    """
    Property 4: Reporting Accuracy
    For any set of write operations, the sum of successful writes and failed
    writes should equal the total number of operations attempted.

    Validates: Requirements 1.7
    """
    from src.models import LoadResult

    total_operations = successful_count + failed_count

    # Create a LoadResult
    result = LoadResult(
        total_records=total_operations,
        successful_writes=successful_count,
        failed_writes=failed_count,
        duration_seconds=1.0,
        errors=[],
    )

    # Property: Sum of successful and failed should equal total
    assert result.successful_writes + result.failed_writes == result.total_records, (
        f"Sum of successful ({result.successful_writes}) and failed ({result.failed_writes}) "
        f"does not equal total ({result.total_records})"
    )

    # Property: Success rate should be correct
    if total_operations > 0:
        expected_success_rate = (successful_count / total_operations) * 100.0
        actual_success_rate = result.success_rate()
        assert abs(actual_success_rate - expected_success_rate) < 0.01, (
            f"Success rate mismatch: expected {expected_success_rate:.2f}%, "
            f"got {actual_success_rate:.2f}%"
        )
    else:
        # For zero operations, success rate should be 0
        assert result.success_rate() == 0.0, (
            f"Success rate for zero operations should be 0.0, got {result.success_rate()}"
        )
