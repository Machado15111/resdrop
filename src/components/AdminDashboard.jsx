import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { IconBarChart, IconUsers, IconDollar, IconSearch, IconLink, IconSettings, IconHotel, IconRefresh, IconClock, IconActivity, IconServer } from './Icons';
import './AdminDashboard.css';
import { API } from '../api';

// Each tab lives in its own file under admin/. This file is now just the shell:
// data fetch, tab state, and routing between them.
import OverviewTab from './admin/OverviewTab';
import BookingsTab from './admin/BookingsTab';
import UsersTab from './admin/UsersTab';
import RevenueTab from './admin/RevenueTab';
import MonitoringTab from './admin/MonitoringTab';
import ActivityTab from './admin/ActivityTab';
import AffiliatesTab from './admin/AffiliatesTab';
import SystemTab from './admin/SystemTab';

function AdminDashboard() {
  const navigate = useNavigate();
  const { authFetch } = useAuth();
  const onBack = () => navigate('/dashboard');
  const [activeTab, setActiveTab] = useState('overview');
  const [adminData, setAdminData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [triggeringCheck, setTriggeringCheck] = useState(false);

  const fetchAdminData = useCallback(async () => {
    setLoading(true);
    try {
      const [dashboard, config] = await Promise.all([
        authFetch(`${API}/admin/dashboard`).then(r => r.json()),
        authFetch(`${API}/config`).then(r => r.json()),
      ]);
      setAdminData({ ...dashboard, config });
    } catch (err) {
      console.error('Failed to fetch admin data:', err);
    }
    setLoading(false);
  }, [authFetch]);

  useEffect(() => {
    fetchAdminData();
    const interval = setInterval(fetchAdminData, 30000);
    return () => clearInterval(interval);
  }, [fetchAdminData]);

  const triggerManualCheck = async () => {
    setTriggeringCheck(true);
    try {
      const res = await authFetch(`${API}/admin/trigger-check`, { method: 'POST' });
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

  const { stats, scheduler, users, revenue, affiliates, system } = adminData;

  const tabs = ['overview', 'bookings', 'users', 'revenue', 'monitoring', 'activity', 'affiliates', 'system'];
  const tabIcons = {
    overview: <IconBarChart size={16} />,
    bookings: <IconHotel size={16} />,
    users: <IconUsers size={16} />,
    revenue: <IconDollar size={16} />,
    monitoring: <IconSearch size={16} />,
    activity: <IconActivity size={16} />,
    affiliates: <IconLink size={16} />,
    system: <IconSettings size={16} />,
  };

  return (
    <div className="admin">
      <div className="admin-header">
        <div className="container admin-header-inner">
          <div className="admin-header-left">
            <button className="btn btn-ghost" onClick={onBack}>&#8592; Back</button>
            <h1>Super Admin</h1>
            <span className="admin-badge">ADMIN PANEL</span>
          </div>
          <div className="admin-header-right">
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => navigate('/admin/special-fares')}
            >
              Tarifas Especiais
            </button>
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
          {tabs.map(tab => (
            <button
              key={tab}
              className={`admin-tab ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tabIcons[tab]}
              {' '}{tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="admin-content container">
        {activeTab === 'overview' && <OverviewTab data={adminData} />}
        {activeTab === 'bookings' && <BookingsTab authFetch={authFetch} />}
        {activeTab === 'users' && <UsersTab users={users} stats={stats} authFetch={authFetch} />}
        {activeTab === 'revenue' && <RevenueTab revenue={revenue} affiliates={affiliates} />}
        {activeTab === 'monitoring' && <MonitoringTab scheduler={scheduler} stats={stats} />}
        {activeTab === 'activity' && <ActivityTab authFetch={authFetch} />}
        {activeTab === 'affiliates' && <AffiliatesTab affiliates={affiliates} config={adminData.config} />}
        {activeTab === 'system' && <SystemTab system={system} config={adminData.config} authFetch={authFetch} />}
      </div>
    </div>
  );
}

// ─── OVERVIEW TAB (Task 11 Redesign) ─────────────────────

export default AdminDashboard;
