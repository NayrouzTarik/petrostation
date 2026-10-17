import React, { useState } from 'react';
import {
  ChevronDown,
  Mail,
  LogOut,
  Building,
  Shield,
  Sun,
  Moon,
  Settings,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useTheme } from '../../context/ThemeContext.tsx';
import { StationLogo } from '../common/StationLogo.tsx';

interface HeaderProps {
  onOpenEmailOutbox: () => void;
  emailCount?: number;
  onNavigateToSettings?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenEmailOutbox,
  emailCount = 0,
  onNavigateToSettings,
}) => {
  const { user, station, allStations, role, logout, switchStation } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [stationMenuOpen, setStationMenuOpen] = useState(false);

  return (
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 flex items-center justify-between gap-4 sticky top-0 z-30 shadow-2xs transition-colors">
      {/* Left Brand Lockup */}
      <div className="flex items-center gap-3">
        {/* SUPER ADMIN CONSOLE */}
        {role === 'SUPER_ADMIN' ? (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-700 text-white flex items-center justify-center font-black text-sm shadow-xs">
              <Shield className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-slate-900 dark:text-white tracking-tight">
                  StationHub Platform
                </span>
                <span className="text-[10px] bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 font-bold px-2 py-0.5 rounded border border-purple-200 dark:border-purple-800">
                  Super Admin
                </span>
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                Administration centrale et gestion des stations
              </span>
            </div>
          </div>
        ) : station ? (
          /* GERANT & ACCOUNTANT CONTEXT */
          <div className="flex items-center gap-3">
            <StationLogo
              stationId={station.id}
              brand={station.brand}
              name={station.name}
              logoUrl={station.logoUrl}
              size="md"
            />
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-slate-900 dark:text-white tracking-tight">
                  {station.name}
                </span>
                <span className="text-xs text-slate-400">·</span>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  {station.city || 'Maroc'}
                </span>
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-xs md:max-w-md">
                {station.location}
              </span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-slate-900 dark:bg-slate-800 text-white flex items-center justify-center font-bold text-xs">
              SH
            </div>
            <span className="font-bold text-sm text-slate-900 dark:text-white">StationHub</span>
          </div>
        )}

        {/* Station Switcher Dropdown (for Accountant managing assigned portfolio) */}
        {role === 'EXPERT_COMPTABLE' && allStations.length > 1 && (
          <div className="relative ml-2">
            <button
              onClick={() => setStationMenuOpen(!stationMenuOpen)}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-colors border border-slate-200 dark:border-slate-700"
              title="Changer de station"
            >
              <Building className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <span>Changer Station ({allStations.length})</span>
              <ChevronDown className="w-3 h-3 text-slate-500 dark:text-slate-400" />
            </button>

            {stationMenuOpen && (
              <div
                className="absolute left-0 mt-1 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg py-1 z-50 animate-in fade-in zoom-in-95 duration-100"
                onMouseLeave={() => setStationMenuOpen(false)}
              >
                <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                  Stations de votre portefeuille
                </div>
                {allStations.map((st) => (
                  <button
                    key={st.id}
                    onClick={() => {
                      switchStation(st.id);
                      setStationMenuOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${
                      station?.id === st.id ? 'bg-sky-50 dark:bg-sky-950/40 text-sky-800 dark:text-sky-300 font-semibold' : 'text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="truncate pr-2">
                      <div className="font-medium text-slate-900 dark:text-slate-100">{st.name}</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">{st.city} · {st.brand}</div>
                    </div>
                    {station?.id === st.id && (
                      <span className="w-2 h-2 rounded-full bg-sky-600"></span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right Controls: Theme Toggle, Outbox, Profile & Logout */}
      <div className="flex items-center gap-3">
        {/* Dark / Light Mode Switcher */}
        <button
          onClick={toggleTheme}
          className="p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors border border-slate-200 dark:border-slate-700 flex items-center gap-1.5"
          title={theme === 'dark' ? 'Activer le mode clair' : 'Activer le mode sombre'}
          aria-label="Basculer le thème"
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-slate-600" />
          )}
          <span className="text-[11px] font-semibold hidden md:inline">
            {theme === 'dark' ? 'Clair' : 'Sombre'}
          </span>
        </button>

        {/* Email Outbox Trigger - Strictly reserved for SaaS Super Admin */}
        {role === 'SUPER_ADMIN' && (
          <button
            onClick={onOpenEmailOutbox}
            className="relative p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors border border-slate-200 dark:border-slate-700"
            title="Boîte d'envoi et passerelle SMTP"
          >
            <Mail className="w-4 h-4" />
            {emailCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-purple-600 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full ring-2 ring-white dark:ring-slate-900">
                {emailCount}
              </span>
            )}
          </button>
        )}

        {/* User Badge & Role Tag */}
        <div className="flex items-center gap-3 pl-2 border-l border-slate-200 dark:border-slate-800">
          <div
            onClick={role === 'GERANT' && onNavigateToSettings ? onNavigateToSettings : undefined}
            className={`flex flex-col text-right hidden sm:flex ${
              role === 'GERANT' && onNavigateToSettings ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''
            }`}
            title={role === 'GERANT' ? 'Modifier mes paramètres de profil (Nom, Logo, Mot de passe)' : undefined}
          >
            <div className="flex items-center gap-1.5 justify-end">
              <span className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                {user?.name || 'Utilisateur'}
              </span>
              <span
                className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded border ${
                  role === 'SUPER_ADMIN'
                    ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800'
                    : role === 'EXPERT_COMPTABLE'
                    ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800'
                    : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                }`}
              >
                {role === 'SUPER_ADMIN'
                  ? 'Super Admin'
                  : role === 'EXPERT_COMPTABLE'
                  ? 'Expert-Comptable'
                  : 'Gérant Station'}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
              {user?.email}
            </span>
          </div>

          {role === 'GERANT' && onNavigateToSettings && (
            <button
              onClick={onNavigateToSettings}
              className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors border border-slate-200 dark:border-slate-800"
              title="Paramètres du Profil (Nom, Logo, Mot de passe)"
            >
              <Settings className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={logout}
            className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors border border-slate-200 dark:border-slate-800"
            title="Se déconnecter de la session"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
