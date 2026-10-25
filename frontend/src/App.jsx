import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Footer from './components/Footer';
import Login from './components/Login';
import OfficerHome from './components/OfficerHome';
import ManagementDashboard from './components/ManagementDashboard';
import InstitutionProfile from './components/InstitutionProfile';
import InstitutionsList from './components/InstitutionsList';
import RegisterCase from './components/RegisterCase';
import OverlapsView from './components/OverlapsView';
import ReportsView from './components/ReportsView';
import CaseDetailModal from './components/CaseDetailModal';
import { getCurrentUser, clearAuth } from './services/api';

export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('home'); // 'home', 'register', 'cases', 'institutions', 'overlaps', 'dashboards', 'reports', 'institution-profile'
  const [selectedCaseId, setSelectedCaseId] = useState(null);
  const [selectedInstitutionId, setSelectedInstitutionId] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    const savedUser = getCurrentUser();
    if (savedUser) {
      setUser(savedUser);
      if (savedUser.role === 'MANAGEMENT') {
        setActiveTab('dashboards');
      } else if (savedUser.role === 'COORDINATOR') {
        setActiveTab('overlaps');
      }
    }
  }, []);

  const handleLoginSuccess = (loggedInUser) => {
    setUser(loggedInUser);
    setRefreshTrigger(prev => prev + 1);
    if (loggedInUser.role === 'MANAGEMENT') {
      setActiveTab('dashboards');
    } else if (loggedInUser.role === 'COORDINATOR') {
      setActiveTab('overlaps');
    } else {
      setActiveTab('home');
    }
  };

  const handleLogout = () => {
    clearAuth();
    setUser(null);
    setActiveTab('home');
    setSelectedCaseId(null);
    setSelectedInstitutionId(null);
  };

  const handleViewCase = (id) => {
    setSelectedCaseId(id);
  };

  const handleViewInstitution = (id) => {
    setSelectedInstitutionId(id);
    setActiveTab('institution-profile');
  };

  const triggerDataRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header
        user={user}
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          if (tab !== 'institution-profile') setSelectedInstitutionId(null);
        }}
        onLogout={handleLogout}
      />

      {!user ? (
        <Login onLoginSuccess={handleLoginSuccess} />
      ) : (
        <div className="portal-layout">
          <Sidebar
            activeTab={activeTab}
            onTabChange={(tab) => {
              setActiveTab(tab);
              if (tab !== 'institution-profile') setSelectedInstitutionId(null);
            }}
            user={user}
          />

          <main id="main-content" className="portal-main">
            {(activeTab === 'home' || activeTab === 'cases') && (
              <OfficerHome
                key={`home-${refreshTrigger}-${user.username}`}
                user={user}
                refreshTrigger={refreshTrigger}
                onViewCase={handleViewCase}
                onViewInstitution={handleViewInstitution}
              />
            )}

            {activeTab === 'register' && (
              <RegisterCase
                user={user}
                onCaseCreated={(newCase) => {
                  triggerDataRefresh();
                  setSelectedCaseId(newCase.id);
                  setActiveTab('home');
                }}
                onCancel={() => setActiveTab('home')}
              />
            )}

            {activeTab === 'dashboards' && (
              <ManagementDashboard
                key={`dash-${refreshTrigger}`}
                user={user}
                onViewCase={handleViewCase}
              />
            )}

            {activeTab === 'overlaps' && (
              <OverlapsView
                key={`overlaps-${refreshTrigger}`}
                user={user}
                onViewCase={handleViewCase}
              />
            )}

            {activeTab === 'institutions' && (
              <InstitutionsList
                key={`inst-${refreshTrigger}`}
                onSelectInstitution={(id) => handleViewInstitution(id)}
              />
            )}

            {activeTab === 'institution-profile' && (
              <InstitutionProfile
                key={`inst-prof-${selectedInstitutionId}-${refreshTrigger}`}
                institutionId={selectedInstitutionId || 1}
                onBack={() => setActiveTab('institutions')}
                onViewCase={handleViewCase}
              />
            )}

            {activeTab === 'reports' && (
              <ReportsView user={user} />
            )}
          </main>
        </div>
      )}

      {/* Case Detail Modal */}
      {selectedCaseId && (
        <CaseDetailModal
          caseId={selectedCaseId}
          user={user}
          onClose={() => setSelectedCaseId(null)}
          onUpdated={() => {
            triggerDataRefresh();
          }}
        />
      )}

      <Footer />
    </div>
  );
}
