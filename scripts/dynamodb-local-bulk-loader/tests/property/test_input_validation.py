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
"""Property-based tests for input validation across all loaders.

Feature: dynamodb-csv-bulk-loader
Property 13: Input Validation
Validates: Requirements 5.6, 8.5
"""

import pytest
from hypothesis import given, strategies as st

from src.async_loader import AsyncDynamoDBLoader
from src.models import LoaderConfig
from src.threaded_loader import ThreadedDynamoDBLoader


# Valid AWS regions for testing
VALID_REGIONS = [
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


# Feature: dynamodb-csv-bulk-loader, Property 13: Input Validation
@given(
    batch_size=st.integers(max_value=0),
    max_workers=st.integers(min_value=1, max_value=100),
    max_retries=st.integers(min_value=0, max_value=10),
)
def test_property_invalid_batch_size_rejected(
    batch_size: int, max_workers: int, max_retries: int
) -> None:
    """Property: Invalid batch_size (<=0) should be rejected with clear error.

    For any batch_size <= 0, the system should reject the configuration
    and provide a clear error message.
    """
    with pytest.raises(ValueError, match="batch_size must be greater than 0"):
        LoaderConfig(
            table_name="test-table",
            batch_size=batch_size,
            max_workers=max_workers,
            max_retries=max_retries,
        ).validate()


# Feature: dynamodb-csv-bulk-loader, Property 13: Input Validation
@given(
    batch_size=st.integers(min_value=1, max_value=100),
    max_workers=st.integers(max_value=0),
    max_retries=st.integers(min_value=0, max_value=10),
)
def test_property_invalid_max_workers_rejected(
    batch_size: int, max_workers: int, max_retries: int
) -> None:
    """Property: Invalid max_workers (<=0) should be rejected with clear error.

    For any max_workers <= 0, the system should reject the configuration
    and provide a clear error message.
    """
    with pytest.raises(ValueError, match="max_workers must be greater than 0"):
        LoaderConfig(
            table_name="test-table",
            batch_size=batch_size,
            max_workers=max_workers,
            max_retries=max_retries,
        ).validate()


# Feature: dynamodb-csv-bulk-loader, Property 13: Input Validation
@given(
    table_name=st.one_of(st.just(""), st.just("   "), st.just("\t\n")),
    batch_size=st.integers(min_value=1, max_value=100),
    max_workers=st.integers(min_value=1, max_value=100),
)
def test_property_empty_table_name_rejected(
    table_name: str, batch_size: int, max_workers: int
) -> None:
    """Property: Empty or whitespace-only table_name should be rejected.

    For any table_name that is empty or contains only whitespace,
    the system should reject the configuration with a clear error message.
    """
    with pytest.raises(ValueError, match="table_name must be a non-empty string"):
        LoaderConfig(
            table_name=table_name,
            batch_size=batch_size,
            max_workers=max_workers,
        ).validate()


# Feature: dynamodb-csv-bulk-loader, Property 13: Input Validation
@given(
    region=st.text(min_size=1, max_size=20).filter(lambda x: x not in VALID_REGIONS),
    batch_size=st.integers(min_value=1, max_value=100),
    max_workers=st.integers(min_value=1, max_value=100),
)
def test_property_invalid_region_rejected(
    region: str, batch_size: int, max_workers: int
) -> None:
    """Property: Invalid AWS region should be rejected with clear error.

    For any region that is not a valid AWS region, the system should
    reject the configuration and provide a clear error message.
    """
    with pytest.raises(ValueError, match="region must be a valid AWS region"):
        LoaderConfig(
            table_name="test-table",
            region=region,
            batch_size=batch_size,
            max_workers=max_workers,
        ).validate()


# Feature: dynamodb-csv-bulk-loader, Property 13: Input Validation
@given(
    max_retries=st.integers(max_value=-1),
    batch_size=st.integers(min_value=1, max_value=100),
    max_workers=st.integers(min_value=1, max_value=100),
)
def test_property_negative_max_retries_rejected(
    max_retries: int, batch_size: int, max_workers: int
) -> None:
    """Property: Negative max_retries should be rejected with clear error.

    For any max_retries < 0, the system should reject the configuration
    and provide a clear error message.
    """
    with pytest.raises(ValueError, match="max_retries must be >= 0"):
        LoaderConfig(
            table_name="test-table",
            batch_size=batch_size,
            max_workers=max_workers,
            max_retries=max_retries,
        ).validate()


# Feature: dynamodb-csv-bulk-loader, Property 13: Input Validation
@given(
    batch_size=st.integers(min_value=1, max_value=100),
    max_workers=st.integers(min_value=1, max_value=100),
    max_retries=st.integers(min_value=0, max_value=10),
    region=st.sampled_from(VALID_REGIONS),
)
def test_property_async_loader_validates_on_init(
    batch_size: int, max_workers: int, max_retries: int, region: str
) -> None:
    """Property: AsyncDynamoDBLoader should validate configuration on initialization.

    For any valid configuration, AsyncDynamoDBLoader should initialize successfully.
    For any invalid configuration, it should raise ValueError during initialization.
    """
    # Valid configuration should succeed
    loader = AsyncDynamoDBLoader(
        table_name="test-table",
        region=region,
        max_workers=max_workers,
        batch_size=batch_size,
        max_retries=max_retries,
    )
    assert loader.config.table_name == "test-table"

    # Invalid batch_size should fail
    with pytest.raises(ValueError):
        AsyncDynamoDBLoader(
            table_name="test-table",
            region=region,
            max_workers=max_workers,
            batch_size=0,
            max_retries=max_retries,
        )


# Feature: dynamodb-csv-bulk-loader, Property 13: Input Validation
@given(
    batch_size=st.integers(min_value=1, max_value=100),
    max_workers=st.integers(min_value=1, max_value=100),
    max_retries=st.integers(min_value=0, max_value=10),
    region=st.sampled_from(VALID_REGIONS),
)
def test_property_threaded_loader_validates_on_init(
    batch_size: int, max_workers: int, max_retries: int, region: str
) -> None:
    """Property: ThreadedDynamoDBLoader should validate configuration on initialization.

    For any valid configuration, ThreadedDynamoDBLoader should initialize successfully.
    For any invalid configuration, it should raise ValueError during initialization.
    """
    # Valid configuration should succeed
    loader = ThreadedDynamoDBLoader(
        table_name="test-table",
        region=region,
        max_workers=max_workers,
        batch_size=batch_size,
        max_retries=max_retries,
    )
    assert loader.config.table_name == "test-table"

    # Invalid max_workers should fail
    with pytest.raises(ValueError):
        ThreadedDynamoDBLoader(
            table_name="test-table",
            region=region,
            max_workers=0,
            batch_size=batch_size,
            max_retries=max_retries,
        )
