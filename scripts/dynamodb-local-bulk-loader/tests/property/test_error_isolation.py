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
"""Property-based tests for error isolation."""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from botocore.exceptions import ClientError
from hypothesis import given, settings
from hypothesis import strategies as st

from src.async_loader import AsyncDynamoDBLoader
from src.models import LoadResult
from src.threaded_loader import ThreadedDynamoDBLoader

# Feature: dynamodb-csv-bulk-loader, Property 16: Error Isolation
# For any batch of write operations where some operations fail, the successful
# operations should complete normally, and the system should continue processing
# remaining batches.


def create_client_error(error_code: str) -> ClientError:
    """Create a ClientError with the specified error code."""
    return ClientError(
        {"Error": {"Code": error_code, "Message": f"Test {error_code}"}},
        "batch_write_item",
    )


@given(
    total_batches=st.integers(min_value=3, max_value=20),
    failing_batch_indices=st.lists(
        st.integers(min_value=0, max_value=19), min_size=1, max_size=5, unique=True
    ),
    batch_size=st.integers(min_value=5, max_value=25),
)
@settings(max_examples=100)
@pytest.mark.asyncio
async def test_async_loader_error_isolation(
    total_batches: int, failing_batch_indices: list[int], batch_size: int
) -> None:
    """Test that async loader isolates errors and continues processing other batches.

    Property: When some batches fail, successful batches should complete normally,
    and the system should continue processing all remaining batches.
    """
    # Filter failing indices to be within range
    failing_indices = [idx for idx in failing_batch_indices if idx < total_batches]

    if not failing_indices:
        # Need at least one failing batch for this test
        failing_indices = [0]

    # Ensure at least one batch succeeds to test error isolation
    if len(failing_indices) >= total_batches:
        # Remove one failing index to ensure at least one batch succeeds
        failing_indices = failing_indices[:-1]

    # Create test CSV data
    total_records = total_batches * batch_size
    csv_content = "id,timestamp,category,user_name,email,amount,status,description\n"
    for i in range(total_records):
        csv_content += f"id-{i},2024-01-01T00:00:00Z,cat,user,email@test.com,100.00,active,desc\n"

    # Write test CSV
    import tempfile

    with tempfile.NamedTemporaryFile(mode="w", suffix=".csv", delete=False) as f:
        f.write(csv_content)
        csv_file = f.name

    try:
        loader = AsyncDynamoDBLoader(
            table_name="test-table",
            region="us-east-1",
            max_workers=5,
            batch_size=batch_size,
            max_retries=0,  # No retries to make test faster
        )

        # Mock the table and batch writer
        batch_call_count = 0

        def mock_batch_writer_context():
            """Mock batch writer context manager factory."""
            nonlocal batch_call_count
            current_batch = batch_call_count
            batch_call_count += 1

            mock_batch = AsyncMock()

            # Fail specific batches
            if current_batch in failing_indices:
                mock_batch.put_item.side_effect = create_client_error(
                    "ProvisionedThroughputExceededException"
                )
            else:
                mock_batch.put_item.return_value = None

            # Create proper async context manager methods
            async def aenter(self):
                return mock_batch

            async def aexit(self, exc_type, exc_val, exc_tb):
                return None

            mock_batch.__aenter__ = aenter
            mock_batch.__aexit__ = aexit

            return mock_batch

        with patch("aioboto3.Session") as mock_session:
            mock_resource = AsyncMock()
            mock_table = AsyncMock()
            mock_table.batch_writer = mock_batch_writer_context

            mock_resource.__aenter__ = AsyncMock(return_value=mock_resource)
            mock_resource.__aexit__ = AsyncMock(return_value=None)
            mock_resource.Table = AsyncMock(return_value=mock_table)

            mock_session.return_value.resource.return_value = mock_resource

            # Load CSV
            result = await loader.load_csv(csv_file)

            # Verify error isolation
            assert isinstance(result, LoadResult)
            assert result.total_records == total_records

            # Calculate expected results
            expected_failed = len(failing_indices) * batch_size
            expected_successful = total_records - expected_failed

            # Allow some tolerance due to batch boundaries
            assert result.successful_writes >= expected_successful - batch_size
            assert result.failed_writes >= expected_failed - batch_size

            # Verify that processing continued despite failures
            assert result.successful_writes > 0, "Some batches should have succeeded"
            assert result.failed_writes > 0, "Some batches should have failed"

            # Verify all records were attempted
            assert (
                result.successful_writes + result.failed_writes == total_records
            ), "All records should be accounted for"

    finally:
        import os

        os.unlink(csv_file)


@given(
    total_batches=st.integers(min_value=3, max_value=20),
    failing_batch_indices=st.lists(
        st.integers(min_value=0, max_value=19), min_size=1, max_size=5, unique=True
    ),
    batch_size=st.integers(min_value=5, max_value=25),
)
@settings(max_examples=100)
def test_threaded_loader_error_isolation(
    total_batches: int, failing_batch_indices: list[int], batch_size: int
) -> None:
    """Test that threaded loader isolates errors and continues processing other batches.

    Property: When some batches fail, successful batches should complete normally,
    and the system should continue processing all remaining batches.
    """
    # Filter failing indices to be within range
    failing_indices = [idx for idx in failing_batch_indices if idx < total_batches]

    if not failing_indices:
        # Need at least one failing batch for this test
        failing_indices = [0]

    # Ensure at least one batch succeeds to test error isolation
    if len(failing_indices) >= total_batches:
        # Remove one failing index to ensure at least one batch succeeds
        failing_indices = failing_indices[:-1]

    # Create test CSV data
    total_records = total_batches * batch_size
    csv_content = "id,timestamp,category,user_name,email,amount,status,description\n"
    for i in range(total_records):
        csv_content += f"id-{i},2024-01-01T00:00:00Z,cat,user,email@test.com,100.00,active,desc\n"

    # Write test CSV
    import tempfile

    with tempfile.NamedTemporaryFile(mode="w", suffix=".csv", delete=False) as f:
        f.write(csv_content)
        csv_file = f.name

    try:
        loader = ThreadedDynamoDBLoader(
            table_name="test-table",
            region="us-east-1",
            max_workers=5,
            batch_size=batch_size,
            max_retries=0,  # No retries to make test faster
        )

        # Mock the table and batch writer
        batch_call_count = 0

        def mock_batch_writer_context():
            """Mock batch writer context manager."""
            nonlocal batch_call_count
            current_batch = batch_call_count
            batch_call_count += 1

            mock_batch = MagicMock()

            # Fail specific batches
            if current_batch in failing_indices:
                mock_batch.put_item.side_effect = create_client_error(
                    "ProvisionedThroughputExceededException"
                )
            else:
                mock_batch.put_item.return_value = None

            mock_batch.__enter__ = MagicMock(return_value=mock_batch)
            mock_batch.__exit__ = MagicMock(return_value=None)

            return mock_batch

        with patch("boto3.Session") as mock_session:
            mock_resource = MagicMock()
            mock_table = MagicMock()
            mock_table.batch_writer = mock_batch_writer_context

            mock_resource.Table.return_value = mock_table
            mock_session.return_value.resource.return_value = mock_resource

            # Load CSV
            result = loader.load_csv(csv_file)

            # Verify error isolation
            assert isinstance(result, LoadResult)
            assert result.total_records == total_records

            # Calculate expected results
            expected_failed = len(failing_indices) * batch_size
            expected_successful = total_records - expected_failed

            # Allow some tolerance due to batch boundaries
            assert result.successful_writes >= expected_successful - batch_size
            assert result.failed_writes >= expected_failed - batch_size

            # Verify that processing continued despite failures
            assert result.successful_writes > 0, "Some batches should have succeeded"
            assert result.failed_writes > 0, "Some batches should have failed"

            # Verify all records were attempted
            assert (
                result.successful_writes + result.failed_writes == total_records
            ), "All records should be accounted for"

    finally:
        import os

        os.unlink(csv_file)
