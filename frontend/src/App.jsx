import { useState, useCallback } from "react";
import {
  ReactFlow,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  MiniMap,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { nodeTypes } from "./CustomNodes";
import Sidebar from "./Sidebar";
import RunPanel from "./RunPanel";
import DetailPanel from "./DetailPanel";
import ToolDetailPanel from "./ToolDetailPanel";
import { api } from "./api";
import "./App.css";

export default function App() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [graphName, setGraphName] = useState("workflow");
  const [selectedNode, setSelectedNode] = useState(null);
  const [selectedTool, setSelectedTool] = useState(null); // { toolName, agentName }

  const onConnect = useCallback(
    async (params) => {
      setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: "#6366f1" } }, eds));

      if (graphName) {
        try {
          const from = params.source;
          const to = params.target;

          if (from === "__start__" && to !== "__end__") {
            await api.addNodeToGraph(graphName, to).catch(() => {});
            await api.setEntry(graphName, to);
          } else if (to === "__end__" && from !== "__start__") {
            await api.addNodeToGraph(graphName, from).catch(() => {});
            await api.setEnd(graphName, from);
          } else if (from !== "__start__" && to !== "__end__") {
            await api.addNodeToGraph(graphName, from).catch(() => {});
            await api.addNodeToGraph(graphName, to).catch(() => {});
            await api.addEdge(graphName, from, to);
          }
        } catch (e) {
          console.error("Edge sync error:", e);
        }
      }
    },
    [graphName, setEdges]
  );

  const onNodeAdd = useCallback(
    (node) => {
      setNodes((nds) => [...nds, node]);
    },
    [setNodes]
  );

  const addConditionalEdge = useCallback(
    (fromNode, toNodes) => {
      toNodes.forEach((to, i) => {
        const newEdge = {
          id: `cond-${fromNode}-${to}-${Date.now()}-${i}`,
          source: fromNode,
          target: to,
          animated: true,
          style: { stroke: "#f59e0b", strokeDasharray: "5 5" },
          label: "conditional",
          labelStyle: { fill: "#f59e0b", fontSize: 10 },
        };
        setEdges((eds) => [...eds, newEdge]);
      });
    },
    [setEdges]
  );

  const onToolClick = useCallback((toolName, agentName) => {
    setSelectedTool({ toolName, agentName });
    setSelectedNode(null);
  }, []);

  // Inject onToolClick into all agent nodes
  const nodesWithHandlers = nodes.map((n) =>
    n.type === "agentNode"
      ? { ...n, data: { ...n.data, onToolClick } }
      : n
  );

  const onNodeClick = useCallback((event, node) => {
    if (node.type === "startNode" || node.type === "endNode") return;
    setSelectedNode(node);
    setSelectedTool(null);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
    setSelectedTool(null);
  }, []);

  const onUpdateNode = useCallback(
    (nodeId, newData) => {
      setNodes((nds) =>
        nds.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, ...newData } } : n))
      );
      setSelectedNode(null);
    },
    [setNodes]
  );

  const refreshLists = useCallback(() => {}, []);

  return (
    <div className="app-container">
      <Sidebar
        onNodeAdd={onNodeAdd}
        graphName={graphName}
        setGraphName={setGraphName}
        refreshLists={refreshLists}
        addConditionalEdge={addConditionalEdge}
      />
      <div className="canvas-container">
        {graphName && (
          <div className="graph-name-banner">{graphName}</div>
        )}
        <ReactFlow
          nodes={nodesWithHandlers}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          nodeTypes={nodeTypes}
          fitView
          proOptions={{ hideAttribution: true }}
        >
          <Background color="#333" gap={20} />
          <Controls />
          <MiniMap
            nodeColor={(n) => {
              if (n.type === "agentNode") return "#6366f1";
              if (n.type === "functionNode") return "#f59e0b";
              if (n.type === "startNode") return "#22c55e";
              if (n.type === "endNode") return "#ef4444";
              return "#888";
            }}
            style={{ background: "#1e1e2e" }}
          />
        </ReactFlow>
        {selectedNode && (
          <DetailPanel node={selectedNode} onUpdate={onUpdateNode} onClose={() => setSelectedNode(null)} />
        )}
        {selectedTool && (
          <ToolDetailPanel
            toolName={selectedTool.toolName}
            agentName={selectedTool.agentName}
            onClose={() => setSelectedTool(null)}
          />
        )}
        <RunPanel graphName={graphName} />
      </div>
    </div>
  );
}
