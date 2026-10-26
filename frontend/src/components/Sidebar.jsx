import { useLanguage } from '../i18n/Language';
import React from 'react';
import { Home, PlusCircle, FolderOpen, Building2, GitMerge, BarChart3 } from 'lucide-react';

export default function Sidebar({ activeTab, onTabChange, user }) {
 const { t } = useLanguage();
  const isOfficerOrHead = user?.role === 'OFFICER' || user?.role === 'HEAD';

  return (
    <aside className="gov-sidebar">
      <ul className="sidebar-nav">
        <li 
          className={`sidebar-nav-item ${activeTab === 'home' ? 'active' : ''}`}
          onClick={() => onTabChange('home')}
        >
          <Home size={18} />
          <span>{t("Home")}</span>
        </li>

        {isOfficerOrHead && (
          <li 
            className={`sidebar-nav-item ${activeTab === 'register' ? 'active' : ''}`}
            onClick={() => onTabChange('register')}
          >
            <PlusCircle size={18} />
            <span>{t("Register Case")}</span>
          </li>
        )}

        <li 
          className={`sidebar-nav-item ${activeTab === 'cases' ? 'active' : ''}`}
          onClick={() => onTabChange('cases')}
        >
          <FolderOpen size={18} />
          <span>{isOfficerOrHead ? t("My Cases") : t("All Cases")}</span>
        </li>

        <li 
          className={`sidebar-nav-item ${activeTab === 'institutions' ? 'active' : ''}`}
          onClick={() => onTabChange('institutions')}
        >
          <Building2 size={18} />
          <span>{t("Institutions")}</span>
        </li>

        <li 
          className={`sidebar-nav-item ${activeTab === 'overlaps' ? 'active' : ''}`}
          onClick={() => onTabChange('overlaps')}
        >
          <GitMerge size={18} />
          <span>{t("Overlaps")}</span>
          <span className="nav-badge">{t("Alerts")}</span>
        </li>

        <li 
          className={`sidebar-nav-item ${activeTab === 'dashboards' ? 'active' : ''}`}
          onClick={() => onTabChange('dashboards')}
        >
          <BarChart3 size={18} />
          <span>{t("Dashboards")}</span>
        </li>

        <li 
          className={`sidebar-nav-item ${activeTab === 'reports' ? 'active' : ''}`}
          onClick={() => onTabChange('reports')}
        >
          <BarChart3 size={18} />
          <span>{t("Reports")}</span>
        </li>
      </ul>

      {/* Bureau Info Footer inside Sidebar */}
      <div style={{
        marginTop: 'auto',
        padding: '16px',
        background: 'rgba(0,0,0,0.2)',
        fontSize: '11.5px',
        color: '#94A3B8',
        borderTop: '1px solid rgba(255,255,255,0.08)'
      }}>
        <div style={{ color: 'white', fontWeight: 600, marginBottom: '2px' }}>
          {user?.bureau ? `Bureau: ${user.bureau}` : 'Central Cell'}
        </div>
        <div>Role: {user?.role}</div>
        <div style={{ marginTop: '6px', fontSize: '10.5px', color: '#64748B' }}>
          AICTE Grievance Engine v1.0
        </div>
      </div>
    </aside>
  );
}
