import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { Sidebar, ActiveNavKey } from './components/layout/Sidebar.tsx';
import { Header } from './components/layout/Header.tsx';
import { LoginView } from './components/auth/LoginView.tsx';
import { DashboardView } from './components/station/DashboardView.tsx';
import { CarburantsView } from './components/station/CarburantsView.tsx';
import { CiternesView } from './components/station/CiternesView.tsx';
import { PistoletsView } from './components/station/PistoletsView.tsx';
import { SalariesView } from './components/station/SalariesView.tsx';
import { TiersView } from './components/station/TiersView.tsx';
import { ProduitsView } from './components/station/ProduitsView.tsx';
import { ServicesView } from './components/station/ServicesView.tsx';
import { JourneesView } from './components/station/JourneesView.tsx';
import { AchatsView } from './components/station/AchatsView.tsx';
import { DepensesView } from './components/station/DepensesView.tsx';
import { FacturationView } from './components/station/FacturationView.tsx';
import { RapportsView } from './components/station/RapportsView.tsx';
import { BackofficeDashboard } from './components/backoffice/BackofficeDashboard.tsx';
import { AccountantView } from './components/accountant/AccountantView.tsx';
import { SettingsView } from './components/station/SettingsView.tsx';
import { EmailOutboxModal } from './components/common/EmailOutboxModal.tsx';
import { api } from './services/api.ts';
import { EmailNotification } from './types/index.ts';

import { ThemeProvider } from './context/ThemeContext.tsx';

const AppContent: React.FC = () => {
  const { isAuthenticated, role, station, switchStation } = useAuth();
  const [activeNav, setActiveNavState] = useState<ActiveNavKey>(() => {
    const saved = localStorage.getItem('stationhub_active_nav');
    return (saved as ActiveNavKey) || 'dashboard';
  });

  const setActiveNav = (nav: ActiveNavKey) => {
    setActiveNavState(nav);
    localStorage.setItem('stationhub_active_nav', nav);
  };

  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emails, setEmails] = useState<EmailNotification[]>([]);

  // Automatically select backoffice when user is Super Admin initially, or comptabilite
  useEffect(() => {
    const saved = localStorage.getItem('stationhub_active_nav') as ActiveNavKey | null;
    if (role === 'SUPER_ADMIN') {
      setActiveNav('backoffice');
    } else if (role === 'EXPERT_COMPTABLE') {
      if (!saved || saved === 'backoffice') {
        setActiveNav('comptabilite');
      }
    } else {
      if (!saved || saved === 'backoffice' || saved === 'comptabilite') {
        setActiveNav('dashboard');
      }
    }
  }, [role]);

  const loadEmails = async () => {
    if (role !== 'SUPER_ADMIN') return;
    try {
      const eList = await api.getEmails();
      setEmails(eList);
    } catch (err) {
      console.warn('Failed to load email outbox', err);
    }
  };

  useEffect(() => {
    if (isAuthenticated && role === 'SUPER_ADMIN') {
      loadEmails();
    }
  }, [isAuthenticated, role, activeNav]);

  if (!isAuthenticated) {
    return <LoginView />;
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-100 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 print:h-auto print:overflow-visible print:block">
      {/* Sidebar Navigation */}
      <div className="print:hidden shrink-0 h-full flex flex-col">
        <Sidebar activeNav={activeNav} onNavigate={setActiveNav} />
      </div>

      {/* Main View Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden print:overflow-visible print:block">
        {/* Top Header */}
        <div className="print:hidden w-full shrink-0">
          <Header
            onOpenEmailOutbox={() => setIsEmailModalOpen(true)}
            emailCount={emails.length}
            onNavigateToSettings={() => setActiveNav('settings')}
          />
        </div>

        {/* View Content Port */}
        <main className="flex-1 overflow-y-auto w-full print:overflow-visible print:block print:p-0 print:m-0">
          {role === 'SUPER_ADMIN' ? (
            <BackofficeDashboard />
          ) : (
            <>
              {activeNav === 'dashboard' && <DashboardView onNavigateToTab={setActiveNav} />}
              {activeNav === 'carburants' && <CarburantsView />}
              {activeNav === 'citernes' && <CiternesView />}
              {activeNav === 'pistolets' && <PistoletsView />}
              {activeNav === 'salaries' && <SalariesView />}
              {activeNav === 'tiers' && <TiersView />}
              {activeNav === 'produits' && <ProduitsView />}
              {activeNav === 'services' && <ServicesView />}
              {activeNav === 'journees' && <JourneesView />}
              {activeNav === 'achats' && <AchatsView />}
              {activeNav === 'depenses' && <DepensesView />}
              {activeNav === 'facturation' && <FacturationView />}
              {activeNav === 'rapports' && <RapportsView />}
              {activeNav === 'comptabilite' && <AccountantView />}
              {activeNav === 'settings' && <SettingsView />}
            </>
          )}
        </main>
      </div>

      {/* Global Email Outbox Modal (Strictly for Platform Owner) */}
      {role === 'SUPER_ADMIN' && (
        <EmailOutboxModal
          isOpen={isEmailModalOpen}
          onClose={() => setIsEmailModalOpen(false)}
          emails={emails}
        />
      )}
    </div>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}
