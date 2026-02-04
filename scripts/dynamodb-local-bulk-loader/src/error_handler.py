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
"""Error handling and categorization for DynamoDB operations."""

import logging
from enum import Enum
from typing import Any

from botocore.exceptions import ClientError

logger = logging.getLogger(__name__)


class ErrorAction(Enum):
    """Actions to take based on error type."""

    RETRY_WITH_BACKOFF = "retry_with_backoff"
    FAIL_IMMEDIATELY = "fail_immediately"
    FAIL_AFTER_RETRIES = "fail_after_retries"


def is_permanent_error(error: Exception) -> bool:
    """Check if an error is permanent and should not be retried.

    Permanent errors include:
    - ValidationException: Invalid data format
    - ResourceNotFoundException: Table doesn't exist
    - AccessDeniedException: Insufficient permissions
    - Invalid configuration errors

    Args:
        error: Exception to check

    Returns:
        True if error is permanent, False otherwise
    """
    if isinstance(error, ClientError):
        error_code = error.response.get("Error", {}).get("Code", "")

        permanent_error_codes = {
            "ValidationException",
            "ResourceNotFoundException",
            "AccessDeniedException",
            "UnrecognizedClientException",
            "InvalidParameterException",
            "InvalidParameterValueException",
            "InvalidParameterCombination",
            "MissingParameter",
            "ItemCollectionSizeLimitExceededException",
            "ConditionalCheckFailedException",
        }

        return error_code in permanent_error_codes

    # Configuration errors are also permanent
    if isinstance(error, (ValueError, TypeError, AttributeError)):
        return True

    return False


def is_throttling_error(error: Exception) -> bool:
    """Check if an error is due to throttling.

    Throttling errors include:
    - ProvisionedThroughputExceededException: DynamoDB throttling
    - ThrottlingException: General AWS throttling
    - RequestLimitExceeded: Rate limit exceeded

    Args:
        error: Exception to check

    Returns:
        True if error is throttling-related, False otherwise
    """
    if isinstance(error, ClientError):
        error_code = error.response.get("Error", {}).get("Code", "")

        throttling_error_codes = {
            "ProvisionedThroughputExceededException",
            "ThrottlingException",
            "RequestLimitExceeded",
            "TooManyRequestsException",
        }

        return error_code in throttling_error_codes

    return False


def is_transient_error(error: Exception) -> bool:
    """Check if an error is transient and can be retried.

    Transient errors include:
    - ServiceUnavailable: Temporary service issues
    - InternalServerError: AWS internal errors
    - Network timeouts and connection errors

    Args:
        error: Exception to check

    Returns:
        True if error is transient, False otherwise
    """
    if isinstance(error, ClientError):
        error_code = error.response.get("Error", {}).get("Code", "")

        transient_error_codes = {
            "ServiceUnavailable",
            "InternalServerError",
            "InternalFailure",
            "ServiceException",
            "RequestTimeout",
        }

        return error_code in transient_error_codes

    # Network-related errors are transient
    if isinstance(
        error,
        (
            ConnectionError,
            TimeoutError,
            OSError,
        ),
    ):
        return True

    return False


def handle_error(error: Exception, attempt: int, max_retries: int) -> ErrorAction:
    """Determine action based on error type and attempt count.

    Decision logic:
    1. If error is permanent -> FAIL_IMMEDIATELY
    2. If max retries reached -> FAIL_AFTER_RETRIES
    3. If error is throttling -> RETRY_WITH_BACKOFF
    4. If error is transient -> RETRY_WITH_BACKOFF
    5. Otherwise -> FAIL_IMMEDIATELY

    Args:
        error: Exception that occurred
        attempt: Current attempt number (0-indexed)
        max_retries: Maximum number of retries allowed

    Returns:
        ErrorAction indicating what to do next
    """
    # Check for permanent errors first
    if is_permanent_error(error):
        logger.error(f"Permanent error detected: {error}")
        return ErrorAction.FAIL_IMMEDIATELY

    # Check if we've exhausted retries
    if attempt >= max_retries:
        logger.error(f"Max retries ({max_retries}) reached for error: {error}")
        return ErrorAction.FAIL_AFTER_RETRIES

    # Check for throttling errors
    if is_throttling_error(error):
        logger.warning(f"Throttling error detected (attempt {attempt + 1}): {error}")
        return ErrorAction.RETRY_WITH_BACKOFF

    # Check for transient errors
    if is_transient_error(error):
        logger.warning(f"Transient error detected (attempt {attempt + 1}): {error}")
        return ErrorAction.RETRY_WITH_BACKOFF

    # Unknown error type - fail immediately to be safe
    logger.error(f"Unknown error type, failing immediately: {error}")
    return ErrorAction.FAIL_IMMEDIATELY


def log_error_details(error: Exception, context: dict[str, Any]) -> None:
    """Log detailed error information for troubleshooting.

    Args:
        error: Exception that occurred
        context: Additional context information (batch_id, operation, etc.)
    """
    error_type = type(error).__name__
    error_msg = str(error)

    log_data = {
        "error_type": error_type,
        "error_message": error_msg,
        **context,
    }

    if isinstance(error, ClientError):
        error_code = error.response.get("Error", {}).get("Code", "Unknown")
        error_message = error.response.get("Error", {}).get("Message", "")
        request_id = error.response.get("ResponseMetadata", {}).get("RequestId", "")

        log_data.update(
            {
                "aws_error_code": error_code,
                "aws_error_message": error_message,
                "aws_request_id": request_id,
            }
        )

    logger.error(f"Error details: {log_data}")
