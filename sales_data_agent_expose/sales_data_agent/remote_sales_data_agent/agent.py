import os
from google.adk.agents import LlmAgent
from google.adk.models.google_llm import Gemini
from google.adk.tools.agent_tool import AgentTool
import logging
from toolbox_core import ToolboxSyncClient
from google.genai.types import GenerateContentConfig

from google.adk.a2a.utils.agent_to_a2a import to_a2a

from .config import GEMINI_MODEL_FLASH, retry_config
from .tools import normalize_user_query_guardrail

logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
from dotenv import load_dotenv
load_dotenv()

# os.environ['GOOGLE_CLOUD_PROJECT'] = os.getenv('GOOGLE_CLOUD_PROJECT')
# os.environ['GOOGLE_CLOUD_LOCATION'] = os.getenv('GOOGLE_CLOUD_LOCATION')
# os.environ['GOOGLE_GENAI_USE_VERTEXAI'] = os.getenv('GOOGLE_GENAI_USE_VERTEXAI','true')

# Initialize Toolbox client
TOOLBOX_URL = os.getenv("TOOLBOX_URL", "http://127.0.0.1:5000")

toolbox = ToolboxSyncClient(TOOLBOX_URL)

tools = toolbox.load_toolset('logistics_operations')

root_agent = LlmAgent(
    model=Gemini(
        model=GEMINI_MODEL_FLASH,
        retry_options=retry_config
    ),
    name='root_agent',
    description='A helpful assistant for user questions.',
    instruction='Answer user questions to the best of your knowledge.',
    tools=tools,
    before_model_callback=normalize_user_query_guardrail,
    generate_content_config=GenerateContentConfig(
        temperature=0.1
    )
)

current_dir = os.path.dirname(os.path.abspath(__file__))
agent_card_path = os.path.join(current_dir, 'agent.json')

# Make the agent A2A-compatible
a2a_app = to_a2a(
                root_agent, 
                port=8001,
                agent_card=agent_card_path
                 )