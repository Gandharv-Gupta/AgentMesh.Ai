export default function ConditionDetailPanel({ edge, onClose }) {
  const data = edge.data || {};
  const routerCode = data.routerCode || "N/A";
  const destMap = data.destinationMap || {};

  return (
    <div className="detail-panel" style={{ top: "20px", right: "20px" }}>
      <div className="detail-header">
        <h3>⚡ Conditional Edge</h3>
        <button className="detail-close" onClick={onClose}>✕</button>
      </div>

      <div className="detail-body">
        <label>From Node</label>
        <input value={data.fromNode || edge.source || "—"} disabled style={{ opacity: 0.6 }} />

        <label>To Node</label>
        <input value={edge.target || "—"} disabled style={{ opacity: 0.6 }} />

        <label>Destination Map</label>
        <div className="condition-map">
          {Object.entries(destMap).length > 0 ? (
            Object.entries(destMap).map(([key, val]) => (
              <div key={key} className="condition-map-row">
                <span className="condition-key">{key}</span>
                <span className="condition-arrow">→</span>
                <span className="condition-val">{val}</span>
              </div>
            ))
          ) : (
            <span style={{ opacity: 0.5, fontSize: "0.75rem" }}>No mapping available</span>
          )}
        </div>

        <label>Router Code</label>
        <pre className="condition-code">{routerCode}</pre>
      </div>
    </div>
  );
}
