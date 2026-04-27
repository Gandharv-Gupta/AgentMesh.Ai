from pydantic import BaseModel


class ToolRequest(BaseModel):
    name: str
    description: str
    tool_type: str = "code"  # "code" or "llm"
    code: str = ""  # Python expression, used when tool_type="code"
    prompt_template: str = ""  # Prompt template with {query}, used when tool_type="llm"


class StateRequest(BaseModel):
    fields: dict  # {"field_name": "type_name"} e.g. {"context": "str", "score": "int"}


class AgentRequest(BaseModel):
    name: str
    description: str
    tool_names: list[str] = []


class NodeRequest(BaseModel):
    name: str
    agent_name: str | None = None
    func_code: str | None = None  # Python expression for a function


class EdgeRequest(BaseModel):
    from_node: str
    to_node: str


class ConditionalEdgeRequest(BaseModel):
    from_node: str
    router_code: str  # Python expression for router function
    destination_map: dict  # {"key": "node_name"}


class GraphRequest(BaseModel):
    name: str
    state_fields: dict = {}


class EntryRequest(BaseModel):
    node_name: str


class RunRequest(BaseModel):
    user_input: str


class TelegramConnectRequest(BaseModel):
    graph_name: str
