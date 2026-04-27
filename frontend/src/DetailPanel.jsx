import { useState } from "react";

export default function DetailPanel({ node, onUpdate, onClose }) {
  const [label, setLabel] = useState(node.data.label || "");
  const [description, setDescription] = useState(node.data.description || "");
  const [tools, setTools] = useState(node.data.tools?.join(", ") || "");

  const handleSave = () => {
    onUpdate(node.id, {
      label,
      description,
      tools: tools ? tools.split(",").map((t) => t.trim()) : [],
    });
  };

  return (
    <div className="detail-panel">
      <div className="detail-header">
        <h3>
          {node.type === "agentNode" ? "🤖 Agent" : "⚡ Function"}: {node.data.label}
        </h3>
        <button className="detail-close" onClick={onClose}>✕</button>
      </div>

      <div className="detail-body">
        <label>Name</label>
        <input value={label} onChange={(e) => setLabel(e.target.value)} />

        <label>Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
        />

        {node.type === "agentNode" && (
          <>
            <label>Tools (comma separated)</label>
            <input value={tools} onChange={(e) => setTools(e.target.value)} />
          </>
        )}

        <button className="btn-primary" onClick={handleSave}>
          Save Changes
        </button>
      </div>
    </div>
  );
}
