import { useLanguage } from '../i18n/Language';
import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { Building2, Search, Eye, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from 'lucide-react';

export default function InstitutionsList({ onSelectInstitution }) {
 const { t } = useLanguage();
  const [institutions, setInstitutions] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [regionFilter, setRegionFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchInstitutions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getInstitutions({
        page,
        pageSize,
        q: searchQuery || undefined,
        region: regionFilter || undefined
      });
      setInstitutions(res.data || []);
      setTotal(res.meta?.total || 0);
    } catch (err) {
      console.error('Failed to load institutions:', err);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, searchQuery, regionFilter]);

  useEffect(() => {
    fetchInstitutions();
  }, [fetchInstitutions]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchInstitutions();
  };

  const totalPages = Math.ceil(total / pageSize) || 1;

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{
          fontSize: '22px',
          fontFamily: 'var(--font-heading)',
          color: '#0A3663',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <Building2 size={24} color="#E65100" />
          AICTE Institutions Master Directory
        </h2>
        <p style={{ fontSize: '13px', color: '#64748B' }}>
          Search approved colleges, universities, and polytechnics with normalized entity resolution.
        </p>
      </div>

      {/* Filter Panel */}
      <div className="gov-filter-panel">
        <form onSubmit={handleSearch} className="gov-filter-grid" style={{ gridTemplateColumns: '2fr 1fr auto' }}>
          <div className="input-with-icon">
            <Search size={16} />
            <input
              type="text"
              placeholder="Search by Institution Name or Permanent ID..."
              className="gov-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <select
            className="gov-select"
            value={regionFilter}
            onChange={(e) => { setRegionFilter(e.target.value); setPage(1); }}
          >
            <option value="">{t("All Regions")}</option>
            <option value="North">{t("North")}</option>
            <option value="South">{t("South")}</option>
            <option value="East">{t("East")}</option>
            <option value="West">{t("West")}</option>
            <option value="Central">{t("Central")}</option>
          </select>

          <button type="submit" className="gov-btn gov-btn-primary">
            Search Registry
          </button>
        </form>
      </div>

      {/* Table */}
      <div className="gov-table-card">
        <div className="gov-table-wrap">
          <table className="gov-data-table">
            <thead>
              <tr>
                <th>{t("Permanent ID")}</th>
                <th>{t("Institution Name")}</th>
                <th>{t("Region")}</th>
                <th>{t("Address")}</th>
                <th style={{ textAlign: 'center' }}>{t("Action")}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '30px', color: '#64748B' }}>
                    Loading institutions...
                  </td>
                </tr>
              ) : institutions.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '30px', color: '#64748B' }}>
                    No institutions found.
                  </td>
                </tr>
              ) : (
                institutions.map(inst => (
                  <tr key={inst.id}>
                    <td style={{ fontWeight: 600, color: '#0A3663' }}>{inst.permanentId}</td>
                    <td style={{ fontWeight: 600 }}>{inst.name}</td>
                    <td>
                      <span className="bureau-tag">{inst.region}</span>
                    </td>
                    <td style={{ fontSize: '12px', color: '#475569' }}>{inst.address || '—'}</td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        onClick={() => onSelectInstitution(inst.id)}
                        className="gov-btn gov-btn-outline"
                        style={{ padding: '3px 12px', fontSize: '12px' }}
                      >
                        <Eye size={13} /> View Profile
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="table-pagination-bar">
          <div>
            Showing {institutions.length > 0 ? (page - 1) * pageSize + 1 : 0}–
            {Math.min(page * pageSize, total)} of {total} institutions
          </div>

          <div className="pagination-controls">
            <button 
              className="page-btn" 
              disabled={page <= 1} 
              onClick={() => setPage(1)}
            >
              <ChevronsLeft size={14} />
            </button>
            <button 
              className="page-btn" 
              disabled={page <= 1} 
              onClick={() => setPage(p => p - 1)}
            >
              <ChevronLeft size={14} />
            </button>
            <button className="page-btn active">{page}</button>
            <button 
              className="page-btn" 
              disabled={page >= totalPages} 
              onClick={() => setPage(p => p + 1)}
            >
              <ChevronRight size={14} />
            </button>
            <button 
              className="page-btn" 
              disabled={page >= totalPages} 
              onClick={() => setPage(totalPages)}
            >
              <ChevronsRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
