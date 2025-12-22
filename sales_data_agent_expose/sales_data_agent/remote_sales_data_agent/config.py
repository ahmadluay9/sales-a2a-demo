from google.genai.types import HttpRetryOptions

GEMINI_MODEL_PRO = "gemini-3-pro-preview"
GEMINI_MODEL_FLASH = "gemini-2.5-flash"

retry_config= HttpRetryOptions(
    attempts=5,         # Maximum retry attempts
    exp_base=7,         # Delay multiplier
    initial_delay=1,    # Initial delay before first retry (in seconds)
    http_status_codes=[
        429, # Too Many Requests
        500, # Internal Server Error
        503, # Service Unavailable
        504, # Gateway Timeout
        ] # Retry on these HTTP errors
)