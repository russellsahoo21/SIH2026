import { useLanguage } from '../i18n/Language';
import React, { useState } from 'react';
import { api } from '../services/api';
import { PlusCircle, Sparkles, AlertTriangle, CheckCircle } from 'lucide-react';

export default function RegisterCase({ user, onCaseCreated, onCancel }) {
 const { t } = useLanguage();
  const [institutionQuery, setInstitutionQuery] = useState('');
  const [description, setDescription] = useState('');
  const [selectedInst, setSelectedInst] = useState(null);
  const [category, setCategory] = useState('FEES');
  const [sourceChannel, setSourceChannel] = useState('CPGRAMS');
  const [receivedOn, setReceivedOn] = useState(new Date().toISOString().split('T')[0]);

  // AI suggestions & Matching states
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [suggestedCandidates, setSuggestedCandidates] = useState([]);
  const [suggestedCategory, setSuggestedCategory] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [overlapAlert, setOverlapAlert] = useState(null);

  const handleGetSuggestions = async () => {
    if (!institutionQuery.trim() && !description.trim()) {
      setError('Please type an institution name or complaint description first.');
      return;
    }
    setError('');
    setLoadingSuggestions(true);
    try {
      const res = await api.suggest({
        institutionName: institutionQuery,
        description
      });
      const data = res.data;
      setSuggestedCandidates(data.institutionCandidates || []);
      if (data.category?.suggested) {
        setSuggestedCategory(data.category);
        setCategory(data.category.suggested);
      }
      if (data.institutionCandidates?.length > 0 && data.institutionCandidates[0].score >= 0.85) {
        setSelectedInst(data.institutionCandidates[0]);
      }
    } catch (err) {
      setError('Auto-suggestion service: ' + err.message);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedInst) {
      setError('Please search and select a confirmed institution from the registry.');
      return;
    }
    setError('');
    setSubmitting(true);

    try {
      const payload = {
        institutionId: Number(selectedInst.id),
        category,
        sourceChannel,
        receivedOn,
        description
      };

      // If user is ADMIN or doesn't have bureau assigned, provide default bureau
      if (!user?.bureau) {
        payload.bureau = 'RB';
      }

      const res = await api.createCase(payload);

      if (res.data?.overlap?.found) {
        setOverlapAlert(res.data.overlap);
      }

      alert(`Grievance Case Registered Successfully! Case ID: ${res.data?.case?.id}`);
      
      if (onCaseCreated) {
        onCaseCreated(res.data.case);
      }
    } catch (err) {
      setError(err.message || 'Failed to register grievance case.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '880px', margin: '0 auto' }}>
      <div className="gov-filter-panel" style={{ borderTop: '4px solid #E65100' }}>
        <div className="gov-filter-header" style={{ borderBottom: '1px solid #E2E8F0', paddingBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <PlusCircle size={22} color="#E65100" />
            <span>{t("Register New Grievance / Case")}</span>
          </div>
          <span style={{ fontSize: '12px', color: '#64748B' }}>
            Owning Bureau: <strong>{user?.bureau || 'RB'}</strong> | Officer: <strong>{user?.fullName}</strong>
          </span>
        </div>

        {error && (
          <div style={{
            background: '#FFEBEE',
            color: '#C62828',
            padding: '12px',
            borderRadius: '4px',
            fontSize: '13px',
            margin: '16px 0',
            borderLeft: '4px solid #C62828'
          }}>
            {error}
          </div>
        )}

        {overlapAlert && (
          <div style={{
            background: '#FFF8E1',
            color: '#B45309',
            padding: '14px',
            borderRadius: '4px',
            fontSize: '13px',
            margin: '16px 0',
            border: '1px solid #FDE68A',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <AlertTriangle size={24} color="#D97706" />
            <div>
              <strong>Cross-Bureau Overlap Alert Detected!</strong>
              <div>Severity: {overlapAlert.severity}. Overlap ID: #{overlapAlert.overlapId}. {overlapAlert.otherCases} other active cases exist in another bureau for this institution.</div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Step 1: Institution Search & AI Match */}
          <div style={{ background: '#F8FAFC', padding: '16px', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#0A3663', marginBottom: '6px' }}>
              1. Institution Name (with Fuzzy & Levenshtein Matching)
            </label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input
                type="text"
                placeholder="Type college name e.g. 'National Rehab Institute' or 'Hillcrest'..."
                className="gov-input"
                value={institutionQuery}
                onChange={(e) => setInstitutionQuery(e.target.value)}
              />
              <button
                type="button"
                onClick={handleGetSuggestions}
                disabled={loadingSuggestions}
                className="gov-btn gov-btn-secondary"
                style={{ gap: '6px' }}
              >
                <Sparkles size={15} color="#D97706" />
                {loadingSuggestions ? 'Matching...' : 'Auto-Suggest'}
              </button>
            </div>

            {/* Candidate Matches */}
            {suggestedCandidates.length > 0 && (
              <div style={{ marginTop: '12px', background: 'white', borderRadius: '4px', border: '1px solid #CBD5E1', padding: '10px' }}>
                <div style={{ fontSize: '11.5px', color: '#64748B', fontWeight: 600, marginBottom: '6px' }}>
                  Select Confirmed Institution:
                </div>
                {suggestedCandidates.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => { setSelectedInst(c); setInstitutionQuery(c.name); }}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: selectedInst?.id === c.id ? '#EFF6FF' : 'transparent',
                      border: selectedInst?.id === c.id ? '1px solid #3B82F6' : '1px solid transparent'
                    }}
                  >
                    <div>
                      <span style={{ fontWeight: 600, fontSize: '13px', color: '#1E293B' }}>{c.name}</span>
                      <span style={{ fontSize: '11px', color: '#64748B', marginLeft: '10px' }}>PID: {c.permanentId}</span>
                    </div>
                    <span style={{
                      fontSize: '11px',
                      background: '#E2E8F0',
                      padding: '2px 8px',
                      borderRadius: '10px',
                      fontWeight: 700
                    }}>
                      Match: {Math.round(c.score * 100)}%
                    </span>
                  </div>
                ))}
              </div>
            )}

            {selectedInst && (
              <div style={{ marginTop: '10px', fontSize: '12.5px', color: '#15803D', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle size={15} />
                <span>Confirmed Selected: <strong>{selectedInst.name}</strong> ({selectedInst.permanentId})</span>
              </div>
            )}
          </div>

          {/* Step 2: Source Channel, Category & Date */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Source Channel
              </label>
              <select
                className="gov-select"
                value={sourceChannel}
                onChange={(e) => setSourceChannel(e.target.value)}
              >
                <option value="CPGRAMS">CPGRAMS Central Portal</option>
                <option value="EMAIL">Official AICTE Email</option>
                <option value="LETTER">Physical Letter / Post</option>
                <option value="MINISTRY">Ministry of Education Reference</option>
                <option value="VIP">VIP / Parliamentary VIP Ref</option>
                <option value="COURT">High Court / Supreme Court Order</option>
                <option value="RTI">RTI Matter</option>
                <option value="OTHER">Other Source</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                {t("Category")}
              </label>
              <select
                className="gov-select"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="FEES">Fees & Refund Policy</option>
                <option value="INTAKE">Seat Intake & Quota</option>
                <option value="FACULTY">Faculty & Staff Qualification</option>
                <option value="INFRASTRUCTURE">Infrastructure Deficiencies</option>
                <option value="RAGGING">Ragging Grievance</option>
                <option value="NORM_VIOLATION">AICTE Approval Norm Violation</option>
                <option value="OTHER">Other Institutional Grievance</option>
              </select>
              {suggestedCategory && (
                <div style={{ fontSize: '11px', color: '#B45309', marginTop: '4px' }}>
                  AI Suggestion: {suggestedCategory.suggested} ({Math.round(suggestedCategory.confidence * 100)}% conf.)
                </div>
              )}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Date of Grievance Receipt
              </label>
              <input
                type="date"
                required
                className="gov-input"
                value={receivedOn}
                onChange={(e) => setReceivedOn(e.target.value)}
              />
            </div>
          </div>

          {/* Step 3: Description */}
          <div>
            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              Full Complaint Description / Grievance Text
            </label>
            <textarea
              required
              rows={4}
              placeholder="State the core details, allegations, and regulatory clauses violated..."
              className="gov-input"
              style={{ width: '100%', resize: 'vertical' }}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '14px', paddingTop: '10px', borderTop: '1px solid #E2E8F0' }}>
            <button
              type="button"
              onClick={onCancel}
              className="gov-btn gov-btn-secondary"
            >
              {t("Cancel")}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="gov-btn gov-btn-primary"
              style={{ padding: '10px 24px' }}
            >
              {submitting ? 'Registering...' : 'Register Complaint'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
