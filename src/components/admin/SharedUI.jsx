/**
 * Small presentational pieces shared by the admin tabs.
 * Moved verbatim out of AdminDashboard.jsx.
 */

function KpiCard({ label, value, icon, trend, color = 'blue' }) {
  return (
    <div className={`kpi-card kpi-${color}`}>
      <div className="kpi-icon">{icon}</div>
      <div className="kpi-info">
        <span className="kpi-value">{value}</span>
        <span className="kpi-label">{label}</span>
        {trend && <span className="kpi-trend">{trend}</span>}
      </div>
    </div>
  );
}

function StatRow({ label, value }) {
  return (
    <div className="stat-row">
      <span className="stat-label">{label}</span>
      <span className="stat-value">{typeof value === 'object' ? value : String(value)}</span>
    </div>
  );
}

function StatusBadge({ status }) {
  const statusMap = {
    connected: { label: 'Connected', cls: 'status-green' },
    active: { label: 'Active', cls: 'status-green' },
    running: { label: 'Running', cls: 'status-green' },
    eligible: { label: 'Eligible', cls: 'status-green' },
    completed: { label: 'Completed', cls: 'status-green' },
    pending: { label: 'Pending', cls: 'status-yellow' },
    'pending setup': { label: 'Pending Setup', cls: 'status-yellow' },
    'not needed': { label: 'Not Needed', cls: 'status-gray' },
    'not eligible': { label: 'Not Eligible', cls: 'status-red' },
    disconnected: { label: 'Disconnected', cls: 'status-red' },
    inactive: { label: 'Inactive', cls: 'status-gray' },
    simulation: { label: 'Simulation', cls: 'status-yellow' },
    no_bookings: { label: 'No Bookings', cls: 'status-gray' },
  };

  const s = statusMap[status] || { label: status, cls: 'status-gray' };
  return <span className={`status-badge ${s.cls}`}>{s.label}</span>;
}

function BookingStatusBadge({ status }) {
  const statusMap = {
    monitoring: { label: 'Monitoring', cls: 'booking-status-monitoring' },
    lower_fare_found: { label: 'Lower Fare Found', cls: 'booking-status-lower' },
    savings_found: { label: 'Savings Found', cls: 'booking-status-savings' },
    confirmed_savings: { label: 'Confirmed', cls: 'booking-status-confirmed' },
    pending_user_confirmation: { label: 'Pending Confirmation', cls: 'booking-status-pending' },
    dismissed: { label: 'Dismissed', cls: 'booking-status-dismissed' },
    alert: { label: 'Alert', cls: 'booking-status-lower' },
  };

  const s = statusMap[status] || { label: status || 'Unknown', cls: 'booking-status-monitoring' };
  return <span className={`booking-status-badge ${s.cls}`}>{s.label}</span>;
}

export { KpiCard, StatRow, StatusBadge, BookingStatusBadge };
