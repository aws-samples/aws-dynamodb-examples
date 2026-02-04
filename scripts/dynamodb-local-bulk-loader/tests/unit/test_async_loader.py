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
"""Unit tests for AsyncDynamoDBLoader."""

import asyncio
import csv
import tempfile
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from src.async_loader import AsyncDynamoDBLoader
from src.models import LoaderConfig


class TestAsyncDynamoDBLoader:
    """Unit tests for AsyncDynamoDBLoader class."""

    def test_initialization_with_valid_config(self):
        """Test that loader initializes correctly with valid configuration."""
        loader = AsyncDynamoDBLoader(
            table_name="test-table",
            region="us-east-1",
            max_workers=5,
            batch_size=10,
            max_retries=2,
        )

        assert loader.config.table_name == "test-table"
        assert loader.config.region == "us-east-1"
        assert loader.config.max_workers == 5
        assert loader.config.batch_size == 10
        assert loader.config.max_retries == 2

    def test_initialization_validates_config(self):
        """Test that initialization validates configuration parameters."""
        # Test invalid table name
        with pytest.raises(ValueError, match="table_name must be a non-empty string"):
            AsyncDynamoDBLoader(table_name="", region="us-east-1")

        # Test invalid batch size
        with pytest.raises(ValueError, match="batch_size must be greater than 0"):
            AsyncDynamoDBLoader(table_name="test", batch_size=0)

        # Test invalid max_workers
        with pytest.raises(ValueError, match="max_workers must be greater than 0"):
            AsyncDynamoDBLoader(table_name="test", max_workers=-1)

        # Test invalid region
        with pytest.raises(ValueError, match="region must be a valid AWS region"):
            AsyncDynamoDBLoader(table_name="test", region="invalid-region")

    def test_read_csv_with_valid_file(self):
        """Test reading a valid CSV file."""
        # Create a temporary CSV file
        with tempfile.NamedTemporaryFile(
            mode="w", suffix=".csv", delete=False, newline=""
        ) as f:
            csv_file = f.name
            writer = csv.DictWriter(f, fieldnames=["id", "name", "value"])
            writer.writeheader()
            writer.writerow({"id": "1", "name": "test1", "value": "100"})
            writer.writerow({"id": "2", "name": "test2", "value": "200"})

        try:
            loader = AsyncDynamoDBLoader(table_name="test-table")
            records = loader._read_csv(csv_file)

            assert len(records) == 2
            assert records[0]["id"] == "1"
            assert records[0]["name"] == "test1"
            assert records[1]["id"] == "2"
            assert records[1]["name"] == "test2"
        finally:
            import os

            os.unlink(csv_file)

    def test_read_csv_with_empty_file(self):
        """Test reading an empty CSV file."""
        # Create an empty CSV file with just headers
        with tempfile.NamedTemporaryFile(
            mode="w", suffix=".csv", delete=False, newline=""
        ) as f:
            csv_file = f.name
            writer = csv.DictWriter(f, fieldnames=["id", "name"])
            writer.writeheader()

        try:
            loader = AsyncDynamoDBLoader(table_name="test-table")
            records = loader._read_csv(csv_file)

            assert len(records) == 0
        finally:
            import os

            os.unlink(csv_file)

    def test_create_batches_with_exact_multiple(self):
        """Test batch creation when record count is exact multiple of batch size."""
        loader = AsyncDynamoDBLoader(table_name="test-table", batch_size=5)
        records = [{"id": str(i)} for i in range(10)]

        batches = loader._create_batches(records)

        assert len(batches) == 2
        assert len(batches[0]) == 5
        assert len(batches[1]) == 5

    def test_create_batches_with_remainder(self):
        """Test batch creation when record count has remainder."""
        loader = AsyncDynamoDBLoader(table_name="test-table", batch_size=3)
        records = [{"id": str(i)} for i in range(10)]

        batches = loader._create_batches(records)

        assert len(batches) == 4
        assert len(batches[0]) == 3
        assert len(batches[1]) == 3
        assert len(batches[2]) == 3
        assert len(batches[3]) == 1

    def test_create_batches_with_empty_records(self):
        """Test batch creation with empty record list."""
        loader = AsyncDynamoDBLoader(table_name="test-table", batch_size=5)
        records = []

        batches = loader._create_batches(records)

        assert len(batches) == 0

    @pytest.mark.asyncio
    async def test_write_batch_success(self):
        """Test successful batch write operation."""
        loader = AsyncDynamoDBLoader(table_name="test-table", max_retries=1)

        # Mock the table and batch_writer
        mock_table = MagicMock()
        mock_batch_writer = AsyncMock()
        mock_batch_writer.__aenter__ = AsyncMock(return_value=mock_batch_writer)
        mock_batch_writer.__aexit__ = AsyncMock(return_value=None)
        mock_batch_writer.put_item = AsyncMock()
        mock_table.batch_writer.return_value = mock_batch_writer

        items = [{"id": "1", "name": "test1"}, {"id": "2", "name": "test2"}]

        result = await loader._write_batch(mock_table, 0, items)

        assert result.successful is True
        assert result.items_count == 2
        assert result.batch_id == 0
        assert result.error is None

    @pytest.mark.asyncio
    async def test_write_batch_with_client_error(self):
        """Test batch write with ClientError."""
        from botocore.exceptions import ClientError

        loader = AsyncDynamoDBLoader(table_name="test-table", max_retries=1)

        # Mock the table to raise ClientError
        mock_table = MagicMock()
        mock_batch_writer = AsyncMock()
        mock_batch_writer.__aenter__ = AsyncMock(
            side_effect=ClientError(
                {"Error": {"Code": "ProvisionedThroughputExceededException"}},
                "PutItem",
            )
        )
        mock_table.batch_writer.return_value = mock_batch_writer

        items = [{"id": "1", "name": "test1"}]

        result = await loader._write_batch(mock_table, 0, items)

        assert result.successful is False
        assert result.items_count == 1
        assert result.error is not None
        assert "ProvisionedThroughputExceededException" in result.error

    @pytest.mark.asyncio
    async def test_write_batch_with_generic_exception(self):
        """Test batch write with generic exception."""
        loader = AsyncDynamoDBLoader(table_name="test-table", max_retries=1)

        # Mock the table to raise generic exception
        mock_table = MagicMock()
        mock_batch_writer = AsyncMock()
        mock_batch_writer.__aenter__ = AsyncMock(
            side_effect=Exception("Unexpected error")
        )
        mock_table.batch_writer.return_value = mock_batch_writer

        items = [{"id": "1", "name": "test1"}]

        result = await loader._write_batch(mock_table, 0, items)

        assert result.successful is False
        assert result.items_count == 1
        assert result.error is not None
        assert "unexpected error" in result.error.lower()

    @pytest.mark.asyncio
    async def test_load_csv_with_empty_file(self):
        """Test loading an empty CSV file."""
        # Create an empty CSV file
        with tempfile.NamedTemporaryFile(
            mode="w", suffix=".csv", delete=False, newline=""
        ) as f:
            csv_file = f.name
            writer = csv.DictWriter(f, fieldnames=["id", "name"])
            writer.writeheader()

        try:
            loader = AsyncDynamoDBLoader(table_name="test-table")
            result = await loader.load_csv(csv_file)

            assert result.total_records == 0
            assert result.successful_writes == 0
            assert result.failed_writes == 0
        finally:
            import os

            os.unlink(csv_file)
