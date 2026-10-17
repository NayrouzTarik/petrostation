import React, { useEffect, useState } from 'react';
import {
  Plus,
  Sparkles,
  Edit2,
  Trash2,
  X,
  Car,
  Wrench,
} from 'lucide-react';
import { api } from '../../services/api.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { ServiceStation } from '../../types/index.ts';

export const ServicesView: React.FC = () => {
  const { station } = useAuth();
  const [services, setServices] = useState<ServiceStation[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingServ, setEditingServ] = useState<ServiceStation | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [category, setCategory] = useState('TOTAL LAVAGE');
  const [prixTTC, setPrixTTC] = useState('10.00');

  const loadData = async () => {
    if (!station) return;
    try {
      setLoading(true);
      const res = await api.getServices(station.id);
      setServices(res);
    } catch (err) {
      console.error('Failed to load services', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [station]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!station) return;
    try {
      await api.addService(station.id, {
        name,
        category,
        prixTTC: parseFloat(prixTTC) || 0,
      });
      setIsAddOpen(false);
      setName('');
      setPrixTTC('10.00');
      await loadData();
    } catch (err) {
      alert('Erreur lors de l\'ajout du service');
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!station || !editingServ) return;
    try {
      await api.updateService(station.id, editingServ.id, {
        name,
        category,
        prixTTC: parseFloat(prixTTC) || 0,
      });
      setEditingServ(null);
      await loadData();
    } catch (err) {
      alert('Erreur lors de la modification du service');
    }
  };

  const handleDelete = async (id: string) => {
    if (!station || !confirm('Supprimer ce service ?')) return;
    try {
      await api.deleteService(station.id, id);
      await loadData();
    } catch (err) {
      alert('Erreur lors de la suppression');
    }
  };

  const openEdit = (s: ServiceStation) => {
    setEditingServ(s);
    setName(s.name);
    setCategory(s.category);
    setPrixTTC(s.prixTTC.toString());
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header matching PDF Page 7 */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Gestion des Services
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Lavage auto/poids lourd, baies de vidange, graissage et services d'entretien
          </p>
        </div>

        <button
          onClick={() => {
            setName('');
            setCategory('TOTAL LAVAGE');
            setPrixTTC('10.00');
            setIsAddOpen(true);
          }}
          className="px-3.5 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg flex items-center gap-1.5 shadow-xs transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Ajouter un Service</span>
        </button>
      </div>

      {/* Table matching PDF Page 7 */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
            <tr>
              <th className="py-2.5 px-4">Nom Service</th>
              <th className="py-2.5 px-4">Catégorie</th>
              <th className="py-2.5 px-4 text-right">P.U (DH)</th>
              <th className="py-2.5 px-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {services.map((serv) => (
              <tr key={serv.id} className="hover:bg-slate-50/60">
                <td className="py-3 px-4 font-bold text-slate-900">{serv.name}</td>
                <td className="py-3 px-4 text-slate-600">
                  <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[10px]">
                    {serv.category}
                  </span>
                </td>
                <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 tabular-nums">
                  {serv.prixTTC.toFixed(2)} DH
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center justify-center gap-1.5">
                    <button
                      onClick={() => openEdit(serv)}
                      className="p-1 text-slate-400 hover:text-slate-700 rounded"
                      title="Modifier"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(serv.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded"
                      title="Supprimer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL: Ajouter un nouveau service (Modernized SaaS UI) */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200/80 dark:border-slate-800 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-xs">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">Nouveau Service</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Lavage, vidange, graissage ou mécanique</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Désignation du Service *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: LAVAGE COMPLET AUTO"
                  className="w-full text-xs px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Catégorie
                </label>
                <input
                  type="text"
                  required
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Lavage, Vidange, Graissage..."
                  className="w-full text-xs px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Prix Unitaire (DH TTC) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={prixTTC}
                  onChange={(e) => setPrixTTC(e.target.value)}
                  placeholder="Ex: 50.00"
                  className="w-full text-sm font-mono font-bold px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white transition-all"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 rounded-xl shadow-xs hover:shadow transition-all"
                >
                  Ajouter le service
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Modifier un service (Modernized SaaS UI) */}
      {editingServ && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200/80 dark:border-slate-800 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-xs">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">Modifier le service</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{editingServ.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingServ(null)}
                className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Désignation du Service *
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
                  Catégorie
                </label>
                <input
                  type="text"
                  required
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Prix Unitaire (DH TTC) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={prixTTC}
                  onChange={(e) => setPrixTTC(e.target.value)}
                  className="w-full text-sm font-mono font-bold px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white transition-all"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingServ(null)}
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
    </div>
  );
};
