import { useLanguage } from '../i18n/Language';
import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { Lock, X, FileText } from 'lucide-react';

export default function CaseDetailModal({ caseId, user, onClose, onUpdated }) {
 const { t } = useLanguage();
  const [caseData, setCaseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionRemark, setActionRemark] = useState('');
  const [visibility, setVisibility] = useState('SHARED');
  const [targetStatus, setTargetStatus] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const loadCase = useCallback(async () => {
    if (!caseId) return;
    setLoading(true);
    try {
      const res = await api.getCase(caseId);
      setCaseData(res.data);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to load case details');
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    loadCase();
  }, [loadCase]);

  const handleStatusChange = async () => {
    if (!targetStatus) return;
    setSubmitting(true);
    setError('');
    try {
      const action = targetStatus === 'DISPOSED' ? api.disposeCase : targetStatus === 'ESCALATED' ? api.escalateCase : caseData.status === 'DISPOSED' ? api.reopenCase : api.updateStatus;
      await action(caseId, {
        toStatus: targetStatus,
        remark: actionRemark || `Status transitioned to ${targetStatus}`,
        version: caseData.version
      });

      setActionRemark('');
      setTargetStatus('');
      loadCase();
      if (onUpdated) onUpdated();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddRemark = async () => {
    if (!actionRemark.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      await api.addRemark(caseId, {
        remark: actionRemark,
        visibility
      });
      setActionRemark('');
      loadCase();
      if (onUpdated) onUpdated();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!caseId) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={18} color="#0A3663" />
            <h3>Case Dossier: {caseId}</h3>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close case"><X size={20}/></button>
        </div>

        <div className="modal-body">
          {loading ? (
            <div style={{ padding: '30px', textAlign: 'center', color: '#64748B' }}>{t("Loading case details...")}</div>
          ) : error && !caseData ? (
            <div style={{ background: '#FFEBEE', color: '#C62828', padding: '12px', borderRadius: '4px' }}>{error}</div>
          ) : caseData ? (
            <div>
              {error && <p role="alert" className="portal-error">{error}</p>}
              {/* Limited View Banner (Need-to-know rule from Section 4.6 & 6.5) */}
              {caseData.accessLevel === 'LIMITED' && (
                <div style={{
                  background: '#FEF3C7',
                  border: '1px solid #FDE68A',
                  color: '#92400E',
                  padding: '10px 14px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  marginBottom: '16px'
                }}>
                  <Lock size={16} className="inline-icon"/> <strong>Need-To-Know Restriction:</strong> This case belongs to another bureau ({caseData.bureau}). As per AICTE governance policy, internal remarks and detailed allegations are masked.
                </div>
              )}

              {/* Header Badges */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', marginBottom: '16px' }}>
                <span className="bureau-tag" style={{ fontSize: '13px', padding: '4px 10px' }}>
                  Bureau: {caseData.bureauCode || caseData.bureau}
                </span>
                <span className={`status-badge status-${caseData.status?.toLowerCase().replace('_', '-')}`} style={{ fontSize: '12px', padding: '4px 12px' }}>
                  {t(caseData.status)}
                </span>
                <span style={{ fontSize: '12px', color: '#64748B' }}>
                  Category: <strong>{caseData.category}</strong>
                </span>
                <span style={{ fontSize: '12px', color: '#64748B' }}>
                  Channel: <strong>{caseData.sourceChannel || 'CPGRAMS'}</strong>
                </span>
                <span style={{ fontSize: '12px', color: '#64748B', marginLeft: 'auto' }}>
                  Version: <strong>#{caseData.version}</strong>
                </span>
              </div>

              {/* Institution and Due Info Box */}
              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '6px', padding: '14px', marginBottom: '18px' }}>
                <div style={{ fontWeight: 700, color: '#0A3663', fontSize: '15px', marginBottom: '4px' }}>
                  {caseData.institution?.name || caseData.institutionName || 'Institution Details'}
                </div>
                <div style={{ display: 'flex', gap: '20px', fontSize: '12.5px', color: '#475569', marginTop: '6px' }}>
                  <div>{t("Due Date:")} <strong>{caseData.dueOn ? new Date(caseData.dueOn).toLocaleDateString('en-GB') : '—'}</strong></div>
                  <div>{t("SLA Window:")} <strong>{caseData.slaDays || 30} days</strong></div>
                  <div>{t("Assigned Officer:")} <strong>{caseData.assignedOfficer?.fullName || caseData.officer?.name || '— Unassigned —'}</strong></div>
                </div>
              </div>

              {/* Description */}
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  {t("Complaint Summary / Grievance Text")}
                </label>
                <div style={{ background: 'white', border: '1px solid #CBD5E1', padding: '12px', borderRadius: '4px', fontSize: '13px', color: '#1E293B', minHeight: '60px' }}>
                  {caseData.description || '(Details restricted under cross-bureau view rules)'}
                </div>
              </div>

              {/* Actions & Remarks History */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
                  {t("Official Audit Trail & Action History (Append-Only)")}
                </label>
                <div style={{ maxHeight: '180px', overflowY: 'auto', border: '1px solid #E2E8F0', borderRadius: '4px' }}>
                  {caseData.recentActions?.length > 0 ? (
                    caseData.recentActions.map((act) => (
                      <div key={act.id} style={{ padding: '8px 12px', borderBottom: '1px solid #F1F5F9', fontSize: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748B', marginBottom: '2px' }}>
                          <span style={{ fontWeight: 600, color: '#0A3663' }}>{act.actionType}</span>
                          <span>{new Date(act.createdAt).toLocaleString('en-GB')}</span>
                        </div>
                        {act.remark && <div style={{ color: '#1E293B' }}>{act.remark}</div>}
                        <div style={{ fontSize: '10.5px', color: '#94A3B8', marginTop: '2px' }}>
                          Actor: {act.actorFullName || act.actorName || `User #${act.actorId}`} | Visibility: {act.visibility}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{ padding: '12px', textAlign: 'center', fontSize: '12px', color: '#94A3B8' }}>{t("No recorded action logs yet.")}</div>
                  )}
                </div>
              </div>

              {/* Official Action Controls */}
              {caseData.accessLevel !== 'LIMITED' && ['OFFICER','HEAD','ADMIN'].includes(user.role) && (user.role === 'ADMIN' || user.bureau === caseData.bureau) && (
                <div style={{ background: '#F1F5F9', padding: '14px', borderRadius: '6px' }}>
                  <div style={{ fontWeight: 700, fontSize: '13px', color: '#0A3663', marginBottom: '8px' }}>
                    {t("Take Official Action / Add Remark")}
                  </div>
                  <textarea
                    rows={2}
                    placeholder="Enter remark, decision note, or investigation directive..."
                    className="gov-input"
                    style={{ width: '100%', marginBottom: '10px' }}
                    value={actionRemark}
                    onChange={(e) => setActionRemark(e.target.value)}
                  />

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <select
                        className="gov-select"
                        style={{ width: '150px', padding: '4px 8px' }}
                        value={targetStatus}
                        onChange={(e) => setTargetStatus(e.target.value)}
                      >
                        <option value="">{t("Move Status...")}</option>
                        {({NEW:['UNDER_PROCESS'],UNDER_PROCESS:['PENDING','ESCALATED','DISPOSED'],PENDING:['UNDER_PROCESS','ESCALATED','DISPOSED'],ESCALATED:['UNDER_PROCESS','DISPOSED'],TRANSFERRED:[],DISPOSED:['UNDER_PROCESS']}[caseData.status] || []).filter(status => (status !== 'DISPOSED' && caseData.status !== 'DISPOSED') || ['HEAD','ADMIN'].includes(user.role)).map(status=><option key={status} value={status}>{caseData.status === 'DISPOSED' ? 'Reopen case' : status.replaceAll('_',' ')}</option>)}
                      </select>

                      {targetStatus && (
                        <button
                          type="button"
                          disabled={submitting}
                          onClick={handleStatusChange}
                          className="gov-btn gov-btn-primary"
                          style={{ padding: '5px 12px', fontSize: '12px' }}
                        >
                          {t("Confirm Status Move")}
                        </button>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <select
                        className="gov-select"
                        style={{ width: '110px', padding: '4px 8px' }}
                        value={visibility}
                        onChange={(e) => setVisibility(e.target.value)}
                      >
                        <option value="SHARED">{t("Shared")}</option>
                        <option value="INTERNAL">{t("Internal")}</option>
                      </select>
                      <button
                        type="button"
                        disabled={submitting || !actionRemark.trim()}
                        onClick={handleAddRemark}
                        className="gov-btn gov-btn-secondary"
                        style={{ padding: '5px 14px', fontSize: '12px' }}
                      >
                        {t("Add Remark")}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>

        <div className="modal-footer">
          <button className="gov-btn gov-btn-secondary" onClick={onClose}>
            {t("Close Dossier")}
          </button>
        </div>
      </div>
    </div>
  );
}
