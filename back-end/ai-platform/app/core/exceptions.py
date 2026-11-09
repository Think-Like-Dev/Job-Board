from __future__ import annotations


class AppError(Exception):
    """Base class for expected application failures."""

    status_code: int = 400
    code: str = "app_error"

    def __init__(self, message: str) -> None:
        self.message = message
        super().__init__(message)


class ConfigurationError(AppError):
    status_code = 500
    code = "configuration_error"


class UnsupportedFileType(AppError):
    status_code = 415
    code = "unsupported_file_type"


class DocumentTooLarge(AppError):
    status_code = 413
    code = "document_too_large"


class UnreadableDocument(AppError):
    status_code = 422
    code = "unreadable_document"


class ResumeNotFound(AppError):
    status_code = 404
    code = "resume_not_found"


class ProviderNotFound(AppError):
    status_code = 404
    code = "provider_not_found"


class CredentialNotFound(AppError):
    status_code = 404
    code = "credential_not_found"


class UnsupportedProvider(AppError):
    status_code = 501
    code = "unsupported_provider"


class NoActiveProvider(AppError):
    status_code = 503
    code = "no_active_provider"


class AllProvidersExhausted(AppError):
    status_code = 502
    code = "all_providers_exhausted"
