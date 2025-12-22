import os

from google.adk.agents.llm_agent import LlmAgent
from google.adk.agents.remote_a2a_agent import AGENT_CARD_WELL_KNOWN_PATH
from google.adk.agents.remote_a2a_agent import RemoteA2aAgent
from google.adk.tools import VertexAiSearchTool
from google.adk.tools.agent_tool import AgentTool
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

vertexai_search_tool = VertexAiSearchTool(
    data_store_id=f"projects/{os.getenv('GOOGLE_CLOUD_PROJECT')}/locations/global/collections/default_collection/dataStores/{os.getenv('DATASTORE_ID')}",
    max_results=5
)

vertexai_search_agent = LlmAgent(
    model=Gemini(
        model=GEMINI_MODEL_FLASH,
        retry_options=retry_config
    ),
    name='vertexai_search_agent',
    description='A helpful assistant for answering questions based on documents retrieved from Vertex AI Search.',
    instruction='Use the tool to answer user questions based on the retrieved documents.',
    tools=[vertexai_search_tool],
    generate_content_config=GenerateContentConfig(
        temperature=0.1
    )
)

rag_tool = AgentTool(agent=vertexai_search_agent, skip_summarization=False)

rag_agent = LlmAgent(
    model=Gemini(
        model=GEMINI_MODEL_FLASH,
        retry_options=retry_config
    ),
    name='sales_rag_agent_with_search',
    description='A helpful assistant for answering sales-related questions using retrieved documents.',
    instruction='Use the provided documents to answer user questions about sales data.',
    tools=[rag_tool]
)

root_agent = LlmAgent(
    model=Gemini(
        model=GEMINI_MODEL_FLASH,
        retry_options=retry_config
    ),
    name='sales_a2a_agent',
    description='A helpful assistant for user questions.',
    instruction='Answer user questions to the best of your knowledge.',
    sub_agents=[sales_agent, rag_agent],
    before_model_callback=normalize_user_query_guardrail,
    generate_content_config=GenerateContentConfig(
        temperature=0.1
    )
)