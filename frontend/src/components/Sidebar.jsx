import React from 'react';
import { Home, PlusCircle, FolderOpen, Building2, GitMerge, BarChart3, Settings, ShieldAlert } from 'lucide-react';

export default function Sidebar({ activeTab, onTabChange, user }) {
  const isOfficerOrHead = user?.role === 'OFFICER' || user?.role === 'HEAD';
  const isManagement = user?.role === 'MANAGEMENT';
  const isCoordinator = user?.role === 'COORDINATOR';

  return (
    <aside className="gov-sidebar">
      <ul className="sidebar-nav">
        <li 
          className={`sidebar-nav-item ${activeTab === 'home' ? 'active' : ''}`}
          onClick={() => onTabChange('home')}
        >
          <Home size={18} />
          <span>Home</span>
        </li>

        {isOfficerOrHead && (
          <li 
            className={`sidebar-nav-item ${activeTab === 'register' ? 'active' : ''}`}
            onClick={() => onTabChange('register')}
          >
            <PlusCircle size={18} />
            <span>Register Case</span>
          </li>
        )}

        <li 
          className={`sidebar-nav-item ${activeTab === 'cases' ? 'active' : ''}`}
          onClick={() => onTabChange('cases')}
        >
          <FolderOpen size={18} />
          <span>{isOfficerOrHead ? 'My Cases' : 'All Cases'}</span>
        </li>

        <li 
          className={`sidebar-nav-item ${activeTab === 'institutions' ? 'active' : ''}`}
          onClick={() => onTabChange('institutions')}
        >
          <Building2 size={18} />
          <span>Institutions</span>
        </li>

        <li 
          className={`sidebar-nav-item ${activeTab === 'overlaps' ? 'active' : ''}`}
          onClick={() => onTabChange('overlaps')}
        >
          <GitMerge size={18} />
          <span>Overlaps</span>
          <span className="nav-badge">Alerts</span>
        </li>

        <li 
          className={`sidebar-nav-item ${activeTab === 'dashboards' ? 'active' : ''}`}
          onClick={() => onTabChange('dashboards')}
        >
          <BarChart3 size={18} />
          <span>Dashboards</span>
        </li>

        <li 
          className={`sidebar-nav-item ${activeTab === 'reports' ? 'active' : ''}`}
          onClick={() => onTabChange('reports')}
        >
          <BarChart3 size={18} />
          <span>Reports</span>
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
