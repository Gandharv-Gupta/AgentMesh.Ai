import { useState, useEffect } from "react";
import { api } from "./api";

export default function ToolDetailPanel({ toolName, agentName, onClose }) {
  const [name, setName] = useState(toolName);
  const [description, setDescription] = useState("");
  const [toolType, setToolType] = useState("code");
  const [code, setCode] = useState("");
  const [promptTemplate, setPromptTemplate] = useState("");
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.getTool(toolName).then((data) => {
      setName(data.name);
      setDescription(data.description || "");
      setToolType(data.tool_type || "code");
      setCode(data.code || "");
      setPromptTemplate(data.prompt_template || "");
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [toolName]);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (loading) return (
    <div className="detail-panel" style={{ top: "20px", right: "20px" }}>
      <div className="detail-header">
        <h3>🔧 Loading...</h3>
        <button className="detail-close" onClick={onClose}>✕</button>
      </div>
    </div>
  );

  return (
    <div className="detail-panel" style={{ top: "20px", right: "20px" }}>
      <div className="detail-header">
        <h3>🔧 {name}</h3>
        <button className="detail-close" onClick={onClose}>✕</button>
      </div>

      <div className="detail-body">
        <label>Agent</label>
        <input value={agentName} disabled style={{ opacity: 0.6 }} />

        <label>Tool Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} />

        <label>Type</label>
        <input value={toolType.toUpperCase()} disabled style={{ opacity: 0.6 }} />

        <label>Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
        />

        {toolType === "llm" ? (
          <>
            <label>Prompt Template</label>
            <textarea
              value={promptTemplate}
              onChange={(e) => setPromptTemplate(e.target.value)}
              rows={5}
              style={{ fontFamily: "monospace", fontSize: "0.8rem" }}
            />
          </>
        ) : (
          <>
            <label>Code</label>
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              rows={5}
              style={{ fontFamily: "monospace", fontSize: "0.8rem" }}
            />
          </>
        )}

        <button className="btn-primary" onClick={handleSave}>
          {saved ? "✓ Saved" : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
