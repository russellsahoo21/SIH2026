import React, { useState } from 'react';
import { api, getFullApiUrl } from '../services/api';
import { FileSpreadsheet, Download } from 'lucide-react';

export default function ReportsView() {
  const [reportType, setReportType] = useState('institution-wise');
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchReport = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.getReport(reportType, 'json');
      setReportData(res.data);
    } catch (err) {
      setError(err.message || 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadExcel = () => {
    window.open(getFullApiUrl(`/reports/${reportType}?format=xlsx`), '_blank');
  };

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
          <FileSpreadsheet size={24} color="#E65100" />
          Regulatory Reports & Analytics Export
        </h2>
        <p style={{ fontSize: '13px', color: '#64748B' }}>
          Generate statutory audit reports for Ministry of Education, Parliament inquiries, and bureau performance review.
        </p>
      </div>

      {/* Selector Card */}
      <div className="gov-filter-panel">
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              Select Report Type
            </label>
            <select
              className="gov-select"
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
            >
              <option value="institution-wise">Institution-wise Grievance & Overlap Summary</option>
              <option value="region-wise">Region-wise Redressal Statistics</option>
              <option value="bureau-wise">Bureau-wise Intake, Disposal & Pendency</option>
              <option value="ageing">Ageing & Overdue SLA Analysis</option>
              <option value="overlaps">Cross-Bureau Detected Overlaps Register</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '22px' }}>
            <button
              onClick={fetchReport}
              disabled={loading}
              className="gov-btn gov-btn-primary"
            >
              {loading ? 'Generating...' : 'Preview Report'}
            </button>

            <button
              onClick={handleDownloadExcel}
              className="gov-btn gov-btn-outline"
            >
              <Download size={14} /> Download Excel (.xlsx)
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div style={{ background: '#FFEBEE', color: '#C62828', padding: '12px', borderRadius: '4px', marginBottom: '16px' }}>
          {error}
        </div>
      )}

      {/* Preview Container */}
      <div className="gov-table-card" style={{ padding: '20px' }}>
        <h3 style={{ fontSize: '15px', color: '#0A3663', fontFamily: 'var(--font-heading)', fontWeight: 700, marginBottom: '14px' }}>
          Report Preview: {reportType}
        </h3>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>
            Processing aggregation queries...
          </div>
        ) : reportData ? (
          <div style={{ overflowX: 'auto' }}>
            <pre style={{
              background: '#0B2038',
              color: '#E2E8F0',
              padding: '16px',
              borderRadius: '6px',
              fontSize: '12px',
              maxHeight: '400px',
              overflowY: 'auto'
            }}>
              {JSON.stringify(reportData, null, 2)}
            </pre>
          </div>
        ) : (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>
            Click "Preview Report" or "Download Excel" to generate the report.
          </div>
        )}
      </div>
    </div>
  );
}
