import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../i18n';
import { API } from '../api';
import './AnalyticsDashboard.css';

function AnalyticsDashboard() {
  const { authFetch } = useAuth();
  const { lang } = useI18n();
  const pt = lang === 'pt';
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalBookings: 0,
    totalSaved: 0,
    avgSavings: 0,
    savingsFound: 0,
    monitoringCount: 0,
    bestDeal: null,
  });
  const [monthlyData, setMonthlyData] = useState([]);
  const [byStatus, setByStatus] = useState({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await authFetch(`${API}/bookings`);
        const data = await res.json();
        setBookings(data);
        calculateStats(data);
      } catch (err) {
        console.error('Failed to fetch bookings:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [authFetch]);

  const calculateStats = (data) => {
    if (!data || data.length === 0) {
      setStats({
        totalBookings: 0,
        totalSaved: 0,
        avgSavings: 0,
        savingsFound: 0,
        monitoringCount: 0,
        bestDeal: null,
      });
      return;
    }

    const totalSaved = data.reduce((sum, b) => sum + (b.totalSavings || 0), 0);
    const avgSavings = data.length > 0 ? totalSaved / data.length : 0;
    const savingsFound = data.filter(b => b.totalSavings > 0).length;
    const monitoringCount = data.filter(b => ['monitoring', 'lower_fare_found'].includes(b.status)).length;
    const bestDeal = data.reduce((best, b) =>
      (b.totalSavings > (best?.totalSavings || 0)) ? b : best
    , null);

    setStats({
      totalBookings: data.length,
      totalSaved: Math.round(totalSaved * 100) / 100,
      avgSavings: Math.round(avgSavings * 100) / 100,
      savingsFound,
      monitoringCount,
      bestDeal,
    });

    // Calculate monthly data
    const monthlyMap = {};
    data.forEach(b => {
      const date = new Date(b.createdAt);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!monthlyMap[monthKey]) monthlyMap[monthKey] = 0;
      monthlyMap[monthKey] += b.totalSavings || 0;
    });
    const sorted = Object.entries(monthlyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([month, saved]) => ({ month, saved: Math.round(saved * 100) / 100 }));
    setMonthlyData(sorted);

    // Calculate by status
    const statusMap = {};
    data.forEach(b => {
      statusMap[b.status] = (statusMap[b.status] || 0) + 1;
    });
    setByStatus(statusMap);
  };

  if (loading) {
    return <div className="analytics-loading">{pt ? 'Carregando análises...' : 'Loading analytics...'}</div>;
  }

  return (
    <div className="analytics-dashboard">
      <div className="analytics-container">
        <h1 className="analytics-title">{pt ? 'Análise das Suas Economias' : 'Your Savings Analytics'}</h1>

        {/* Key Metrics */}
        <div className="analytics-grid">
          <div className="analytics-card metric-card">
            <div className="metric-label">{pt ? 'Total Economizado' : 'Total Saved'}</div>
            <div className="metric-value">${stats.totalSaved.toFixed(2)}</div>
            <div className="metric-subtext">{stats.savingsFound} {pt ? 'reservas com economia' : 'bookings with savings'}</div>
          </div>

          <div className="analytics-card metric-card">
            <div className="metric-label">{pt ? 'Média por Reserva' : 'Average per Booking'}</div>
            <div className="metric-value">${stats.avgSavings.toFixed(2)}</div>
            <div className="metric-subtext">{pt ? 'Quando há economia' : 'When savings found'}</div>
          </div>

          <div className="analytics-card metric-card">
            <div className="metric-label">{pt ? 'Total de Reservas' : 'Total Bookings'}</div>
            <div className="metric-value">{stats.totalBookings}</div>
            <div className="metric-subtext">{stats.monitoringCount} {pt ? 'em monitoramento ativo' : 'actively monitoring'}</div>
          </div>

          <div className="analytics-card metric-card">
            <div className="metric-label">{pt ? 'Taxa de Sucesso' : 'Success Rate'}</div>
            <div className="metric-value">
              {stats.totalBookings > 0
                ? Math.round((stats.savingsFound / stats.totalBookings) * 100)
                : 0}%
            </div>
            <div className="metric-subtext">{pt ? 'Oferta melhor encontrada' : 'Found better deal'}</div>
          </div>
        </div>

        {/* Best Deal Highlight */}
        {stats.bestDeal && (
          <div className="analytics-card best-deal-card">
            <div className="best-deal-header">🏆 {pt ? 'Melhor Oferta Encontrada' : 'Best Deal Found'}</div>
            <div className="best-deal-content">
              <div className="best-deal-hotel">{stats.bestDeal.hotelName}</div>
              <div className="best-deal-location">{stats.bestDeal.destination}</div>
              <div className="best-deal-savings">
                {pt ? 'Economizou' : 'Saved'} <span className="savings-amount">${stats.bestDeal.totalSavings.toFixed(2)}</span>
              </div>
              <div className="best-deal-meta">
                {stats.bestDeal.checkinDate} → {stats.bestDeal.checkoutDate}
              </div>
            </div>
          </div>
        )}

        {/* Charts */}
        <div className="analytics-chart-grid">
          {/* Savings Over Time */}
          <div className="analytics-card chart-card">
            <h3 className="chart-title">{pt ? 'Economia ao Longo do Tempo' : 'Savings Over Time'}</h3>
            {monthlyData.length > 0 ? (
              <div className="chart-container">
                <div className="chart-bars">
                  {monthlyData.map((d, i) => {
                    const maxVal = Math.max(...monthlyData.map(x => x.saved), 1);
                    const height = (d.saved / maxVal) * 100;
                    return (
                      <div key={i} className="bar-wrapper">
                        <div
                          className="bar"
                          style={{ height: `${height}%` }}
                          title={`${d.month}: $${d.saved}`}
                        />
                        <div className="bar-label">{d.month.split('-')[1]}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="chart-empty">{pt ? 'Ainda sem dados de economia' : 'No savings data yet'}</div>
            )}
          </div>

          {/* Bookings by Status */}
          <div className="analytics-card chart-card">
            <h3 className="chart-title">{pt ? 'Reservas por Status' : 'Bookings by Status'}</h3>
            {Object.keys(byStatus).length > 0 ? (
              <div className="status-breakdown">
                {Object.entries(byStatus).map(([status, count]) => (
                  <div key={status} className="status-item">
                    <div className="status-name">
                      <span className={`status-badge status-${status}`}>{status}</span>
                      <span className="status-count">{count}</span>
                    </div>
                    <div className="status-bar-bg">
                      <div
                        className="status-bar"
                        style={{ width: `${(count / stats.totalBookings) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="chart-empty">{pt ? 'Ainda sem reservas' : 'No bookings yet'}</div>
            )}
          </div>
        </div>

        {/* ROI Summary */}
        {stats.totalBookings > 0 && (
          <div className="analytics-card roi-card">
            <h3 className="roi-title">{pt ? 'Resumo de Retorno' : 'ROI Summary'}</h3>
            <div className="roi-content">
              <div className="roi-stat">
                <div className="roi-label">{pt ? 'Monitoramento Ativo' : 'Monitoring Active'}</div>
                <div className="roi-value">{stats.monitoringCount} {pt ? 'reservas' : 'bookings'}</div>
              </div>
              <div className="roi-stat">
                <div className="roi-label">{pt ? 'Prontas para Remarcar' : 'Ready to Rebook'}</div>
                <div className="roi-value">
                  {Object.entries(byStatus).find(([k]) => k === 'lower_fare_found')?.[1] || 0}
                  {' '}{pt ? 'reservas' : 'bookings'}
                </div>
              </div>
              <div className="roi-stat">
                <div className="roi-label">{pt ? 'Economia Média por Remarcação' : 'Avg Savings per Rebook'}</div>
                <div className="roi-value">
                  ${stats.savingsFound > 0 ? (stats.totalSaved / stats.savingsFound).toFixed(2) : 0}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {stats.totalBookings === 0 && (
          <div className="analytics-empty">
            <div className="empty-icon">📊</div>
            <h3>{pt ? 'Ainda Sem Análises' : 'No Analytics Yet'}</h3>
            <p>{pt ? 'Adicione sua primeira reserva para ver a análise de economia' : 'Add your first booking to see savings analytics'}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default AnalyticsDashboard;
