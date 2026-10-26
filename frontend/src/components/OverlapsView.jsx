import { useLanguage } from '../i18n/Language';
import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { GitMerge, Link2, ShieldAlert, CheckCircle, Search, Eye } from 'lucide-react';

export default function OverlapsView({ onViewCase }) {
 const { t } = useLanguage();
  const [overlaps, setOverlaps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOverlap, setSelectedOverlap] = useState(null);
  const [leadBureau, setLeadBureau] = useState('PGRC');
  const [coordinationNotes, setCoordinationNotes] = useState('');
  const [linking, setLinking] = useState(false);

  const loadOverlaps = async () => {
    setLoading(true);
    try {
      const res = await api.getOverlaps();
      setOverlaps(res.data || []);
      if (res.data?.length > 0 && !selectedOverlap) {
        setSelectedOverlap(res.data[0]);
      }
    } catch (err) {
      console.error('Failed to load overlap alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOverlaps();
  }, []);

  const handleLinkGroup = async () => {
    if (!selectedOverlap) return;
    setLinking(true);
    try {
      const caseIds = selectedOverlap.members ? selectedOverlap.members.map(m => m.caseId) : [];
      await api.linkOverlap(selectedOverlap.id, {
        caseIds,
        leadBureau,
        notes: coordinationNotes || 'Linked under coordinated multi-bureau review.'
      });
      alert('Overlap group linked successfully!');
      loadOverlaps();
    } catch (err) {
      alert('Failed to link group: ' + err.message);
    } finally {
      setLinking(false);
    }
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
          <GitMerge size={24} color="#E65100" />
          Cross-Bureau Overlap Coordination
        </h2>
        <p style={{ fontSize: '13px', color: '#64748B' }}>
          Automated multi-bureau duplicate & simultaneous investigation detector. Coordinate lead bureaus and avoid duplicate disciplinary proceedings.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: '20px' }}>
        {/* Left: Overlap Groups List */}
        <div className="gov-table-card">
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #E2E8F0', fontWeight: 700, color: '#0A3663', fontSize: '14px' }}>
            Detected Overlap Clusters ({overlaps.length})
          </div>

          <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: '30px', textAlign: 'center', color: '#64748B' }}>{t("Scanning for overlaps...")}</div>
            ) : overlaps.length === 0 ? (
              <div style={{ padding: '30px', textAlign: 'center', color: '#64748B' }}>{t("No active overlap groups found.")}</div>
            ) : (
              overlaps.map(o => (
                <div
                  key={o.id}
                  onClick={() => setSelectedOverlap(o)}
                  style={{
                    padding: '14px 18px',
                    borderBottom: '1px solid #F1F5F9',
                    cursor: 'pointer',
                    background: selectedOverlap?.id === o.id ? '#EFF6FF' : 'white',
                    borderLeft: selectedOverlap?.id === o.id ? '4px solid #E65100' : '4px solid transparent'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontWeight: 700, color: '#0A3663', fontSize: '14px' }}>
                      Cluster #{o.id}
                    </span>
                    <span style={{
                      background: o.severity === 'HIGH' ? '#FEE2E2' : '#FEF3C7',
                      color: o.severity === 'HIGH' ? '#DC2626' : '#B45309',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 700
                    }}>
                      {o.severity}
                    </span>
                  </div>

                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#1E293B', marginBottom: '4px' }}>
                    {o.institutionName || `Institution #${o.institutionId}`}
                  </div>

                  <div style={{ fontSize: '11.5px', color: '#64748B', display: 'flex', gap: '12px' }}>
                    <span>Status: <strong>{o.status}</strong></span>
                    <span>Cases: <strong>{o.caseCount || o.members?.length || 2}</strong></span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: Overlap Coordination Workspace */}
        <div className="gov-table-card" style={{ padding: '20px' }}>
          {selectedOverlap ? (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E2E8F0', paddingBottom: '14px', marginBottom: '16px' }}>
                <div>
                  <h3 style={{ fontSize: '16px', color: '#0A3663', fontFamily: 'var(--font-heading)', fontWeight: 700 }}>
                    Overlap Workspace #{selectedOverlap.id}
                  </h3>
                  <div style={{ fontSize: '12px', color: '#64748B' }}>
                    Institution: <strong>{selectedOverlap.institutionName || selectedOverlap.institutionId}</strong>
                  </div>
                </div>

                <span className={`status-badge status-${selectedOverlap.status?.toLowerCase()}`}>
                  {selectedOverlap.status}
                </span>
              </div>

              {/* Members in overlap cluster */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
                  Member Cases in this Overlap Group:
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {(selectedOverlap.members || []).map(m => (
                    <div key={m.caseId} style={{
                      padding: '10px 14px',
                      background: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      borderRadius: '6px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div>
                        <span className="case-id-link" onClick={() => onViewCase(m.caseId)}>
                          {m.caseId}
                        </span>
                        <span style={{ fontSize: '12px', color: '#64748B', marginLeft: '12px' }}>
                          Similarity: <strong>{Math.round((m.similarity || 0.85) * 100)}%</strong>
                        </span>
                        <span style={{ fontSize: '11px', background: '#E2E8F0', padding: '2px 6px', borderRadius: '4px', marginLeft: '8px' }}>
                          {m.memberState || 'DETECTED'}
                        </span>
                      </div>
                      <button
                        onClick={() => onViewCase(m.caseId)}
                        className="gov-btn gov-btn-outline"
                        style={{ padding: '3px 10px', fontSize: '11.5px' }}
                      >
                        Inspect
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Coordinator Decision Box */}
              <div style={{ background: '#F1F5F9', padding: '16px', borderRadius: '6px', border: '1px solid #CBD5E1' }}>
                <div style={{ fontWeight: 700, fontSize: '13.5px', color: '#0A3663', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Link2 size={16} />
                  Appoint Lead Bureau & Synchronize Investigation
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Designated Lead Bureau
                  </label>
                  <select
                    className="gov-select"
                    value={leadBureau}
                    onChange={(e) => setLeadBureau(e.target.value)}
                  >
                    <option value="PGRC">PGRC (Public Grievance Redressal Cell)</option>
                    <option value="RB">RB (Regulation Bureau)</option>
                    <option value="RO">RO (Regional Office)</option>
                    <option value="CELL">Special AICTE Cell</option>
                  </select>
                </div>

                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Coordination Notes & Joint Hearing Directives
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Provide justification for linking and instructions for the lead bureau..."
                    className="gov-input"
                    value={coordinationNotes}
                    onChange={(e) => setCoordinationNotes(e.target.value)}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button
                    disabled={linking}
                    onClick={handleLinkGroup}
                    className="gov-btn gov-btn-primary"
                  >
                    {linking ? 'Linking...' : 'Link Cases & Set Lead Bureau'}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>
              Select an overlap cluster from the left to inspect and coordinate.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
