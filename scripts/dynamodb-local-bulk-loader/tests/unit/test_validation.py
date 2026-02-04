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
"""Unit tests for input validation across all loaders.

Tests specific validation rules with concrete invalid inputs and verifies
error message clarity.

Requirements: 5.6, 8.5
"""

import pytest

from src.async_loader import AsyncDynamoDBLoader
from src.models import LoaderConfig
from src.threaded_loader import ThreadedDynamoDBLoader


class TestLoaderConfigValidation:
    """Unit tests for LoaderConfig validation."""

    def test_valid_configuration(self):
        """Test that valid configuration passes validation."""
        config = LoaderConfig(
            table_name="test-table",
            region="us-east-1",
            max_workers=10,
            batch_size=25,
            max_retries=3,
        )
        # Should not raise any exception
        config.validate()

    def test_empty_table_name(self):
        """Test that empty table_name is rejected."""
        config = LoaderConfig(table_name="", region="us-east-1")
        with pytest.raises(ValueError) as exc_info:
            config.validate()
        assert "table_name must be a non-empty string" in str(exc_info.value)

    def test_whitespace_only_table_name(self):
        """Test that whitespace-only table_name is rejected."""
        config = LoaderConfig(table_name="   ", region="us-east-1")
        with pytest.raises(ValueError) as exc_info:
            config.validate()
        assert "table_name must be a non-empty string" in str(exc_info.value)

    def test_zero_batch_size(self):
        """Test that batch_size of 0 is rejected."""
        config = LoaderConfig(table_name="test-table", batch_size=0)
        with pytest.raises(ValueError) as exc_info:
            config.validate()
        assert "batch_size must be greater than 0" in str(exc_info.value)
        assert "got 0" in str(exc_info.value)

    def test_negative_batch_size(self):
        """Test that negative batch_size is rejected."""
        config = LoaderConfig(table_name="test-table", batch_size=-5)
        with pytest.raises(ValueError) as exc_info:
            config.validate()
        assert "batch_size must be greater than 0" in str(exc_info.value)
        assert "got -5" in str(exc_info.value)

    def test_zero_max_workers(self):
        """Test that max_workers of 0 is rejected."""
        config = LoaderConfig(table_name="test-table", max_workers=0)
        with pytest.raises(ValueError) as exc_info:
            config.validate()
        assert "max_workers must be greater than 0" in str(exc_info.value)
        assert "got 0" in str(exc_info.value)

    def test_negative_max_workers(self):
        """Test that negative max_workers is rejected."""
        config = LoaderConfig(table_name="test-table", max_workers=-3)
        with pytest.raises(ValueError) as exc_info:
            config.validate()
        assert "max_workers must be greater than 0" in str(exc_info.value)
        assert "got -3" in str(exc_info.value)

    def test_negative_max_retries(self):
        """Test that negative max_retries is rejected."""
        config = LoaderConfig(table_name="test-table", max_retries=-1)
        with pytest.raises(ValueError) as exc_info:
            config.validate()
        assert "max_retries must be >= 0" in str(exc_info.value)
        assert "got -1" in str(exc_info.value)

    def test_zero_max_retries_allowed(self):
        """Test that max_retries of 0 is allowed (no retries)."""
        config = LoaderConfig(table_name="test-table", max_retries=0)
        # Should not raise any exception
        config.validate()

    def test_invalid_region_format(self):
        """Test that invalid AWS region is rejected."""
        config = LoaderConfig(table_name="test-table", region="invalid-region")
        with pytest.raises(ValueError) as exc_info:
            config.validate()
        assert "region must be a valid AWS region" in str(exc_info.value)
        assert "got invalid-region" in str(exc_info.value)

    def test_nonexistent_region(self):
        """Test that non-existent AWS region is rejected."""
        config = LoaderConfig(table_name="test-table", region="us-north-1")
        with pytest.raises(ValueError) as exc_info:
            config.validate()
        assert "region must be a valid AWS region" in str(exc_info.value)

    def test_all_valid_regions_accepted(self):
        """Test that all valid AWS regions are accepted."""
        valid_regions = [
            "us-east-1",
            "us-east-2",
            "us-west-1",
            "us-west-2",
            "eu-west-1",
            "eu-west-2",
            "eu-west-3",
            "eu-central-1",
            "ap-northeast-1",
            "ap-northeast-2",
            "ap-southeast-1",
            "ap-southeast-2",
            "ap-south-1",
            "sa-east-1",
            "ca-central-1",
        ]

        for region in valid_regions:
            config = LoaderConfig(table_name="test-table", region=region)
            # Should not raise any exception
            config.validate()

    def test_negative_base_delay(self):
        """Test that negative base_delay is rejected."""
        config = LoaderConfig(table_name="test-table", base_delay=-0.1)
        with pytest.raises(ValueError) as exc_info:
            config.validate()
        assert "base_delay must be >= 0" in str(exc_info.value)

    def test_max_delay_less_than_base_delay(self):
        """Test that max_delay < base_delay is rejected."""
        config = LoaderConfig(
            table_name="test-table", base_delay=5.0, max_delay=2.0
        )
        with pytest.raises(ValueError) as exc_info:
            config.validate()
        assert "max_delay must be >= base_delay" in str(exc_info.value)
        assert "max_delay=2.0" in str(exc_info.value)
        assert "base_delay=5.0" in str(exc_info.value)


class TestAsyncLoaderValidation:
    """Unit tests for AsyncDynamoDBLoader validation."""

    def test_initialization_validates_immediately(self):
        """Test that AsyncDynamoDBLoader validates on initialization."""
        # Valid config should succeed
        loader = AsyncDynamoDBLoader(table_name="test-table")
        assert loader.config.table_name == "test-table"

        # Invalid config should fail immediately
        with pytest.raises(ValueError, match="batch_size must be greater than 0"):
            AsyncDynamoDBLoader(table_name="test-table", batch_size=-1)

    def test_multiple_validation_errors_reported_first(self):
        """Test that first validation error is reported when multiple exist."""
        # Empty table_name is checked first
        with pytest.raises(ValueError, match="table_name must be a non-empty string"):
            AsyncDynamoDBLoader(
                table_name="",
                batch_size=-1,  # Also invalid
                max_workers=-1,  # Also invalid
            )


class TestThreadedLoaderValidation:
    """Unit tests for ThreadedDynamoDBLoader validation."""

    def test_initialization_validates_immediately(self):
        """Test that ThreadedDynamoDBLoader validates on initialization."""
        # Valid config should succeed
        loader = ThreadedDynamoDBLoader(table_name="test-table")
        assert loader.config.table_name == "test-table"

        # Invalid config should fail immediately
        with pytest.raises(ValueError, match="max_workers must be greater than 0"):
            ThreadedDynamoDBLoader(table_name="test-table", max_workers=0)

    def test_validation_prevents_resource_allocation(self):
        """Test that validation happens before any resource allocation."""
        # This should fail fast without creating any threads or connections
        with pytest.raises(ValueError):
            ThreadedDynamoDBLoader(table_name="", region="us-east-1")


class TestValidationErrorMessages:
    """Unit tests for validation error message clarity."""

    def test_error_messages_include_actual_values(self):
        """Test that error messages include the actual invalid values."""
        config = LoaderConfig(table_name="test-table", batch_size=-10)

        with pytest.raises(ValueError) as exc_info:
            config.validate()

        error_msg = str(exc_info.value)
        assert "-10" in error_msg  # Actual value included
        assert "batch_size" in error_msg  # Parameter name included

    def test_error_messages_are_descriptive(self):
        """Test that error messages clearly describe the problem."""
        config = LoaderConfig(table_name="test-table", region="xyz")

        with pytest.raises(ValueError) as exc_info:
            config.validate()

        error_msg = str(exc_info.value)
        assert "region" in error_msg
        assert "valid AWS region" in error_msg
        assert "xyz" in error_msg

    def test_error_messages_suggest_valid_range(self):
        """Test that error messages indicate valid ranges."""
        config = LoaderConfig(table_name="test-table", max_retries=-5)

        with pytest.raises(ValueError) as exc_info:
            config.validate()

        error_msg = str(exc_info.value)
        assert ">= 0" in error_msg  # Indicates valid range
