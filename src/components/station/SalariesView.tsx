import React, { useEffect, useState } from 'react';
import {
  Plus,
  Users,
  UserCheck,
  Edit2,
  Trash2,
  X,
  Phone,
  Calendar,
  MoreVertical,
} from 'lucide-react';
import { api } from '../../services/api.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { Salarie } from '../../types/index.ts';

export const SalariesView: React.FC = () => {
  const { station } = useAuth();
  const [salaries, setSalaries] = useState<Salarie[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingSalarie, setEditingSalarie] = useState<Salarie | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [matricule, setMatricule] = useState('');
  const [role, setRole] = useState<'GERANT' | 'POMPISTE' | 'LAVEUR' | 'GRAISSEUR' | 'CAISSIER'>('POMPISTE');
  const [phone, setPhone] = useState('');

  const loadData = async () => {
    if (!station) return;
    try {
      setLoading(true);
      const res = await api.getSalaries(station.id);
      setSalaries(res);
    } catch (err) {
      console.error('Failed to load salaries', err);
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
      await api.addSalarie(station.id, {
        name,
        matricule,
        role,
        phone,
      });
      setIsAddModalOpen(false);
      setName('');
      setMatricule('');
      setPhone('');
      await loadData();
    } catch (err) {
      alert('Erreur lors de l\'ajout du salarié');
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!station || !editingSalarie) return;
    try {
      await api.updateSalarie(station.id, editingSalarie.id, {
        name,
        matricule,
        role,
        phone,
      });
      setEditingSalarie(null);
      await loadData();
    } catch (err) {
      alert('Erreur lors de la modification du salarié');
    }
  };

  const handleDelete = async (id: string) => {
    if (!station || !confirm('Êtes-vous sûr de vouloir supprimer ce salarié ?')) return;
    try {
      await api.deleteSalarie(station.id, id);
      await loadData();
    } catch (err) {
      alert('Erreur lors de la suppression');
    }
  };

  const openEdit = (s: Salarie) => {
    setEditingSalarie(s);
    setName(s.name);
    setMatricule(s.matricule);
    setRole(s.role);
    setPhone(s.phone || '');
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header matching PDF Page 4 */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Gestion des Salariés
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Équipes d'exploitation: Gérants, pompistes de piste, laveurs et caissiers
          </p>
        </div>

        <button
          onClick={() => {
            setName('');
            setMatricule(`M-${Date.now().toString().slice(-3)}`);
            setPhone('');
            setIsAddModalOpen(true);
          }}
          className="p-2 text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs transition-colors flex items-center justify-center"
          title="Ajouter un Salarié"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Cards Grid matching PDF Page 4 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {salaries.map((sal) => {
          const isGerant = sal.role === 'GERANT';
          const avatarBg = isGerant
            ? 'bg-blue-600 text-white'
            : 'bg-emerald-600 text-white';

          return (
            <div
              key={sal.id}
              className="bg-white border border-slate-200 rounded-xl p-4 hover:border-slate-300 transition-all shadow-2xs relative flex flex-col justify-between"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs uppercase shadow-xs ${avatarBg}`}
                  >
                    {sal.role === 'GERANT' ? 'G' : sal.matricule.slice(-2)}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 leading-tight">
                      {sal.name}
                    </h3>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Matricule: {sal.matricule}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEdit(sal)}
                    className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors"
                    title="Modifier"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(sal.id)}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                    title="Supprimer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Footer matching exact screenshot badge */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <div className="flex items-center gap-1.5 font-medium text-slate-700">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>1 INFORMATIONS {sal.role}</span>
                </div>
                <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">
                  {sal.actif ? 'ACTIF' : 'INACTIF'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL: Ajouter un Salarié (Modernized SaaS UI) */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200/80 dark:border-slate-800 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-xs">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">Nouveau Collaborateur</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Pompiste, gérant, caissier ou technicien</p>
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

            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Nom & Prénom *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Rachid Mansouri"
                  className="w-full text-xs px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Matricule *
                  </label>
                  <input
                    type="text"
                    required
                    value={matricule}
                    onChange={(e) => setMatricule(e.target.value)}
                    placeholder="Ex: EMP-004"
                    className="w-full text-xs font-mono px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Rôle / Fonction
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as any)}
                    className="w-full text-xs px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white transition-all font-medium"
                  >
                    <option value="POMPISTE">Pompiste de piste</option>
                    <option value="GERANT">Gérant de station</option>
                    <option value="LAVEUR">Laveur</option>
                    <option value="GRAISSEUR">Graisseur / Vidangeur</option>
                    <option value="CAISSIER">Caissier</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Téléphone (optionnel)
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+212 6..."
                  className="w-full text-xs font-mono px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white transition-all"
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
                  Ajouter le salarié
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Modifier un Salarié (Modernized SaaS UI) */}
      {editingSalarie && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200/80 dark:border-slate-800 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-xs">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">Modifier le Collaborateur</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{editingSalarie.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingSalarie(null)}
                className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Nom & Prénom *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Matricule *
                  </label>
                  <input
                    type="text"
                    required
                    value={matricule}
                    onChange={(e) => setMatricule(e.target.value)}
                    className="w-full text-xs font-mono px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Fonction
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as any)}
                    className="w-full text-xs px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white transition-all font-medium"
                  >
                    <option value="POMPISTE">POMPISTE</option>
                    <option value="GERANT">GERANT</option>
                    <option value="LAVEUR">LAVEUR</option>
                    <option value="GRAISSEUR">GRAISSEUR</option>
                    <option value="CAISSIER">CAISSIER</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingSalarie(null)}
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
