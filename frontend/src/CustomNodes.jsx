import { Handle, Position } from "@xyflow/react";

export function AgentNode({ data }) {
  const tools = data.tools || [];
  const radius = 80;
  const spread = Math.min(Math.PI * 0.8, tools.length * 0.5);

  return (
    <div className="custom-node agent-node" style={{ position: "relative", overflow: "visible" }}>
      <div className="node-header">🤖 Agent</div>
      <div className="node-body">
        <strong>{data.label}</strong>
        <p className="node-desc">{data.description ? (data.description.length > 60 ? data.description.slice(0, 60) + "…" : data.description) : "No description"}</p>
      </div>
      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />
      {tools.map((tool, i) => {
        const angle = tools.length === 1
          ? Math.PI  // left side
          : -Math.PI / 2 - spread / 2 + (i * spread) / Math.max(tools.length - 1, 1);
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        return (
          <div
            key={tool}
            className="tool-spoke"
            style={{ left: `calc(50% + ${x}px)`, top: `calc(50% + ${y}px)` }}
            onClick={(e) => {
              e.stopPropagation();
              if (data.onToolClick) data.onToolClick(tool, data.label);
            }}
            title={tool}
          >
            <svg className="spoke-line" style={{ position: "absolute", left: "50%", top: "50%", overflow: "visible", pointerEvents: "none" }}>
              <line x1="0" y1="0" x2={-x} y2={-y} stroke="#6366f1" strokeWidth="1" strokeDasharray="3,3" opacity="0.4" />
            </svg>
            🔧 {tool.length > 10 ? tool.slice(0, 10) + "…" : tool}
          </div>
        );
      })}
    </div>
  );
}

export function FunctionNode({ data }) {
  return (
    <div className="custom-node func-node">
      <div className="node-header">⚡ Function</div>
      <div className="node-body">
        <strong>{data.label}</strong>
      </div>
      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

export function StartNode() {
  return (
    <div className="custom-node start-node">
      <div className="node-body"><strong>▶ START</strong></div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

export function EndNode() {
  return (
    <div className="custom-node end-node">
      <div className="node-body"><strong>⏹ END</strong></div>
      <Handle type="target" position={Position.Top} />
    </div>
  );
}

export const nodeTypes = {
  agentNode: AgentNode,
  functionNode: FunctionNode,
  startNode: StartNode,
  endNode: EndNode,
};
