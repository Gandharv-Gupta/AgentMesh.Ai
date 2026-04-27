import { useState } from "react";
import { api } from "./api";

export default function RunPanel({ graphName }) {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleRun = async () => {
    if (!graphName) {
      setOutput(["Error: Create a graph first."]);
      return;
    }
    setLoading(true);
    setOutput(null);
    try {
      const result = await api.runGraph(graphName, input);
      setOutput(result.messages);
    } catch (e) {
      setOutput([`Error: ${e.message}`]);
    }
    setLoading(false);
  };

  return (
    <div className="run-panel">
      <h3>▶ Run Workflow</h3>
      <div className="run-input-row">
        <input
          placeholder="Enter your message..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleRun()}
        />
        <button className="btn-run" onClick={handleRun} disabled={loading}>
          {loading ? "Running..." : "Run"}
        </button>
      </div>
      {output && (
        <div className="output-box">
          {output.map((msg, i) => (
            <div key={i} className="output-msg">{msg}</div>
          ))}
        </div>
      )}
    </div>
  );
}
