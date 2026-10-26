import { useLanguage } from '../i18n/Language';
import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import {
  User, FolderPlus, RefreshCw, AlertTriangle, GitMerge, Search,
  RotateCcw, Eye, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight
} from 'lucide-react';

export default function OfficerHome({ user, refreshTrigger, onViewCase, onViewInstitution }) {
 const { t } = useLanguage();
  const [summary, setSummary] = useState(null);
  const [cases, setCases] = useState([]);
  const [totalCases, setTotalCases] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [loading, setLoading] = useState(true);

  // Filters matching Slide 1
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dueFilter, setDueFilter] = useState(''); // 'overdue'

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch Summary KPIs from DB
      const summaryParams = user?.bureau ? { bureau: user.bureau } : {};
      const sumRes = await api.getDashboardSummary(summaryParams);
      setSummary(sumRes.data);

      // 2. Fetch Cases from DB
      const caseParams = {
        page,
        pageSize,
        q: searchQuery || undefined,
        category: categoryFilter || undefined,
        status: statusFilter || undefined,
        overdue: dueFilter === 'overdue' ? 'true' : undefined
      };
      // Allow officer/head to see their bureau cases by default
      if (user?.bureau && (user.role === 'OFFICER' || user.role === 'HEAD')) {
        caseParams.bureau = user.bureau;
      }

      const caseRes = await api.getCases(caseParams);
      setCases(caseRes.data || []);
      setTotalCases(caseRes.meta?.total || 0);
    } catch (err) {
      console.error('Error fetching dashboard data from DB:', err);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, searchQuery, categoryFilter, statusFilter, dueFilter, user]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData, refreshTrigger]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchDashboardData();
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setCategoryFilter('');
    setStatusFilter('');
    setDueFilter('');
    setPage(1);
  };

  const totalPages = Math.ceil(totalCases / pageSize) || 1;

  // Real-time formatted timestamp
  const [loginTimeDisplay] = useState(() => {
    const now = new Date();
    return now.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }) + ', ' + now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  });

  const [todayIso] = useState(() => new Date().toISOString().slice(0, 10));

  return (
    <div>
      {/* 1. Welcome Officer Banner (Dynamic based on DB user record) */}
      <div className="welcome-banner">
        <div className="welcome-info">
          <div className="welcome-name">
            <span style={{ fontSize: '18px' }}><User size={18} /></span>
            <span>Welcome, {user?.fullName || user?.username || 'Officer'}</span>
          </div>
          <div className="welcome-meta">
            Bureau: <strong>{user?.bureau || 'Central'}</strong> ({
              user?.bureau === 'RB' ? 'Rehabilitation & Regulatory Bureau' :
              user?.bureau === 'PGRC' ? 'Public Grievance Redressal Cell' :
              user?.bureau === 'RO' ? 'Regional Office' :
              user?.bureau === 'CELL' ? 'Special AICTE Cell' : 'All Bureaus'
            })
            {user?.region && <span> | Region: <strong>{user.region}</strong></span>}
          </div>
        </div>
        <div className="last-login-meta">
          Active Session: {loginTimeDisplay} IST
        </div>
      </div>

      {/* 2. Four KPI Metric Cards (Directly calculated from Postgres DB) */}
      <div className="kpi-metrics-grid">
        <div className="kpi-card kpi-green">
          <div className="kpi-icon-wrap">
            <FolderPlus size={24} />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">{t("New Cases")}</span>
            <span className="kpi-value">{summary?.byStatus?.NEW || 0}</span>
          </div>
        </div>

        <div className="kpi-card kpi-blue">
          <div className="kpi-icon-wrap">
            <RefreshCw size={24} />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">{t("Under Process")}</span>
            <span className="kpi-value">{summary?.byStatus?.UNDER_PROCESS || 0}</span>
          </div>
        </div>

        <div className="kpi-card kpi-red">
          <div className="kpi-icon-wrap">
            <AlertTriangle size={24} />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">{t("Overdue Cases")}</span>
            <span className="kpi-value">{summary?.overdue || 0}</span>
          </div>
        </div>

        <div className="kpi-card kpi-amber">
          <div className="kpi-icon-wrap">
            <GitMerge size={24} />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">{t("Overlap Alerts")}</span>
            <span className="kpi-value">{summary?.openOverlapGroups || 0}</span>
          </div>
        </div>
      </div>

      {/* 3. Filter & Search Panel */}
      <div className="gov-filter-panel">
        <div className="gov-filter-header">
          <span>{user?.bureau ? `My Cases (${user.bureau})` : 'All Cases Directory'}</span>
          <span style={{ fontSize: '13px', color: '#64748B', fontWeight: 500 }}>
            Total Live Cases: <strong>{totalCases}</strong>
          </span>
        </div>

        <form onSubmit={handleSearchSubmit} className="gov-filter-grid">
          <div className="input-with-icon">
            <Search size={16} />
            <input
              type="text"
              placeholder="Search by Case ID, Institution or Keyword"
              className="gov-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <select
            className="gov-select"
            value={categoryFilter}
            onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
          >
            <option value="">{t("All Categories")}</option>
            <option value="FEES">{t("Fees & Refund")}</option>
            <option value="INTAKE">{t("Seat Intake")}</option>
            <option value="FACULTY">{t("Faculty Shortage")}</option>
            <option value="INFRASTRUCTURE">{t("Infrastructure")}</option>
            <option value="RAGGING">{t("Anti-Ragging")}</option>
            <option value="NORM_VIOLATION">{t("Norm Violation")}</option>
            <option value="OTHER">{t("Other Issues")}</option>
          </select>

          <select
            className="gov-select"
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          >
            <option value="">{t("All Status")}</option>
            <option value="NEW">{t("New")}</option>
            <option value="UNDER_PROCESS">{t("Under Process")}</option>
            <option value="PENDING">{t("Pending")}</option>
            <option value="ESCALATED">{t("Escalated")}</option>
            <option value="TRANSFERRED">{t("Transferred")}</option>
            <option value="DISPOSED">{t("Disposed")}</option>
          </select>

          <select
            className="gov-select"
            value={dueFilter}
            onChange={(e) => { setDueFilter(e.target.value); setPage(1); }}
          >
            <option value="">{t("Due in: All")}</option>
            <option value="overdue">{t("Overdue SLA")}</option>
          </select>

          <button type="submit" className="gov-btn gov-btn-primary">
            {t("Search")}
          </button>

          <button
            type="button"
            onClick={handleResetFilters}
            className="gov-btn gov-btn-secondary"
            title="Reset Filters"
          >
            <RotateCcw size={14} /> {t("Reset")}
          </button>
        </form>
      </div>

      {/* 4. Dynamic Paginated Cases Data Table from Postgres DB */}
      <div className="gov-table-card">
        <div className="gov-table-wrap">
          <table className="gov-data-table">
            <thead>
              <tr>
                <th>Case ID ⇅</th>
                <th>Institution ⇅</th>
                <th>Category ⇅</th>
                <th>Status ⇅</th>
                <th>Assigned Officer ⇅</th>
                <th>Due Date ⇅</th>
                <th style={{ textAlign: 'center' }}>{t("Action")}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '36px', color: '#64748B' }}>
                    Loading grievance records from database...
                  </td>
                </tr>
              ) : cases.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '36px', color: '#64748B' }}>
                    No cases match the given filter criteria.
                  </td>
                </tr>
              ) : (
                cases.map((c) => {
                  const isOverdue = c.slaState === 'OVERDUE' || (c.dueOn && c.dueOn < todayIso && c.status !== 'DISPOSED');
                  const officerDisplayName = c.officer?.name || c.officerName || c.assignedOfficerName || '— Unassigned —';
                  return (
                    <tr key={c.id}>
                      <td>
                        <span
                          className="case-id-link"
                          onClick={() => onViewCase(c.id)}
                        >
                          {c.id}
                        </span>
                      </td>
                      <td>
                        <span
                          style={{ cursor: 'pointer', fontWeight: 600, color: '#1E293B' }}
                          onClick={() => onViewInstitution(c.institutionId)}
                          title="Click to view institution profile"
                        >
                          {c.institutionName || `Institution #${c.institutionId}`}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: '12px', fontWeight: 500 }}>
                          {c.category}
                        </span>
                      </td>
                      <td>
                        <span className={`status-badge status-${c.status.toLowerCase().replace('_', '-')}`}>
                          {c.status.replace('_', ' ')}
                        </span>
                        {isOverdue && c.status !== 'DISPOSED' && (
                          <span className="status-badge status-overdue" style={{ marginLeft: '4px' }}>
                            Overdue
                          </span>
                        )}
                      </td>
                      <td>
                        <span style={{ fontSize: '12px', color: '#334155' }}>
                          {officerDisplayName}
                        </span>
                      </td>
                      <td>
                        <span style={{
                          fontSize: '12px',
                          fontWeight: isOverdue ? 700 : 500,
                          color: isOverdue ? '#C62828' : '#334155'
                        }}>
                          {c.dueOn ? new Date(c.dueOn).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          onClick={() => onViewCase(c.id)}
                          className="gov-btn gov-btn-outline"
                          style={{ padding: '4px 14px', fontSize: '12px' }}
                        >
                          <Eye size={13} /> {t("View")}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="table-pagination-bar">
          <div>
            Showing {cases.length > 0 ? (page - 1) * pageSize + 1 : 0}–
            {Math.min(page * pageSize, totalCases)} of {totalCases} cases
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>{t("Rows per page:")}</span>
              <select
                className="gov-select"
                style={{ width: 'auto', padding: '4px 8px' }}
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>

            <div className="pagination-controls">
              <button
                className="page-btn"
                disabled={page <= 1}
                onClick={() => setPage(1)}
                title="First Page"
              >
                <ChevronsLeft size={14} />
              </button>
              <button
                className="page-btn"
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
                title="Previous Page"
              >
                <ChevronLeft size={14} />
              </button>

              <button className="page-btn active">
                {page}
              </button>

              {totalPages > page && (
                <button className="page-btn" onClick={() => setPage(page + 1)}>
                  {page + 1}
                </button>
              )}

              <button
                className="page-btn"
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
                title="Next Page"
              >
                <ChevronRight size={14} />
              </button>
              <button
                className="page-btn"
                disabled={page >= totalPages}
                onClick={() => setPage(totalPages)}
                title="Last Page"
              >
                <ChevronsRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
