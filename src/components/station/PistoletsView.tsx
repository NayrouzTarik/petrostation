import React, { useEffect, useState } from 'react';
import {
  Plus,
  Gauge,
  Sliders,
  AlertTriangle,
  X,
  Check,
  Fuel,
  MoreVertical,
  Edit2,
} from 'lucide-react';
import { api } from '../../services/api.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { Pistolet, Citerne } from '../../types/index.ts';
import { formatDateDMY } from '../../utils/dateUtils.ts';

export const PistoletsView: React.FC = () => {
  const { station } = useAuth();
  const [pistolets, setPistolets] = useState<Pistolet[]>([]);
  const [citernes, setCiternes] = useState<Citerne[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [isCalibrageOpen, setIsCalibrageOpen] = useState(false);
  const [isNewPistoletOpen, setIsNewPistoletOpen] = useState(false);
  const [editingPistolet, setEditingPistolet] = useState<Pistolet | null>(null);
  const [historyPistolet, setHistoryPistolet] = useState<Pistolet | null>(null);
  const [pistoletHistoryList, setPistoletHistoryList] = useState<any[]>([]);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Calibrage state
  const [calibrageDate, setCalibrageDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [calibrageValues, setCalibrageValues] = useState<Record<string, number>>({});

  // New Pistolet state
  const [code, setCode] = useState('');
  const [citerneId, setCiterneId] = useState('');
  const [carburantCode, setCarburantCode] = useState('GAS');
  const [initialIndex, setInitialIndex] = useState('0');

  // Edit Pistolet state
  const [editCode, setEditCode] = useState('');
  const [editCiterneId, setEditCiterneId] = useState('');
  const [editCarburantCode, setEditCarburantCode] = useState('GAS');
  const [editCurrentIndex, setEditCurrentIndex] = useState('0');

  const loadData = async () => {
    if (!station) return;
    try {
      setLoading(true);
      const [pList, cList] = await Promise.all([
        api.getPistolets(station.id),
        api.getCiternes(station.id),
      ]);
      setPistolets(pList);
      setCiternes(cList);
      if (cList.length > 0) {
        setCiterneId(cList[0].id);
        setCarburantCode(cList[0].carburantCode);
      }
      // Pre-fill calibrage values with current index
      const initVals: Record<string, number> = {};
      pList.forEach((p) => {
        initVals[p.id] = p.currentIndex;
      });
      setCalibrageValues(initVals);
    } catch (err) {
      console.error('Failed to load pistolets', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [station]);

  const openEditModal = (p: Pistolet) => {
    setEditingPistolet(p);
    setEditCode(p.code);
    setEditCiterneId(p.citerneId);
    setEditCarburantCode(p.carburantCode);
    setEditCurrentIndex(String(p.currentIndex));
    setActiveMenuId(null);
  };

  const openHistoryModal = async (p: Pistolet) => {
    if (!station) return;
    setHistoryPistolet(p);
    setActiveMenuId(null);
    try {
      const hist = await api.getPistoletHistory(station.id, p.id);
      setPistoletHistoryList(hist);
    } catch {
      setPistoletHistoryList([]);
    }
  };

  const handleUpdatePistolet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!station || !editingPistolet) return;
    try {
      await api.updatePistolet(station.id, editingPistolet.id, {
        code: editCode,
        citerneId: editCiterneId,
        carburantCode: editCarburantCode,
        currentIndex: parseFloat(editCurrentIndex) || 0,
      });
      setEditingPistolet(null);
      await loadData();
    } catch (err) {
      alert('Erreur lors de la modification du pistolet');
    }
  };

  const handleDeletePistolet = async (pistId: string) => {
    if (!station || !confirm('Êtes-vous sûr de vouloir supprimer ce pistolet ?')) return;
    try {
      await api.deletePistolet(station.id, pistId);
      setActiveMenuId(null);
      await loadData();
    } catch (err) {
      alert('Erreur lors de la suppression du pistolet');
    }
  };

  const handleCalibrageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!station) return;
    try {
      const payload = {
        date: calibrageDate,
        adjustments: Object.entries(calibrageValues).map(([pistoletId, nouveauIndex]) => ({
          pistoletId,
          nouveauIndex,
        })),
      };
      await api.submitCalibrage(station.id, payload);
      setIsCalibrageOpen(false);
      await loadData();
    } catch (err) {
      alert('Erreur lors du calibrage des index');
    }
  };

  const handleAddPistolet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!station) return;
    try {
      await api.addPistolet(station.id, {
        code,
        citerneId,
        carburantCode,
        initialIndex: parseFloat(initialIndex) || 0,
      });
      setIsNewPistoletOpen(false);
      setCode('');
      await loadData();
    } catch (err) {
      alert('Erreur lors de l\'ajout du pistolet');
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header matching PDF Page 3 */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Gestion des Pistolets
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Surveillance des index volumétriques, calibrage et affectation aux citernes
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsCalibrageOpen(true)}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1.5 transition-colors border border-slate-300"
          >
            <Sliders className="w-3.5 h-3.5 text-slate-600" />
            <span>Calibrage</span>
          </button>
          <button
            onClick={() => setIsNewPistoletOpen(true)}
            className="p-2 text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs transition-colors flex items-center justify-center"
            title="Nouveau Pistolet"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Pumps Grid matching exact cards in PDF Page 3 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {pistolets.map((pist) => {
          const isGasoil = pist.carburantCode.toUpperCase() === 'GAS';
          const fuelName = isGasoil ? 'Gasoil' : 'Sans Plomb';

          return (
            <div
              key={pist.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-2xs relative flex flex-col justify-between"
            >
              <div className="flex items-start justify-between">
                {/* Pump Icon & Code */}
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-2xs ${
                      isGasoil ? 'bg-slate-900 dark:bg-slate-800 text-white' : 'bg-emerald-600 text-white'
                    }`}
                    title={`Pistolet distributeur ${fuelName}`}
                  >
                    <Fuel className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-black text-sm text-slate-900 dark:text-white">{pist.code}</h3>
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="En service"></span>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded font-mono block mt-0.5 ${
                        isGasoil
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200'
                          : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                      }`}
                    >
                      {pist.carburantCode} ({fuelName})
                    </span>
                  </div>
                </div>

                {/* 3-dots Actions Menu */}
                <div className="relative">
                  <button
                    onClick={() =>
                      setActiveMenuId(activeMenuId === pist.id ? null : pist.id)
                    }
                    className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg p-1 transition-colors cursor-pointer"
                    title="Actions pistolet"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>

                  {/* Dropdown Menu */}
                  {activeMenuId === pist.id && (
                    <>
                      <div
                        className="fixed inset-0 z-20"
                        onClick={() => setActiveMenuId(null)}
                      />
                      <div
                        className="absolute right-0 mt-1 w-52 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl py-1 z-30 animate-in fade-in zoom-in-95"
                      >
                        <button
                          onClick={() => {
                            setActiveMenuId(null);
                            openHistoryModal(pist);
                          }}
                          className="w-full text-left px-3 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 flex items-center gap-2 cursor-pointer"
                        >
                          <Sliders className="w-3.5 h-3.5 text-slate-400 dark:text-slate-400" />
                          <span>Consulter l'historique</span>
                        </button>
                        <button
                          onClick={() => {
                            setActiveMenuId(null);
                            openEditModal(pist);
                          }}
                          className="w-full text-left px-3 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 flex items-center gap-2 cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-slate-400 dark:text-slate-400" />
                          <span>Modifier le pistolet</span>
                        </button>
                        <button
                          onClick={() => {
                            setActiveMenuId(null);
                            handleDeletePistolet(pist.id);
                          }}
                          className="w-full text-left px-3 py-2 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2 border-t border-slate-100 dark:border-slate-700/60 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5 text-rose-500" />
                          <span>Supprimer le pistolet</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Meter Index Display */}
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-baseline justify-between">
                <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-semibold">
                  Index Volumétrique
                </span>
                <span className="text-base font-black font-mono text-slate-900 dark:text-white tabular-nums tracking-wide">
                  {(pist.currentIndex || 0).toLocaleString('fr-FR')}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL: Calibrage Index Pistolets (Modernized SaaS UI) */}
      {isCalibrageOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200/80 dark:border-slate-800 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-xs">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Calibrage des Index Pistolets
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Ajustement technique et réétalonnage volumétrique
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCalibrageOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCalibrageSubmit} className="p-6 space-y-5">
              {/* Warning Banner */}
              <div className="flex items-start gap-3 p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p>
                    En cas de maintenance des compteurs ou pompes, scindez la journée et indiquez ici l'index réel de départ pour la nouvelle période d'exploitation.
                  </p>
                  <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 mt-1">
                    Note : Action technique traçable dans le journal d'audit de la station.
                  </p>
                </div>
              </div>

              {/* Date Input */}
              <div className="flex items-center gap-3">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                  Date de calibrage :
                </label>
                <div className="relative w-48">
                  <input
                    type="date"
                    required
                    value={calibrageDate}
                    onChange={(e) => setCalibrageDate(e.target.value)}
                    className="w-full text-xs px-3.5 py-2 border border-slate-200 dark:border-slate-700 rounded-xl font-mono bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 transition-all"
                  />
                </div>
              </div>

              {/* Calibrage Table */}
              <div className="border border-slate-200/80 dark:border-slate-700/80 rounded-xl overflow-hidden max-h-64 overflow-y-auto shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold uppercase text-[11px] sticky top-0">
                    <tr>
                      <th className="py-2.5 px-4">Pistolet</th>
                      <th className="py-2.5 px-4 text-right">Index Actuel</th>
                      <th className="py-2.5 px-4 text-right">Nouveau Index</th>
                      <th className="py-2.5 px-4 text-right">Différence</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {pistolets.map((p) => {
                      const nouveau = calibrageValues[p.id] ?? p.currentIndex;
                      const diff = nouveau - p.currentIndex;

                      return (
                        <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-2.5 px-4 font-semibold text-slate-900 dark:text-white">
                            {p.code} - {p.carburantCode}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono text-slate-600 dark:text-slate-400">
                            {p.currentIndex.toLocaleString('fr-FR')}
                          </td>
                          <td className="py-2.5 px-4 text-right">
                            <input
                              type="number"
                              required
                              value={nouveau}
                              onChange={(e) =>
                                setCalibrageValues({
                                  ...calibrageValues,
                                  [p.id]: parseFloat(e.target.value) || 0,
                                })
                              }
                              className="w-28 text-xs font-mono font-bold px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-right bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            />
                          </td>
                          <td
                            className={`py-2.5 px-4 text-right font-mono font-bold ${
                              diff === 0
                                ? 'text-slate-700 dark:text-slate-300'
                                : diff > 0
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            {diff > 0 ? `+${diff}` : diff}
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
                  onClick={() => setIsCalibrageOpen(false)}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 rounded-xl shadow-xs hover:shadow transition-all"
                >
                  Valider le Calibrage
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Nouveau Pistolet (Modernized SaaS UI) */}
      {isNewPistoletOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200/80 dark:border-slate-800 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-xs">
                  <Gauge className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">Nouveau Pistolet</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Raccordement d'un pistolet à une citerne</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsNewPistoletOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddPistolet} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Code / Repère du pistolet *
                </label>
                <input
                  type="text"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Ex: P1, P2, P3..."
                  className="w-full text-xs font-mono font-bold px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white transition-all uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Citerne source associée *
                </label>
                <select
                  value={citerneId}
                  onChange={(e) => {
                    const cId = e.target.value;
                    setCiterneId(cId);
                    const matchingCit = citernes.find((c) => c.id === cId);
                    if (matchingCit) {
                      setCarburantCode(matchingCit.carburantCode);
                    }
                  }}
                  className="w-full text-xs px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white transition-all font-medium"
                >
                  {citernes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.carburantCode})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Type de carburant
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={carburantCode}
                    className="w-full text-xs font-mono font-bold px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-700 dark:text-slate-300"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Index de départ *
                  </label>
                  <input
                    type="number"
                    value={initialIndex}
                    onChange={(e) => setInitialIndex(e.target.value)}
                    className="w-full text-xs font-mono font-bold px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white transition-all"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNewPistoletOpen(false)}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 rounded-xl shadow-xs hover:shadow transition-all"
                >
                  Ajouter le pistolet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Modifier le Pistolet (Modernized SaaS UI) */}
      {editingPistolet && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200/80 dark:border-slate-800 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-xs">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">Modifier le Pistolet</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{editingPistolet.code}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingPistolet(null)}
                className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdatePistolet} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Code Pistolet (ex: P1, P2...) *
                </label>
                <input
                  type="text"
                  required
                  value={editCode}
                  onChange={(e) => setEditCode(e.target.value)}
                  className="w-full text-xs font-mono font-bold px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white transition-all uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Liaison Citerne *
                </label>
                <select
                  value={editCiterneId}
                  onChange={(e) => {
                    const cId = e.target.value;
                    setEditCiterneId(cId);
                    const matchingCit = citernes.find((c) => c.id === cId);
                    if (matchingCit) {
                      setEditCarburantCode(matchingCit.carburantCode);
                    }
                  }}
                  className="w-full text-xs px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white transition-all font-medium"
                >
                  {citernes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.carburantCode})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Type de carburant
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={editCarburantCode}
                    className="w-full text-xs font-mono font-bold px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-700 dark:text-slate-300"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Index Volumétrique Actuel *
                  </label>
                  <input
                    type="number"
                    required
                    value={editCurrentIndex}
                    onChange={(e) => setEditCurrentIndex(e.target.value)}
                    className="w-full text-xs font-mono font-bold px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white transition-all"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingPistolet(null)}
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

      {/* MODAL: Historique du Pistolet (Modernized SaaS UI) */}
      {historyPistolet && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200/80 dark:border-slate-800 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-xs">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Historique du Pistolet {historyPistolet.code} ({historyPistolet.carburantCode})
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Relevés de calibrages, ajustements d'index et étalonnages
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setHistoryPistolet(null)}
                className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden max-h-80 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold sticky top-0">
                    <tr>
                      <th className="py-2.5 px-3">Date (JJ/MM/AA)</th>
                      <th className="py-2.5 px-3 text-right">Index Avant</th>
                      <th className="py-2.5 px-3 text-right">Nouvel Index</th>
                      <th className="py-2.5 px-3 text-right">Différence</th>
                      <th className="py-2.5 px-3">Motif</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                    {pistoletHistoryList.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400 dark:text-slate-500 font-sans italic">
                          Aucun calibrage enregistré pour ce pistolet.
                        </td>
                      </tr>
                    ) : (
                      pistoletHistoryList.map((c, i) => (
                        <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-2.5 px-3 font-sans text-slate-700 dark:text-slate-300">
                            {formatDateDMY(c.date)}
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-600 dark:text-slate-400">
                            {c.indexActuel?.toLocaleString('fr-FR')}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-slate-900 dark:text-white">
                            {c.nouveauIndex?.toLocaleString('fr-FR')}
                          </td>
                          <td
                            className={`py-2.5 px-3 text-right font-bold ${
                              c.difference >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            {c.difference > 0 ? `+${c.difference}` : c.difference}
                          </td>
                          <td className="py-2.5 px-3 font-sans text-slate-600 dark:text-slate-400 truncate max-w-[150px]">
                            {c.motif || 'Calibrage de piste'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end pt-4 mt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setHistoryPistolet(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
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
