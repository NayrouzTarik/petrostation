import React, { useEffect, useState } from 'react';
import {
  Plus,
  Receipt,
  Search,
  Edit2,
  Trash2,
  X,
  Calendar,
  DollarSign,
} from 'lucide-react';
import { api } from '../../services/api.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { Depense, DepenseDetail, Tier } from '../../types/index.ts';

export const DepensesView: React.FC = () => {
  const { station } = useAuth();
  const [depenses, setDepenses] = useState<Depense[]>([]);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingDepense, setEditingDepense] = useState<Depense | null>(null);

  // Form fields
  const [typeDepense, setTypeDepense] = useState('Électricité & Eau');
  const [fournisseurId, setFournisseurId] = useState('');
  const [numeroFacture, setNumeroFacture] = useState('');
  const [dateFacturation, setDateFacturation] = useState(new Date().toISOString().split('T')[0]);
  const [dateEcheance, setDateEcheance] = useState(new Date().toISOString().split('T')[0]);
  const [details, setDetails] = useState<DepenseDetail[]>([
    {
      id: 'd-1',
      designation: '',
      quantite: 1,
      prixUnitaireHT: 0,
      tvaTaux: 20,
      tvaMontant: 0,
      totalTTC: 0,
    },
  ]);
  const [remise, setRemise] = useState('0.00');
  const [statutPaiement, setStatutPaiement] = useState<'Payé' | 'En attente' | 'Partiel'>('Payé');
  const [modePaiement, setModePaiement] = useState('Chèque');

  const loadData = async () => {
    if (!station) return;
    try {
      setLoading(true);
      const [dList, tList] = await Promise.all([
        api.getDepenses(station.id),
        api.getTiers(station.id),
      ]);
      setDepenses(dList);
      setTiers(tList);
      if (tList.length > 0 && !fournisseurId) {
        setFournisseurId(tList[0].id);
      }
    } catch (err) {
      console.error('Failed to load expenses', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [station]);

  const initNew = () => {
    setTypeDepense('Électricité & Eau');
    setNumeroFacture(`DEP-${Date.now().toString().slice(-4)}`);
    setDateFacturation(new Date().toISOString().split('T')[0]);
    setDateEcheance(new Date().toISOString().split('T')[0]);
    setDetails([
      {
        id: `d-${Date.now()}`,
        designation: 'Facture énergie station',
        quantite: 1,
        prixUnitaireHT: 1500,
        tvaTaux: 14,
        tvaMontant: 210,
        totalTTC: 1710,
      },
    ]);
    setRemise('0.00');
    setStatutPaiement('Payé');
    setModePaiement('Chèque');
  };

  const updateDetail = (idx: number, field: string, val: any) => {
    const updated = [...details];
    const row = { ...updated[idx], [field]: val };
    const ht = row.quantite * row.prixUnitaireHT;
    const tva = (ht * row.tvaTaux) / 100;
    row.tvaMontant = Math.round(tva * 100) / 100;
    row.totalTTC = Math.round((ht + tva) * 100) / 100;
    updated[idx] = row;
    setDetails(updated);
  };

  const addDetailRow = () => {
    setDetails([
      ...details,
      {
        id: `d-${Date.now()}`,
        designation: '',
        quantite: 1,
        prixUnitaireHT: 0,
        tvaTaux: 20,
        tvaMontant: 0,
        totalTTC: 0,
      },
    ]);
  };

  const removeDetailRow = (idx: number) => {
    if (details.length <= 1) return;
    setDetails(details.filter((_, i) => i !== idx));
  };

  const subTotalHT = details.reduce((a, c) => a + c.quantite * c.prixUnitaireHT, 0);
  const subTotalTVA = details.reduce((a, c) => a + c.tvaMontant, 0);
  const remiseVal = parseFloat(remise) || 0;
  const totalHT = Math.max(0, subTotalHT - remiseVal);
  const totalTTC = Math.max(0, subTotalHT + subTotalTVA - remiseVal);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!station) return;
    try {
      const fourn = tiers.find((t) => t.id === fournisseurId);
      const payload: Partial<Depense> = {
        typeDepense,
        fournisseurId,
        fournisseurNom: fourn?.name || 'Fournisseur Divers',
        numeroFacture,
        dateFacturation,
        dateEcheance,
        details,
        remise: remiseVal,
        totalHT: Math.round(totalHT * 100) / 100,
        totalTVA: Math.round(subTotalTVA * 100) / 100,
        totalTTC: Math.round(totalTTC * 100) / 100,
        statutPaiement,
        modePaiement,
        datePaiement: statutPaiement === 'Payé' ? dateFacturation : undefined,
      };

      if (editingDepense) {
        await api.updateDepense(station.id, editingDepense.id, payload);
        setEditingDepense(null);
      } else {
        await api.addDepense(station.id, payload);
        setIsAddOpen(false);
      }
      await loadData();
    } catch (err) {
      alert('Erreur lors de l\'enregistrement de la dépense');
    }
  };

  const handleDelete = async (id: string) => {
    if (!station || !confirm('Supprimer cette dépense ?')) return;
    try {
      await api.deleteDepense(station.id, id);
      await loadData();
    } catch (err) {
      alert('Erreur lors de la suppression');
    }
  };

  const filtered = depenses.filter(
    (d) =>
      d.numeroFacture.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.fournisseurNom.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.typeDepense.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header matching PDF Page 12 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Dépenses</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Charges générales d'exploitation: Électricité, salaires, entretien matériel, impôts et fournitures
          </p>
        </div>

        <button
          onClick={() => {
            initNew();
            setIsAddOpen(true);
          }}
          className="px-3.5 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg flex items-center gap-1.5 shadow-xs transition-colors self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Ajouter une dépense</span>
        </button>
      </div>

      {/* Filter and Table */}
      <div className="space-y-4">
        <div className="relative w-72">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher par facture, fournisseur..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white"
          />
        </div>

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
              <tr>
                <th className="py-2.5 px-3">N° de Facture</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Fournisseur</th>
                <th className="py-2.5 px-3">Date Facturation</th>
                <th className="py-2.5 px-3 text-right">Montant (DH TTC)</th>
                <th className="py-2.5 px-3 text-center">Statut</th>
                <th className="py-2.5 px-3">Date d'échéance</th>
                <th className="py-2.5 px-3">Mode</th>
                <th className="py-2.5 px-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((dep) => (
                <tr key={dep.id} className="hover:bg-slate-50/60">
                  <td className="py-3 px-3 font-bold font-mono text-slate-900">
                    {dep.numeroFacture}
                  </td>
                  <td className="py-3 px-3">
                    <span className="text-[10px] font-semibold bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                      {dep.typeDepense}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-semibold text-slate-800">
                    {dep.fournisseurNom}
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-600">{dep.dateFacturation}</td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 tabular-nums">
                    {dep.totalTTC.toFixed(2)}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        dep.statutPaiement === 'Payé'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-amber-50 text-amber-800 border border-amber-200'
                      }`}
                    >
                      {dep.statutPaiement}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-600">{dep.dateEcheance}</td>
                  <td className="py-3 px-3 text-slate-700">{dep.modePaiement}</td>
                  <td className="py-3 px-3">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => {
                          setEditingDepense(dep);
                          setTypeDepense(dep.typeDepense);
                          setFournisseurId(dep.fournisseurId);
                          setNumeroFacture(dep.numeroFacture);
                          setDateFacturation(dep.dateFacturation);
                          setDateEcheance(dep.dateEcheance);
                          setDetails(dep.details || []);
                          setRemise((dep.remise || 0).toString());
                          setStatutPaiement(dep.statutPaiement);
                          setModePaiement(dep.modePaiement);
                          setIsAddOpen(true);
                        }}
                        className="p-1 text-slate-400 hover:text-slate-700 rounded"
                        title="Modifier"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(dep.id)}
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

      {/* MODAL: Ajouter / Modifier Dépense (Modernized SaaS UI) */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200/80 dark:border-slate-800 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-xs">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    {editingDepense ? 'Modifier la Dépense' : 'Nouvelle Charge d\'Exploitation'}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Saisie des frais généraux, maintenance, fournitures ou salaires
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAddOpen(false);
                  setEditingDepense(null);
                }}
                className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto flex-1">
              {/* Informations Générales */}
              <div className="bg-slate-50/60 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 rounded-xl p-4">
                <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
                  Informations de Facturation
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Nature de dépense *
                    </label>
                    <select
                      value={typeDepense}
                      onChange={(e) => setTypeDepense(e.target.value)}
                      className="w-full text-xs px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 transition-all font-medium"
                    >
                      <option value="Électricité & Eau">Électricité & Eau</option>
                      <option value="Entretien & Maintenance">Entretien & Maintenance</option>
                      <option value="Fournitures de Bureau">Fournitures de Bureau</option>
                      <option value="Salaires & Primes">Salaires & Primes</option>
                      <option value="Taxes & Impôts">Taxes & Impôts</option>
                      <option value="Télécom & Internet">Télécom & Internet</option>
                      <option value="Divers">Divers</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Fournisseur / Bénéficiaire *
                    </label>
                    <select
                      value={fournisseurId}
                      onChange={(e) => setFournisseurId(e.target.value)}
                      className="w-full text-xs px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 transition-all font-medium"
                    >
                      {tiers
                        .filter((t) => t.type === 'Fournisseur')
                        .map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      N° de Facture
                    </label>
                    <input
                      type="text"
                      required
                      value={numeroFacture}
                      onChange={(e) => setNumeroFacture(e.target.value)}
                      className="w-full text-xs font-mono font-bold px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Date de Facturation
                    </label>
                    <input
                      type="date"
                      required
                      value={dateFacturation}
                      onChange={(e) => setDateFacturation(e.target.value)}
                      className="w-full text-xs font-mono px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Details table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Lignes de Dépenses ({details.length})
                  </h3>
                  <button
                    type="button"
                    onClick={addDetailRow}
                    className="px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl flex items-center gap-1.5 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Ajouter une ligne
                  </button>
                </div>

                <div className="border border-slate-200/80 dark:border-slate-700/80 rounded-xl overflow-hidden shadow-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs min-w-[650px]">
                      <thead className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold uppercase text-[11px]">
                        <tr>
                          <th className="py-2.5 px-3.5">Désignation</th>
                          <th className="py-2.5 px-3.5 text-right">Quantité</th>
                          <th className="py-2.5 px-3.5 text-right">PU HT (DH)</th>
                          <th className="py-2.5 px-3.5 text-right">TVA (%)</th>
                          <th className="py-2.5 px-3.5 text-right">Total TTC</th>
                          <th className="py-2.5 px-3 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {details.map((d, idx) => (
                          <tr key={d.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                            <td className="py-2 px-3.5">
                              <input
                                type="text"
                                value={d.designation}
                                onChange={(e) => updateDetail(idx, 'designation', e.target.value)}
                                placeholder="Désignation du service ou matériel"
                                className="w-full px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                              />
                            </td>
                            <td className="py-2 px-3.5 text-right">
                              <input
                                type="number"
                                value={d.quantite}
                                onChange={(e) =>
                                  updateDetail(idx, 'quantite', parseFloat(e.target.value) || 0)
                                }
                                className="w-16 px-2.5 py-1.5 font-mono text-xs border border-slate-200 dark:border-slate-700 rounded-lg text-right bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                              />
                            </td>
                            <td className="py-2 px-3.5 text-right">
                              <input
                                type="number"
                                step="0.01"
                                value={d.prixUnitaireHT}
                                onChange={(e) =>
                                  updateDetail(idx, 'prixUnitaireHT', parseFloat(e.target.value) || 0)
                                }
                                className="w-24 px-2.5 py-1.5 font-mono text-xs border border-slate-200 dark:border-slate-700 rounded-lg text-right bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                              />
                            </td>
                            <td className="py-2 px-3.5 text-right">
                              <input
                                type="number"
                                value={d.tvaTaux}
                                onChange={(e) =>
                                  updateDetail(idx, 'tvaTaux', parseFloat(e.target.value) || 0)
                                }
                                className="w-16 px-2.5 py-1.5 font-mono text-xs border border-slate-200 dark:border-slate-700 rounded-lg text-right bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                              />
                            </td>
                            <td className="py-2 px-3.5 text-right font-mono font-bold text-slate-900 dark:text-white">
                              {d.totalTTC.toFixed(2)} DH
                            </td>
                            <td className="py-2 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => removeDetailRow(idx)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Remise & Paiement + Summary side-by-side */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                <div className="bg-slate-50/60 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 rounded-xl p-4 space-y-3">
                  <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Modalités de Règlement
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Statut
                      </label>
                      <select
                        value={statutPaiement}
                        onChange={(e) => setStatutPaiement(e.target.value as any)}
                        className="w-full text-xs px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
                      >
                        <option value="Payé">Payé</option>
                        <option value="En attente">En attente</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Mode de paiement
                      </label>
                      <select
                        value={modePaiement}
                        onChange={(e) => setModePaiement(e.target.value)}
                        className="w-full text-xs px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
                      >
                        <option value="Chèque">Chèque</option>
                        <option value="Virement">Virement</option>
                        <option value="Espèces">Espèces</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Remise globale accordée (DH)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={remise}
                      onChange={(e) => setRemise(e.target.value)}
                      placeholder="0.00"
                      className="w-full text-xs font-mono px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {/* Totals Summary */}
                <div className="bg-slate-50/80 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/80 p-4 space-y-2 font-mono text-xs">
                  <div className="text-[11px] font-bold font-sans text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                    Total Dépense
                  </div>
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span className="font-sans">Total HT :</span>
                    <span>{totalHT.toFixed(2)} DH</span>
                  </div>
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span className="font-sans">Total TVA :</span>
                    <span>{subTotalTVA.toFixed(2)} DH</span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-900 dark:text-white border-t border-slate-200 dark:border-slate-700 pt-2 text-sm">
                    <span className="font-sans">Total TTC :</span>
                    <span className="text-emerald-700 dark:text-emerald-400">{totalTTC.toFixed(2)} DH</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddOpen(false);
                    setEditingDepense(null);
                  }}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 rounded-xl shadow-xs hover:shadow transition-all"
                >
                  {editingDepense ? 'Enregistrer les modifications' : 'Valider la dépense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
