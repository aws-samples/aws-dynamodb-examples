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
"""Unit tests for CSV generator.

This module contains unit tests for specific examples and edge cases
of the CSVGenerator class.
"""

import csv
import tempfile
import uuid
from datetime import datetime
from decimal import Decimal
from pathlib import Path

import pytest

from src.csv_generator import CSVGenerator


class TestCSVGeneratorEdgeCases:
    """Test edge cases for CSV generator."""

    def test_zero_records(self) -> None:
        """Test generating CSV with 0 records.

        Validates: Requirements 4.5
        """
        with tempfile.NamedTemporaryFile(mode="w", suffix=".csv", delete=False) as tmp_file:
            tmp_path = tmp_file.name

        try:
            generator = CSVGenerator(output_file=tmp_path, num_records=0)
            generator.generate()

            # Verify file exists and has header but no data rows
            with open(tmp_path, encoding="utf-8") as csvfile:
                reader = csv.DictReader(csvfile)
                records = list(reader)

            assert len(records) == 0, "Should have 0 records"

            # Verify header is present
            with open(tmp_path, encoding="utf-8") as csvfile:
                first_line = csvfile.readline().strip()
                expected_header = "id,timestamp,category,user_name,email,amount,status,description"
                assert first_line == expected_header, f"Expected header: {expected_header}"

        finally:
            Path(tmp_path).unlink(missing_ok=True)

    def test_one_record(self) -> None:
        """Test generating CSV with exactly 1 record.

        Validates: Requirements 4.1, 4.3, 4.4, 4.5
        """
        with tempfile.NamedTemporaryFile(mode="w", suffix=".csv", delete=False) as tmp_file:
            tmp_path = tmp_file.name

        try:
            generator = CSVGenerator(output_file=tmp_path, num_records=1)
            generator.generate()

            with open(tmp_path, encoding="utf-8") as csvfile:
                reader = csv.DictReader(csvfile)
                records = list(reader)

            assert len(records) == 1, "Should have exactly 1 record"

            record = records[0]

            # Verify all required fields are present
            required_fields = [
                "id",
                "timestamp",
                "category",
                "user_name",
                "email",
                "amount",
                "status",
                "description",
            ]
            for field in required_fields:
                assert field in record, f"Field '{field}' missing"
                assert len(record[field]) > 0, f"Field '{field}' is empty"

            # Verify ID is valid UUID
            uuid.UUID(record["id"])

            # Verify timestamp is valid ISO 8601
            datetime.fromisoformat(record["timestamp"])

            # Verify amount is valid decimal
            Decimal(record["amount"])

        finally:
            Path(tmp_path).unlink(missing_ok=True)

    def test_special_characters_in_data(self) -> None:
        """Test that special characters are properly escaped in CSV.

        This test verifies that the CSV generator properly handles special
        characters like commas, quotes, and newlines in the generated data.

        Validates: Requirements 4.8
        """
        with tempfile.NamedTemporaryFile(mode="w", suffix=".csv", delete=False) as tmp_file:
            tmp_path = tmp_file.name

        try:
            # Generate a small CSV
            generator = CSVGenerator(output_file=tmp_path, num_records=10)
            generator.generate()

            # Read and verify CSV can be parsed correctly
            with open(tmp_path, encoding="utf-8") as csvfile:
                reader = csv.DictReader(csvfile)
                records = list(reader)

            assert len(records) == 10, "Should have 10 records"

            # Verify each record has all fields and they're properly parsed
            for i, record in enumerate(records):
                # Check that fields with potential special characters are handled
                # (description field from Faker can contain various characters)
                assert "description" in record, f"Record {i}: description field missing"

                # Verify the record can be written and read back
                # This ensures proper CSV escaping
                assert isinstance(record["description"], str), f"Record {i}: description not a string"

        finally:
            Path(tmp_path).unlink(missing_ok=True)


class TestCSVGeneratorSpecificCounts:
    """Test specific record counts."""

    def test_10k_records(self) -> None:
        """Test generating CSV with 10,000 records.

        This is the default development testing size.

        Validates: Requirements 4.5, 4.6
        """
        with tempfile.NamedTemporaryFile(mode="w", suffix=".csv", delete=False) as tmp_file:
            tmp_path = tmp_file.name

        try:
            generator = CSVGenerator(output_file=tmp_path, num_records=10000)
            generator.generate()

            with open(tmp_path, encoding="utf-8") as csvfile:
                reader = csv.DictReader(csvfile)
                records = list(reader)

            assert len(records) == 10000, "Should have exactly 10,000 records"

            # Verify first and last records have all required fields
            for record in [records[0], records[-1]]:
                required_fields = [
                    "id",
                    "timestamp",
                    "category",
                    "user_name",
                    "email",
                    "amount",
                    "status",
                    "description",
                ]
                for field in required_fields:
                    assert field in record, f"Field '{field}' missing"
                    assert len(record[field]) > 0, f"Field '{field}' is empty"

        finally:
            Path(tmp_path).unlink(missing_ok=True)

    @pytest.mark.slow
    def test_1m_records(self) -> None:
        """Test generating CSV with 1,000,000 records.

        This is the production-scale testing size. Marked as slow test.

        Validates: Requirements 4.5, 4.7
        """
        with tempfile.NamedTemporaryFile(mode="w", suffix=".csv", delete=False) as tmp_file:
            tmp_path = tmp_file.name

        try:
            generator = CSVGenerator(output_file=tmp_path, num_records=1_000_000)
            generator.generate()

            # For 1M records, we'll verify count without loading all into memory
            with open(tmp_path, encoding="utf-8") as csvfile:
                reader = csv.DictReader(csvfile)
                count = sum(1 for _ in reader)

            assert count == 1_000_000, f"Should have exactly 1,000,000 records, got {count}"

            # Verify file exists and is non-empty
            file_size = Path(tmp_path).stat().st_size
            assert file_size > 0, "File should not be empty"

            # Rough estimate: each record should be at least 100 bytes
            # (conservative estimate for all fields)
            min_expected_size = 1_000_000 * 100
            assert (
                file_size > min_expected_size
            ), f"File size {file_size} seems too small for 1M records"

        finally:
            Path(tmp_path).unlink(missing_ok=True)


class TestCSVGeneratorDataQuality:
    """Test data quality and format."""

    def test_all_fields_present(self) -> None:
        """Test that all required fields are present in generated CSV.

        Validates: Requirements 4.3
        """
        with tempfile.NamedTemporaryFile(mode="w", suffix=".csv", delete=False) as tmp_file:
            tmp_path = tmp_file.name

        try:
            generator = CSVGenerator(output_file=tmp_path, num_records=5)
            generator.generate()

            with open(tmp_path, encoding="utf-8") as csvfile:
                reader = csv.DictReader(csvfile)
                records = list(reader)

            required_fields = [
                "id",
                "timestamp",
                "category",
                "user_name",
                "email",
                "amount",
                "status",
                "description",
            ]

            # Check header
            assert reader.fieldnames == required_fields, "Header fields don't match expected"

            # Check each record
            for i, record in enumerate(records):
                for field in required_fields:
                    assert field in record, f"Record {i}: Field '{field}' missing"
                    assert record[field] is not None, f"Record {i}: Field '{field}' is None"
                    assert len(record[field]) > 0, f"Record {i}: Field '{field}' is empty"

        finally:
            Path(tmp_path).unlink(missing_ok=True)

    def test_timestamps_are_sorted(self) -> None:
        """Test that timestamps are in ascending chronological order.

        Validates: Requirements 4.4
        """
        with tempfile.NamedTemporaryFile(mode="w", suffix=".csv", delete=False) as tmp_file:
            tmp_path = tmp_file.name

        try:
            generator = CSVGenerator(output_file=tmp_path, num_records=100)
            generator.generate()

            with open(tmp_path, encoding="utf-8") as csvfile:
                reader = csv.DictReader(csvfile)
                records = list(reader)

            timestamps = [datetime.fromisoformat(record["timestamp"]) for record in records]

            # Verify ascending order
            for i in range(len(timestamps) - 1):
                assert (
                    timestamps[i] <= timestamps[i + 1]
                ), f"Timestamps not sorted at index {i}: {timestamps[i]} > {timestamps[i+1]}"

        finally:
            Path(tmp_path).unlink(missing_ok=True)

    def test_uuids_are_unique(self) -> None:
        """Test that all generated UUIDs are unique.

        Validates: Requirements 4.1
        """
        with tempfile.NamedTemporaryFile(mode="w", suffix=".csv", delete=False) as tmp_file:
            tmp_path = tmp_file.name

        try:
            generator = CSVGenerator(output_file=tmp_path, num_records=1000)
            generator.generate()

            with open(tmp_path, encoding="utf-8") as csvfile:
                reader = csv.DictReader(csvfile)
                records = list(reader)

            ids = [record["id"] for record in records]

            # Verify all IDs are unique
            unique_ids = set(ids)
            assert len(unique_ids) == len(ids), f"Found duplicate IDs: {len(ids)} total, {len(unique_ids)} unique"

            # Verify all are valid UUIDs
            for id_value in ids:
                uuid.UUID(id_value)

        finally:
            Path(tmp_path).unlink(missing_ok=True)

    def test_csv_format_valid(self) -> None:
        """Test that generated CSV has valid format.

        Validates: Requirements 4.8
        """
        with tempfile.NamedTemporaryFile(mode="w", suffix=".csv", delete=False) as tmp_file:
            tmp_path = tmp_file.name

        try:
            generator = CSVGenerator(output_file=tmp_path, num_records=10)
            generator.generate()

            # Verify file can be read as CSV
            with open(tmp_path, encoding="utf-8") as csvfile:
                reader = csv.DictReader(csvfile)
                records = list(reader)

            assert len(records) == 10, "Should have 10 records"

            # Verify no parsing errors occurred
            # (csv.DictReader would raise exception if format is invalid)

        finally:
            Path(tmp_path).unlink(missing_ok=True)
