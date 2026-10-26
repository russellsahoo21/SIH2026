import { useLanguage } from '../i18n/Language';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { linkedCaseIds } from '../services/viewData';
import { api } from '../services/api';
import { GitMerge, Link2 } from 'lucide-react';

export default function OverlapsView({ onViewCase, user }) {
 const { t } = useLanguage();
  const [overlaps, setOverlaps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOverlap, setSelectedOverlap] = useState(null);
  const [leadBureau, setLeadBureau] = useState('PGRC');
  const [coordinationNotes, setCoordinationNotes] = useState('');
  const selectionRequest = useRef(0);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const canCoordinate = ['COORDINATOR','ADMIN'].includes(user?.role);
  const selectOverlap = useCallback(async (group) => {
    const requestId = ++selectionRequest.current;
    setSelectedOverlap(null);setDetailLoading(true);setError('');setNotice('');
    try {
      const res = await api.getOverlap(group.id);
      if(requestId !== selectionRequest.current) return;
      setSelectedOverlap(res.data);
      setLeadBureau(res.data.leadBureau || res.data.suggestedLeadBureau || 'PGRC');
      setCoordinationNotes(res.data.notes || '');
    } catch(err) { if(requestId === selectionRequest.current) setError(err.message); }
    finally { if(requestId === selectionRequest.current) setDetailLoading(false); }
  }, []);
  const [linking, setLinking] = useState(false);

  const loadOverlaps = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getOverlaps();
      setOverlaps(res.data || []);
      if (res.data?.length > 0) {
        await selectOverlap(res.data[0]);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [selectOverlap]);

  useEffect(() => {
    loadOverlaps();
  }, [loadOverlaps]);

  const handleLinkGroup = async () => {
    if (!selectedOverlap || !canCoordinate) return;
    const caseIds = linkedCaseIds(selectedOverlap);
    if (!caseIds.length) { setError('No related member cases are available to link.'); return; }
    setError('');setNotice('');
    setLinking(true);
    try {
      const result = await api.linkOverlap(selectedOverlap.id, {
        caseIds,
        leadBureau,
        notes: coordinationNotes || 'Linked under coordinated multi-bureau review.'
      });
      setSelectedOverlap(result.data);
      setNotice('Overlap group linked successfully.');
      setOverlaps(items=>items.map(item=>item.id===result.data.id?{...item,...result.data}:item));
    } catch (err) {
      setError('Failed to link group: ' + err.message);
    } finally {
      setLinking(false);
    }
  };

  const handleMarkNotRelated = async (caseIds) => {
    if (!selectedOverlap || !canCoordinate || !caseIds?.length) return;
    setError('');
    setNotice('');
    setLinking(true);
    try {
      const result = await api.notRelatedOverlap(selectedOverlap.id, {
        caseIds,
        notes: coordinationNotes || 'Marked as unrelated false positive by coordinator.'
      });
      setSelectedOverlap(result.data);
      const isDismissed = result.data?.status === 'DISMISSED';
      setNotice(isDismissed ? 'Cluster dismissed as unrelated false positive.' : `${caseIds.length} case(s) marked as unrelated.`);
      setOverlaps(items => items.map(item => item.id === result.data.id ? { ...item, ...result.data } : item));
    } catch (err) {
      setError('Failed to mark unrelated: ' + err.message);
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
                  onClick={() => { if(!linking) selectOverlap(o); }}
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
          {error && <p role="alert" className="portal-error">{error}</p>}
          {notice && <p role="status">{notice}</p>}
          {detailLoading ? <p>Loading member cases…</p> : selectedOverlap ? (
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
                          Similarity: <strong>{Math.round((m.similarity ?? 0) * 100)}%</strong>
                        </span>
                        <span style={{ fontSize: '11px', background: '#E2E8F0', padding: '2px 6px', borderRadius: '4px', marginLeft: '8px' }}>
                          {m.memberState || 'DETECTED'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => onViewCase(m.caseId)}
                          className="gov-btn gov-btn-outline"
                          style={{ padding: '3px 10px', fontSize: '11.5px' }}
                        >
                          Inspect
                        </button>
                        {canCoordinate && selectedOverlap.status !== 'DISMISSED' && m.memberState !== 'NOT_RELATED' && (
                          <button
                            disabled={linking}
                            onClick={() => handleMarkNotRelated([m.caseId])}
                            className="gov-btn gov-btn-secondary"
                            style={{ padding: '3px 10px', fontSize: '11.5px', color: '#DC2626', borderColor: '#FCA5A5' }}
                            title="Mark this specific complaint as unrelated false positive"
                          >
                            Unrelate
                          </button>
                        )}
                      </div>
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
                    placeholder="Provide justification for linking or reason for marking as unrelated..."
                    className="gov-input"
                    value={coordinationNotes}
                    onChange={(e) => setCoordinationNotes(e.target.value)}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', flexWrap: 'wrap' }}>
                  {canCoordinate && selectedOverlap.status !== 'DISMISSED' && (
                    <button
                      type="button"
                      disabled={linking || !linkedCaseIds(selectedOverlap).length}
                      onClick={() => handleMarkNotRelated(linkedCaseIds(selectedOverlap))}
                      className="gov-btn gov-btn-secondary"
                      style={{ color: '#DC2626', borderColor: '#FCA5A5' }}
                      title="Dismiss false positives if complaints refer to distinct, unrelated campus matters"
                    >
                      {linking ? 'Processing...' : 'Mark as Unrelated'}
                    </button>
                  )}
                  <button
                    disabled={linking || !canCoordinate || !linkedCaseIds(selectedOverlap).length}
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
