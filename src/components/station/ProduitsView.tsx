import React, { useEffect, useState } from 'react';
import {
  Plus,
  Search,
  Package,
  Edit2,
  Trash2,
  X,
  Droplet,
  Layers,
} from 'lucide-react';
import { api } from '../../services/api.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { Produit } from '../../types/index.ts';

export const ProduitsView: React.FC = () => {
  const { station } = useAuth();
  const [produits, setProduits] = useState<Produit[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingProd, setEditingProd] = useState<Produit | null>(null);

  // Form Fields
  const [category, setCategory] = useState('Lubrifiants');
  const [marque, setMarque] = useState('Total');
  const [name, setName] = useState('');
  const [prixVenteTTC, setPrixVenteTTC] = useState('0.00');
  const [prixAchatHT, setPrixAchatHT] = useState('0.00');
  const [stockBoutique, setStockBoutique] = useState('0');
  const [stockDepot, setStockDepot] = useState('0');

  const loadData = async () => {
    if (!station) return;
    try {
      setLoading(true);
      const res = await api.getProduits(station.id);
      setProduits(res);
    } catch (err) {
      console.error('Failed to load products', err);
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
      await api.addProduit(station.id, {
        category,
        marque,
        name,
        prixVenteTTC: parseFloat(prixVenteTTC) || 0,
        prixAchatHT: parseFloat(prixAchatHT) || 0,
        stockBoutique: parseInt(stockBoutique) || 0,
        stockDepot: parseInt(stockDepot) || 0,
      });
      setIsAddOpen(false);
      setName('');
      setPrixVenteTTC('0.00');
      setPrixAchatHT('0.00');
      setStockBoutique('0');
      setStockDepot('0');
      await loadData();
    } catch (err) {
      alert('Erreur lors de l\'ajout du produit');
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!station || !editingProd) return;
    try {
      await api.updateProduit(station.id, editingProd.id, {
        category,
        marque,
        name,
        prixVenteTTC: parseFloat(prixVenteTTC) || 0,
        prixAchatHT: parseFloat(prixAchatHT) || 0,
        stockBoutique: parseInt(stockBoutique) || 0,
        stockDepot: parseInt(stockDepot) || 0,
      });
      setEditingProd(null);
      await loadData();
    } catch (err) {
      alert('Erreur lors de la modification');
    }
  };

  const handleDelete = async (id: string) => {
    if (!station || !confirm('Supprimer ce produit ?')) return;
    try {
      await api.deleteProduit(station.id, id);
      await loadData();
    } catch (err) {
      alert('Erreur lors de la suppression');
    }
  };

  const openEdit = (p: Produit) => {
    setEditingProd(p);
    setCategory(p.category);
    setMarque(p.marque);
    setName(p.name);
    setPrixVenteTTC(p.prixVenteTTC.toString());
    setPrixAchatHT(p.prixAchatHT.toString());
    setStockBoutique(p.stockBoutique.toString());
    setStockDepot(p.stockDepot.toString());
  };

  const filtered = produits.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.marque.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header matching PDF Page 6 bottom */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Gestion des Produits
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Lubrifiants moteurs, liquides d'entretien, accessoires et stocks boutique & dépôt
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setCategory('Lubrifiants');
              setMarque(station?.brand || 'Winxo');
              setName('');
              setPrixVenteTTC('0.00');
              setPrixAchatHT('0.00');
              setStockBoutique('0');
              setStockDepot('0');
              setIsAddOpen(true);
            }}
            className="px-3.5 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Ajouter un Produit</span>
          </button>
        </div>
      </div>

      {/* Filter and Table */}
      <div className="space-y-4">
        <div className="relative w-72">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher par nom de produit..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white"
          />
        </div>

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
              <tr>
                <th className="py-2.5 px-4">Nom Produit</th>
                <th className="py-2.5 px-4">Marque</th>
                <th className="py-2.5 px-4 text-right">P.U Achat HT (DH)</th>
                <th className="py-2.5 px-4 text-right">P.U Vente TTC (DH)</th>
                <th className="py-2.5 px-4 text-right">Stock Boutique (U)</th>
                <th className="py-2.5 px-4 text-right">Stock Dépôt (U)</th>
                <th className="py-2.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((prod) => (
                <tr key={prod.id} className="hover:bg-slate-50/60">
                  <td className="py-3 px-4 font-bold text-slate-900">{prod.name}</td>
                  <td className="py-3 px-4 text-slate-600">
                    <span className="font-medium text-slate-800">{prod.marque}</span>
                    <span className="text-[10px] text-slate-400 block">{prod.category}</span>
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-600">
                    {prod.prixAchatHT.toFixed(2)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold tabular-nums text-slate-900">
                    {prod.prixVenteTTC.toFixed(2)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-semibold tabular-nums text-emerald-700">
                    {prod.stockBoutique}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-600">
                    {prod.stockDepot}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => openEdit(prod)}
                        className="p-1 text-slate-400 hover:text-slate-700 rounded"
                        title="Modifier"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(prod.id)}
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
      </div>

      {/* MODAL: Ajouter un nouveau produit (Modernized SaaS UI) */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200/80 dark:border-slate-800 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-xs">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">Nouveau Produit</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Lubrifiants, boutique ou entretien</p>
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
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Catégorie
                  </label>
                  <input
                    type="text"
                    required
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="Lubrifiants..."
                    className="w-full text-xs px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Marque
                  </label>
                  <input
                    type="text"
                    required
                    value={marque}
                    onChange={(e) => setMarque(e.target.value)}
                    placeholder="Total, Shell..."
                    className="w-full text-xs px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Désignation du Produit *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: HUILE MOTEUR 10W40 (5L)"
                  className="w-full text-xs px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    PU Vente TTC (DH) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={prixVenteTTC}
                    onChange={(e) => setPrixVenteTTC(e.target.value)}
                    className="w-full text-xs font-mono font-bold px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    PU Achat HT (DH) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={prixAchatHT}
                    onChange={(e) => setPrixAchatHT(e.target.value)}
                    className="w-full text-xs font-mono px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Stock Boutique (U)
                  </label>
                  <input
                    type="number"
                    value={stockBoutique}
                    onChange={(e) => setStockBoutique(e.target.value)}
                    className="w-full text-xs font-mono px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Stock Dépôt (U)
                  </label>
                  <input
                    type="number"
                    value={stockDepot}
                    onChange={(e) => setStockDepot(e.target.value)}
                    className="w-full text-xs font-mono px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white transition-all"
                  />
                </div>
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
                  Ajouter le produit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Modifier un produit (Modernized SaaS UI) */}
      {editingProd && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200/80 dark:border-slate-800 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-xs">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">Modifier le produit</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{editingProd.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingProd(null)}
                className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Nom Produit *
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
                    PU Vente TTC (DH) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={prixVenteTTC}
                    onChange={(e) => setPrixVenteTTC(e.target.value)}
                    className="w-full text-xs font-mono font-bold px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    PU Achat HT (DH) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={prixAchatHT}
                    onChange={(e) => setPrixAchatHT(e.target.value)}
                    className="w-full text-xs font-mono px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white transition-all"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingProd(null)}
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
