/**
 * AffiliatesTab — moved verbatim out of AdminDashboard.jsx (was one 1,565-line file).
 */
import { StatRow, StatusBadge } from './SharedUI';

function AffiliatesTab({ affiliates, config }) {
  return (
    <div className="admin-section">
      <h2>Affiliate Programmes</h2>

      <div className="admin-grid-2">
        {/* Booking.com */}
        <div className="admin-card affiliate-card">
          <div className="affiliate-header">
            <span className="affiliate-logo">B</span>
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
            <span className="affiliate-logo">E</span>
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
        <h3>Expedia Restrictions</h3>
        <div className="admin-grid-2">
          <div>
            <h4 className="admin-subtitle">Allowed Affiliate Types</h4>
            <ul className="admin-list">
              <li>Coupons</li>
              <li>Social Media</li>
              <li>Content</li>
              <li>Email Marketing</li>
              <li>Cashback</li>
            </ul>
          </div>
          <div>
            <h4 className="admin-subtitle">Not Allowed / Not Eligible</h4>
            <ul className="admin-list admin-list-danger">
              <li>Siteunder</li>
              <li>Direct Search (SEM)</li>
              <li>Flights -- 0% commission</li>
              <li>Insurance -- 0% commission</li>
              <li>Lodging with coupon -- 0% commission</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── SYSTEM TAB ────────────────────────────────────────────

export default AffiliatesTab;
