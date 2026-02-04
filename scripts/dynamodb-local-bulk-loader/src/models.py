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
"""Data models for DynamoDB CSV bulk loader."""

from dataclasses import dataclass, field
from decimal import Decimal
from typing import Any, Optional


@dataclass
class CSVRecord:
    """Represents a single CSV record."""

    id: str  # UUID
    timestamp: str  # ISO 8601
    category: str
    user_name: str
    email: str
    amount: Decimal
    status: str
    description: str

    def to_dynamodb_item(self) -> dict[str, Any]:
        """Convert CSV record to DynamoDB item format.

        Returns:
            Dictionary with DynamoDB-compatible types
        """
        return {
            "id": self.id,
            "timestamp": self.timestamp,
            "category": self.category,
            "user_name": self.user_name,
            "email": self.email,
            "amount": str(self.amount),  # DynamoDB stores Decimal as string
            "status": self.status,
            "description": self.description,
        }


@dataclass
class LoadResult:
    """Result of a CSV load operation."""

    total_records: int
    successful_writes: int
    failed_writes: int
    duration_seconds: float
    errors: list[str] = field(default_factory=list)

    def success_rate(self) -> float:
        """Calculate success rate percentage.

        Returns:
            Success rate as a percentage (0-100)
        """
        if self.total_records == 0:
            return 0.0
        return (self.successful_writes / self.total_records) * 100.0


@dataclass
class BatchResult:
    """Result of a single batch write operation."""

    batch_id: int
    items_count: int
    successful: bool
    retry_count: int
    error: Optional[str] = None


@dataclass
class LoaderConfig:
    """Configuration for DynamoDB loaders."""

    table_name: str
    region: str = "us-east-1"
    max_workers: int = 10
    batch_size: int = 25
    max_retries: int = 3
    base_delay: float = 0.1
    max_delay: float = 10.0

    def validate(self) -> None:
        """Validate configuration parameters.

        Raises:
            ValueError: If any configuration parameter is invalid
        """
        if not self.table_name or not self.table_name.strip():
            raise ValueError("table_name must be a non-empty string")

        if self.batch_size <= 0:
            raise ValueError(f"batch_size must be greater than 0, got {self.batch_size}")

        if self.max_workers <= 0:
            raise ValueError(f"max_workers must be greater than 0, got {self.max_workers}")

        if self.max_retries < 0:
            raise ValueError(f"max_retries must be >= 0, got {self.max_retries}")

        # Validate AWS region format (basic check)
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
        if self.region not in valid_regions:
            raise ValueError(f"region must be a valid AWS region, got {self.region}")

        if self.base_delay < 0:
            raise ValueError(f"base_delay must be >= 0, got {self.base_delay}")

        if self.max_delay < self.base_delay:
            raise ValueError(
                f"max_delay must be >= base_delay, got max_delay={self.max_delay}, base_delay={self.base_delay}"
            )
