/**
 * RevenueTab — moved verbatim out of AdminDashboard.jsx (was one 1,565-line file).
 */
import { IconCrown, IconDollar, IconLink, IconRefresh } from '../Icons';
import { KpiCard, StatRow, StatusBadge } from './SharedUI';

function RevenueTab({ revenue, affiliates }) {
  return (
    <div className="admin-section">
      <h2>Revenue &amp; Commissions</h2>

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

export default RevenueTab;
