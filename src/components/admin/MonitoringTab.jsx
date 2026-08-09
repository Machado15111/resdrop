/**
 * MonitoringTab — moved verbatim out of AdminDashboard.jsx (was one 1,565-line file).
 */
import { IconActivity, IconChart, IconCheck, IconRefresh, IconTarget } from '../Icons';
import { KpiCard, StatRow } from './SharedUI';
import { API } from '../../api';

function MonitoringTab({ scheduler, stats }) {
  return (
    <div className="admin-section">
      <h2>Price Monitoring</h2>

      <div className="admin-kpi-grid">
        <KpiCard
          label="Scheduler Status"
          value={scheduler?.running ? 'RUNNING' : 'STOPPED'}
          icon={scheduler?.running ? <IconActivity size={24} /> : <IconTarget size={24} />}
          color={scheduler?.running ? 'green' : 'red'}
        />
        <KpiCard
          label="Checks Per Day"
          value={`${scheduler?.checksPerDay || 0}x`}
          icon={<IconRefresh size={24} />}
          color="blue"
        />
        <KpiCard
          label="Total Checks Run"
          value={scheduler?.totalChecksRun || 0}
          icon={<IconCheck size={24} />}
          color="purple"
        />
        <KpiCard
          label="Success Rate"
          value={`${stats?.successRate || 0}%`}
          icon={<IconChart size={24} />}
          color="orange"
        />
      </div>

      <div className="admin-grid-2">
        <div className="admin-card">
          <h3>Schedule Configuration</h3>
          <div className="admin-stat-list">
            <StatRow label="Check Times" value={(scheduler?.checkHours || []).join(', ')} />
            <StatRow label="Last Check" value={scheduler?.lastCheck ? new Date(scheduler.lastCheck).toLocaleString() : 'Never'} />
            <StatRow label="Next Check" value={scheduler?.nextCheck ? new Date(scheduler.nextCheck).toLocaleString() : 'N/A'} />
            <StatRow label="Active Bookings" value={stats?.totalBookings || 0} />
            <StatRow label="Est. API Calls/Day" value={`${(stats?.totalBookings || 0) * (scheduler?.checksPerDay || 3) * 6} calls`} />
          </div>
        </div>

        <div className="admin-card">
          <h3>Check Performance</h3>
          <div className="admin-stat-list">
            {scheduler?.recentHistory?.slice(-5).reverse().map((entry, i) => (
              <StatRow
                key={i}
                label={new Date(entry.timestamp).toLocaleTimeString()}
                value={`${entry.bookingsChecked} checked, ${entry.savingsFound} savings (${entry.duration}ms)`}
              />
            ))}
            {(!scheduler?.recentHistory || scheduler.recentHistory.length === 0) && (
              <p className="admin-empty">No checks yet</p>
            )}
          </div>
        </div>
      </div>

      <div className="admin-card">
        <h3>Cost Estimate (2-3x daily checks)</h3>
        <div className="admin-info-box">
          <p><strong>Current Configuration:</strong> {scheduler?.checksPerDay || 3} checks/day</p>
          <p><strong>Per check:</strong> Each booking generates ~6 price lookups across OTA sources</p>
          <p><strong>Daily API calls:</strong> {(stats?.totalBookings || 0)} bookings x {scheduler?.checksPerDay || 3} checks x 6 sources = ~{(stats?.totalBookings || 0) * (scheduler?.checksPerDay || 3) * 6} calls/day</p>
          <p><strong>Monthly estimate:</strong> ~{(stats?.totalBookings || 0) * (scheduler?.checksPerDay || 3) * 6 * 30} calls/month</p>
        </div>
      </div>
    </div>
  );
}

// ─── AFFILIATES TAB ────────────────────────────────────────

export default MonitoringTab;
