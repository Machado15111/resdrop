/**
 * OverviewTab — moved verbatim out of AdminDashboard.jsx (was one 1,565-line file).
 */
import { IconActivity, IconCheck, IconClock, IconHotel, IconMail, IconSearch, IconServer, IconShield, IconUsers, IconX, IconZap } from '../Icons';
import { KpiCard, StatusBadge } from './SharedUI';
import { API } from '../../api';

function OverviewTab({ data }) {
  const { inboundStats, recentImports = [], stats } = data;

  const ib = inboundStats || {
    emailsToday: 0,
    emailsThisMonth: 0,
    bookingsCreated: stats?.totalBookings || 0,
    activeMonitoring: 0,
    needsInformation: 0,
    failed: 0,
    duplicate: 0,
    unknownSenders: 0,
    nuiteeMatches: 0,
    googleFallbackMatches: 0,
    awaitingReview: 0,
    attachmentsProcessed: 0,
    queueDepth: 0,
    lastUpdated: new Date().toISOString(),
  };

  return (
    <div className="admin-section animate-in">
      <div className="admin-section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2>Inbound Email & Import Pipeline</h2>
          <span style={{ fontSize: 12, color: '#6b7280' }}>
            Last updated: {ib.lastUpdated ? new Date(ib.lastUpdated).toLocaleTimeString() : 'Just now'}
          </span>
        </div>
      </div>

      {/* 12 Live Metric Cards from DB */}
      <div className="admin-kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <KpiCard label="Emails Today" value={ib.emailsToday} icon={<IconMail size={20} />} trend="today" color="blue" />
        <KpiCard label="Emails This Month" value={ib.emailsThisMonth} icon={<IconMail size={20} />} trend="this month" color="blue" />
        <KpiCard label="Bookings Created" value={ib.bookingsCreated} icon={<IconHotel size={20} />} trend="total active" color="green" />
        <KpiCard label="Active Monitoring" value={ib.activeMonitoring} icon={<IconCheck size={20} />} trend="24/7 scanning" color="green" />

        <KpiCard label="Needs Info" value={ib.needsInformation} icon={<IconActivity size={20} />} trend="incomplete" color="orange" />
        <KpiCard label="Failed Imports" value={ib.failed} icon={<IconX size={20} />} trend="parse errors" color="red" />
        <KpiCard label="Duplicates" value={ib.duplicate} icon={<IconShield size={20} />} trend="deduped" color="purple" />
        <KpiCard label="Unknown Senders" value={ib.unknownSenders} icon={<IconUsers size={20} />} trend="pending signup" color="orange" />

        <KpiCard label="Nuitée Matches" value={ib.nuiteeMatches} icon={<IconZap size={20} />} trend="primary match" color="green" />
        <KpiCard label="Google Fallbacks" value={ib.googleFallbackMatches} icon={<IconSearch size={20} />} trend="capped API" color="blue" />
        <KpiCard label="Awaiting Review" value={ib.awaitingReview} icon={<IconClock size={20} />} trend="queue" color="orange" />
        <KpiCard label="Attachments Processed" value={ib.attachmentsProcessed} icon={<IconServer size={20} />} trend="PDF/DOCX/OCR" color="purple" />
      </div>

      {/* Recent Imports Table */}
      <div className="admin-card">
        <h3>Recent Imports</h3>
        {recentImports.length > 0 ? (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Received</th>
                  <th>Source</th>
                  <th>User</th>
                  <th>Hotel</th>
                  <th>Status</th>
                  <th>Missing Fields</th>
                </tr>
              </thead>
              <tbody>
                {recentImports.map((imp, i) => (
                  <tr key={imp.id || i}>
                    <td>{imp.createdAt ? new Date(imp.createdAt).toLocaleString() : '-'}</td>
                    <td><span className="activity-action-badge">{imp.source || 'email'}</span></td>
                    <td>{imp.userEmail || <span style={{ color: '#d97706' }}>Unknown (Token sent)</span>}</td>
                    <td><strong>{imp.extractedData?.hotelName || '—'}</strong></td>
                    <td><StatusBadge status={imp.status === 'ACTIVE_MONITORING' ? 'connected' : imp.status === 'NEEDS_INFORMATION' ? 'pending' : 'disconnected'} /></td>
                    <td>{Array.isArray(imp.missingFields) && imp.missingFields.length > 0 ? imp.missingFields.join(', ') : 'None'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="admin-empty">No data available yet.</p>
        )}
      </div>
    </div>
  );
}

// ─── BOOKINGS TAB ─────────────────────────────────────────

export default OverviewTab;
