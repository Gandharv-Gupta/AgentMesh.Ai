const API = "http://localhost:8000";

async function request(path, method = "GET", body = null) {
  const opts = { method, headers: { "Content-Type": "application/json" } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${API}${path}`, opts);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Request failed");
  }
  return res.json();
}

export const api = {
  // Tools
  createTool: (data) => request("/tools/create", "POST", data),
  listTools: () => request("/tools/list"),
  getTool: (name) => request(`/tools/${name}`),

  // Agents
  createAgent: (data) => request("/agents/create", "POST", data),
  listAgents: () => request("/agents/list"),
  invokeAgent: (name, input) => request(`/agents/${name}/invoke`, "POST", { user_input: input }),

  // Nodes
  createNode: (data) => request("/nodes/create", "POST", data),
  listNodes: () => request("/nodes/list"),

  // Graphs
  createGraph: (data) => request("/graphs/create", "POST", data),
  listGraphs: () => request("/graphs/list"),
  addNodeToGraph: (name, nodeName) => request(`/graphs/${name}/add_node`, "POST", { node_name: nodeName }),
  setEntry: (name, nodeName) => request(`/graphs/${name}/set_entry`, "POST", { node_name: nodeName }),
  setEnd: (name, nodeName) => request(`/graphs/${name}/set_end`, "POST", { node_name: nodeName }),
  addEdge: (name, from_node, to_node) => request(`/graphs/${name}/add_edge`, "POST", { from_node, to_node }),
  addConditionalEdge: (name, data) => request(`/graphs/${name}/add_conditional_edge`, "POST", data),
  runGraph: (name, input, initialState = {}) =>
    request(`/graphs/${name}/run`, "POST", { user_input: input, initial_state: initialState }),

  // Telegram
  telegramConnect: (graphName) => request("/telegram/connect", "POST", { graph_name: graphName }),
  telegramDisconnect: () => request("/telegram/disconnect", "POST"),
  telegramStatus: () => request("/telegram/status"),
};
