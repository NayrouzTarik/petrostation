import React, { useEffect, useState, useCallback } from 'react';
import {
  TrendingUp,
  Calendar,
  DollarSign,
  Users,
  Building2,
  Award,
  ArrowUpRight,
  Droplets,
  PlayCircle,
  RefreshCw,
} from 'lucide-react';
import { api } from '../../services/api.ts';
import { useAuth } from '../../context/AuthContext.tsx';

interface DashboardViewProps {
  onNavigateToTab: (tab: any) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigateToTab }) => {
  const { station } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchDashboard = useCallback(async (id: string, showSpinner = true) => {
    try {
      if (showSpinner) setLoading(true);
      setIsRefreshing(true);
      const res = await api.getDashboard(id);
      setData(res);
    } catch (err) {
      console.error('Failed to load dashboard', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!station?.id) return;
    fetchDashboard(station.id);

    const handleFocus = () => {
      fetchDashboard(station.id, false);
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [station, fetchDashboard]);

  const handleManualRefresh = () => {
    if (station?.id) {
      fetchDashboard(station.id);
    }
  };

  const formatDH = (val: number) => {
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val || 0);
  };

  const [hoveredMonth, setHoveredMonth] = useState<any | null>(null);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Tableau De Bord</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Aperçu en temps réel de l'activité commerciale, des ventes carburants et de la trésorerie
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={handleManualRefresh}
            disabled={loading || isRefreshing}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/80 rounded-xl flex items-center gap-1.5 shadow-2xs transition-all disabled:opacity-50"
            title="Rafraîchir les données"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-600' : ''}`} />
            <span>{isRefreshing ? 'Actualisation...' : 'Actualiser'}</span>
          </button>

          <button
            onClick={() => onNavigateToTab('journees')}
            className="px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 rounded-xl flex items-center gap-2 shadow-xs transition-colors"
          >
            <PlayCircle className="w-4 h-4" />
            <span>Saisie Clôture de Journée (Shift)</span>
          </button>
        </div>
      </div>

      {/* 4 Top KPI Cards from PDF Page 1 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CA JOUR */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">CA TTC - JOUR (DH)</span>
            <Calendar className="w-4 h-4 text-slate-400 dark:text-slate-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white tabular-nums">
            {formatDH(data?.caJour)} <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">DH</span>
          </div>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 block">Aujourd'hui</span>
        </div>

        {/* CA SEMAINE */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">CA TTC - SEMAINE (S42)</span>
            <TrendingUp className="w-4 h-4 text-slate-400 dark:text-slate-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white tabular-nums">
            {formatDH(data?.caSemaine)} <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">DH</span>
          </div>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 block">7 derniers jours glissants</span>
        </div>

        {/* CA MOIS */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">CA TTC - MOIS (OCTOBRE)</span>
            <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-700 dark:text-emerald-400 tabular-nums">
            {formatDH(data?.caMois)} <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-500">DH</span>
          </div>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 block">Mois en cours</span>
        </div>

        {/* CA ANNEE */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">CA TTC - ANNÉE (2026)</span>
            <Award className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white tabular-nums">
            {formatDH(data?.caAnnee)} <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">DH</span>
          </div>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 block">* Cumul annuel</span>
        </div>
      </div>

      {/* 3 Secondary Cards from PDF Page 1 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* SOLDE CLIENTS */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
              SOLDE TOTAL DES CLIENTS
            </span>
            <Users className="w-4 h-4 text-sky-600 dark:text-sky-400" />
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-white tabular-nums">
            {formatDH(data?.soldeClients)} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">DH</span>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            {data?.countClientsPositifs || 0} client(s) avec un solde positif
          </div>
        </div>

        {/* SOLDE FOURNISSEURS */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
              SOLDE TOTAL DES FOURNISSEURS
            </span>
            <Building2 className="w-4 h-4 text-rose-600 dark:text-rose-400" />
          </div>
          <div className="text-xl font-bold text-rose-700 dark:text-rose-400 tabular-nums">
            {formatDH(data?.soldeFournisseurs)} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">DH</span>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            {data?.countFournisseursNegatifs || 0} fournisseur(s) avec un solde négatif (dette)
          </div>
        </div>

        {/* MEILLEURES VENTES LUBRIFIANT */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
              MEILLEURES VENTES DU MOIS (LUBRIFIANT)
            </span>
            <Droplets className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          {data?.topProducts && data.topProducts.length > 0 ? (
            <div className="space-y-1">
              <div className="font-bold text-xs text-slate-900 dark:text-white truncate">
                {data.topProducts[0].name}
              </div>
              <div className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold tabular-nums">
                {data.topProducts[0].qte} unités ({formatDH(data.topProducts[0].totalDH)} DH)
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-400 dark:text-slate-500 italic">
              Aucune donnée disponible pour ce mois
            </div>
          )}
        </div>
      </div>

      {/* Main Chart Section from PDF Page 1 */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-2xs relative">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">
            Chiffre d'affaires HT et résultat net par mois pour l'année 2026 (en MDH)
          </h2>

          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
              <span className="text-slate-600">Chiffre d'affaires</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
              <span className="text-slate-600">Charges</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
              <span className="text-slate-600">Résultat net</span>
            </div>

            <button
              onClick={() => {
                localStorage.setItem('stationhub_rapport_tab', 'cpc');
                onNavigateToTab('rapports');
              }}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 ml-2 transition-colors cursor-pointer"
              title="Consulter le rapport CPC complet (Résultat net annuel)"
            >
              <span>voir le rapport</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Detailed Floating Hover Tooltip */}
        {hoveredMonth && (
          <div className="absolute top-16 right-6 z-20 bg-slate-900 text-white rounded-xl shadow-xl p-3.5 border border-slate-700 text-xs space-y-1.5 min-w-[210px] animate-in fade-in duration-150">
            <div className="font-bold text-slate-200 pb-1 border-b border-slate-800 flex justify-between items-center">
              <span>{hoveredMonth.month} 2026</span>
              <span className="text-[10px] text-emerald-400 font-mono">Détails mensuels</span>
            </div>
            <div className="flex justify-between items-center text-slate-300">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span> CA HT :
              </span>
              <span className="font-bold font-mono text-white">{formatDH(hoveredMonth.caHT)} DH</span>
            </div>
            <div className="flex justify-between items-center text-slate-300">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400"></span> Charges :
              </span>
              <span className="font-bold font-mono text-white">{formatDH(hoveredMonth.charges)} DH</span>
            </div>
            <div className="flex justify-between items-center pt-1 border-t border-slate-800 text-slate-200">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Résultat Net :
              </span>
              <span
                className={`font-black font-mono ${
                  hoveredMonth.resultatNet >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {formatDH(hoveredMonth.resultatNet)} DH
              </span>
            </div>
            {hoveredMonth.caHT > 0 && (
              <div className="text-[10px] text-slate-400 text-right font-mono">
                Marge nette: {((hoveredMonth.resultatNet / hoveredMonth.caHT) * 100).toFixed(1)}%
              </div>
            )}
          </div>
        )}

        {/* Visual Monthly Performance Bars/Chart */}
        <div className="h-64 flex items-end gap-2 pt-6 pb-2 border-b border-slate-100">
          {data?.chartMonthly?.map((m: any, idx: number) => {
            const maxVal = Math.max(
              40000,
              ...data.chartMonthly.map((x: any) => Math.max(x.caHT || 0, x.charges || 0, Math.abs(x.resultatNet || 0)))
            );
            const caHeight = m.caHT > 0 ? Math.min(100, Math.max(6, (m.caHT / maxVal) * 100)) : 0;
            const chargesHeight = m.charges > 0 ? Math.min(100, Math.max(6, (m.charges / maxVal) * 100)) : 0;
            const resHeight = m.resultatNet > 0 ? Math.min(100, Math.max(4, (m.resultatNet / maxVal) * 100)) : 0;

            return (
              <div
                key={idx}
                onMouseEnter={() => setHoveredMonth(m)}
                onMouseLeave={() => setHoveredMonth(null)}
                className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer transition-colors hover:bg-slate-50/80 rounded-lg p-1"
              >
                <div className="w-full flex items-end justify-center gap-1 h-48 px-1">
                  {/* CA Bar */}
                  <div
                    style={{ height: `${caHeight}%` }}
                    className={`w-1/3 rounded-t-xs transition-all relative ${
                      caHeight > 0 ? 'bg-blue-500 group-hover:bg-blue-600' : 'bg-transparent'
                    }`}
                  ></div>
                  {/* Charges Bar */}
                  <div
                    style={{ height: `${chargesHeight}%` }}
                    className={`w-1/3 rounded-t-xs transition-all relative ${
                      chargesHeight > 0 ? 'bg-amber-400 group-hover:bg-amber-500' : 'bg-transparent'
                    }`}
                  ></div>
                  {/* Résultat Bar */}
                  <div
                    style={{ height: `${resHeight}%` }}
                    className={`w-1/3 rounded-t-xs transition-all relative ${
                      resHeight > 0 ? 'bg-emerald-500 group-hover:bg-emerald-600' : 'bg-transparent'
                    }`}
                  ></div>
                </div>
                <span
                  className={`text-[10px] mt-2 font-medium transition-colors ${
                    hoveredMonth?.month === m.month ? 'text-emerald-700 font-bold' : 'text-slate-500'
                  }`}
                >
                  {m.month}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
