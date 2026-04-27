from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
load_dotenv()
from main import ToolFactory, StateFactory, Agent, NodeFactory, GraphBuilder, AgentState
from langgraph.graph import END
from langchain_core.messages import HumanMessage, AIMessage
import threading, requests as http_requests, os, time

app = FastAPI(title="AgentMesh API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def parse_code(code: str):
    """Parse a lambda expression or def block into a callable."""
    code = code.strip()
    if code.startswith("def "):
        ns = {}
        exec(code, ns)
        # grab the first function defined
        fn_name = code.split("(")[0].replace("def ", "").strip()
        return ns[fn_name]
    return eval(code)

# --- In-memory stores ---
tools_store = {}
tools_meta = {}  # stores raw tool info for frontend
agents_store = {}
nodes_store = {}
graphs_store = {}


# --- Request Models ---
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


# --- Tool Endpoints ---
@app.post("/tools/create")
def create_tool(req: ToolRequest):
    if req.tool_type == "llm":
        t = ToolFactory(
            name=req.name, description=req.description,
            tool_type="llm", prompt_template=req.prompt_template
        ).create()
    else:
        func = parse_code(req.code)
        t = ToolFactory(name=req.name, description=req.description, func=func).create()
    tools_store[req.name] = t
    tools_meta[req.name] = {
        "name": req.name, "description": req.description,
        "tool_type": req.tool_type, "code": req.code,
        "prompt_template": req.prompt_template,
    }
    return {"message": f"Tool '{req.name}' created ({req.tool_type})."}


@app.get("/tools/list")
def list_tools():
    return {"tools": list(tools_store.keys())}


@app.get("/tools/{name}")
def get_tool(name: str):
    if name not in tools_meta:
        raise HTTPException(404, f"Tool '{name}' not found.")
    return tools_meta[name]


# --- Agent Endpoints ---
@app.post("/agents/create")
def create_agent(req: AgentRequest):
    agent_tools = [tools_store[t] for t in req.tool_names if t in tools_store]
    agent = Agent(name=req.name, description=req.description, tools=agent_tools or None)
    agents_store[req.name] = agent
    return {"message": f"Agent '{req.name}' created with {len(agent.tools)} tool(s)."}


@app.get("/agents/list")
def list_agents():
    return {"agents": list(agents_store.keys())}


@app.post("/agents/{name}/invoke")
def invoke_agent(name: str, req: RunRequest):
    if name not in agents_store:
        raise HTTPException(404, f"Agent '{name}' not found.")
    result = agents_store[name].invoke(req.user_input)
    messages = [m.content for m in result["messages"]]
    return {"messages": messages}


# --- Node Endpoints ---
@app.post("/nodes/create")
def create_node(req: NodeRequest):
    if req.agent_name:
        if req.agent_name not in agents_store:
            raise HTTPException(404, f"Agent '{req.agent_name}' not found.")
        node = NodeFactory(name=req.name, agent=agents_store[req.agent_name])
    elif req.func_code:
        func = parse_code(req.func_code)
        node = NodeFactory(name=req.name, func=func)
    else:
        raise HTTPException(400, "Provide either agent_name or func_code.")
    nodes_store[req.name] = node
    return {"message": f"Node '{req.name}' created."}


@app.get("/nodes/list")
def list_nodes():
    return {"nodes": list(nodes_store.keys())}


# --- Graph Endpoints ---
TYPE_MAP = {"str": str, "int": int, "float": float, "bool": bool, "list": list, "dict": dict}


@app.post("/graphs/create")
def create_graph(req: GraphRequest):
    if req.name in graphs_store:
        return {"message": f"Graph '{req.name}' already exists."}
    fields = {k: TYPE_MAP.get(v, str) for k, v in req.state_fields.items()}
    state = StateFactory(fields=fields).create() if fields else AgentState
    graph = GraphBuilder(state=state)
    graphs_store[req.name] = graph
    return {"message": f"Graph '{req.name}' created."}


@app.post("/graphs/{name}/add_node")
def graph_add_node(name: str, req: EntryRequest):
    if name not in graphs_store:
        raise HTTPException(404, f"Graph '{name}' not found.")
    if req.node_name not in nodes_store:
        raise HTTPException(404, f"Node '{req.node_name}' not found.")
    graphs_store[name].add_node(nodes_store[req.node_name])
    return {"message": f"Node '{req.node_name}' added to graph '{name}'."}


@app.post("/graphs/{name}/set_entry")
def graph_set_entry(name: str, req: EntryRequest):
    if name not in graphs_store:
        raise HTTPException(404, f"Graph '{name}' not found.")
    # Don't override if already set
    if graphs_store[name].entry_point:
        return {"message": f"Entry already set to '{graphs_store[name].entry_point}'."}
    graphs_store[name].set_entry(req.node_name)
    return {"message": f"Entry point set to '{req.node_name}'."}


@app.post("/graphs/{name}/set_end")
def graph_set_end(name: str, req: EntryRequest):
    if name not in graphs_store:
        raise HTTPException(404, f"Graph '{name}' not found.")
    if req.node_name in graphs_store[name].end_nodes:
        return {"message": f"End already set for '{req.node_name}'."}
    graphs_store[name].set_end(req.node_name)
    return {"message": f"End set after '{req.node_name}'."}


@app.post("/graphs/{name}/add_edge")
def graph_add_edge(name: str, req: EdgeRequest):
    if name not in graphs_store:
        raise HTTPException(404, f"Graph '{name}' not found.")
    graphs_store[name].add_edge(req.from_node, req.to_node)
    return {"message": f"Edge added: {req.from_node} → {req.to_node}"}


@app.post("/graphs/{name}/add_conditional_edge")
def graph_add_conditional_edge(name: str, req: ConditionalEdgeRequest):
    if name not in graphs_store:
        raise HTTPException(404, f"Graph '{name}' not found.")
    router_fn = parse_code(req.router_code)
    dest_map = {k: (END if v == "END" else v) for k, v in req.destination_map.items()}
    # Allow "START" or "__start__" as from_node — passed through to GraphBuilder
    graphs_store[name].add_conditional_edge(req.from_node, router_fn, dest_map)
    return {"message": f"Conditional edge added from '{req.from_node}'."}


@app.post("/graphs/{name}/run")
def graph_run(name: str, req: RunRequest):
    if name not in graphs_store:
        raise HTTPException(404, f"Graph '{name}' not found.")
    result = graphs_store[name].run(req.user_input)
    messages = [m.content for m in result["messages"]]
    return {"messages": messages}


# ── Telegram Integration ──────────────────────────────────
TELEGRAM_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_BASE = f"https://api.telegram.org/bot{TELEGRAM_TOKEN}"
telegram_thread = None
telegram_stop_event = threading.Event()
telegram_connected_graph = None

def telegram_poll_loop(graph_name: str):
    offset = None
    sessions = {}  # chat_id -> list of messages
    while not telegram_stop_event.is_set():
        try:
            resp = http_requests.get(
                f"{TELEGRAM_BASE}/getUpdates",
                params={"offset": offset, "timeout": 30},
                timeout=35
            ).json()
            for update in resp.get("result", []):
                offset = update["update_id"] + 1
                msg = update.get("message", {})
                text = msg.get("text", "")
                chat_id = msg["chat"]["id"]
                if not text or graph_name not in graphs_store:
                    continue
                # Clear session on /start or /reset
                if text.strip() in ["/start", "/reset"]:
                    sessions.pop(chat_id, None)
                    http_requests.post(f"{TELEGRAM_BASE}/sendMessage", json={"chat_id": chat_id, "text": "Hi! How can I help you today?"})
                    continue
                # Build message history
                if chat_id not in sessions:
                    sessions[chat_id] = []
                sessions[chat_id].append(HumanMessage(content=text))
                try:
                    # Only pass human/AI messages to keep context clean
                    clean_history = [m for m in sessions[chat_id] if isinstance(m, (HumanMessage, AIMessage))]
                    # Limit to last 20 messages to avoid token overflow
                    clean_history = clean_history[-20:]
                    print(f"[Telegram] Running graph '{graph_name}' with {len(clean_history)} messages")
                    result = graphs_store[graph_name].run(
                        user_input=text, messages=clean_history
                    )
                    reply = result["messages"][-1].content
                    print(f"[Telegram] Reply length: {len(reply)} chars")
                    # Store AI reply in session
                    sessions[chat_id].append(AIMessage(content=reply))

                    # Auto-chain: if info_collector says all details collected, immediately run again for flight_search
                    if "all details collected" in reply.lower() or "searching flights" in reply.lower():
                        print(f"[Telegram] Auto-chaining to flight_search...")
                        http_requests.post(f"{TELEGRAM_BASE}/sendMessage", json={"chat_id": chat_id, "text": reply})
                        auto_history = [m for m in sessions[chat_id] if isinstance(m, (HumanMessage, AIMessage))][-20:]
                        result2 = graphs_store[graph_name].run(
                            user_input="search flights now", messages=auto_history + [HumanMessage(content="search flights now")]
                        )
                        reply = result2["messages"][-1].content
                        sessions[chat_id].append(HumanMessage(content="search flights now"))
                        sessions[chat_id].append(AIMessage(content=reply))
                        print(f"[Telegram] Auto-chain reply length: {len(reply)} chars")

                    # Truncate if too long for Telegram (4096 char limit)
                    if len(reply) > 4000:
                        reply = reply[:4000] + "\n\n... (truncated)"
                except Exception as e:
                    reply = f"Error: {e}"
                    print(f"[Telegram] Error: {e}")
                resp = http_requests.post(f"{TELEGRAM_BASE}/sendMessage", json={"chat_id": chat_id, "text": reply})
                print(f"[Telegram] Send status: {resp.status_code}")
        except Exception as e:
            print(f"Telegram poll error: {e}")
            time.sleep(2)

class TelegramConnectRequest(BaseModel):
    graph_name: str

@app.post("/telegram/connect")
def telegram_connect(req: TelegramConnectRequest):
    global telegram_thread, telegram_connected_graph
    if not TELEGRAM_TOKEN:
        raise HTTPException(400, "TELEGRAM_BOT_TOKEN not set in .env")
    if req.graph_name not in graphs_store:
        raise HTTPException(404, f"Graph '{req.graph_name}' not found.")
    # Stop existing if running
    if telegram_thread and telegram_thread.is_alive():
        telegram_stop_event.set()
        telegram_thread.join(timeout=5)
    telegram_stop_event.clear()
    telegram_connected_graph = req.graph_name
    telegram_thread = threading.Thread(target=telegram_poll_loop, args=(req.graph_name,), daemon=True)
    telegram_thread.start()
    return {"message": f"Telegram connected to graph '{req.graph_name}'"}

@app.post("/telegram/disconnect")
def telegram_disconnect():
    global telegram_thread, telegram_connected_graph
    if telegram_thread and telegram_thread.is_alive():
        telegram_stop_event.set()
        telegram_thread.join(timeout=5)
    telegram_connected_graph = None
    return {"message": "Telegram disconnected."}

@app.get("/telegram/status")
def telegram_status():
    connected = telegram_thread is not None and telegram_thread.is_alive()
    return {"connected": connected, "graph": telegram_connected_graph if connected else None}


@app.get("/graphs/list")
def list_graphs():
    return {"graphs": list(graphs_store.keys())}
