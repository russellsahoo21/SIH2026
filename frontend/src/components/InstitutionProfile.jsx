import { useLanguage } from '../i18n/Language';
import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { 
  Building2, MapPin, Calendar, GitMerge, Search, RotateCcw, 
  ExternalLink, ArrowRight, ShieldAlert, CheckCircle, Clock 
} from 'lucide-react';

export default function InstitutionProfile({ institutionId, onBack, onViewCase }) {
 const { t } = useLanguage();
  const [inst, setInst] = useState(null);
  const [cases, setCases] = useState([]);
  const [overlaps, setOverlaps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function loadData() {
      if (!institutionId) return;
      setLoading(true);
      try {
        const [instRes, casesRes, overlapsRes] = await Promise.all([
          api.getInstitution(institutionId),
          api.getInstitutionCases(institutionId),
          api.getInstitutionOverlaps(institutionId).catch(() => ({ data: [] }))
        ]);
        setInst(instRes.data);
        setCases(casesRes.data || []);
        setOverlaps(overlapsRes.data || []);
      } catch (err) {
        console.error('Failed to load institution profile:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [institutionId]);

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>{t("Loading Institution Profile...")}</div>;
  }

  if (!inst) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <p>{t("Institution not found.")}</p>
        <button onClick={onBack} className="gov-btn gov-btn-secondary" style={{ marginTop: '12px' }}>{t("Go Back")}</button>
      </div>
    );
  }

  const filteredCases = cases.filter(c => {
    const matchesSearch = !searchQuery || 
      c.id.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (c.description && c.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = !statusFilter || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div>
      {/* Breadcrumb */}
      <div style={{ fontSize: '13px', color: '#64748B', marginBottom: '16px' }}>
        <span style={{ cursor: 'pointer', color: '#0A3663' }} onClick={onBack}>{t("Home")}</span> &gt;{' '}
        <span style={{ cursor: 'pointer', color: '#0A3663' }} onClick={onBack}>{t("Institutions")}</span> &gt;{' '}
        <strong>{t("Institution Profile")}</strong>
      </div>

      {/* Main Profile Header Banner (Slide 4 Mockup) */}
      <div style={{
        background: 'white',
        borderRadius: '8px',
        padding: '24px',
        border: '1px solid #CBD5E1',
        boxShadow: 'var(--shadow-sm)',
        display: 'flex',
        alignItems: 'center',
        gap: '24px',
        marginBottom: '24px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Ashoka watermark decoration on right */}
        <div style={{
          position: 'absolute',
          right: '120px',
          top: '-20px',
          width: '180px',
          height: '180px',
          background: 'radial-gradient(circle, rgba(0,0,128,0.04) 40%, transparent 70%)',
          borderRadius: '50%',
          pointerEvents: 'none'
        }} />

        {/* Institution Logo Box */}
        <div style={{
          width: '84px',
          height: '84px',
          borderRadius: '8px',
          background: '#F1F5F9',
          border: '1px solid #CBD5E1',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          color: '#0A3663'
        }}>
          <Building2 size={36} />
          <span style={{ fontSize: '10px', fontWeight: 600, marginTop: '4px' }}>College Logo</span>
        </div>

        {/* Details */}
        <div style={{ flex: 1 }}>
          <h2 style={{
            fontSize: '22px',
            fontFamily: 'var(--font-heading)',
            color: '#0A3663',
            fontWeight: 700,
            marginBottom: '6px'
          }}>
            {inst.name}
          </h2>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', fontSize: '13px', color: '#475569' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Calendar size={14} color="#0A3663" />
              <span>Permanent ID: <strong>{inst.permanentId}</strong></span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <MapPin size={14} color="#0A3663" />
              <span>Address: {inst.address || 'Address not listed'}</span>
            </div>
            <div style={{ borderLeft: '1px solid #CBD5E1', paddingLeft: '14px' }}>
              Region: <strong>{inst.region}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Stats Grid (Slide 4 Mockup) */}
      <div className="kpi-metrics-grid">
        <div className="kpi-card kpi-blue">
          <div className="kpi-icon-wrap">
            <Building2 size={22} />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">{t("Total Cases")}</span>
            <span className="kpi-value">{inst.caseCounts?.total || cases.length}</span>
          </div>
        </div>

        <div className="kpi-card kpi-amber">
          <div className="kpi-icon-wrap">
            <Clock size={22} />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">{t("Open Cases")}</span>
            <span className="kpi-value">{inst.caseCounts?.open || 0}</span>
          </div>
        </div>

        <div className="kpi-card kpi-green">
          <div className="kpi-icon-wrap">
            <CheckCircle size={22} />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">{t("Disposed Cases")}</span>
            <span className="kpi-value">{inst.caseCounts?.disposed || 0}</span>
          </div>
        </div>

        <div className="kpi-card kpi-red">
          <div className="kpi-icon-wrap">
            <ShieldAlert size={22} />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">{t("Overdue Cases")}</span>
            <span className="kpi-value">{inst.caseCounts?.overdue || 0}</span>
          </div>
        </div>
      </div>

      {/* Main Two-Column View: Cases Table + Active Overlaps Panel (Slide 4) */}
      <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 1fr', gap: '24px', alignItems: 'start' }}>
        {/* Left Side: Cases Table */}
        <div className="gov-table-card">
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0' }}>
            <h3 style={{ fontSize: '16px', color: '#0A3663', fontFamily: 'var(--font-heading)', fontWeight: 700, marginBottom: '12px' }}>
              All Cases of this Institution
            </h3>

            <div style={{ display: 'flex', gap: '12px' }}>
              <div className="input-with-icon" style={{ flex: 1 }}>
                <Search size={15} />
                <input
                  type="text"
                  placeholder="Search by Case ID or Keyword"
                  className="gov-input"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <select
                className="gov-select"
                style={{ width: '160px' }}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">{t("All Status")}</option>
                <option value="NEW">{t("New")}</option>
                <option value="UNDER_PROCESS">{t("Under Process")}</option>
                <option value="PENDING">{t("Pending")}</option>
                <option value="ESCALATED">{t("Escalated")}</option>
                <option value="DISPOSED">{t("Disposed")}</option>
              </select>
            </div>
          </div>

          <div className="gov-table-wrap">
            <table className="gov-data-table">
              <thead>
                <tr>
                  <th>Case ID ⇅</th>
                  <th>Bureau ⇅</th>
                  <th>Category ⇅</th>
                  <th>Status ⇅</th>
                  <th>Assigned Officer ⇅</th>
                  <th>Due Date ⇅</th>
                  <th style={{ textAlign: 'center' }}>{t("Action")}</th>
                </tr>
              </thead>
              <tbody>
                {filteredCases.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: '#64748B' }}>
                      No cases found for this institution.
                    </td>
                  </tr>
                ) : (
                  filteredCases.map(c => (
                    <tr key={c.id}>
                      <td>
                        <span className="case-id-link" onClick={() => onViewCase(c.id)}>
                          {c.id}
                        </span>
                      </td>
                      <td>
                        <span className="bureau-tag">{c.bureauCode || c.bureau}</span>
                      </td>
                      <td>{c.category}</td>
                      <td>
                        <span className={`status-badge status-${c.status.toLowerCase().replace('_', '-')}`}>
                          {c.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td>{c.assignedOfficerName || '— Unassigned —'}</td>
                      <td>
                        {c.dueOn ? new Date(c.dueOn).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          onClick={() => onViewCase(c.id)}
                          className="gov-btn gov-btn-outline"
                          style={{ padding: '3px 10px', fontSize: '11.5px' }}
                        >
                          {t("View")}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Side: Active Overlaps Card (Slide 4 Mockup) */}
        <div style={{
          background: '#FFFBEB',
          border: '1px solid #FDE68A',
          borderRadius: '8px',
          padding: '20px',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#B45309', fontWeight: 700, fontSize: '15px', marginBottom: '8px' }}>
            <GitMerge size={18} />
            Active Overlaps
          </div>
          <p style={{ fontSize: '12.5px', color: '#78350F', marginBottom: '16px' }}>
            Cross-bureau duplicate or simultaneous investigations detected for this institution:
          </p>

          {overlaps.length === 0 ? (
            <div style={{ background: 'white', padding: '16px', borderRadius: '6px', textAlign: 'center', fontSize: '12px', color: '#64748B' }}>
              No active overlaps detected for this college.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {overlaps.map(grp => (
                <div key={grp.id} style={{
                  background: 'white',
                  border: '1px solid #FEF3C7',
                  borderRadius: '6px',
                  padding: '12px',
                  fontSize: '12px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontWeight: 700, color: '#0A3663' }}>Overlap #{grp.id}</span>
                    <span style={{
                      background: grp.severity === 'HIGH' ? '#FEE2E2' : '#FEF3C7',
                      color: grp.severity === 'HIGH' ? '#DC2626' : '#D97706',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontWeight: 700,
                      fontSize: '10px'
                    }}>
                      {grp.severity}
                    </span>
                  </div>
                  <div style={{ color: '#4B5563', marginBottom: '6px' }}>
                    Status: <strong>{grp.status}</strong> | Lead Bureau: <strong>{grp.leadBureau || 'Unassigned'}</strong>
                  </div>
                  {grp.notes && (
                    <div style={{ fontSize: '11px', color: '#6B7280', fontStyle: 'italic' }}>
                      "{grp.notes}"
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
