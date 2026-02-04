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
"""Multi-threaded Python implementation for loading CSV data into DynamoDB."""

import csv
import os
import random
import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Any

import boto3
from botocore.config import Config
from botocore.exceptions import ClientError

from src.logging_config import get_logger
from src.models import BatchResult, LoaderConfig, LoadResult
from src.retry_handler import RetryHandler

logger = get_logger(__name__)

# Auto-detect optimal worker count for threaded loader
# Threaded loader benefits from matching CPU core count
DEFAULT_WORKERS = os.cpu_count() or 10  # Fallback to 10 if detection fails


class ThreadedDynamoDBLoader:
    """Multi-threaded loader for CSV data into DynamoDB using boto3."""

    def __init__(
        self,
        table_name: str,
        region: str = "us-east-1",
        max_workers: int | None = None,
        batch_size: int = 25,
        max_retries: int = 3,
    ):
        """Initialize threaded loader with configuration.

        Args:
            table_name: Name of the DynamoDB table
            region: AWS region
            max_workers: Maximum number of concurrent worker threads.
                        If None, auto-detects CPU count (recommended for optimal performance).
                        Threaded loader benefits from matching CPU core count.
            batch_size: Number of records per batch
            max_retries: Maximum retry attempts for failed operations
        """
        # Auto-detect optimal worker count if not specified
        if max_workers is None:
            max_workers = DEFAULT_WORKERS
            logger.info(f"Auto-detected {max_workers} CPU cores, using {max_workers} workers")

        self.config = LoaderConfig(
            table_name=table_name,
            region=region,
            max_workers=max_workers,
            batch_size=batch_size,
            max_retries=max_retries,
        )
        # Validate configuration on initialization
        self.config.validate()

        self.retry_handler = RetryHandler(
            max_retries=max_retries,
            base_delay=self.config.base_delay,
            max_delay=self.config.max_delay,
        )

        # Thread-safe lock for shared resource access
        self._lock = threading.Lock()

        # Configure boto3 with optimized connection pool
        # Connection pool size should match or exceed worker count to prevent bottlenecks
        self.boto_config = Config(
            max_pool_connections=max_workers + 5,  # Add buffer for overhead
            retries={"max_attempts": 0},  # Disable boto3 retries (we handle our own)
        )

    def load_csv(self, csv_file: str) -> LoadResult:
        """Load CSV file into DynamoDB with shuffling and parallel processing.

        This method:
        1. Reads all records from the CSV file
        2. Shuffles the records to prevent hot partitions
        3. Splits records into batches
        4. Processes batches concurrently using thread pool
        5. Returns statistics about the load operation

        Args:
            csv_file: Path to the CSV file

        Returns:
            LoadResult with operation statistics
        """
        start_time = time.time()
        logger.info(f"Starting CSV load from {csv_file}")

        # Read CSV file into memory
        # Note: For very large files (>1M records), consider streaming or using Spark loader
        records = self._read_csv(csv_file)
        total_records = len(records)
        logger.info(f"Read {total_records} records from CSV")

        if total_records == 0:
            logger.warning("No records to load")
            return LoadResult(
                total_records=0,
                successful_writes=0,
                failed_writes=0,
                duration_seconds=time.time() - start_time,
                errors=[],
            )

        # CRITICAL: Shuffle records to prevent hot partitions
        # Without shuffling, sequential writes to sorted data (e.g., by timestamp)
        # would target the same partition key range, causing throttling.
        # Shuffling distributes writes randomly across all partitions.
        logger.info("Shuffling records to prevent hot partitions")
        random.shuffle(records)

        # Split into batches of configured size (max 25 for DynamoDB BatchWriteItem)
        batches = self._create_batches(records)
        logger.info(f"Created {len(batches)} batches of size {self.config.batch_size}")

        # Process batches concurrently with thread pool
        successful_writes = 0
        failed_writes = 0
        errors = []

        # Create boto3 session and DynamoDB resource with optimized config
        # Each thread will get its own client from the resource
        # boto3 handles thread-safe connection pooling internally
        session = boto3.Session(region_name=self.config.region)
        dynamodb = session.resource("dynamodb", config=self.boto_config)
        table = dynamodb.Table(self.config.table_name)

        # ThreadPoolExecutor manages a pool of worker threads
        # max_workers limits concurrent operations to prevent overwhelming DynamoDB
        # Context manager ensures proper thread cleanup on completion
        with ThreadPoolExecutor(max_workers=self.config.max_workers) as executor:
            # Submit all batch write tasks to the thread pool
            # Each task runs independently in its own thread
            future_to_batch = {
                executor.submit(self._write_batch, table, i, batch): (i, batch)
                for i, batch in enumerate(batches)
            }

            # Collect results as they complete (not necessarily in submission order)
            # This allows processing results immediately without waiting for all tasks
            for future in as_completed(future_to_batch):
                batch_id, batch = future_to_batch[future]
                try:
                    result = future.result()
                    if result.successful:
                        successful_writes += result.items_count
                    else:
                        failed_writes += result.items_count
                        if result.error:
                            errors.append(result.error)
                except Exception as e:
                    # Handle exceptions from thread execution
                    # This catches errors not handled within _write_batch
                    error_msg = f"Batch {batch_id} failed with exception: {e}"
                    logger.error(error_msg)
                    errors.append(error_msg)
                    failed_writes += len(batch)

        duration = time.time() - start_time
        logger.info(
            f"Load complete: {successful_writes} successful, {failed_writes} failed, "
            f"duration: {duration:.2f}s"
        )

        return LoadResult(
            total_records=total_records,
            successful_writes=successful_writes,
            failed_writes=failed_writes,
            duration_seconds=duration,
            errors=errors,
        )

    def _read_csv(self, csv_file: str) -> list[dict[str, Any]]:
        """Read CSV file and return list of records.

        Args:
            csv_file: Path to CSV file

        Returns:
            List of dictionaries representing CSV records
        """
        records = []
        with open(csv_file, encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                records.append(row)
        return records

    def _create_batches(self, records: list[dict[str, Any]]) -> list[list[dict[str, Any]]]:
        """Split records into batches.

        Args:
            records: List of records

        Returns:
            List of batches, where each batch is a list of records
        """
        batches = []
        for i in range(0, len(records), self.config.batch_size):
            batch = records[i : i + self.config.batch_size]
            batches.append(batch)
        return batches

    def _write_batch(self, table: Any, batch_id: int, items: list[dict[str, Any]]) -> BatchResult:
        """Write a batch of items to DynamoDB with retry logic (thread-safe).

        Uses the retry handler to implement exponential backoff with jitter.
        This handles transient errors (throttling, network issues) gracefully
        while failing fast on permanent errors (validation, permissions).

        Thread Safety: boto3's batch_writer is thread-safe and can be called
        from multiple threads concurrently without additional locking.

        Args:
            table: boto3 DynamoDB table resource
            batch_id: Identifier for this batch
            items: List of items to write

        Returns:
            BatchResult with operation status
        """
        retry_count = 0

        def write_operation() -> None:
            """Actual write operation to be retried.

            Uses batch_writer for efficient batch writes with automatic
            retry of unprocessed items within the batch.
            boto3's batch_writer is thread-safe.
            """
            nonlocal retry_count

            # batch_writer automatically handles:
            # - Batching items into groups of 25 (DynamoDB limit)
            # - Retrying unprocessed items from partial failures
            # - Thread-safe operation (no additional locking needed)
            with table.batch_writer() as batch:
                for item in items:
                    batch.put_item(Item=item)

        try:
            # Delegate retry logic to RetryHandler
            # This implements exponential backoff: delay = base_delay * (2^attempt) + jitter
            self.retry_handler.retry_sync(write_operation)

            logger.debug(f"Batch {batch_id} written successfully ({len(items)} items)")
            return BatchResult(
                batch_id=batch_id,
                items_count=len(items),
                successful=True,
                retry_count=retry_count,
            )

        except ClientError as e:
            # DynamoDB-specific errors (throttling, validation, etc.)
            error_code = e.response.get("Error", {}).get("Code", "Unknown")
            error_msg = f"Batch {batch_id} failed after retries: {error_code} - {e}"
            logger.error(error_msg)
            return BatchResult(
                batch_id=batch_id,
                items_count=len(items),
                successful=False,
                retry_count=self.config.max_retries,
                error=error_msg,
            )
        except Exception as e:
            # Unexpected errors (network, programming errors, etc.)
            error_msg = f"Batch {batch_id} failed with unexpected error: {e}"
            logger.error(error_msg)
            return BatchResult(
                batch_id=batch_id,
                items_count=len(items),
                successful=False,
                retry_count=self.config.max_retries,
                error=error_msg,
            )
