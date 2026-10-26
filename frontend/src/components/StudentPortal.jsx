import { useLanguage } from '../i18n/Language';
import React, { useEffect, useState, useCallback } from 'react';
import { apiRequest } from '../services/api';
import { PlusCircle, RefreshCw, ArrowLeft, FileText } from 'lucide-react';

export default function StudentPortal() {
  const { t } = useLanguage();
  const [cases, setCases] = useState([]);
  const [institutions, setInstitutions] = useState([]);
  const [loadingInstitutions, setLoadingInstitutions] = useState(false);
  const [detail, setDetail] = useState(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  const refresh = useCallback(async () => {
    try {
      setError('');
      const r = await apiRequest('/student/cases');
      setCases(r.data || []);
    } catch (e) {
      setError(e.message);
    }
  }, []);

  const loadInstitutions = useCallback(async () => {
    setLoadingInstitutions(true);
    try {
      let r = await apiRequest('/student/institutions');
      // Fallback to /institutions if /student/institutions returned no rows or unexpected empty
      if (!r?.data || r.data.length === 0) {
        try {
          const fallback = await apiRequest('/institutions?pageSize=100');
          if (fallback?.data?.institutions?.length) {
            r = { data: fallback.data.institutions };
          }
        } catch {
          // ignore fallback error
        }
      }
      setInstitutions(r?.data || []);
    } catch (e) {
      try {
        const fallback = await apiRequest('/institutions?pageSize=100');
        setInstitutions(fallback?.data?.institutions || []);
      } catch {
        setError(e.message);
      }
    } finally {
      setLoadingInstitutions(false);
    }
  }, []);

  // Preload cases and institutions immediately on mount
  useEffect(() => {
    refresh();
    loadInstitutions();
  }, [refresh, loadInstitutions]);

  async function view(id) {
    try {
      const r = await apiRequest('/student/cases/' + encodeURIComponent(id));
      setDetail(r.data);
    } catch (e) {
      setError(e.message);
    }
  }

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const data = Object.fromEntries(new FormData(e.currentTarget));
      const r = await apiRequest('/student/cases', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      setNotice('Complaint submitted: ' + r.data.case.id);
      setCreating(false);
      await refresh();
      await view(r.data.case.id);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  const handleStartCreate = () => {
    setCreating(true);
    setDetail(null);
    if (institutions.length === 0) {
      loadInstitutions();
    }
  };

  return (
    <main id="main-content" className="student-portal">
      <div className="portal-toolbar">
        <h2>{t("My complaints")}</h2>
        <button
          className="gov-btn gov-btn-secondary"
          onClick={() => {
            refresh();
            if (detail) view(detail.id);
          }}
        >
          <RefreshCw size={16} />
          {t("Refresh")}
        </button>
        <button className="gov-btn gov-btn-primary" onClick={handleStartCreate}>
          <PlusCircle size={16} />
          {t("Submit complaint")}
        </button>
      </div>

      <p>{t("Your complaints and status history are private to your account.")}</p>
      {error && <p role="alert" className="portal-error">{error}</p>}
      {notice && <p role="status">{notice}</p>}

      {creating ? (
        <form className="student-form gov-filter-panel" onSubmit={submit}>
          <h3>{t("Submit a complaint")}</h3>

          <label>
            {t("Institution")}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <select
                className="gov-select"
                name="institutionId"
                required
                disabled={loadingInstitutions && institutions.length === 0}
                style={{ flex: 1 }}
              >
                {loadingInstitutions ? (
                  <option value="">{t("Loading institutions…")}</option>
                ) : institutions.length === 0 ? (
                  <option value="">{t("No institutions found")}</option>
                ) : (
                  <option value="">{t("Choose institution")}</option>
                )}
                {institutions.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name}{i.permanentId ? ` (${i.permanentId})` : ''}
                  </option>
                ))}
              </select>
              {institutions.length === 0 && !loadingInstitutions && (
                <button
                  type="button"
                  className="gov-btn gov-btn-secondary"
                  onClick={loadInstitutions}
                  title={t("Retry loading")}
                  style={{ padding: '8px 12px', fontSize: '12px', whiteSpace: 'nowrap' }}
                >
                  <RefreshCw size={14} /> {t("Retry loading")}
                </button>
              )}
            </div>
          </label>

          <label>
            {t("Receiving bureau")}
            <select className="gov-select" name="bureau">
              {['RB', 'PGRC', 'RO', 'CELL'].map((x) => (
                <option key={x} value={x}>{x}</option>
              ))}
            </select>
          </label>

          <label>
            {t("Category")}
            <select className="gov-select" name="category">
              {['FEES', 'INTAKE', 'FACULTY', 'INFRASTRUCTURE', 'RAGGING', 'NORM_VIOLATION', 'OTHER'].map((x) => (
                <option key={x} value={x}>{x}</option>
              ))}
            </select>
          </label>

          <label>
            {t("Complaint details")}
            <textarea
              name="description"
              className="gov-input"
              rows={5}
              minLength={10}
              maxLength={10000}
              required
            />
          </label>

          <div className="portal-toolbar">
            <button className="gov-btn gov-btn-primary" disabled={busy}>
              {busy ? t("Submitting…") : t("Submit complaint")}
            </button>
            <button
              type="button"
              className="gov-btn gov-btn-secondary"
              onClick={() => setCreating(false)}
            >
              {t("Cancel")}
            </button>
          </div>
        </form>
      ) : detail ? (
        <section className="gov-filter-panel">
          <button className="gov-btn gov-btn-secondary" onClick={() => setDetail(null)}>
            <ArrowLeft size={16} />
            {t("All complaints")}
          </button>
          <h3>{detail.id} · {t(detail.status)}</h3>
          <p>{detail.institutionName} · {detail.bureau}</p>
          <p>{detail.description}</p>
          <h4>{t("Status history")}</h4>
          <ol>
            {detail.history.map((a) => (
              <li key={a.id}>
                {t(a.status)} · {new Date(a.createdAt).toLocaleString()}
              </li>
            ))}
          </ol>
        </section>
      ) : (
        <section className="gov-filter-panel">
          {cases.length === 0 ? (
            <p>{t("No complaints submitted yet.")}</p>
          ) : (
            cases.map((c) => (
              <button className="student-case" key={c.id} onClick={() => view(c.id)}>
                <FileText size={20} />
                <span>
                  <strong>{c.id}</strong>
                  <br />
                  {c.institutionName}
                </span>
                <span>{t(c.status)}</span>
              </button>
            ))
          )}
        </section>
      )}
    </main>
  );
}
