import os

from google.adk.agents.llm_agent import LlmAgent
from google.adk.agents.remote_a2a_agent import AGENT_CARD_WELL_KNOWN_PATH
from google.adk.agents.remote_a2a_agent import RemoteA2aAgent
from google.adk.models.google_llm import Gemini

from google.genai.types import GenerateContentConfig

from .config import GEMINI_MODEL_FLASH, retry_config
from .tools import normalize_user_query_guardrail

os.environ['GOOGLE_CLOUD_PROJECT'] = os.getenv('GOOGLE_CLOUD_PROJECT')
os.environ['GOOGLE_CLOUD_LOCATION'] = os.getenv('GOOGLE_CLOUD_LOCATION')
os.environ['GOOGLE_GENAI_USE_VERTEXAI'] = os.getenv('GOOGLE_GENAI_USE_VERTEXAI','true')

REMOTE_AGENT_URL = os.getenv('REMOTE_AGENT_URL','http://localhost:8001')

sales_agent = RemoteA2aAgent(
    name="sales_data_agent",
    description=(
        "This agent acts as a remote proxy to the Sales Data Agent, which provides sales-related data and insights via an A2A server."
    ),
    agent_card=f"{REMOTE_AGENT_URL}{AGENT_CARD_WELL_KNOWN_PATH}",
)

root_agent = LlmAgent(
    model=Gemini(
        model=GEMINI_MODEL_FLASH,
        retry_options=retry_config
    ),
    name='sales_a2a_agent',
    description='A helpful assistant for user questions.',
    instruction='Answer user questions to the best of your knowledge.',
    sub_agents=[sales_agent],
    before_model_callback=normalize_user_query_guardrail,
    generate_content_config=GenerateContentConfig(
        temperature=0.1
    )
)