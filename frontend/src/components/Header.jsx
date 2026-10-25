import React, { useState } from 'react';
import { Landmark, Bell, User, ChevronDown, LogOut, Search, Volume2 } from 'lucide-react';
import { getActiveBackend, setActiveBackend } from '../services/api';

export default function Header({ user, onLogout, onTabChange, activeTab, onBackendChange }) {
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
          <a href="#main-content" style={{ marginRight: '16px' }}>Skip to main content</a>
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
          <span className="lang-switch">English | <span style={{ cursor: 'pointer', color: '#64748B' }}>हिंदी</span></span>
        </div>
      </div>

      {/* 3. Main Brand & Emblem Bar */}
      <div className="gov-header">
        <div className="gov-brand">
          <div className="gov-logo-badge">
            <Landmark size={22} color="#0A3663" />
            <span>AICTE</span>
          </div>

          <div className="gov-title-group">
            <h1>Integrated Complaint Monitoring Dashboard</h1>
            <p>
              {user?.role === 'MANAGEMENT' ? 'Senior Management Dashboard' : 
               user?.role === 'COORDINATOR' ? 'Cross-Bureau Coordination Portal' :
               user ? `Officer Portal (${user.bureau || 'General Bureau'})` : 'Officer Portal'}
            </p>
          </div>
        </div>

        <div className="gov-emblem-group">
          {/* Official Emblem of India Representation */}
          <div className="national-emblem">
            <div>
              <div className="emblem-text">
                भारत सरकार
                <span>Government of India</span>
              </div>
            </div>
            <div className="emblem-icon">🏛️</div>
          </div>

          {user && (
            <div className="user-quick-profile">
              <button className="noti-btn" title="System Notifications">
                <Bell size={18} />
                <span className="noti-badge" />
              </button>

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
                      <LogOut size={14} /> Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 4. Sub-Navigation Horizontal Bar (As in Slide 2 & 3) */}
      <div className="sub-nav-bar">
        <div 
          className={`sub-nav-item ${activeTab === 'home' ? 'active' : ''}`}
          onClick={() => onTabChange('home')}
        >
          Home
        </div>
        <div 
          className={`sub-nav-item ${activeTab === 'dashboards' ? 'active' : ''}`}
          onClick={() => onTabChange('dashboards')}
        >
          Senior Management Dashboard
        </div>
        <div 
          className={`sub-nav-item ${activeTab === 'overlaps' ? 'active' : ''}`}
          onClick={() => onTabChange('overlaps')}
        >
          Overlap Coordination
        </div>
        <div 
          className={`sub-nav-item ${activeTab === 'institutions' ? 'active' : ''}`}
          onClick={() => onTabChange('institutions')}
        >
          Institutions Master
        </div>
        <div 
          className={`sub-nav-item ${activeTab === 'reports' ? 'active' : ''}`}
          onClick={() => onTabChange('reports')}
        >
          Reports & Analytics
        </div>
      </div>

      {/* 5. Announcements / News Ticker */}
      <div className="gov-announcement-bar">
        <div className="announcement-badge">
          <Volume2 size={15} /> Announcements
        </div>
        <div className="announcement-ticker">
          <span>New: Revised guidelines for AICTE complaint monitoring and multi-bureau overlap detection now active.</span>
          <span>All officers are advised to regularly update the status of complaints before monthly SLA cutoff.</span>
          <span>Institutions under high overlap review flagged for cross-verification.</span>
        </div>
      </div>
    </header>
  );
}
