import React, { useEffect, useState } from 'react';
import {
  Plus,
  MoreVertical,
  History,
  Edit2,
  Trash2,
  X,
  Droplet,
  Fuel,
  Check,
  FileSpreadsheet,
} from 'lucide-react';
import { api } from '../../services/api.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { Carburant } from '../../types/index.ts';
import { DateRangeExportModal } from '../common/DateRangeExportModal.tsx';
import { exportToExcel } from '../../utils/excelExport.ts';
import { formatDateDMY, isDateInRange } from '../../utils/dateUtils.ts';

export const CarburantsView: React.FC = () => {
  const { station } = useAuth();
  const [carburants, setCarburants] = useState<Carburant[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [editingCarburant, setEditingCarburant] = useState<Carburant | null>(null);
  const [historyCarburant, setHistoryCarburant] = useState<Carburant | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Edit / Add Form Fields
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [pricePerLiter, setPricePerLiter] = useState('');

  const loadData = async () => {
    if (!station) return;
    try {
      setLoading(true);
      const res = await api.getCarburants(station.id);
      setCarburants(res);
    } catch (err) {
      console.error('Failed to load carburants', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [station]);

  const handleExportExcel = (startDate: string, endDate: string) => {
    const rows: any[] = [];
    carburants.forEach((carb) => {
      (carb.history || []).forEach((h) => {
        if (isDateInRange(h.date, startDate, endDate)) {
          rows.push({
            'Date (JJ/MM/AA)': formatDateDMY(h.date),
            'Carburant': carb.name,
            'Code': carb.code,
            'Prix par Litre (DH/L)': h.price,
            'Modifié par': h.updatedBy || 'Gérant',
          });
        }
      });
      // Also include current price entry
      rows.push({
        'Date (JJ/MM/AA)': formatDateDMY(new Date().toISOString()),
        'Carburant': carb.name,
        'Code': carb.code,
        'Prix par Litre (DH/L)': carb.pricePerLiter,
        'Modifié par': 'Prix Actuel Piste',
      });
    });

    exportToExcel(`historique_prix_carburants_${formatDateDMY(startDate).replace(/\//g, '-')}_au_${formatDateDMY(endDate).replace(/\//g, '-')}`, [
      {
        sheetName: 'Historique Prix',
        data: rows.length > 0 ? rows : [{ Message: 'Aucun enregistrement sur cette période' }],
      },
    ]);
  };

  const handleAddCarburant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!station) return;
    try {
      await api.addCarburant(station.id, {
        name,
        code: code.toUpperCase(),
        pricePerLiter: parseFloat(pricePerLiter) || 0,
      });
      setIsAddModalOpen(false);
      setName('');
      setCode('');
      setPricePerLiter('');
      await loadData();
    } catch (err) {
      alert('Erreur lors de l\'ajout du carburant');
    }
  };

  const handleDeleteCarburant = async (carbId: string) => {
    if (!station || !confirm('Êtes-vous sûr de vouloir supprimer ce carburant ?')) return;
    try {
      await api.deleteCarburant(station.id, carbId);
      setActiveMenuId(null);
      await loadData();
    } catch (err) {
      alert('Erreur lors de la suppression');
    }
  };

  const openEditModal = (carb: Carburant) => {
    setEditingCarburant(carb);
    setName(carb.name);
    setCode(carb.code);
    setPricePerLiter(carb.pricePerLiter.toString());
    setActiveMenuId(null);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!station || !editingCarburant) return;
    try {
      await api.updateCarburant(station.id, editingCarburant.id, {
        name,
        code,
        pricePerLiter: parseFloat(pricePerLiter),
      });
      setEditingCarburant(null);
      await loadData();
    } catch (err) {
      alert('Erreur lors de la modification du carburant');
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Gestion des Carburants
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Tarification officielle au litre, types de carburants et historique des révisions
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsExportModalOpen(true)}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-2xs transition-colors flex items-center gap-1.5"
            title="Exporter l'historique des prix au format Excel"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span className="hidden sm:inline">Exporter l'historique (Excel)</span>
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="p-2 text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs transition-colors flex items-center justify-center"
            title="Ajouter un carburant"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Fuel Cards Grid matching PDF Page 1 bottom */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {carburants.map((carb) => {
          const isGasoil = carb.code.toUpperCase() === 'GAS';
          const dropColor = isGasoil ? 'text-slate-800' : 'text-emerald-600';

          return (
            <div
              key={carb.id}
              className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between hover:border-slate-300 transition-all shadow-2xs relative"
            >
              <div className="flex items-center gap-4">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    isGasoil ? 'bg-slate-100' : 'bg-emerald-50'
                  }`}
                >
                  <Droplet className={`w-5 h-5 ${dropColor}`} fill="currentColor" />
                </div>

                <div>
                  <h3 className="font-bold text-sm text-slate-900">{carb.name}</h3>
                  <span className="text-[10px] text-slate-500 font-mono">
                    Code: {carb.code}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-xl font-black text-slate-900 tabular-nums">
                    {carb.pricePerLiter.toFixed(2)}{' '}
                    <span className="text-xs font-semibold text-slate-500">DH/L</span>
                  </div>
                  <span className="text-[10px] text-slate-400">Prix actuel</span>
                </div>

                {/* Dropdown Menu Trigger */}
                <div className="relative">
                  <button
                    onClick={() =>
                      setActiveMenuId(activeMenuId === carb.id ? null : carb.id)
                    }
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>

                  {/* Dropdown Menu */}
                  {activeMenuId === carb.id && (
                    <div
                      className="absolute right-0 mt-1 w-52 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-30 animate-in fade-in zoom-in-95"
                      onMouseLeave={() => setActiveMenuId(null)}
                    >
                      <button
                        onClick={() => {
                          setHistoryCarburant(carb);
                          setActiveMenuId(null);
                        }}
                        className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                      >
                        <History className="w-3.5 h-3.5 text-slate-400" />
                        <span>Consulter l'historique des prix</span>
                      </button>
                      <button
                        onClick={() => openEditModal(carb)}
                        className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-slate-400" />
                        <span>Modifier le carburant</span>
                      </button>
                      <button
                        onClick={() => handleDeleteCarburant(carb.id)}
                        className="w-full text-left px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2 border-t border-slate-100 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                        <span>Supprimer ce carburant</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL: Modifier le Carburant (Modernized SaaS UI) */}
      {editingCarburant && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200/80 dark:border-slate-800 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-xs">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">Modifier le Carburant</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{editingCarburant.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingCarburant(null)}
                className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Désignation du Carburant *
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
                  Code / Abréviation *
                </label>
                <input
                  type="text"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white uppercase font-mono transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Prix par Litre (DH/L) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={pricePerLiter}
                  onChange={(e) => setPricePerLiter(e.target.value)}
                  className="w-full text-sm font-bold font-mono px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white transition-all"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingCarburant(null)}
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

      {/* MODAL: Historique des Prix (Modernized SaaS UI) */}
      {historyCarburant && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200/80 dark:border-slate-800 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-xs">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Historique des Prix
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {historyCarburant.name} ({historyCarburant.code}) • Journal des modifications
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setHistoryCarburant(null)}
                className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              <div className="border border-slate-200/80 dark:border-slate-700/80 rounded-xl overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold uppercase text-[11px]">
                    <tr>
                      <th className="py-2.5 px-3.5">Date</th>
                      <th className="py-2.5 px-3.5">Nouveau Prix</th>
                      <th className="py-2.5 px-3.5">Modifié par</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {historyCarburant.history?.map((h, i) => (
                      <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-2.5 px-3.5 font-mono text-slate-600 dark:text-slate-400">{h.date}</td>
                        <td className="py-2.5 px-3.5 font-bold font-mono text-emerald-700 dark:text-emerald-400">
                          {h.price.toFixed(2)} DH
                        </td>
                        <td className="py-2.5 px-3.5 text-slate-700 dark:text-slate-300">{h.updatedBy}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end pt-4 mt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setHistoryCarburant(null)}
                  className="px-5 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Ajouter un Carburant (Modernized SaaS UI) */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200/80 dark:border-slate-800 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-xs">
                  <Fuel className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">Nouveau Carburant</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Ajout au barème de la station</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddCarburant} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Nom du carburant *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Gasoil 50, Sans Plomb 98..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Code / Abréviation (ex: GAS, SSP, EXCL...) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: GAS50"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white uppercase font-mono transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Prix par Litre initial (DH/L) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="Ex: 15.92"
                  value={pricePerLiter}
                  onChange={(e) => setPricePerLiter(e.target.value)}
                  className="w-full text-sm font-bold font-mono px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white transition-all"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 rounded-xl shadow-xs hover:shadow transition-all"
                >
                  Ajouter le carburant
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Export to Excel Modal */}
      <DateRangeExportModal
        isOpen={isExportModalOpen}
        title="Exporter l'historique des prix des carburants"
        subtitle="Sélectionnez la période pour extraire les révisions de prix en format Excel (JJ/MM/AA)"
        onClose={() => setIsExportModalOpen(false)}
        onExport={handleExportExcel}
      />
    </div>
  );
};
