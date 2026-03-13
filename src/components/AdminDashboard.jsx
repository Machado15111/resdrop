import { useState, useEffect } from 'react';
import { IconBarChart, IconUsers, IconDollar, IconSearch, IconLink, IconSettings, IconHotel, IconRefresh, IconClock, IconActivity, IconStar, IconCheck, IconCrown, IconZap, IconServer, IconTarget, IconChart, IconPercent, IconShield, IconTrendUp } from './Icons';
import './AdminDashboard.css';
import { API } from '../api';

function AdminDashboard({ onBack }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [adminData, setAdminData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [triggeringCheck, setTriggeringCheck] = useState(false);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const [dashboard, config] = await Promise.all([
        fetch(`${API}/admin/dashboard`).then(r => r.json()),
        fetch(`${API}/config`).then(r => r.json()),
      ]);
      setAdminData({ ...dashboard, config });
    } catch (err) {
      console.error('Failed to fetch admin data:', err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAdminData();
    const interval = setInterval(fetchAdminData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const triggerManualCheck = async () => {
    setTriggeringCheck(true);
    try {
      const res = await fetch(`${API}/admin/trigger-check`, { method: 'POST' });
      const result = await res.json();
      alert(`Price check complete!\n${result.bookingsChecked} bookings checked\n${result.savingsFound} new savings found`);
      fetchAdminData();
    } catch (err) {
      alert('Failed to trigger check: ' + err.message);
    }
    setTriggeringCheck(false);
  };

  if (loading && !adminData) {
    return (
      <div className="admin-loading">
        <div className="admin-spinner" />
        <p>Loading admin dashboard...</p>
      </div>
    );
  }

  if (!adminData) return null;

  const { stats, scheduler, users, bookings, revenue, affiliates, system } = adminData;

  return (
    <div className="admin">
      <div className="admin-header">
        <div className="container admin-header-inner">
          <div className="admin-header-left">
            <button className="btn btn-ghost" onClick={onBack}>← Back</button>
            <h1>Super Admin</h1>
            <span className="admin-badge">ADMIN PANEL</span>
          </div>
          <div className="admin-header-right">
            <span className="admin-live-dot" />
            <span className="admin-live-text">Live</span>
            <button
              className="btn btn-primary btn-sm"
              onClick={triggerManualCheck}
              disabled={triggeringCheck}
            >
              {triggeringCheck ? 'Checking...' : 'Run Price Check'}
            </button>
          </div>
        </div>
      </div>

      <div className="admin-tabs">
        <div className="container">
          {['overview', 'users', 'revenue', 'monitoring', 'affiliates', 'system'].map(tab => (
            <button
              key={tab}
              className={`admin-tab ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab === 'overview' && <IconBarChart size={16} />}
              {tab === 'users' && <IconUsers size={16} />}
              {tab === 'revenue' && <IconDollar size={16} />}
              {tab === 'monitoring' && <IconSearch size={16} />}
              {tab === 'affiliates' && <IconLink size={16} />}
              {tab === 'system' && <IconSettings size={16} />}
              {' '}{tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="admin-content container">
        {activeTab === 'overview' && <OverviewTab data={adminData} />}
        {activeTab === 'users' && <UsersTab users={users} stats={stats} />}
        {activeTab === 'revenue' && <RevenueTab revenue={revenue} affiliates={affiliates} />}
        {activeTab === 'monitoring' && <MonitoringTab scheduler={scheduler} stats={stats} />}
        {activeTab === 'affiliates' && <AffiliatesTab affiliates={affiliates} config={adminData.config} />}
        {activeTab === 'system' && <SystemTab system={system} config={adminData.config} />}
      </div>
    </div>
  );
}

// ─── OVERVIEW TAB ──────────────────────────────────────────
function OverviewTab({ data }) {
  const { stats, scheduler, users, revenue } = data;

  return (
    <div className="admin-section">
      <h2>Dashboard Overview</h2>

      <div className="admin-kpi-grid">
        <KpiCard
          label="Total Users"
          value={users?.total || 0}
          icon={<IconUsers size={24} />}
          trend={`+${users?.newToday || 0} today`}
          color="blue"
        />
        <KpiCard
          label="Active Bookings"
          value={stats?.totalBookings || 0}
          icon={<IconHotel size={24} />}
          trend={`${stats?.savingsFound || 0} with savings`}
          color="purple"
        />
        <KpiCard
          label="Total Savings Found"
          value={`$${(stats?.totalSavings || 0).toLocaleString()}`}
          icon={<IconDollar size={24} />}
          trend={`${stats?.successRate || 0}% success rate`}
          color="green"
        />
        <KpiCard
          label="Est. Revenue"
          value={`$${(revenue?.estimatedMonthly || 0).toLocaleString()}`}
          icon={<IconTrendUp size={24} />}
          trend="this month"
          color="orange"
        />
      </div>

      <div className="admin-grid-2">
        <div className="admin-card">
          <h3>Quick Stats</h3>
          <div className="admin-stat-list">
            <StatRow label="Avg Savings per Booking" value={`R$${stats?.avgSavings || 0}`} />
            <StatRow label="Price Checks Today" value={scheduler?.totalChecksRun || 0} />
            <StatRow label="Checks Per Day" value={`${scheduler?.checksPerDay || 3}x`} />
            <StatRow label="Last Check" value={scheduler?.lastCheck ? new Date(scheduler.lastCheck).toLocaleString() : 'Never'} />
            <StatRow label="Next Check" value={scheduler?.nextCheck ? new Date(scheduler.nextCheck).toLocaleString() : 'N/A'} />
            <StatRow label="API Mode" value={stats?.apiMode || 'SIMULATION'} />
          </div>
        </div>

        <div className="admin-card">
          <h3>Affiliate Programmes</h3>
          <div className="admin-stat-list">
            <StatRow
              label="Booking.com (Awin)"
              value={<StatusBadge status={data.config?.awinConfigured ? 'connected' : 'disconnected'} />}
            />
            <StatRow
              label="Expedia (Awin)"
              value={<StatusBadge status={data.affiliates?.expedia?.configured ? 'connected' : 'pending'} />}
            />
            <StatRow
              label="Booking.com Direct API"
              value={<StatusBadge status={data.config?.bookingComConfigured ? 'connected' : 'not needed'} />}
            />
            <StatRow label="Awin Publisher ID" value={data.config?.awinPublisherId || 'Not set'} />
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="admin-card">
        <h3>Recent Check History</h3>
        {scheduler?.recentHistory?.length > 0 ? (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Bookings Checked</th>
                <th>Savings Found</th>
                <th>New Savings</th>
                <th>Errors</th>
                <th>Duration</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {scheduler.recentHistory.slice().reverse().map((entry, i) => (
                <tr key={i}>
                  <td>{new Date(entry.timestamp).toLocaleString()}</td>
                  <td>{entry.bookingsChecked}</td>
                  <td>{entry.savingsFound}</td>
                  <td>R${entry.totalNewSavings || 0}</td>
                  <td className={entry.errors > 0 ? 'text-danger' : ''}>{entry.errors}</td>
                  <td>{entry.duration}ms</td>
                  <td><StatusBadge status={entry.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="admin-empty">No checks run yet. Click "Run Price Check" to start.</p>
        )}
      </div>
    </div>
  );
}

// ─── USERS TAB ─────────────────────────────────────────────
function UsersTab({ users, stats }) {
  return (
    <div className="admin-section">
      <h2>User Management</h2>

      <div className="admin-kpi-grid">
        <KpiCard label="Total Users" value={users?.total || 0} icon={<IconUsers size={24} />} color="blue" />
        <KpiCard label="Active Today" value={users?.activeToday || 0} icon={<IconActivity size={24} />} color="green" />
        <KpiCard label="New This Week" value={users?.newThisWeek || 0} icon={<IconTrendUp size={24} />} color="purple" />
        <KpiCard label="Premium Users" value={users?.premium || 0} icon={<IconStar size={24} />} color="orange" />
      </div>

      <div className="admin-grid-2">
        <div className="admin-card">
          <h3>User Breakdown</h3>
          <div className="admin-stat-list">
            <StatRow label="Free Tier" value={`${users?.freeTier || 0} users`} />
            <StatRow label="Premium Tier" value={`${users?.premium || 0} users`} />
            <StatRow label="Avg Bookings per User" value={users?.avgBookingsPerUser || 0} />
            <StatRow label="Users with Savings" value={`${users?.withSavings || 0} (${users?.savingsPercent || 0}%)`} />
          </div>
        </div>

        <div className="admin-card">
          <h3>User Growth</h3>
          <div className="admin-growth-chart">
            {(users?.growthData || []).map((d, i) => (
              <div key={i} className="growth-bar-wrap">
                <div className="growth-bar" style={{ height: `${Math.min(100, d.count * 10)}%` }}>
                  <span className="growth-value">{d.count}</span>
                </div>
                <span className="growth-label">{d.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* User List */}
      <div className="admin-card">
        <h3>Recent Users</h3>
        {users?.list?.length > 0 ? (
          <table className="admin-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Bookings</th>
                <th>Total Savings</th>
                <th>Plan</th>
                <th>Joined</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {users.list.map((user, i) => (
                <tr key={i}>
                  <td>{user.name}</td>
                  <td>{user.email}</td>
                  <td>{user.bookings}</td>
                  <td>R${user.totalSavings}</td>
                  <td><span className={`plan-badge plan-${user.plan}`}>{user.plan}</span></td>
                  <td>{new Date(user.joinedAt).toLocaleDateString()}</td>
                  <td><StatusBadge status={user.active ? 'active' : 'inactive'} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="admin-empty">No users yet. Users are created when bookings are submitted.</p>
        )}
      </div>
    </div>
  );
}

// ─── REVENUE TAB ───────────────────────────────────────────
function RevenueTab({ revenue, affiliates }) {
  return (
    <div className="admin-section">
      <h2>Revenue & Commissions</h2>

      <div className="admin-kpi-grid">
        <KpiCard
          label="Est. Monthly Revenue"
          value={`$${(revenue?.estimatedMonthly || 0).toLocaleString()}`}
          icon={<IconDollar size={24} />}
          color="green"
        />
        <KpiCard
          label="Affiliate Commissions"
          value={`$${(revenue?.affiliateCommissions || 0).toLocaleString()}`}
          icon={<IconLink size={24} />}
          color="blue"
        />
        <KpiCard
          label="Membership Revenue"
          value={`$${(revenue?.membershipRevenue || 0).toLocaleString()}`}
          icon={<IconCrown size={24} />}
          color="purple"
        />
        <KpiCard
          label="Rebookings This Month"
          value={revenue?.rebookingsThisMonth || 0}
          icon={<IconRefresh size={24} />}
          color="orange"
        />
      </div>

      <div className="admin-grid-2">
        <div className="admin-card">
          <h3>Commission Breakdown</h3>
          <div className="admin-stat-list">
            <StatRow label="Booking.com (est. 25-40%)" value={`R$${revenue?.bookingCommissions || 0}`} />
            <StatRow label="Expedia (4% lodging)" value={`R$${revenue?.expediaCommissions || 0}`} />
            <StatRow label="Other OTAs" value={`R$${revenue?.otherCommissions || 0}`} />
            <StatRow label="Total Booking Value" value={`R$${(revenue?.totalBookingValue || 0).toLocaleString()}`} />
            <StatRow label="Avg Commission Rate" value={`${revenue?.avgCommissionRate || 0}%`} />
          </div>
        </div>

        <div className="admin-card">
          <h3>Revenue Projections</h3>
          <div className="admin-stat-list">
            <StatRow label="Current MRR" value={`R$${revenue?.currentMRR || 0}`} />
            <StatRow label="Projected ARR" value={`R$${(revenue?.projectedARR || 0).toLocaleString()}`} />
            <StatRow label="LTV per User" value={`R$${revenue?.ltvPerUser || 0}`} />
            <StatRow label="CAC Target" value={`R$${revenue?.cacTarget || 0}`} />
            <StatRow label="Break-even Users" value={revenue?.breakEvenUsers || 'N/A'} />
          </div>
        </div>
      </div>

      <div className="admin-card">
        <h3>Expedia Commission Rates</h3>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Category</th>
              <th>Commission Rate</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {(affiliates?.expediaCommissions || []).map((c, i) => (
              <tr key={i}>
                <td>{c.category}</td>
                <td>{c.label}</td>
                <td><StatusBadge status={c.eligible ? 'eligible' : 'not eligible'} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── MONITORING TAB ────────────────────────────────────────
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
        <h3>📊 Cost Estimate (2-3x daily checks)</h3>
        <div className="admin-info-box">
          <p><strong>Current Configuration:</strong> {scheduler?.checksPerDay || 3} checks/day</p>
          <p><strong>Per check:</strong> Each booking generates ~6 price lookups across OTA sources</p>
          <p><strong>Daily API calls:</strong> {(stats?.totalBookings || 0)} bookings × {scheduler?.checksPerDay || 3} checks × 6 sources = ~{(stats?.totalBookings || 0) * (scheduler?.checksPerDay || 3) * 6} calls/day</p>
          <p><strong>Monthly estimate:</strong> ~{(stats?.totalBookings || 0) * (scheduler?.checksPerDay || 3) * 6 * 30} calls/month</p>
        </div>
      </div>
    </div>
  );
}

// ─── AFFILIATES TAB ────────────────────────────────────────
function AffiliatesTab({ affiliates, config }) {
  return (
    <div className="admin-section">
      <h2>Affiliate Programmes</h2>

      <div className="admin-grid-2">
        {/* Booking.com */}
        <div className="admin-card affiliate-card">
          <div className="affiliate-header">
            <span className="affiliate-logo">🅱️</span>
            <div>
              <h3>Booking.com</h3>
              <p className="affiliate-network">via Awin Network</p>
            </div>
            <StatusBadge status={config?.awinConfigured ? 'connected' : 'pending'} />
          </div>
          <div className="admin-stat-list">
            <StatRow label="Advertiser ID (Brazil)" value={affiliates?.booking?.advertiserIdBrazil || 'N/A'} />
            <StatRow label="Publisher ID" value={config?.awinPublisherId || 'Not set'} />
            <StatRow label="Programme Status" value={affiliates?.booking?.programmeStatus || 'Pending approval'} />
            <StatRow label="Commission" value="25-40% (varies)" />
            <StatRow label="Cookie Window" value="Session-based" />
          </div>
        </div>

        {/* Expedia */}
        <div className="admin-card affiliate-card">
          <div className="affiliate-header">
            <span className="affiliate-logo">✈️</span>
            <div>
              <h3>Expedia</h3>
              <p className="affiliate-network">via Awin Network</p>
            </div>
            <StatusBadge status={affiliates?.expedia?.configured ? 'connected' : 'pending'} />
          </div>
          <div className="admin-stat-list">
            <StatRow label="Advertiser ID" value={affiliates?.expedia?.advertiserId || 'Not set'} />
            <StatRow label="Lodging Commission" value="4%" />
            <StatRow label="Packages Commission" value="2%" />
            <StatRow label="Cars Commission" value="1.5%" />
            <StatRow label="Cookie Window" value="7 days" />
            <StatRow label="Attribution" value="Last click via Awin" />
          </div>
        </div>
      </div>

      {/* Commission comparison */}
      <div className="admin-card">
        <h3>Commission Comparison</h3>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Platform</th>
              <th>Lodging</th>
              <th>Packages</th>
              <th>Cars</th>
              <th>Rentals</th>
              <th>Cookie</th>
              <th>Attribution</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Booking.com</strong></td>
              <td>25-40%</td>
              <td>N/A</td>
              <td>N/A</td>
              <td>N/A</td>
              <td>Session</td>
              <td>Last click</td>
            </tr>
            <tr>
              <td><strong>Expedia</strong></td>
              <td>4%</td>
              <td>2%</td>
              <td>1.5%</td>
              <td>2%</td>
              <td>7 days</td>
              <td>Last click (Awin)</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="admin-card">
        <h3>⚠️ Expedia Restrictions</h3>
        <div className="admin-grid-2">
          <div>
            <h4 className="admin-subtitle">✅ Allowed Affiliate Types</h4>
            <ul className="admin-list">
              <li>Coupons</li>
              <li>Social Media</li>
              <li>Content</li>
              <li>Email Marketing</li>
              <li>Cashback</li>
            </ul>
          </div>
          <div>
            <h4 className="admin-subtitle">❌ Not Allowed / Not Eligible</h4>
            <ul className="admin-list admin-list-danger">
              <li>Siteunder</li>
              <li>Direct Search (SEM)</li>
              <li>Flights — 0% commission</li>
              <li>Insurance — 0% commission</li>
              <li>Lodging with coupon — 0% commission</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── SYSTEM TAB ────────────────────────────────────────────
function SystemTab({ system, config }) {
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

      <div className="admin-card">
        <h3>💡 Estimated Monthly Costs</h3>
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
        <p className="admin-note">* API costs are $0 — using free affiliate links via Awin (no per-call charges)</p>
      </div>
    </div>
  );
}

// ─── SHARED COMPONENTS ─────────────────────────────────────

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

export default AdminDashboard;
