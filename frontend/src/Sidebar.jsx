import { useState } from "react";
import { api } from "./api";

export default function Sidebar({ onNodeAdd, graphName, setGraphName, refreshLists, addConditionalEdge }) {
  const [tab, setTab] = useState("tools");

  // Tool state
  const [toolName, setToolName] = useState("");
  const [toolDesc, setToolDesc] = useState("");
  const [toolType, setToolType] = useState("code");
  const [toolCode, setToolCode] = useState("");
  const [toolPrompt, setToolPrompt] = useState("Summarize the following: {query}");

  // Agent state
  const [agentName, setAgentName] = useState("");
  const [agentDesc, setAgentDesc] = useState("");
  const [agentTools, setAgentTools] = useState("");

  // Node state
  const [nodeName, setNodeName] = useState("");
  const [nodeAgent, setNodeAgent] = useState("");
  const [nodeFunc, setNodeFunc] = useState("");

  // Edge state
  const [edgeFrom, setEdgeFrom] = useState("");
  const [edgeTo, setEdgeTo] = useState("");
  const [condFrom, setCondFrom] = useState("");
  const [routerCode, setRouterCode] = useState("");
  const [destMap, setDestMap] = useState("");

  // Graph state
  const [stateFields, setStateFields] = useState("");

  const [status, setStatus] = useState("");

  const showStatus = (msg) => {
    setStatus(msg);
    setTimeout(() => setStatus(""), 3000);
  };

  const handleCreateTool = async () => {
    try {
      const body = { name: toolName, description: toolDesc, tool_type: toolType };
      if (toolType === "code") body.code = toolCode;
      else body.prompt_template = toolPrompt;
      await api.createTool(body);
      showStatus(`Tool '${toolName}' created (${toolType})!`);
      setToolName(""); setToolDesc(""); setToolCode(""); setToolPrompt("");
      refreshLists();
    } catch (e) { showStatus(`Error: ${e.message}`); }
  };

  const handleCreateAgent = async () => {
    try {
      const tool_names = agentTools ? agentTools.split(",").map(t => t.trim()) : [];
      await api.createAgent({ name: agentName, description: agentDesc, tool_names: tool_names });
      showStatus(`Agent '${agentName}' created!`);

      // Also create a node for this agent
      await api.createNode({ name: agentName, agent_name: agentName });

      // Add to canvas
      onNodeAdd({
        id: agentName,
        type: "agentNode",
        position: { x: 250 + Math.random() * 200, y: 150 + Math.random() * 200 },
        data: { label: agentName, description: agentDesc, tools: tool_names },
      });

      setAgentName(""); setAgentDesc(""); setAgentTools("");
      refreshLists();
    } catch (e) { showStatus(`Error: ${e.message}`); }
  };

  const handleCreateNode = async () => {
    try {
      const body = { name: nodeName };
      if (nodeAgent) body.agent_name = nodeAgent;
      else if (nodeFunc) body.func_code = nodeFunc;
      await api.createNode(body);

      onNodeAdd({
        id: nodeName,
        type: nodeAgent ? "agentNode" : "functionNode",
        position: { x: 250 + Math.random() * 200, y: 150 + Math.random() * 200 },
        data: { label: nodeName },
      });

      showStatus(`Node '${nodeName}' created!`);
      setNodeName(""); setNodeAgent(""); setNodeFunc("");
      refreshLists();
    } catch (e) { showStatus(`Error: ${e.message}`); }
  };

  const handleAddStaticEdge = async () => {
    try {
      await api.addEdge(graphName, edgeFrom, edgeTo);
      showStatus(`Edge added: ${edgeFrom} → ${edgeTo}`);
      setEdgeFrom(""); setEdgeTo("");
    } catch (e) { showStatus(`Error: ${e.message}`); }
  };

  const handleAddConditionalEdge = async () => {
    if (!condFrom || !routerCode || !destMap) {
      showStatus("Error: Fill in all conditional edge fields.");
      return;
    }
    try {
      const destination_map = {};
      destMap.split(",").forEach(pair => {
        const idx = pair.trim().indexOf("=");
        if (idx > 0) {
          const key = pair.trim().substring(0, idx).trim();
          const val = pair.trim().substring(idx + 1).trim();
          destination_map[key] = val;
        }
      });
      console.log("Conditional edge:", { from: condFrom, router: routerCode, map: destination_map });
      if (Object.keys(destination_map).length === 0) {
        showStatus("Error: Invalid destination map. Use format: key=node, key=node");
        return;
      }
      await api.addConditionalEdge(graphName, {
        from_node: condFrom,
        router_code: routerCode,
        destination_map,
      });
      showStatus(`Conditional edge added from '${condFrom}'`);
      // Draw conditional edges on canvas
      const toNodes = Object.values(destination_map).map(v => v === "END" ? "__end__" : v);
      if (toNodes.length > 0) addConditionalEdge(condFrom, toNodes, { routerCode, destinationMap: destination_map });
      setCondFrom(""); setRouterCode(""); setDestMap("");
    } catch (e) { showStatus(`Error: ${e.message}`); }
  };

  const handleCreateGraph = async () => {
    try {
      const fields = {};
      if (stateFields.trim()) {
        stateFields.split(",").forEach(f => {
          const [k, v] = f.trim().split(":");
          if (k && v) fields[k.trim()] = v.trim();
        });
      }
      await api.createGraph({ name: graphName, state_fields: fields });
      showStatus(`Graph '${graphName}' created!`);

      // Add START and END nodes to canvas
      onNodeAdd({ id: "__start__", type: "startNode", position: { x: 350, y: 30 }, data: { label: "START" } });
      onNodeAdd({ id: "__end__", type: "endNode", position: { x: 350, y: 600 }, data: { label: "END" } });

      refreshLists();
    } catch (e) { showStatus(`Error: ${e.message}`); }
  };

  return (
    <div className="sidebar">
      <h2>🧬 AgentMesh</h2>

      <button className="btn-primary" style={{ margin: '0 12px 8px', background: '#7c3aed' }} onClick={async () => {
        try {
          showStatus("Loading demo...");
          // 1. Create graph
          setGraphName("flight_booking");
          await api.createGraph({ name: "flight_booking", state_fields: {} });

          // 2. Create tools (all LLM-based)
          await api.createTool({ name: "validate_info", description: "Validates passenger name, age, and phone from text.", tool_type: "llm", prompt_template: "Extract and validate passenger info from this text. Check: name (alphabetic, 2+ chars), age (1-120), phone (10 digits). Say which are valid, invalid, or missing. Text: {query}" });
          await api.createTool({ name: "search_flights", description: "Searches available flights.", tool_type: "llm", prompt_template: "Generate a list of 8 realistic flights from Delhi to Mumbai for tomorrow. Include flight numbers (AI/6E/UK/SG prefix), departure times spread across the day, economy (₹3000-6000) and business (₹7000-12000) prices. Format as a clean numbered list. Query: {query}" });
          await api.createTool({ name: "book_flight", description: "Books a flight and returns confirmation.", tool_type: "llm", prompt_template: "Generate a realistic booking confirmation with: Booking ID (AMB-XXXXX), flight details, passenger info, CONFIRMED status, Pending payment, reminder to arrive 2hrs early. Details: {query}" });

          // 3. Create agents + nodes
          const agents = [
            { name: "info_collector", description: "You are a friendly flight booking assistant. Your ONLY job is to collect: passenger full name, age, phone number, departure city, and destination city. Check the conversation history for any info already provided. Ask ONLY for what is missing. Once you have ALL 5 details, summarize them clearly and say 'All details collected! Searching flights now...' Do NOT search for flights yourself.", tool_names: ["validate_info"], y: 150, x: 300 },
            { name: "flight_search", description: "You are a flight search agent. Use the search_flights tool to find available flights based on the user's route. Present results in a clean numbered list. At the end, ask: 'Which flight would you like to book? Reply with the flight number.'", tool_names: ["search_flights"], y: 350, x: 300 },
            { name: "booking_agent", description: "You are a booking confirmation agent. Use the book_flight tool with ALL the passenger details and the chosen flight from the conversation to generate a final booking confirmation.", tool_names: ["book_flight"], y: 550, x: 300 },
          ];
          for (const a of agents) {
            await api.createAgent({ name: a.name, description: a.description, tool_names: a.tool_names });
            await api.createNode({ name: a.name, agent_name: a.name });
            onNodeAdd({ id: a.name, type: "agentNode", position: { x: a.x, y: a.y }, data: { label: a.name, description: a.description, tools: a.tool_names } });
          }

          // 4. Build graph: START → (router) → info_collector / flight_search / booking_agent → END
          for (const a of agents) await api.addNodeToGraph("flight_booking", a.name).catch(() => {});

          // Router at START: decides which agent handles each message based on conversation state
          const routerCode = `def router(state):
    msgs = [m for m in state["messages"] if hasattr(m, "content")]
    ai_msgs = [m.content.lower() for m in msgs if type(m).__name__ == "AIMessage"]
    last_ai = ai_msgs[-1] if ai_msgs else ""
    full = " ".join(m.content.lower() for m in msgs)
    last_user_msgs = [m.content.lower() for m in msgs if type(m).__name__ == "HumanMessage"]
    last_user = last_user_msgs[-1] if last_user_msgs else ""
    # If booking confirmed, we are done
    if "booking id" in full or "amb-" in full:
        return "done"
    # If flights were shown and user wants to book
    has_flights = "which flight" in full or any(c in full for c in ["ai 3", "6e 2", "6e 3", "6e 4", "6e 5", "6e 6", "6e 7", "uk ", "sg "])
    if has_flights and any(w in last_user for w in ["book", "yes", "confirm", "proceed", "economy", "business", "sg", "ai", "6e", "uk", "best"]):
        return "book"
    # If flights were shown, stay with flight_search for follow-ups
    if has_flights:
        return "search"
    # If info was just collected (auto-chained), search flights
    if "all details collected" in last_ai or "searching flights" in last_ai:
        return "search"
    # Default: collect info
    return "collect"`;
          await api.addConditionalEdge("flight_booking", {
            from_node: "__start__",
            router_code: routerCode,
            destination_map: { collect: "info_collector", search: "flight_search", book: "booking_agent", done: "END" },
          });

          await api.setEnd("flight_booking", "info_collector");
          await api.setEnd("flight_booking", "flight_search");
          await api.setEnd("flight_booking", "booking_agent");

          addConditionalEdge("info_collector", ["flight_search", "booking_agent"], { routerCode, destinationMap: { collect: "info_collector", search: "flight_search", book: "booking_agent", done: "END" } });

          showStatus("✅ Demo loaded! Connect to Telegram to test.");
        } catch (e) { showStatus(`Error: ${e.message}`); }
      }}>🚀 Load Flight Booking Demo</button>

      <div className="tabs">
        {["tools", "agents", "nodes", "edges", "graph"].map(t => (
          <button key={t} className={tab === t ? "tab active" : "tab"} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {status && <div className="status-bar">{status}</div>}

      {tab === "tools" && (
        <div className="panel">
          <h3>Create Tool</h3>
          <input placeholder="Tool name" value={toolName} onChange={e => setToolName(e.target.value)} />
          <input placeholder="Description" value={toolDesc} onChange={e => setToolDesc(e.target.value)} />
          <div className="tool-type-toggle">
            <button className={toolType === "code" ? "tab active" : "tab"} onClick={() => setToolType("code")}>Code</button>
            <button className={toolType === "llm" ? "tab active" : "tab"} onClick={() => setToolType("llm")}>LLM</button>
          </div>
          {toolType === "code" ? (
            <textarea placeholder='lambda query: f"Result: {query}"' value={toolCode} onChange={e => setToolCode(e.target.value)} rows={3} />
          ) : (
            <textarea placeholder="Summarize the following: {query}" value={toolPrompt} onChange={e => setToolPrompt(e.target.value)} rows={3} />
          )}
          <button className="btn-primary" onClick={handleCreateTool}>Create Tool</button>
        </div>
      )}

      {tab === "agents" && (
        <div className="panel">
          <h3>Create Agent</h3>
          <input placeholder="Agent name" value={agentName} onChange={e => setAgentName(e.target.value)} />
          <textarea placeholder="System prompt / description" value={agentDesc} onChange={e => setAgentDesc(e.target.value)} rows={3} />
          <input placeholder="Tool names (comma separated)" value={agentTools} onChange={e => setAgentTools(e.target.value)} />
          <button className="btn-primary" onClick={handleCreateAgent}>Create Agent + Node</button>
        </div>
      )}

      {tab === "nodes" && (
        <div className="panel">
          <h3>Create Function Node</h3>
          <input placeholder="Node name" value={nodeName} onChange={e => setNodeName(e.target.value)} />
          <input placeholder="Agent name (if agent node)" value={nodeAgent} onChange={e => setNodeAgent(e.target.value)} />
          <textarea placeholder="Or Python func: lambda state: {...}" value={nodeFunc} onChange={e => setNodeFunc(e.target.value)} rows={3} />
          <button className="btn-primary" onClick={handleCreateNode}>Create Node</button>
        </div>
      )}

      {tab === "edges" && (
        <div className="panel">
          <h3>Static Edge</h3>
          <input placeholder="From node" value={edgeFrom} onChange={e => setEdgeFrom(e.target.value)} />
          <input placeholder="To node" value={edgeTo} onChange={e => setEdgeTo(e.target.value)} />
          <button className="btn-primary" onClick={handleAddStaticEdge}>Add Static Edge</button>

          <hr style={{ border: "1px solid #2d2d44", margin: "12px 0" }} />

          <h3>Conditional Edge</h3>
          <input placeholder="From node" value={condFrom} onChange={e => setCondFrom(e.target.value)} />
          <textarea
            placeholder={'def router(state):\n    if "HI" in state["messages"][-1].content:\n        return "next"\n    return "end"'}
            value={routerCode}
            onChange={e => setRouterCode(e.target.value)}
            rows={5}
          />
          <input
            placeholder="Destination map: next=a2, end=END"
            value={destMap}
            onChange={e => setDestMap(e.target.value)}
          />
          <button className="btn-primary" onClick={handleAddConditionalEdge}>Add Conditional Edge</button>
        </div>
      )}

      {tab === "graph" && (
        <div className="panel">
          <h3>Create Graph</h3>
          <input placeholder="Graph name" value={graphName} onChange={e => setGraphName(e.target.value)} />
          <input placeholder="State fields: context:str, score:int" value={stateFields} onChange={e => setStateFields(e.target.value)} />
          <button className="btn-primary" onClick={handleCreateGraph}>Create Graph</button>

          <hr style={{ border: 'none', borderTop: '1px solid #2d2d44', margin: '12px 0' }} />
          <h3>Telegram</h3>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button className="btn-primary" style={{ flex: 1 }} onClick={async () => {
              if (!graphName) { showStatus('Enter a graph name first'); return; }
              try {
                const res = await api.telegramConnect(graphName);
                showStatus(`🟢 ${res.message}`);
              } catch (e) { showStatus(`Error: ${e.message}`); }
            }}>Connect to Telegram</button>
            <button className="btn-primary" style={{ flex: 1, background: '#ef4444' }} onClick={async () => {
              try {
                const res = await api.telegramDisconnect();
                showStatus(`🔴 ${res.message}`);
              } catch (e) { showStatus(`Error: ${e.message}`); }
            }}>Disconnect</button>
          </div>
        </div>
      )}
    </div>
  );
}
