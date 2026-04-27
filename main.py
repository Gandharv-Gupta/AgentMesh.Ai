import os
from langchain_openai import ChatOpenAI
from langchain_core.tools import tool
from langgraph.graph import StateGraph, START, END
from langgraph.prebuilt import create_react_agent
from langgraph.prebuilt.chat_agent_executor import AgentState as BaseAgentState
from typing import TypedDict, Annotated, Sequence
from langchain_core.messages import BaseMessage, HumanMessage, SystemMessage
import operator


# --- Tool Factory ---
class ToolFactory:
    def __init__(self, name: str, description: str, func: callable = None, tool_type: str = "code", prompt_template: str = None):
        """
        tool_type: "code" for lambda-based tools, "llm" for LLM-based tools
        prompt_template: used when tool_type="llm", e.g. "Summarize the following: {query}"
        func: used when tool_type="code", a callable
        """
        self.name = name
        self.description = description
        self.tool_type = tool_type
        self.func = func
        self.prompt_template = prompt_template

    def create(self):
        """Wraps the function as a LangChain @tool."""
        desc = self.description

        if self.tool_type == "llm":
            prompt_tpl = self.prompt_template or "{query}"
            llm = ChatOpenAI(model="gpt-4o", api_key=os.getenv("OPENAI_API_KEY"))

            def llm_fn(query: str) -> str:
                prompt = prompt_tpl.replace("{query}", query)
                response = llm.invoke([HumanMessage(content=prompt)])
                return response.content

            fn = llm_fn
        else:
            fn = self.func

        @tool
        def dynamic_tool(query: str) -> str:
            """Placeholder."""
            return fn(query)

        dynamic_tool.name = self.name
        dynamic_tool.description = desc
        return dynamic_tool


# --- Dummy Tool ---
dummy = ToolFactory(
    name="dummy_tool",
    description="A placeholder tool that echoes the input.",
    func=lambda query: f"Dummy result for: {query}",
)
dummy_tool = dummy.create()


# --- State Factory ---
class StateFactory:
    def __init__(self, fields: dict = None):
        """
        fields: dict of {field_name: type}
        Example: {"context": str, "score": int}
        'messages' is always included automatically.
        """
        self.fields = fields or {}

    def create(self) -> type:
        base = dict(BaseAgentState.__annotations__)
        base.update(self.fields)
        return TypedDict("AgentState", base)  # type: ignore


# Default state
AgentState = StateFactory().create()


# --- Agent Class ---
class Agent:
    def __init__(
        self,
        name: str = "DefaultAgent",
        description: str = "You are a helpful AI assistant.",
        tools: list = None,
        llm: ChatOpenAI = None,
        state: type = AgentState,
    ):
        self.name = name
        self.description = description
        self.tools = tools or [dummy_tool]
        self.llm = llm or ChatOpenAI(model="gpt-4o", api_key=os.getenv("OPENAI_API_KEY"))
        self.state = state
        self.agent = create_react_agent(
            model=self.llm,
            tools=self.tools,
            prompt=self.description,
            state_schema=self.state,
        )

    def invoke(self, user_input: str):
        return self.agent.invoke({"messages": [HumanMessage(content=user_input)]})


# --- Node Factory ---
class NodeFactory:
    def __init__(self, name: str, agent: Agent = None, func: callable = None):
        """
        name: unique node name
        agent: an Agent instance (uses agent.invoke)
        func: a plain Python function that takes state and returns state updates
        Provide either an agent or a python function, not both.
        """
        self.name = name
        if agent:
            self.node_fn = self._wrap_agent(agent)
        elif func:
            self.node_fn = func
        else:
            raise ValueError("Provide either an agent or a func.")

    def _wrap_agent(self, agent: Agent):
        def node_fn(state):
            return agent.agent.invoke(state)
        return node_fn

    def get(self):
        """Returns (name, node_function) ready to add to a StateGraph."""
        return self.name, self.node_fn


# --- Graph Builder ---
# Global execution log reference — set by backend_api.py
_execution_log = None

def set_execution_log(log_list):
    global _execution_log
    _execution_log = log_list


class GraphBuilder:
    def __init__(self, state: type = AgentState):
        self.state = state
        self.nodes = []
        self.edges = []
        self.conditional_edges = []
        self.entry_point = None
        self.end_nodes = []

    def add_node(self, node: NodeFactory):
        name, fn = node.get()
        if not any(n == name for n, _ in self.nodes):
            self.nodes.append((name, fn))

    def set_entry(self, node_name: str):
        self.entry_point = node_name

    def set_end(self, node_name: str):
        self.end_nodes.append(node_name)

    def add_edge(self, from_node: str, to_node: str):
        self.edges.append((from_node, to_node))

    def add_conditional_edge(self, from_node: str, router_fn: callable, destination_map: dict):
        self.conditional_edges.append((from_node, router_fn, destination_map))

    def _wrap_with_tracking(self, name, fn):
        """Wrap a node function to log execution start/end."""
        def tracked_fn(state):
            from datetime import datetime
            if _execution_log is not None:
                _execution_log.append({"node": name, "status": "running", "timestamp": datetime.now().isoformat()})
            try:
                result = fn(state)
                if _execution_log is not None:
                    _execution_log.append({"node": name, "status": "done", "timestamp": datetime.now().isoformat()})
                return result
            except Exception as e:
                if _execution_log is not None:
                    _execution_log.append({"node": name, "status": "error", "timestamp": datetime.now().isoformat(), "error": str(e)})
                raise
        return tracked_fn

    def compile(self):
        graph = StateGraph(self.state)
        for name, fn in self.nodes:
            graph.add_node(name, self._wrap_with_tracking(name, fn))
        # Check if any conditional edge starts from START
        has_start_conditional = any(f == "__start__" or f == "START" for f, _, _ in self.conditional_edges)
        if self.entry_point and not has_start_conditional:
            graph.set_entry_point(self.entry_point)
        for from_n, to_n in self.edges:
            graph.add_edge(from_n, to_n)
        for node_name in self.end_nodes:
            graph.add_edge(node_name, END)
        for from_n, router_fn, dest_map in self.conditional_edges:
            source = START if from_n in ("__start__", "START") else from_n
            graph.add_conditional_edges(source, router_fn, dest_map)
        return graph.compile()

    def run(self, user_input: str, initial_state: dict = None, messages: list = None):
        compiled = self.compile()
        if messages:
            state = {"messages": messages}
        else:
            state = {"messages": [HumanMessage(content=user_input)]}
        if initial_state:
            state.update(initial_state)
        return compiled.invoke(state)


# --- Quick Test ---
if __name__ == "__main__":
    agent = Agent(name="TestAgent", description="You are a test assistant.")
    print(f"Agent '{agent.name}' created with {len(agent.tools)} tool(s).")
