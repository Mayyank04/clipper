"""
ViralClip Studio — Caption Preset Importer Exceptions
"""

class PresetImportError(Exception):
    """Base exception for all preset importer operations."""
    def __init__(self, message: str, stage: str = "UNKNOWN", error_code: str = "ERR_GENERIC", details: dict = None, suggested_action: str = None):
        super().__init__(message)
        self.message = message
        self.stage = stage
        self.error_code = error_code
        self.details = details or {}
        self.suggested_action = suggested_action or "Review file format and retry import."

class FormatDetectionError(PresetImportError):
    def __init__(self, message: str, details: dict = None):
        super().__init__(message, stage="FORMAT_DETECTION", error_code="ERR_UNKNOWN_FORMAT", details=details, suggested_action="Ensure file is valid XML, JSON, or supported font format.")

class SecurityValidationError(PresetImportError):
    def __init__(self, message: str, details: dict = None):
        super().__init__(message, stage="SECURITY_VALIDATION", error_code="ERR_SECURITY_VIOLATION", details=details, suggested_action="Remove untrusted external references, path traversals, or oversized payloads.")

class ParsingError(PresetImportError):
    def __init__(self, message: str, details: dict = None):
        super().__init__(message, stage="PARSING", error_code="ERR_PARSE_FAILED", details=details, suggested_action="Inspect the XML/JSON syntax for syntax errors or incomplete tags.")

class ConversionError(PresetImportError):
    def __init__(self, message: str, details: dict = None):
        super().__init__(message, stage="CONVERSION", error_code="ERR_CONVERSION_FAILED", details=details, suggested_action="Check preset animation properties and layer hierarchy.")

class ValidationError(PresetImportError):
    def __init__(self, message: str, details: dict = None):
        super().__init__(message, stage="VALIDATION", error_code="ERR_VALIDATION_FAILED", details=details, suggested_action="Verify font size, color hex values, and position ranges.")
