import { useLanguage } from './i18n/Language';
import React, { useState, useEffect } from 'react';
import StudentPortal from './components/StudentPortal';
import SignUp from './components/SignUp';
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
  const { t, language } = useLanguage();
  const [signUp, setSignUp] = useState(false);
  const [user, setUser] = useState(() => getCurrentUser());
  const [activeTab, setActiveTab] = useState(() => {
    const saved = getCurrentUser();
    if (saved?.role === 'MANAGEMENT') return 'dashboards';
    if (saved?.role === 'COORDINATOR') return 'overlaps';
    return 'home';
  }); // 'home', 'register', 'cases', 'institutions', 'overlaps', 'dashboards', 'reports', 'institution-profile'
  const [selectedCaseId, setSelectedCaseId] = useState(null);
  const [selectedInstitutionId, setSelectedInstitutionId] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    const names = {home:'Home',cases:'My Cases',register:'Register Case',institutions:'Institutions',overlaps:'Overlap Coordination',dashboards:'Management Dashboard',reports:'Reports', 'institution-profile':'Institution Profile'};
    document.title = t(user ? (['STUDENT','COLLEGE'].includes(user.role) ? 'My Complaints' : names[activeTab] || 'Portal') : signUp ? 'Account Registration' : 'Login') + (language === 'hi' ? ' | एआईसीटीई शिकायत पोर्टल' : ' | AICTE Complaint Portal');
  }, [user, activeTab, signUp, language, t]);
  const handleLoginSuccess = (loggedInUser) => {
    setSignUp(false);
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
        key={user?.id || 'signed-out'}
        user={user}
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          if (tab !== 'institution-profile') setSelectedInstitutionId(null);
        }}
        onViewCase={handleViewCase}
        onLogout={handleLogout}
        onBackendChange={handleLogout}
      />

      {!user ? (
        <>{signUp ? <SignUp onLoginSuccess={handleLoginSuccess} onBack={()=>setSignUp(false)}/> : <Login onLoginSuccess={handleLoginSuccess} onRegister={()=>setSignUp(true)}/>}</>
      ) : ['STUDENT','COLLEGE'].includes(user.role) ? <StudentPortal /> : (
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
