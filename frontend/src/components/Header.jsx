import { useLanguage } from '../i18n/Language';
import React, { useState } from 'react';
import { Bell, User, ChevronDown, LogOut, Search, Volume2 } from 'lucide-react';
import { api, apiRequest, getActiveBackend, setActiveBackend } from '../services/api';

export default function Header({ user, onLogout, onTabChange, activeTab, onBackendChange, onViewCase }) {
 const { t, language, setLanguage } = useLanguage();
  const announcements = [
    'New: Revised guidelines for AICTE complaint monitoring and multi-bureau overlap detection now active.',
    'All officers are advised to regularly update the status of complaints before monthly SLA cutoff.',
    'Institutions under high overlap review flagged for cross-verification.'
  ];
  const [showNotifications,setShowNotifications]=useState(false);
  const [notifications,setNotifications]=useState([]);
  const [notificationError,setNotificationError]=useState('');
  const [loadingNotifications,setLoadingNotifications]=useState(false);
  async function toggleNotifications(){
    setShowNotifications(!showNotifications);
    if(showNotifications)return;
    setLoadingNotifications(true);setNotificationError('');
    try{const r=['STUDENT','COLLEGE'].includes(user.role)?await apiRequest('/student/cases'):await api.getCases({bureau:user.bureau || undefined,overdue:'true',pageSize:5});setNotifications(r.data || []);}catch(e){setNotificationError(e.message);}finally{setLoadingNotifications(false);}
  }
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [fontSize, setFontSize] = useState('normal'); // 'small', 'normal', 'large'
  const [backendMode, setBackendMode] = useState(getActiveBackend());

  const handleBackendSwitch = (mode) => {
    setActiveBackend(mode);
    setBackendMode(mode);
    if (onBackendChange) onBackendChange(mode);
  };

  const changeFontSize = (size) => {
    setFontSize(size);
    if (size === 'small') document.documentElement.style.fontSize = '14px';
    else if (size === 'large') document.documentElement.style.fontSize = '18px';
    else document.documentElement.style.fontSize = '16px';
  };

  return (
    <header>
      {/* 1. Indian Tricolor Ribbon */}
      <div className="tricolor-bar" />

      {/* 2. Top Accessibility & Language Bar */}
      <div className="gov-accessibility-bar">
        <div>
          <a href="#main-content" style={{ marginRight: '16px' }}>{t("Skip to main content")}</a>
          <span style={{ color: '#CBD5E1' }}>|</span>
          <span style={{ marginLeft: '16px' }}>AICTE Portal Standard v2.4</span>
        </div>

        <div className="accessibility-actions">
          <div className="text-resize-btns">
            <button onClick={() => changeFontSize('small')} title="Decrease font size">A-</button>
            <button onClick={() => changeFontSize('normal')} title="Reset font size">A</button>
            <button onClick={() => changeFontSize('large')} title="Increase font size">A+</button>
          </div>
          <span style={{ color: '#CBD5E1' }}>|</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '11px', color: '#64748B' }}>Backend:</span>
            <select
              style={{
                fontSize: '11px',
                fontWeight: '600',
                padding: '1px 6px',
                borderRadius: '3px',
                border: '1px solid #CBD5E1',
                background: '#F8FAFC',
                color: '#0A3663',
                cursor: 'pointer'
              }}
              value={backendMode}
              onChange={(e) => handleBackendSwitch(e.target.value)}
              title="Switch backend target between Render and Localhost"
            >
              <option value="render">Render Cloud (Live)</option>
              <option value="local">Localhost:4000</option>
            </select>
          </div>
          <span style={{ color: '#CBD5E1' }}>|</span>
          <span className="lang-switch"><button type="button" lang="en" aria-pressed={language==='en'} onClick={()=>setLanguage('en')}>English</button><span aria-hidden="true"> | </span><button type="button" lang="hi" aria-pressed={language==='hi'} onClick={()=>setLanguage('hi')}>हिंदी</button></span>
        </div>
      </div>

      {/* 3. Main Brand & Emblem Bar */}
      <div className="gov-header">
        <div className="gov-brand">
          <img className="portal-brand-logo" src="/assets/portal-mark.png" alt="AICTE Grievance Portal" width="48" height="48" />

          <div className="gov-title-group">
            <h1>{t("Integrated Complaint Monitoring Dashboard")}</h1>
            <p>
              {user?.role === 'COLLEGE' ? t("College Grievance Portal") : user?.role === 'STUDENT' ? t("Student Grievance Portal") : user?.role === 'MANAGEMENT' ? t("Senior Management Dashboard") :
               user?.role === 'COORDINATOR' ? t("Cross-Bureau Coordination Portal") :
               user ? `Officer Portal (${user.bureau || 'General Bureau'})` : t("Officer Portal")}
            </p>
          </div>
        </div>

        <div className="gov-emblem-group">
          {/* Official Emblem of India Representation */}
          <div className="national-emblem">
            <div>
              <div className="emblem-text">
                भारत सरकार
                <span>{t("Government of India")}</span>
              </div>
            </div>
            <span className="design-emblem" role="img" aria-label="Emblem from the supplied portal design" />
          </div>

          {user && (
            <div className="user-quick-profile">
              <div style={{position:"relative"}}><button className="noti-btn" title="Notifications" aria-label="Notifications" aria-expanded={showNotifications} onClick={toggleNotifications}>
                <Bell size={18} />

              </button>
              {showNotifications&&<section className="notification-panel" aria-label="Notifications"><h3>{['STUDENT','COLLEGE'].includes(user.role)?t("Complaint updates"):t("Overdue case alerts")}</h3><p>{t("Refreshes when opened.")}</p>{loadingNotifications?<p>{t("Loading…")}</p>:notificationError?<p role="alert">{notificationError}</p>:notifications.length===0?<p>{t("No alerts at present.")}</p>:notifications.map(c=>['STUDENT','COLLEGE'].includes(user.role)?<p key={c.id}>{c.id} · {c.status}</p>:<button key={c.id} onClick={()=>{setShowNotifications(false);onViewCase(c.id);}}>{c.id}<br/>{c.institutionName} · {c.status}</button>)}<button onClick={()=>setShowNotifications(false)}>{t("Close")}</button></section>}
              </div>
              <div style={{ position: 'relative' }}>
                <div
                  className="user-menu-pill"
                  onClick={() => setShowUserDropdown(!showUserDropdown)}
                >
                  <User size={16} />
                  <span>{user.fullName || user.username}</span>
                  <ChevronDown size={14} />
                </div>

                {showUserDropdown && (
                  <div style={{
                    position: 'absolute',
                    right: 0,
                    top: '100%',
                    marginTop: '8px',
                    background: 'white',
                    color: '#1E293B',
                    borderRadius: '6px',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
                    border: '1px solid #E2E8F0',
                    width: '210px',
                    padding: '8px 0',
                    zIndex: 100
                  }}>
                    <div style={{ padding: '8px 16px', borderBottom: '1px solid #F1F5F9' }}>
                      <div style={{ fontWeight: 700, fontSize: '13px' }}>{user.fullName}</div>
                      <div style={{ fontSize: '11px', color: '#64748B' }}>Role: {user.role}</div>
                      {user.bureau && <div style={{ fontSize: '11px', color: '#64748B' }}>Bureau: {user.bureau}</div>}
                    </div>

                    <button
                      onClick={() => {
                        setShowUserDropdown(false);
                        onLogout();
                      }}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        background: 'none',
                        border: 'none',
                        padding: '10px 16px',
                        fontSize: '13px',
                        color: '#DC2626',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        cursor: 'pointer'
                      }}
                    >
                      <LogOut size={14} /> {t("Logout")}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 4. Sub-Navigation Horizontal Bar (As in Slide 2 & 3) */}
      {user && !['STUDENT','COLLEGE'].includes(user.role) && <div className="sub-nav-bar">
        <div
          className={`sub-nav-item ${activeTab === 'home' ? 'active' : ''}`}
          onClick={() => onTabChange('home')}
        >
          {t("Home")}
        </div>
        <div
          className={`sub-nav-item ${activeTab === 'dashboards' ? 'active' : ''}`}
          onClick={() => onTabChange('dashboards')}
        >
          {t("Senior Management Dashboard")}
        </div>
        <div
          className={`sub-nav-item ${activeTab === 'overlaps' ? 'active' : ''}`}
          onClick={() => onTabChange('overlaps')}
        >
          {t("Overlap Coordination")}
        </div>
        <div
          className={`sub-nav-item ${activeTab === 'institutions' ? 'active' : ''}`}
          onClick={() => onTabChange('institutions')}
        >
          {t("Institutions Master")}
        </div>
        <div
          className={`sub-nav-item ${activeTab === 'reports' ? 'active' : ''}`}
          onClick={() => onTabChange('reports')}
        >
          {t("Reports & Analytics")}
        </div>
      </div>

      }
      {/* 5. Announcements / News Ticker */}
      <div className="gov-announcement-bar">
        <div className="announcement-badge">
          <Volume2 size={15} /> {t("Announcements")}
        </div>
        <div className="announcement-ticker" tabIndex={0} role="region" aria-label="Announcements. Hover or focus to pause scrolling.">
          <div className="announcement-track">
            {[0, 1].map(copy => <div className="announcement-group" key={copy} aria-hidden={copy === 1 ? true : undefined}>
              {announcements.map(message => <span key={message}>{t(message)}</span>)}
            </div>)}
          </div>
        </div>
      </div>
    </header>
  );
}
