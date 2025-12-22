from google.adk.agents.callback_context import CallbackContext
from google.adk.models import LlmResponse, LlmRequest
from typing import Optional
from google.genai.types import Part
from google import genai

def normalize_user_query_guardrail(
    callback_context: CallbackContext, llm_request: LlmRequest
) -> Optional[LlmResponse]:
    """Inspects/modifies the LLM request or skips the call."""
    agent_name = callback_context.agent_name
    print(f"[Callback] Before model call for agent: {agent_name}")

    # Inspect the last user message in the request contents
    last_user_message = ""
    if llm_request.contents and llm_request.contents[-1].role == 'user':
         if llm_request.contents[-1].parts:
            last_user_message = llm_request.contents[-1].parts[0].text
    print(f"[Callback] Inspecting last user message: '{last_user_message}'")

    if not last_user_message:
        return None

    # Fix typos and expand acronyms in the last user message
    client = genai.Client()
    response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=[
                Part.from_text(
                    text=f"""Please normalize the following user query by fixing typos.

                    Examples:
                    - "srend" should become "send"                 

                    User query: "{last_user_message}"

                    If no normalization is needed, just return the original user query.

                    Normalized query:"""
                ),
            ],
        )

    if response and response.text:
        normalized_message = response.text.strip()
        print(f"[Callback] Normalized user message to: '{normalized_message}'")
        # Modify the llm_request with the normalized message
        if llm_request.contents and llm_request.contents[-1].role == 'user':
            if llm_request.contents[-1].parts:
                llm_request.contents[-1].parts[0].text = normalized_message
    else:
        print("[Callback] Normalization failed or produced no output.")

    return None