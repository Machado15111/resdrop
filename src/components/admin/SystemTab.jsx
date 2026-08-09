/**
 * SystemTab — moved verbatim out of AdminDashboard.jsx (was one 1,565-line file).
 */
import { IconClock, IconServer, IconSettings } from '../Icons';
import { KpiCard, StatRow, StatusBadge } from './SharedUI';
import { API } from '../../api';

function SystemTab({ system, config }) {
  // Plain derived value, not state. This was a useState + useEffect that only
  // ever copied config.resendConfigured into state — which rendered once with
  // `null` (reported as "disconnected") before the effect corrected it.
  const emailStatus = !!config?.resendConfigured;

  return (
    <div className="admin-section">
      <h2>System Health</h2>

      <div className="admin-kpi-grid">
        <KpiCard label="Uptime" value={system?.uptime || 'N/A'} icon={<IconClock size={24} />} color="green" />
        <KpiCard label="Memory" value={system?.memoryUsage || 'N/A'} icon={<IconServer size={24} />} color="blue" />
        <KpiCard label="API Mode" value={config?.apiMode || 'N/A'} icon={<IconSettings size={24} />} color="purple" />
        <KpiCard label="Server" value="Node.js" icon={<IconServer size={24} />} color="orange" />
      </div>

      <div className="admin-grid-2">
        <div className="admin-card">
          <h3>Server Info</h3>
          <div className="admin-stat-list">
            <StatRow label="Node.js Version" value={system?.nodeVersion || 'N/A'} />
            <StatRow label="Server Uptime" value={system?.uptime || 'N/A'} />
            <StatRow label="Memory Used" value={system?.memoryUsage || 'N/A'} />
            <StatRow label="Platform" value={system?.platform || 'N/A'} />
            <StatRow label="Environment" value={system?.environment || 'development'} />
          </div>
        </div>

        <div className="admin-card">
          <h3>API Connections</h3>
          <div className="admin-stat-list">
            <StatRow
              label="Awin API"
              value={<StatusBadge status={config?.awinConfigured ? 'connected' : 'disconnected'} />}
            />
            <StatRow
              label="Booking.com API"
              value={<StatusBadge status={config?.bookingComConfigured ? 'connected' : 'simulation'} />}
            />
            <StatRow
              label="Expedia (Awin)"
              value={<StatusBadge status={system?.expediaConfigured ? 'connected' : 'pending setup'} />}
            />
            <StatRow label="Sandbox Mode" value={config?.sandboxMode ? 'ON' : 'OFF'} />
          </div>
        </div>
      </div>

      {/* Email Service Status */}
      <div className="admin-card">
        <h3>Email Service (Resend)</h3>
        <div className="admin-stat-list">
          <StatRow
            label="Resend API"
            value={<StatusBadge status={emailStatus ? 'connected' : 'disconnected'} />}
          />
          <StatRow label="From Address" value={config?.resendFrom || 'Not configured'} />
          <StatRow label="Status" value={emailStatus ? 'Ready to send emails' : 'Set RESEND_API_KEY to enable'} />
        </div>
      </div>

      <div className="admin-card">
        <h3>Estimated Monthly Costs</h3>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Service</th>
              <th>1K Users</th>
              <th>10K Users</th>
              <th>100K Users</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>Hosting (VPS/Cloud)</td><td>$5-15</td><td>$50-100</td><td>$300-500</td></tr>
            <tr><td>Database (PostgreSQL)</td><td>$0-15</td><td>$25-50</td><td>$100-200</td></tr>
            <tr><td>Email/Notifications</td><td>$0-10</td><td>$25-50</td><td>$100-300</td></tr>
            <tr><td>CDN + SSL + Domain</td><td>$10-20</td><td>$20-40</td><td>$50-100</td></tr>
            <tr><td>Monitoring/Logging</td><td>$0</td><td>$10-20</td><td>$50-100</td></tr>
            <tr className="admin-table-total"><td><strong>Total</strong></td><td><strong>$15-60</strong></td><td><strong>$130-260</strong></td><td><strong>$600-1,200</strong></td></tr>
          </tbody>
        </table>
        <p className="admin-note">* API costs are $0 -- using free affiliate links via Awin (no per-call charges)</p>
      </div>
    </div>
  );
}

// ─── SHARED COMPONENTS ─────────────────────────────────────

export default SystemTab;
