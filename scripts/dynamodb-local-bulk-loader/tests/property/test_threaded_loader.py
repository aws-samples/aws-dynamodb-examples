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
"""Property-based tests for ThreadedDynamoDBLoader."""

import csv
import tempfile
import threading
from collections import Counter
from decimal import Decimal
from unittest.mock import MagicMock, patch

from hypothesis import given, settings
from hypothesis import strategies as st

from src.threaded_loader import ThreadedDynamoDBLoader


# Feature: dynamodb-csv-bulk-loader, Property 5: Thread Safety
# Validates: Requirements 2.5
@given(
    num_batches=st.integers(min_value=5, max_value=20),
    batch_size=st.integers(min_value=5, max_value=25),
    max_workers=st.integers(min_value=2, max_value=10),
)
@settings(max_examples=100)
def test_thread_safety(num_batches, batch_size, max_workers):
    """
    Property 5: Thread Safety
    For any concurrent write operations using the threaded loader, no race
    conditions should occur, and all writes should be accounted for correctly
    without data corruption.

    This test verifies:
    1. All batches are processed exactly once
    2. No duplicate processing occurs
    3. Results are correctly aggregated across threads
    4. No data corruption from concurrent access

    Validates: Requirements 2.5
    """
    # Create test data
    total_records = num_batches * batch_size
    records = [
        {
            "id": f"id-{i}",
            "timestamp": "2024-01-01T00:00:00",
            "category": "test",
            "user_name": "test_user",
            "email": "test@example.com",
            "amount": "10.00",
            "status": "active",
            "description": "test record",
        }
        for i in range(total_records)
    ]

    # Create a temporary CSV file
    with tempfile.NamedTemporaryFile(
        mode="w", suffix=".csv", delete=False, newline=""
    ) as f:
        csv_file = f.name
        fieldnames = list(records[0].keys())
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(records)

    try:
        # Track which batches were processed and how many times
        processed_batches = []
        batch_lock = threading.Lock()

        # Track all items written
        written_items = []
        items_lock = threading.Lock()

        # Mock the batch writer to track operations
        def mock_batch_writer_context():
            """Mock context manager for batch writer."""

            class MockBatchWriter:
                def __init__(self):
                    self.items = []

                def put_item(self, Item):
                    # Thread-safe item tracking
                    with items_lock:
                        written_items.append(Item["id"])
                    self.items.append(Item)

                def __enter__(self):
                    return self

                def __exit__(self, exc_type, exc_val, exc_tb):
                    # Track batch completion
                    with batch_lock:
                        processed_batches.append(len(self.items))
                    return False

            return MockBatchWriter()

        # Create mock table
        mock_table = MagicMock()
        mock_table.batch_writer.side_effect = mock_batch_writer_context

        # Create loader
        loader = ThreadedDynamoDBLoader(
            table_name="test-table",
            region="us-east-1",
            max_workers=max_workers,
            batch_size=batch_size,
            max_retries=0,  # No retries for this test
        )

        # Mock boto3 to use our mock table
        with patch("boto3.Session") as mock_session:
            mock_resource = MagicMock()
            mock_resource.Table.return_value = mock_table
            mock_session.return_value.resource.return_value = mock_resource

            # Load the CSV
            result = loader.load_csv(csv_file)

        # Property 1: All records should be processed
        assert result.total_records == total_records, (
            f"Expected {total_records} total records, got {result.total_records}"
        )

        # Property 2: All writes should be successful (no race conditions causing failures)
        assert result.successful_writes == total_records, (
            f"Expected {total_records} successful writes, got {result.successful_writes}"
        )
        assert result.failed_writes == 0, (
            f"Expected 0 failed writes, got {result.failed_writes}"
        )

        # Property 3: Correct number of batches should be processed
        expected_num_batches = (total_records + batch_size - 1) // batch_size
        assert len(processed_batches) == expected_num_batches, (
            f"Expected {expected_num_batches} batches, got {len(processed_batches)}"
        )

        # Property 4: Each item should be written exactly once (no duplicates from race conditions)
        item_counts = Counter(written_items)
        for item_id, count in item_counts.items():
            assert count == 1, (
                f"Item {item_id} was written {count} times, expected 1 (race condition detected)"
            )

        # Property 5: All original items should be written
        written_ids = set(written_items)
        original_ids = {record["id"] for record in records}
        assert written_ids == original_ids, (
            f"Written items don't match original items. "
            f"Missing: {original_ids - written_ids}, "
            f"Extra: {written_ids - original_ids}"
        )

        # Property 6: Total items across all batches should equal total records
        total_items_in_batches = sum(processed_batches)
        assert total_items_in_batches == total_records, (
            f"Total items in batches ({total_items_in_batches}) doesn't match "
            f"total records ({total_records})"
        )

    finally:
        # Clean up temporary file
        import os

        os.unlink(csv_file)
