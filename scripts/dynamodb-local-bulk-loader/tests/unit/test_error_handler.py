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
"""Unit tests for error handling and categorization."""

import pytest
from botocore.exceptions import ClientError

from src.error_handler import (
    ErrorAction,
    handle_error,
    is_permanent_error,
    is_throttling_error,
    is_transient_error,
    log_error_details,
)


def create_client_error(error_code: str, message: str = "Test error") -> ClientError:
    """Helper to create a ClientError with specified error code."""
    return ClientError(
        {"Error": {"Code": error_code, "Message": message}}, "test_operation"
    )


class TestIsPermanentError:
    """Test permanent error categorization."""

    def test_validation_exception_is_permanent(self) -> None:
        """Test that ValidationException is categorized as permanent."""
        error = create_client_error("ValidationException")
        assert is_permanent_error(error) is True

    def test_resource_not_found_is_permanent(self) -> None:
        """Test that ResourceNotFoundException is categorized as permanent."""
        error = create_client_error("ResourceNotFoundException")
        assert is_permanent_error(error) is True

    def test_access_denied_is_permanent(self) -> None:
        """Test that AccessDeniedException is categorized as permanent."""
        error = create_client_error("AccessDeniedException")
        assert is_permanent_error(error) is True

    def test_unrecognized_client_is_permanent(self) -> None:
        """Test that UnrecognizedClientException is categorized as permanent."""
        error = create_client_error("UnrecognizedClientException")
        assert is_permanent_error(error) is True

    def test_invalid_parameter_is_permanent(self) -> None:
        """Test that InvalidParameterException is categorized as permanent."""
        error = create_client_error("InvalidParameterException")
        assert is_permanent_error(error) is True

    def test_conditional_check_failed_is_permanent(self) -> None:
        """Test that ConditionalCheckFailedException is categorized as permanent."""
        error = create_client_error("ConditionalCheckFailedException")
        assert is_permanent_error(error) is True

    def test_value_error_is_permanent(self) -> None:
        """Test that ValueError is categorized as permanent."""
        error = ValueError("Invalid configuration")
        assert is_permanent_error(error) is True

    def test_type_error_is_permanent(self) -> None:
        """Test that TypeError is categorized as permanent."""
        error = TypeError("Invalid type")
        assert is_permanent_error(error) is True

    def test_throttling_error_is_not_permanent(self) -> None:
        """Test that throttling errors are not categorized as permanent."""
        error = create_client_error("ProvisionedThroughputExceededException")
        assert is_permanent_error(error) is False

    def test_transient_error_is_not_permanent(self) -> None:
        """Test that transient errors are not categorized as permanent."""
        error = create_client_error("ServiceUnavailable")
        assert is_permanent_error(error) is False


class TestIsThrottlingError:
    """Test throttling error categorization."""

    def test_provisioned_throughput_exceeded_is_throttling(self) -> None:
        """Test that ProvisionedThroughputExceededException is categorized as throttling."""
        error = create_client_error("ProvisionedThroughputExceededException")
        assert is_throttling_error(error) is True

    def test_throttling_exception_is_throttling(self) -> None:
        """Test that ThrottlingException is categorized as throttling."""
        error = create_client_error("ThrottlingException")
        assert is_throttling_error(error) is True

    def test_request_limit_exceeded_is_throttling(self) -> None:
        """Test that RequestLimitExceeded is categorized as throttling."""
        error = create_client_error("RequestLimitExceeded")
        assert is_throttling_error(error) is True

    def test_too_many_requests_is_throttling(self) -> None:
        """Test that TooManyRequestsException is categorized as throttling."""
        error = create_client_error("TooManyRequestsException")
        assert is_throttling_error(error) is True

    def test_permanent_error_is_not_throttling(self) -> None:
        """Test that permanent errors are not categorized as throttling."""
        error = create_client_error("ValidationException")
        assert is_throttling_error(error) is False

    def test_transient_error_is_not_throttling(self) -> None:
        """Test that transient errors are not categorized as throttling."""
        error = create_client_error("ServiceUnavailable")
        assert is_throttling_error(error) is False

    def test_non_client_error_is_not_throttling(self) -> None:
        """Test that non-ClientError exceptions are not categorized as throttling."""
        error = ValueError("Test error")
        assert is_throttling_error(error) is False


class TestIsTransientError:
    """Test transient error categorization."""

    def test_service_unavailable_is_transient(self) -> None:
        """Test that ServiceUnavailable is categorized as transient."""
        error = create_client_error("ServiceUnavailable")
        assert is_transient_error(error) is True

    def test_internal_server_error_is_transient(self) -> None:
        """Test that InternalServerError is categorized as transient."""
        error = create_client_error("InternalServerError")
        assert is_transient_error(error) is True

    def test_internal_failure_is_transient(self) -> None:
        """Test that InternalFailure is categorized as transient."""
        error = create_client_error("InternalFailure")
        assert is_transient_error(error) is True

    def test_service_exception_is_transient(self) -> None:
        """Test that ServiceException is categorized as transient."""
        error = create_client_error("ServiceException")
        assert is_transient_error(error) is True

    def test_request_timeout_is_transient(self) -> None:
        """Test that RequestTimeout is categorized as transient."""
        error = create_client_error("RequestTimeout")
        assert is_transient_error(error) is True

    def test_connection_error_is_transient(self) -> None:
        """Test that ConnectionError is categorized as transient."""
        error = ConnectionError("Connection failed")
        assert is_transient_error(error) is True

    def test_timeout_error_is_transient(self) -> None:
        """Test that TimeoutError is categorized as transient."""
        error = TimeoutError("Request timed out")
        assert is_transient_error(error) is True

    def test_os_error_is_transient(self) -> None:
        """Test that OSError is categorized as transient."""
        error = OSError("Network error")
        assert is_transient_error(error) is True

    def test_permanent_error_is_not_transient(self) -> None:
        """Test that permanent errors are not categorized as transient."""
        error = create_client_error("ValidationException")
        assert is_transient_error(error) is False

    def test_throttling_error_is_not_transient(self) -> None:
        """Test that throttling errors are not categorized as transient."""
        error = create_client_error("ProvisionedThroughputExceededException")
        assert is_transient_error(error) is False


class TestHandleError:
    """Test error action determination."""

    def test_permanent_error_fails_immediately(self) -> None:
        """Test that permanent errors result in FAIL_IMMEDIATELY action."""
        error = create_client_error("ValidationException")
        action = handle_error(error, attempt=0, max_retries=3)
        assert action == ErrorAction.FAIL_IMMEDIATELY

    def test_max_retries_reached_fails_after_retries(self) -> None:
        """Test that exhausted retries result in FAIL_AFTER_RETRIES action."""
        error = create_client_error("ServiceUnavailable")
        action = handle_error(error, attempt=3, max_retries=3)
        assert action == ErrorAction.FAIL_AFTER_RETRIES

    def test_throttling_error_retries_with_backoff(self) -> None:
        """Test that throttling errors result in RETRY_WITH_BACKOFF action."""
        error = create_client_error("ProvisionedThroughputExceededException")
        action = handle_error(error, attempt=0, max_retries=3)
        assert action == ErrorAction.RETRY_WITH_BACKOFF

    def test_transient_error_retries_with_backoff(self) -> None:
        """Test that transient errors result in RETRY_WITH_BACKOFF action."""
        error = create_client_error("ServiceUnavailable")
        action = handle_error(error, attempt=0, max_retries=3)
        assert action == ErrorAction.RETRY_WITH_BACKOFF

    def test_unknown_error_fails_immediately(self) -> None:
        """Test that unknown errors result in FAIL_IMMEDIATELY action."""
        error = create_client_error("UnknownErrorCode")
        action = handle_error(error, attempt=0, max_retries=3)
        assert action == ErrorAction.FAIL_IMMEDIATELY

    def test_permanent_error_ignores_retry_count(self) -> None:
        """Test that permanent errors fail immediately regardless of retry count."""
        error = create_client_error("AccessDeniedException")
        action = handle_error(error, attempt=0, max_retries=10)
        assert action == ErrorAction.FAIL_IMMEDIATELY

    def test_throttling_error_with_retries_remaining(self) -> None:
        """Test throttling error with retries remaining."""
        error = create_client_error("ThrottlingException")
        action = handle_error(error, attempt=1, max_retries=3)
        assert action == ErrorAction.RETRY_WITH_BACKOFF

    def test_transient_error_at_max_retries(self) -> None:
        """Test transient error at maximum retry count."""
        error = create_client_error("InternalServerError")
        action = handle_error(error, attempt=5, max_retries=5)
        assert action == ErrorAction.FAIL_AFTER_RETRIES


class TestLogErrorDetails:
    """Test error logging functionality."""

    def test_log_client_error_details(self, caplog: pytest.LogCaptureFixture) -> None:
        """Test logging of ClientError details."""
        error = create_client_error("ValidationException", "Invalid input")
        context = {"batch_id": 123, "operation": "write_batch"}

        log_error_details(error, context)

        # Verify log contains error details
        assert "ValidationException" in caplog.text
        assert "batch_id" in caplog.text
        assert "operation" in caplog.text

    def test_log_generic_error_details(self, caplog: pytest.LogCaptureFixture) -> None:
        """Test logging of generic error details."""
        error = ValueError("Invalid configuration")
        context = {"config_key": "batch_size", "config_value": -1}

        log_error_details(error, context)

        # Verify log contains error details
        assert "ValueError" in caplog.text
        assert "config_key" in caplog.text

    def test_log_includes_request_id_for_client_errors(
        self, caplog: pytest.LogCaptureFixture
    ) -> None:
        """Test that AWS request ID is logged for ClientErrors."""
        error = ClientError(
            {
                "Error": {"Code": "ServiceUnavailable", "Message": "Service down"},
                "ResponseMetadata": {"RequestId": "test-request-123"},
            },
            "test_operation",
        )
        context = {"batch_id": 456}

        log_error_details(error, context)

        # Verify request ID is logged
        assert "test-request-123" in caplog.text


class TestErrorActionEnum:
    """Test ErrorAction enum."""

    def test_error_action_values(self) -> None:
        """Test that ErrorAction enum has expected values."""
        assert ErrorAction.RETRY_WITH_BACKOFF.value == "retry_with_backoff"
        assert ErrorAction.FAIL_IMMEDIATELY.value == "fail_immediately"
        assert ErrorAction.FAIL_AFTER_RETRIES.value == "fail_after_retries"

    def test_error_action_members(self) -> None:
        """Test that ErrorAction enum has exactly three members."""
        assert len(ErrorAction) == 3
