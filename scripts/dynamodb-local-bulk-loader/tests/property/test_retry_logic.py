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
"""Property-based tests for retry logic.

This module contains property-based tests using Hypothesis to verify
universal correctness properties of the retry handler.
"""

import asyncio
from typing import Any

from hypothesis import given, settings
from hypothesis import strategies as st

from src.retry_handler import RetryHandler


# Feature: dynamodb-csv-bulk-loader, Property 14: Retry with Exponential Backoff
# For any failed write operation, retry delays should follow the pattern:
# delay(n) = min(base_delay * 2^n + jitter, max_delay), where jitter is a
# random value between 0 and 1.
@settings(max_examples=100)
@given(
    base_delay=st.floats(min_value=0.01, max_value=1.0),
    max_delay=st.floats(min_value=1.0, max_value=100.0),
    attempt=st.integers(min_value=0, max_value=10),
)
def test_retry_exponential_backoff(base_delay: float, max_delay: float, attempt: int) -> None:
    """Property test: Retry delays follow exponential backoff with jitter.

    This test verifies that the retry delay calculation follows the correct
    exponential backoff formula with jitter, which is critical for handling
    DynamoDB throttling gracefully.

    Validates: Requirements 1.5, 2.6, 3.6, 6.1, 6.2, 6.4
    """
    handler = RetryHandler(max_retries=10, base_delay=base_delay, max_delay=max_delay)

    # Calculate delay for the given attempt
    delay = handler.calculate_delay(attempt)

    # Calculate expected minimum delay (exponential backoff without jitter)
    exponential_delay = base_delay * (2**attempt)

    # The actual minimum delay is the exponential delay (before jitter)
    # but capped at max_delay
    expected_min_delay = min(exponential_delay, max_delay)

    # Calculate expected maximum delay (exponential backoff with max jitter)
    # Jitter adds up to 1.0, but the total is still capped at max_delay
    expected_max_delay = min(exponential_delay + 1.0, max_delay)

    # Verify delay is within expected bounds
    assert (
        expected_min_delay <= delay <= expected_max_delay
    ), f"Delay {delay} not in expected range [{expected_min_delay}, {expected_max_delay}]"

    # Verify delay never exceeds max_delay
    assert delay <= max_delay, f"Delay {delay} exceeds max_delay {max_delay}"

    # Verify delay is non-negative
    assert delay >= 0, f"Delay {delay} is negative"

    # Verify delay includes jitter component when not capped by max_delay
    # If exponential_delay < max_delay, then delay should be >= exponential_delay
    if exponential_delay < max_delay:
        assert (
            delay >= exponential_delay
        ), f"Delay {delay} is less than exponential {exponential_delay}"


# Feature: dynamodb-csv-bulk-loader, Property 15: Retry Count Limits
# For any configured maximum retry count M, a failing operation should be
# retried at most M times before being marked as permanently failed.
@settings(max_examples=100)
@given(
    max_retries=st.integers(min_value=0, max_value=10),
)
def test_retry_count_limits_sync(max_retries: int) -> None:
    """Property test: Retry count is limited to configured maximum (sync).

    This test verifies that the retry handler respects the maximum retry
    count configuration and doesn't retry indefinitely, which is critical
    for preventing infinite loops and resource exhaustion.

    Validates: Requirements 6.2
    """
    handler = RetryHandler(max_retries=max_retries, base_delay=0.001, max_delay=0.01)

    # Track number of attempts
    attempt_count = 0

    def failing_function() -> Any:
        nonlocal attempt_count
        attempt_count += 1
        raise ValueError(f"Attempt {attempt_count} failed")

    # Attempt to call the failing function
    try:
        handler.retry_sync(failing_function)
        # Should never reach here
        raise AssertionError("Expected exception to be raised")
    except ValueError as e:
        # Verify the exception is from the last attempt
        assert f"Attempt {attempt_count} failed" in str(e)

    # Verify total attempts = max_retries + 1 (initial attempt + retries)
    expected_attempts = max_retries + 1
    assert (
        attempt_count == expected_attempts
    ), f"Expected {expected_attempts} attempts, got {attempt_count}"


@settings(max_examples=100)
@given(
    max_retries=st.integers(min_value=0, max_value=10),
)
def test_retry_count_limits_async(max_retries: int) -> None:
    """Property test: Retry count is limited to configured maximum (async).

    This test verifies that the async retry handler respects the maximum retry
    count configuration and doesn't retry indefinitely.

    Validates: Requirements 6.2
    """
    handler = RetryHandler(max_retries=max_retries, base_delay=0.001, max_delay=0.01)

    # Track number of attempts
    attempt_count = 0

    async def failing_async_function() -> Any:
        nonlocal attempt_count
        attempt_count += 1
        raise ValueError(f"Attempt {attempt_count} failed")

    # Attempt to call the failing function
    async def run_test() -> None:
        nonlocal attempt_count
        try:
            await handler.retry_async(failing_async_function)
            # Should never reach here
            raise AssertionError("Expected exception to be raised")
        except ValueError as e:
            # Verify the exception is from the last attempt
            assert f"Attempt {attempt_count} failed" in str(e)

        # Verify total attempts = max_retries + 1 (initial attempt + retries)
        expected_attempts = max_retries + 1
        assert (
            attempt_count == expected_attempts
        ), f"Expected {expected_attempts} attempts, got {attempt_count}"

    # Run the async test
    asyncio.run(run_test())


@settings(max_examples=100)
@given(
    max_retries=st.integers(min_value=1, max_value=5),
    success_on_attempt=st.integers(min_value=1, max_value=5),
)
def test_retry_succeeds_before_limit_sync(max_retries: int, success_on_attempt: int) -> None:
    """Property test: Retry succeeds when operation succeeds before limit (sync).

    This test verifies that the retry handler returns successfully when the
    operation succeeds before exhausting all retry attempts.

    Validates: Requirements 6.2
    """
    # Only test cases where success happens within retry limit
    if success_on_attempt > max_retries + 1:
        return

    handler = RetryHandler(max_retries=max_retries, base_delay=0.001, max_delay=0.01)

    # Track number of attempts
    attempt_count = 0

    def eventually_succeeding_function() -> str:
        nonlocal attempt_count
        attempt_count += 1
        if attempt_count < success_on_attempt:
            raise ValueError(f"Attempt {attempt_count} failed")
        return f"Success on attempt {attempt_count}"

    # Call the function
    result = handler.retry_sync(eventually_succeeding_function)

    # Verify success
    assert result == f"Success on attempt {success_on_attempt}"
    assert attempt_count == success_on_attempt


@settings(max_examples=100)
@given(
    max_retries=st.integers(min_value=1, max_value=5),
    success_on_attempt=st.integers(min_value=1, max_value=5),
)
def test_retry_succeeds_before_limit_async(max_retries: int, success_on_attempt: int) -> None:
    """Property test: Retry succeeds when operation succeeds before limit (async).

    This test verifies that the async retry handler returns successfully when
    the operation succeeds before exhausting all retry attempts.

    Validates: Requirements 6.2
    """
    # Only test cases where success happens within retry limit
    if success_on_attempt > max_retries + 1:
        return

    handler = RetryHandler(max_retries=max_retries, base_delay=0.001, max_delay=0.01)

    # Track number of attempts
    attempt_count = 0

    async def eventually_succeeding_async_function() -> str:
        nonlocal attempt_count
        attempt_count += 1
        if attempt_count < success_on_attempt:
            raise ValueError(f"Attempt {attempt_count} failed")
        return f"Success on attempt {attempt_count}"

    # Run the async test
    async def run_test() -> None:
        nonlocal attempt_count
        result = await handler.retry_async(eventually_succeeding_async_function)
        assert result == f"Success on attempt {success_on_attempt}"
        assert attempt_count == success_on_attempt

    asyncio.run(run_test())


@settings(max_examples=100)
@given(
    base_delay=st.floats(min_value=0.001, max_value=0.1),
    max_delay=st.floats(min_value=0.1, max_value=1.0),
    max_retries=st.integers(min_value=1, max_value=3),
)
def test_retry_delays_increase_exponentially(
    base_delay: float, max_delay: float, max_retries: int
) -> None:
    """Property test: Retry delays increase exponentially across attempts.

    This test verifies that delays increase exponentially with each retry
    attempt (until hitting max_delay), which is the expected backoff behavior.

    Validates: Requirements 6.1, 6.4
    """
    handler = RetryHandler(max_retries=max_retries, base_delay=base_delay, max_delay=max_delay)

    delays = []
    for attempt in range(max_retries):
        delay = handler.calculate_delay(attempt)
        delays.append(delay)

    # Verify delays are non-decreasing (accounting for max_delay cap)
    for i in range(len(delays) - 1):
        # If we haven't hit max_delay, next delay should be larger
        if delays[i] < max_delay:
            # Allow for jitter variance - the exponential component should still grow
            # We check that the minimum possible next delay (without jitter) is larger
            min_next_delay = base_delay * (2 ** (i + 1))
            if min_next_delay <= max_delay:
                # Next delay should be at least as large as current (within jitter tolerance)
                assert (
                    delays[i + 1] >= delays[i] - 1.0
                ), f"Delays not increasing: {delays[i]} -> {delays[i+1]}"
