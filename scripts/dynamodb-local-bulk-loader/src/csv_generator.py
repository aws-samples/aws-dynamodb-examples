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
"""CSV data generator for testing DynamoDB bulk loader."""

import csv
import uuid
from datetime import datetime, timedelta
from decimal import Decimal
from pathlib import Path

from faker import Faker


class CSVGenerator:
    """Generate realistic CSV test data with patterns that could cause hot partitions."""

    # Predefined categories and statuses for realistic data
    CATEGORIES = ["Electronics", "Books", "Clothing", "Home", "Sports", "Toys", "Food"]
    STATUSES = ["pending", "processing", "completed", "cancelled", "refunded"]

    def __init__(self, output_file: str, num_records: int = 10000):
        """Initialize CSV generator.

        Args:
            output_file: Path to output CSV file
            num_records: Number of records to generate (default: 10000)
        """
        self.output_file = Path(output_file)
        self.num_records = num_records
        self.faker = Faker()
        # Set seed for reproducible data generation in tests
        Faker.seed(42)

    def generate(self) -> None:
        """Generate CSV file with sorted timestamps.

        Creates records with chronologically sorted timestamps to simulate
        a hot partition scenario if written sequentially to DynamoDB.
        
        Hot Partition Scenario:
        - Records have timestamps in ascending order (2024-01-01 00:00:00, 00:00:01, etc.)
        - If written to DynamoDB in this order without shuffling, all writes
          would target the same partition key range at the same time
        - This causes throttling as one partition receives all the write load
        - The shuffle pattern in the loaders randomizes write order to prevent this
        
        All required fields are generated with realistic data using Faker.
        """
        # Generate all records first
        records = self._generate_records()

        # Write to CSV file
        self._write_csv(records)

    def _generate_records(self) -> list[dict]:
        """Generate all records with sorted timestamps.

        Creates records with incrementing timestamps (1 second apart) to
        demonstrate a hot partition scenario. In a real-world scenario,
        this could represent:
        - Time-series data (sensor readings, logs, events)
        - Sequential transaction data
        - Batch-processed records with creation timestamps
        
        Without shuffling before writing to DynamoDB, these sorted timestamps
        would cause all writes to target the same partition, leading to throttling.

        Returns:
            List of record dictionaries with all required fields
        """
        records = []
        base_time = datetime(2024, 1, 1, 0, 0, 0)

        for i in range(self.num_records):
            # Create timestamps in ascending order (hot partition scenario)
            # Each record is 1 second after the previous one
            timestamp = base_time + timedelta(seconds=i)

            record = {
                # UUID v4 for primary key (random, well-distributed)
                "id": str(uuid.uuid4()),
                # Sorted timestamp (creates hot partition if written sequentially)
                "timestamp": timestamp.isoformat(),
                # Realistic attributes using Faker
                "category": self.faker.random_element(elements=self.CATEGORIES),
                "user_name": self.faker.name(),
                "email": self.faker.email(),
                # Convert to string to avoid Decimal serialization issues
                "amount": str(Decimal(str(round(self.faker.random.uniform(1.0, 1000.0), 2)))),
                "status": self.faker.random_element(elements=self.STATUSES),
                "description": self.faker.text(max_nb_chars=100),
            }
            records.append(record)

        return records

    def _write_csv(self, records: list[dict]) -> None:
        """Write records to CSV file.

        Args:
            records: List of record dictionaries to write
        """
        # Ensure output directory exists
        self.output_file.parent.mkdir(parents=True, exist_ok=True)

        # Define field order
        fieldnames = [
            "id",
            "timestamp",
            "category",
            "user_name",
            "email",
            "amount",
            "status",
            "description",
        ]

        # Write CSV with headers
        with open(self.output_file, "w", newline="", encoding="utf-8") as csvfile:
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(records)
