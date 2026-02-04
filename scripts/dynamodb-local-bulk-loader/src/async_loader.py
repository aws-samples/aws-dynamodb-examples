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
"""Async Python implementation for loading CSV data into DynamoDB."""

import asyncio
import csv
import random
import time
from typing import Any

import aioboto3
from botocore.config import Config
from botocore.exceptions import ClientError

from src.logging_config import get_logger
from src.models import BatchResult, LoaderConfig, LoadResult
from src.retry_handler import RetryHandler

logger = get_logger(__name__)

# Optimal worker count for async loader (from performance testing)
# Async loader doesn't benefit from matching CPU cores - 10 is optimal
DEFAULT_ASYNC_WORKERS = 10


class AsyncDynamoDBLoader:
    """Async loader for CSV data into DynamoDB using aioboto3."""

    def __init__(
        self,
        table_name: str,
        region: str = "us-east-1",
        max_workers: int | None = None,
        batch_size: int = 25,
        max_retries: int = 3,
    ):
        """Initialize async loader with configuration.

        Args:
            table_name: Name of the DynamoDB table
            region: AWS region
            max_workers: Maximum number of concurrent workers.
                        If None, uses 10 (optimal for async loader based on testing).
                        Async loader doesn't benefit from matching CPU cores.
            batch_size: Number of records per batch
            max_retries: Maximum retry attempts for failed operations
        """
        # Use optimal default for async loader if not specified
        if max_workers is None:
            max_workers = DEFAULT_ASYNC_WORKERS
            logger.info(f"Using {max_workers} async workers (optimal for async loader)")
        
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
        
        # Configure boto3 with optimized connection pool
        # Connection pool size should match or exceed worker count
        self.boto_config = Config(
            max_pool_connections=max_workers + 5,  # Add buffer for overhead
            retries={'max_attempts': 0}  # Disable boto3 retries (we handle our own)
        )

    async def load_csv(self, csv_file: str) -> LoadResult:
        """Load CSV file into DynamoDB with shuffling and parallel processing.

        This method:
        1. Reads all records from the CSV file
        2. Shuffles the records to prevent hot partitions
        3. Splits records into batches
        4. Processes batches concurrently using async workers
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

        # Process batches concurrently with worker pool
        successful_writes = 0
        failed_writes = 0
        errors = []

        # Use async context manager for proper resource cleanup
        # aioboto3 handles connection pooling and cleanup automatically
        async with aioboto3.Session().resource(
            "dynamodb", 
            region_name=self.config.region,
            config=self.boto_config
        ) as dynamodb:
            table = await dynamodb.Table(self.config.table_name)

            # Semaphore limits concurrent operations
            # This implements the worker pool pattern for controlled parallelism
            semaphore = asyncio.Semaphore(self.config.max_workers)

            async def process_batch_with_semaphore(
                batch_id: int, batch: list[dict[str, Any]]
            ) -> BatchResult:
                """Process a batch with semaphore to limit concurrency.

                The semaphore ensures only max_workers batches are processed
                simultaneously, preventing resource exhaustion and rate limiting.
                """
                async with semaphore:
                    return await self._write_batch(table, batch_id, batch)

            # Create all tasks upfront for maximum concurrency
            # asyncio.gather() executes them concurrently, respecting semaphore limits
            tasks = [process_batch_with_semaphore(i, batch) for i, batch in enumerate(batches)]
            # return_exceptions=True prevents one failure from canceling all tasks
            batch_results = await asyncio.gather(*tasks, return_exceptions=True)

            # Aggregate results
            for result in batch_results:
                if isinstance(result, Exception):
                    # Handle exceptions from gather
                    error_msg = f"Batch processing failed: {result}"
                    logger.error(error_msg)
                    errors.append(error_msg)
                    failed_writes += self.config.batch_size
                elif isinstance(result, BatchResult):
                    if result.successful:
                        successful_writes += result.items_count
                    else:
                        failed_writes += result.items_count
                        if result.error:
                            errors.append(result.error)

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

    async def _write_batch(
        self, table: Any, batch_id: int, items: list[dict[str, Any]]
    ) -> BatchResult:
        """Write a batch of items to DynamoDB with retry logic.

        Uses the retry handler to implement exponential backoff with jitter.
        This handles transient errors (throttling, network issues) gracefully
        while failing fast on permanent errors (validation, permissions).

        Args:
            table: aioboto3 DynamoDB table resource
            batch_id: Identifier for this batch
            items: List of items to write

        Returns:
            BatchResult with operation status
        """
        retry_count = 0

        async def write_operation() -> None:
            """Actual write operation to be retried.

            Uses batch_writer for efficient batch writes with automatic
            retry of unprocessed items within the batch.
            """
            nonlocal retry_count

            # batch_writer automatically handles:
            # - Batching items into groups of 25 (DynamoDB limit)
            # - Retrying unprocessed items from partial failures
            # - Efficient connection reuse
            async with table.batch_writer() as batch:
                for item in items:
                    await batch.put_item(Item=item)

        try:
            # Delegate retry logic to RetryHandler
            # This implements exponential backoff: delay = base_delay * (2^attempt) + jitter
            await self.retry_handler.retry_async(write_operation)

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
