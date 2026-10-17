import React, { useEffect, useState } from 'react';
import {
  Plus,
  Scale,
  Database,
  AlertTriangle,
  X,
  Check,
  Calendar,
  MoreVertical,
  History,
  Edit2,
  Trash2,
} from 'lucide-react';
import { api } from '../../services/api.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { Citerne } from '../../types/index.ts';
import { formatDateDMY } from '../../utils/dateUtils.ts';

export const CiternesView: React.FC = () => {
  const { station } = useAuth();
  const [citernes, setCiternes] = useState<Citerne[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [isJaugeageOpen, setIsJaugeageOpen] = useState(false);
  const [isNewCiterneOpen, setIsNewCiterneOpen] = useState(false);
  const [editingCiterne, setEditingCiterne] = useState<Citerne | null>(null);
  const [historyCiterne, setHistoryCiterne] = useState<Citerne | null>(null);
  const [citerneHistoryList, setCiterneHistoryList] = useState<any[]>([]);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Jaugeage form state
  const [jaugeageDate, setJaugeageDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [readings, setReadings] = useState<Record<string, number>>({});

  // New Citerne / Edit form state
  const [name, setName] = useState('');
  const [carburantCode, setCarburantCode] = useState('GAS');
  const [capacity, setCapacity] = useState('20000');
  const [minAlertLevel, setMinAlertLevel] = useState('2500');
  const [currentStock, setCurrentStock] = useState('0');

  const loadData = async () => {
    if (!station) return;
    try {
      setLoading(true);
      const res = await api.getCiternes(station.id);
      setCiternes(res);
      // Pre-fill readings with current stock
      const initialReadings: Record<string, number> = {};
      res.forEach((c) => {
        initialReadings[c.id] = c.currentStock;
      });
      setReadings(initialReadings);
    } catch (err) {
      console.error('Failed to load citernes', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [station]);

  const openEditModal = (c: Citerne) => {
    setEditingCiterne(c);
    setName(c.name);
    setCarburantCode(c.carburantCode);
    setCapacity(String(c.capacity));
    setMinAlertLevel(String(c.minAlertLevel));
    setCurrentStock(String(c.currentStock));
    setActiveMenuId(null);
  };

  const openHistoryModal = async (c: Citerne) => {
    if (!station) return;
    setHistoryCiterne(c);
    setActiveMenuId(null);
    try {
      const hist = await api.getCiterneHistory(station.id, c.id);
      setCiterneHistoryList(hist);
    } catch {
      setCiterneHistoryList([]);
    }
  };

  const handleUpdateCiterne = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!station || !editingCiterne) return;
    try {
      await api.updateCiterne(station.id, editingCiterne.id, {
        name,
        carburantCode,
        capacity: parseFloat(capacity) || 0,
        minAlertLevel: parseFloat(minAlertLevel) || 0,
        currentStock: parseFloat(currentStock) || 0,
      });
      setEditingCiterne(null);
      await loadData();
    } catch (err) {
      alert('Erreur lors de la modification de la citerne');
    }
  };

  const handleDeleteCiterne = async (citerneId: string) => {
    if (!station || !confirm('Êtes-vous sûr de vouloir supprimer cette citerne ?')) return;
    try {
      await api.deleteCiterne(station.id, citerneId);
      setActiveMenuId(null);
      await loadData();
    } catch (err) {
      alert('Erreur lors de la suppression de la citerne');
    }
  };

  const handleJaugeageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!station) return;
    try {
      const payload = {
        date: jaugeageDate,
        readings: Object.entries(readings).map(([citerneId, stockReel]) => ({
          citerneId,
          stockReel,
        })),
      };
      await api.submitJaugeage(station.id, payload);
      setIsJaugeageOpen(false);
      await loadData();
    } catch (err) {
      alert('Erreur lors de la validation du jaugeage');
    }
  };

  const handleAddCiterne = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!station) return;
    try {
      await api.addCiterne(station.id, {
        name,
        carburantCode,
        capacity: parseFloat(capacity),
        minAlertLevel: parseFloat(minAlertLevel),
        currentStock: 0,
      });
      setIsNewCiterneOpen(false);
      setName('');
      await loadData();
    } catch (err) {
      alert('Erreur lors de l\'ajout de la citerne');
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header matching PDF Page 2 */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Gestion des Citernes
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Suivi des capacités des réservoirs, stocks réels et relevés de jaugeage
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsJaugeageOpen(true)}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1.5 transition-colors border border-slate-300"
          >
            <Scale className="w-3.5 h-3.5 text-slate-600" />
            <span>Jaugeage</span>
          </button>
          <button
            onClick={() => setIsNewCiterneOpen(true)}
            className="p-2 text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs transition-colors flex items-center justify-center"
            title="Ajouter une citerne"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Citernes Cards Grid matching PDF Page 2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {citernes.map((cit) => {
          const isGasoil = cit.carburantCode.toUpperCase() === 'GAS';
          const fillPercentage = Math.min(
            100,
            Math.round((cit.currentStock / cit.capacity) * 100)
          );
          const isLow = cit.currentStock <= cit.minAlertLevel;

          return (
            <div
              key={cit.id}
              className="bg-white border border-slate-200 rounded-xl p-5 hover:border-slate-300 transition-all shadow-2xs relative space-y-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      isGasoil ? 'bg-slate-100 text-slate-800' : 'bg-emerald-50 text-emerald-700'
                    }`}
                  >
                    <Database className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">{cit.name}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded font-mono ${
                          isGasoil ? 'bg-slate-100 text-slate-800' : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {cit.carburantCode}
                      </span>
                      <span className="text-xs text-slate-400">·</span>
                      <span className="text-[11px] text-slate-500 font-mono">
                        Capacité: {cit.capacity.toLocaleString('fr-FR')} L
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-xl font-black text-slate-900 tabular-nums">
                      {cit.currentStock.toLocaleString('fr-FR')}{' '}
                      <span className="text-xs font-semibold text-slate-500">L</span>
                    </div>
                    <span className="text-[10px] text-slate-400">Stock actuel</span>
                  </div>

                  {/* Dropdown Menu Trigger */}
                  <div className="relative">
                    <button
                      onClick={() =>
                        setActiveMenuId(activeMenuId === cit.id ? null : cit.id)
                      }
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                      title="Options de la citerne"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>

                    {/* Dropdown Menu */}
                    {activeMenuId === cit.id && (
                      <div
                        className="absolute right-0 mt-1 w-56 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-30 animate-in fade-in zoom-in-95"
                        onMouseLeave={() => setActiveMenuId(null)}
                      >
                        <button
                          onClick={() => openHistoryModal(cit)}
                          className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                        >
                          <History className="w-3.5 h-3.5 text-slate-400" />
                          <span>Consulter l'historique des jaugeages</span>
                        </button>
                        <button
                          onClick={() => openEditModal(cit)}
                          className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-slate-400" />
                          <span>Modifier la citerne</span>
                        </button>
                        <button
                          onClick={() => handleDeleteCiterne(cit.id)}
                          className="w-full text-left px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2 border-t border-slate-100 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                          <span>Supprimer cette citerne</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Tank Level Progress Bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[11px] text-slate-500">Remplissage cuve</span>
                  <span className="font-bold font-mono text-slate-800">
                    {fillPercentage}%
                  </span>
                </div>
                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200/60 p-0.5">
                  <div
                    style={{ width: `${fillPercentage}%` }}
                    className={`h-full rounded-full transition-all duration-500 ${
                      isLow
                        ? 'bg-rose-500'
                        : isGasoil
                        ? 'bg-slate-700'
                        : 'bg-emerald-500'
                    }`}
                  ></div>
                </div>
              </div>

              {isLow && (
                <div className="flex items-center gap-2 p-2 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-[11px]">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>Alerte stock critique (&le; {cit.minAlertLevel} L). Réapprovisionnement requis.</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* MODAL: Jaugeage Citernes (Modernized SaaS UI) */}
      {isJaugeageOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200/80 dark:border-slate-800 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-xs">
                  <Scale className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">Jaugeage des Citernes</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Relevé physique et réconciliation des stocks réels</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsJaugeageOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleJaugeageSubmit} className="p-6 space-y-5">
              {/* Warning Banner */}
              <div className="flex items-start gap-3 p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <span>
                  Le jaugeage doit correspondre aux mesures physiques prises à la clôture de journée pour réconcilier le stock réel et le stock théorique.
                </span>
              </div>

              {/* Date Input */}
              <div className="flex items-center gap-3">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                  Date du jaugeage :
                </label>
                <div className="relative w-48">
                  <input
                    type="date"
                    required
                    value={jaugeageDate}
                    onChange={(e) => setJaugeageDate(e.target.value)}
                    className="w-full text-xs px-3.5 py-2 border border-slate-200 dark:border-slate-700 rounded-xl font-mono bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 transition-all"
                  />
                </div>
              </div>

              {/* Jaugeage Table */}
              <div className="border border-slate-200/80 dark:border-slate-700/80 rounded-xl overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold uppercase text-[11px]">
                    <tr>
                      <th className="py-2.5 px-4">Citerne</th>
                      <th className="py-2.5 px-4 text-right">Stock théorique</th>
                      <th className="py-2.5 px-4 text-right">Stock réel (L)</th>
                      <th className="py-2.5 px-4 text-right">Écart</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {citernes.map((c) => {
                      const real = readings[c.id] ?? c.currentStock;
                      const ecart = real - c.currentStock;

                      return (
                        <tr key={c.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                            {c.name} - {c.carburantCode}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-slate-600 dark:text-slate-400">
                            {c.currentStock.toLocaleString('fr-FR')} L
                          </td>
                          <td className="py-3 px-4 text-right">
                            <input
                              type="number"
                              required
                              value={real}
                              onChange={(e) =>
                                setReadings({
                                  ...readings,
                                  [c.id]: parseFloat(e.target.value) || 0,
                                })
                              }
                              className="w-28 text-xs font-mono font-bold px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-right bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            />
                          </td>
                          <td
                            className={`py-3 px-4 text-right font-mono font-bold ${
                              ecart === 0
                                ? 'text-slate-700 dark:text-slate-300'
                                : ecart > 0
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            {ecart > 0 ? `+${ecart}` : ecart} L
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsJaugeageOpen(false)}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 rounded-xl shadow-xs hover:shadow transition-all"
                >
                  Valider le Jaugeage
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Nouvelle Citerne (Modernized SaaS UI) */}
      {isNewCiterneOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200/80 dark:border-slate-800 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-xs">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">Nouvelle Citerne</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Configuration du réservoir de stockage</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsNewCiterneOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddCiterne} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Nom de la Citerne (unique) *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: CGAS-2"
                  className="w-full text-xs px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Type Carburant
                </label>
                <select
                  value={carburantCode}
                  onChange={(e) => setCarburantCode(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white transition-all font-medium"
                >
                  <option value="GAS">Gasoil (GAS)</option>
                  <option value="SSP">Super Sans Plomb (SSP)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Capacité (Litres) *
                  </label>
                  <input
                    type="number"
                    required
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value)}
                    className="w-full text-xs font-mono px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Seuil Alerte (L) *
                  </label>
                  <input
                    type="number"
                    required
                    value={minAlertLevel}
                    onChange={(e) => setMinAlertLevel(e.target.value)}
                    className="w-full text-xs font-mono px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white transition-all"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNewCiterneOpen(false)}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 rounded-xl shadow-xs hover:shadow transition-all"
                >
                  Ajouter la Citerne
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Modifier Citerne (Modernized SaaS UI) */}
      {editingCiterne && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200/80 dark:border-slate-800 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-xs">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">Modifier la Citerne</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{editingCiterne.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingCiterne(null)}
                className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateCiterne} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Nom de la Citerne *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Type Carburant
                </label>
                <select
                  value={carburantCode}
                  onChange={(e) => setCarburantCode(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white transition-all font-medium"
                >
                  <option value="GAS">Gasoil (GAS)</option>
                  <option value="SSP">Super Sans Plomb (SSP)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Capacité (Litres) *
                  </label>
                  <input
                    type="number"
                    required
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value)}
                    className="w-full text-xs font-mono px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Seuil Alerte (L) *
                  </label>
                  <input
                    type="number"
                    required
                    value={minAlertLevel}
                    onChange={(e) => setMinAlertLevel(e.target.value)}
                    className="w-full text-xs font-mono px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Stock Actuel en Litres *
                </label>
                <input
                  type="number"
                  required
                  value={currentStock}
                  onChange={(e) => setCurrentStock(e.target.value)}
                  className="w-full text-xs font-mono font-bold px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white transition-all"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingCiterne(null)}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 rounded-xl shadow-xs hover:shadow transition-all"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Historique des Jaugeages */}
      {historyCiterne && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Historique des Jaugeages - {historyCiterne.name} ({historyCiterne.carburantCode})
                </h2>
                <p className="text-[11px] text-slate-500">
                  Relevés de niveau réels et calcul des écarts de jauge
                </p>
              </div>
              <button
                onClick={() => setHistoryCiterne(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6">
              <div className="border border-slate-200 rounded-lg overflow-hidden max-h-72 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold sticky top-0">
                    <tr>
                      <th className="py-2.5 px-3">Date (JJ/MM/AA)</th>
                      <th className="py-2.5 px-3 text-right">Stock Théorique</th>
                      <th className="py-2.5 px-3 text-right">Stock Réel</th>
                      <th className="py-2.5 px-3 text-right">Écart (L)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {citerneHistoryList.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-6 text-center text-slate-400 font-sans italic">
                          Aucun relevé de jaugeage enregistré pour cette citerne.
                        </td>
                      </tr>
                    ) : (
                      citerneHistoryList.map((j, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-sans text-slate-700">
                            {formatDateDMY(j.date)}
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-600">
                            {j.stockTheorique?.toLocaleString('fr-FR')} L
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                            {j.stockReel?.toLocaleString('fr-FR')} L
                          </td>
                          <td
                            className={`py-2.5 px-3 text-right font-bold ${
                              j.ecart === 0
                                ? 'text-slate-600'
                                : j.ecart > 0
                                ? 'text-emerald-600'
                                : 'text-rose-600'
                            }`}
                          >
                            {j.ecart > 0 ? `+${j.ecart}` : j.ecart} L
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end pt-4 mt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setHistoryCiterne(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
