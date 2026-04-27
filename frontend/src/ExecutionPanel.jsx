import { useState, useEffect, useRef } from "react";
import { api } from "./api";

export default function ExecutionPanel({ onActiveNodeChange }) {
  const [log, setLog] = useState([]);
  const [expanded, setExpanded] = useState(true);
  const bottomRef = useRef(null);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const data = await api.executionStatus();
        setLog(data.log || []);

        // Find last "running" node
        const running = [...(data.log || [])].reverse().find((e) => e.status === "running");
        const lastDone = [...(data.log || [])].reverse().find((e) => e.status === "done");

        if (running) {
          // Check if there's a "done" after this "running" for the same node
          const runIdx = (data.log || []).lastIndexOf(running);
          const doneAfter = (data.log || [])
            .slice(runIdx)
            .find((e) => e.node === running.node && e.status === "done");
          onActiveNodeChange(doneAfter ? null : running.node);
        } else {
          onActiveNodeChange(null);
        }
      } catch {
        // ignore
      }
    }, 800);
    return () => clearInterval(interval);
  }, [onActiveNodeChange]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [log]);

  const statusIcon = (status) => {
    if (status === "running") return "⏳";
    if (status === "done") return "✅";
    if (status === "error") return "❌";
    return "•";
  };

  const statusColor = (status) => {
    if (status === "running") return "#f59e0b";
    if (status === "done") return "#22c55e";
    if (status === "error") return "#ef4444";
    return "#888";
  };

  // Group consecutive running/done pairs
  const steps = [];
  const seen = new Set();
  for (let i = 0; i < log.length; i++) {
    const e = log[i];
    const key = `${e.node}-${e.timestamp}`;
    if (seen.has(key)) continue;
    seen.add(key);
    steps.push(e);
  }

  return (
    <div className="execution-panel">
      <div className="execution-header" onClick={() => setExpanded(!expanded)}>
        <span>⚡ Execution Tracker</span>
        <span style={{ fontSize: "0.7rem", opacity: 0.6 }}>{expanded ? "▼" : "▶"}</span>
      </div>
      {expanded && (
        <div className="execution-body">
          {steps.length === 0 ? (
            <div className="execution-empty">No execution yet. Run the graph to see activity.</div>
          ) : (
            <div className="execution-timeline">
              {steps.map((step, i) => (
                <div key={i} className={`execution-step ${step.status}`}>
                  <div className="execution-dot" style={{ background: statusColor(step.status) }}>
                    {step.status === "running" && <div className="execution-pulse" />}
                  </div>
                  <div className="execution-line" />
                  <div className="execution-info">
                    <span className="execution-node">{statusIcon(step.status)} {step.node}</span>
                    <span className="execution-time">
                      {new Date(step.timestamp).toLocaleTimeString()}
                    </span>
                    {step.error && <span className="execution-error">{step.error}</span>}
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
          )}
          <button
            className="execution-clear"
            onClick={async () => {
              await api.executionClear();
              setLog([]);
              onActiveNodeChange(null);
            }}
          >
            🗑 Clear
          </button>
        </div>
      )}
    </div>
  );
}
