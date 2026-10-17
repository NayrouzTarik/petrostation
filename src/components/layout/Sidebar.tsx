import React from 'react';
import {
  LayoutDashboard,
  Fuel,
  Database,
  Gauge,
  Users,
  Building2,
  Package,
  Sparkles,
  CalendarCheck,
  Truck,
  Receipt,
  FileSpreadsheet,
  BarChart3,
  ShieldCheck,
  Calculator,
  Layers,
  Settings,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';

export type ActiveNavKey =
  | 'dashboard'
  | 'carburants'
  | 'citernes'
  | 'pistolets'
  | 'salaries'
  | 'tiers'
  | 'produits'
  | 'services'
  | 'journees'
  | 'achats'
  | 'depenses'
  | 'facturation'
  | 'rapports'
  | 'backoffice'
  | 'comptabilite'
  | 'settings';

interface SidebarProps {
  activeNav: ActiveNavKey;
  onNavigate: (key: ActiveNavKey) => void;
  collapsed?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeNav, onNavigate }) => {
  const { role, station } = useAuth();

  // Navigation items strictly for Station Managers
  const managerNavItems: Array<{
    key: ActiveNavKey;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { key: 'dashboard', label: 'Tableau de Bord', icon: LayoutDashboard },
    { key: 'carburants', label: 'Carburants', icon: Fuel },
    { key: 'citernes', label: 'Citernes & Stocks', icon: Database },
    { key: 'pistolets', label: 'Pistolets & Index', icon: Gauge },
    { key: 'salaries', label: 'Salariés & Postes', icon: Users },
    { key: 'tiers', label: 'Tiers & Comptes', icon: Building2 },
    { key: 'produits', label: 'Produits & Boutique', icon: Package },
    { key: 'services', label: 'Services & Lavage', icon: Sparkles },
    { key: 'journees', label: 'Journées (Saisie de Quart)', icon: CalendarCheck },
    { key: 'achats', label: 'Achats Fournisseurs', icon: Truck },
    { key: 'depenses', label: 'Dépenses & Charges', icon: Receipt },
    { key: 'facturation', label: 'Factures / BL / Devis', icon: FileSpreadsheet },
    { key: 'rapports', label: 'Rapports (8 modules)', icon: BarChart3 },
    { key: 'settings', label: 'Paramètres du Profil', icon: Settings },
  ];

  // Specific accountant navigation items
  const accountantNavItems: Array<{
    key: ActiveNavKey;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { key: 'comptabilite', label: 'Espace Comptable (TVA & Banque)', icon: Calculator },
    { key: 'dashboard', label: 'Tableau de Bord Station', icon: LayoutDashboard },
    { key: 'achats', label: 'Achats & Factures Fournisseurs', icon: Truck },
    { key: 'depenses', label: 'Dépenses & Charges', icon: Receipt },
    { key: 'facturation', label: 'Factures Clients & BL', icon: FileSpreadsheet },
    { key: 'tiers', label: 'Comptes Tiers & Soldes', icon: Building2 },
    { key: 'rapports', label: 'États Financiers & Rapports', icon: BarChart3 },
  ];

  return (
    <aside className="w-64 h-full bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 select-none text-slate-300">
      {/* Brand Header */}
      <div className="h-16 px-5 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-black text-sm tracking-tight">
            SH
          </div>
          <div className="flex flex-col">
            <span className="text-white font-bold text-sm tracking-tight">StationHub</span>
            <span className="text-[10px] text-slate-400 font-medium">
              {role === 'SUPER_ADMIN' ? 'Administration Centrale' : 'Gestion de Station'}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {/* SUPER_ADMIN: STRICTLY PLATFORM BACKOFFICE */}
        {role === 'SUPER_ADMIN' && (
          <div className="space-y-2">
            <div className="px-3 pb-1 text-[10px] uppercase font-bold text-purple-400 tracking-wider">
              Administration
            </div>

            <button
              onClick={() => onNavigate('backoffice')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeNav === 'backoffice'
                  ? 'bg-purple-700 text-white shadow-sm'
                  : 'text-purple-300 hover:bg-purple-900/40 hover:text-white'
              }`}
            >
              <ShieldCheck className="w-4 h-4 shrink-0 text-purple-300" />
              <div className="text-left truncate">
                <div>Clients & Stations</div>
                <div className="text-[10px] text-purple-300/80 font-normal">Gestion comptes & licences</div>
              </div>
            </button>

          </div>
        )}

        {/* EXPERT_COMPTABLE: Accounting Workspace */}
        {role === 'EXPERT_COMPTABLE' && (
          <>
            <div className="px-3 pb-1 text-[10px] uppercase font-semibold text-sky-400 tracking-wider">
              Espace Comptabilité
            </div>
            {accountantNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeNav === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => onNavigate(item.key)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-sky-600 text-white font-semibold shadow-xs'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </>
        )}

        {/* GERANT: Station Exploitation modules strictly for station managers */}
        {role === 'GERANT' && (
          <>
            <div className="px-3 pb-1 text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
              Exploitation Station
            </div>

            {managerNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeNav === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => onNavigate(item.key)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-emerald-600 text-white font-semibold shadow-xs'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </>
        )}
      </nav>

      {/* Role and Station Context in Sidebar Footer */}
      <div className="p-3 border-t border-slate-800 bg-slate-900/60">
        <div className="flex items-center gap-2.5 px-2 py-1.5">
          <div
            className={`w-2 h-2 rounded-full ${
              role === 'SUPER_ADMIN'
                ? 'bg-purple-400'
                : role === 'EXPERT_COMPTABLE'
                ? 'bg-sky-400'
                : 'bg-emerald-400'
            }`}
          ></div>
          <div className="truncate text-[11px] text-slate-300 font-medium">
            {role === 'SUPER_ADMIN'
              ? 'Administration SaaS'
              : station?.name || 'Station Active'}
          </div>
        </div>
      </div>
    </aside>
  );
};
