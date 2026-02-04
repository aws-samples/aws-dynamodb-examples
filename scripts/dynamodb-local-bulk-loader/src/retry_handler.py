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
"""Retry handler with exponential backoff and jitter."""

import asyncio
import logging
import random
from typing import Any, Callable, TypeVar

logger = logging.getLogger(__name__)

T = TypeVar('T')


class RetryHandler:
    """Handles retry logic with exponential backoff and jitter."""

    def __init__(
        self,
        max_retries: int = 3,
        base_delay: float = 0.1,
        max_delay: float = 10.0
    ):
        """Initialize retry handler with backoff parameters.

        Args:
            max_retries: Maximum number of retry attempts
            base_delay: Base delay in seconds for exponential backoff
            max_delay: Maximum delay in seconds
        """
        self.max_retries = max_retries
        self.base_delay = base_delay
        self.max_delay = max_delay

    def calculate_delay(self, attempt: int) -> float:
        """Calculate delay with exponential backoff and jitter.

        Exponential backoff increases delay exponentially with each retry attempt,
        reducing load on the system during high error rates.
        
        Jitter adds randomness to prevent thundering herd problem where many
        clients retry simultaneously after the same delay.

        Formula: min(base_delay * (2 ** attempt) + jitter, max_delay)
        where jitter is a random value between 0 and 1.

        Example delays with base_delay=0.1, max_delay=10.0:
        - Attempt 0: 0.1 * 2^0 + jitter = 0.1-1.1s
        - Attempt 1: 0.1 * 2^1 + jitter = 0.2-1.2s
        - Attempt 2: 0.1 * 2^2 + jitter = 0.4-1.4s
        - Attempt 3: 0.1 * 2^3 + jitter = 0.8-1.8s
        - Attempt 4: 0.1 * 2^4 + jitter = 1.6-2.6s
        - Attempt 5+: Capped at max_delay = 10.0s

        Args:
            attempt: Current attempt number (0-indexed)

        Returns:
            Delay in seconds
        """
        exponential_delay = self.base_delay * (2 ** attempt)
        jitter = random.uniform(0, 1)
        delay = min(exponential_delay + jitter, self.max_delay)
        return delay

    async def retry_async(
        self,
        func: Callable[..., Any],
        *args: Any,
        **kwargs: Any
    ) -> Any:
        """Retry async function with exponential backoff.

        Args:
            func: Async function to retry
            *args: Positional arguments for func
            **kwargs: Keyword arguments for func

        Returns:
            Result from successful function call

        Raises:
            Exception: The last exception if all retries are exhausted
        """
        last_exception = None

        for attempt in range(self.max_retries + 1):
            try:
                return await func(*args, **kwargs)
            except Exception as e:
                last_exception = e

                if attempt < self.max_retries:
                    delay = self.calculate_delay(attempt)
                    logger.warning(
                        f"Attempt {attempt + 1}/{self.max_retries + 1} failed: {e}. "
                        f"Retrying in {delay:.2f}s..."
                    )
                    await asyncio.sleep(delay)
                else:
                    logger.error(
                        f"All {self.max_retries + 1} attempts failed. Last error: {e}"
                    )

        # This should never be None due to the loop logic, but for type safety
        if last_exception:
            raise last_exception
        raise RuntimeError("Retry logic failed unexpectedly")

    def retry_sync(
        self,
        func: Callable[..., T],
        *args: Any,
        **kwargs: Any
    ) -> T:
        """Retry sync function with exponential backoff.

        Args:
            func: Synchronous function to retry
            *args: Positional arguments for func
            **kwargs: Keyword arguments for func

        Returns:
            Result from successful function call

        Raises:
            Exception: The last exception if all retries are exhausted
        """
        import time

        last_exception = None

        for attempt in range(self.max_retries + 1):
            try:
                return func(*args, **kwargs)
            except Exception as e:
                last_exception = e

                if attempt < self.max_retries:
                    delay = self.calculate_delay(attempt)
                    logger.warning(
                        f"Attempt {attempt + 1}/{self.max_retries + 1} failed: {e}. "
                        f"Retrying in {delay:.2f}s..."
                    )
                    time.sleep(delay)
                else:
                    logger.error(
                        f"All {self.max_retries + 1} attempts failed. Last error: {e}"
                    )

        # This should never be None due to the loop logic, but for type safety
        if last_exception:
            raise last_exception
        raise RuntimeError("Retry logic failed unexpectedly")
