/** Reusable StatCard — no text clipping */
export default function StatCard({ icon, number, label, badge }) {
  return (
    <div className="stat-card">
      <div className="stat-card-icon">{icon}</div>
      <div className="stat-card-info">
        <span className="stat-card-num">{number}</span>
        <span className="stat-card-label">{label}</span>
        {badge && <span className="stat-card-badge">{badge}</span>}
      </div>
    </div>
  );
}
