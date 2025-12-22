import os
from google.adk.agents.remote_a2a_agent import AGENT_CARD_WELL_KNOWN_PATH
from google.adk.agents.remote_a2a_agent import RemoteA2aAgent

os.environ['GOOGLE_CLOUD_PROJECT'] = os.getenv('GOOGLE_CLOUD_PROJECT')
os.environ['GOOGLE_CLOUD_LOCATION'] = os.getenv('GOOGLE_CLOUD_LOCATION')
os.environ['GOOGLE_GENAI_USE_VERTEXAI'] = os.getenv('GOOGLE_GENAI_USE_VERTEXAI','true')

remote_url = os.getenv("REMOTE_AGENT_URL", "http://localhost:8001")

root_agent = RemoteA2aAgent(
    name="sales_data_agent",
    description=(
        "This agent acts as a remote proxy to the Sales Data Agent, which provides sales-related data and insights via an A2A server."
    ),
    agent_card=f"{remote_url}{AGENT_CARD_WELL_KNOWN_PATH}",
)