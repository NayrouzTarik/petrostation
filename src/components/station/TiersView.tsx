import React, { useEffect, useState, useRef } from 'react';
import {
  Plus,
  Search,
  Building2,
  DollarSign,
  CreditCard,
  Edit2,
  Trash2,
  X,
  FileText,
  ArrowUpDown,
  Download,
  Upload,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { api } from '../../services/api.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { Tier, PaiementTier } from '../../types/index.ts';
import { DateRangeExportModal } from '../common/DateRangeExportModal.tsx';
import { exportToExcel, parseExcelOrCsvFile } from '../../utils/excelExport.ts';
import { formatDateDMY, isDateInRange } from '../../utils/dateUtils.ts';

export const TiersView: React.FC = () => {
  const { station } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState<'liste' | 'paiements'>('liste');
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [paiements, setPaiements] = useState<PaiementTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Modals state
  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
  const [editingTier, setEditingTier] = useState<Tier | null>(null);
  const [isAddPaymentOpen, setIsAddPaymentOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<PaiementTier | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [cannotDeleteTier, setCannotDeleteTier] = useState<Tier | null>(null);

  // Add/Edit Account form
  const [name, setName] = useState('');
  const [type, setType] = useState<'Client' | 'Fournisseur' | 'Banque' | 'Caisse'>('Client');
  const [sousTypeClient, setSousTypeClient] = useState('Entreprise');
  const [adresse, setAdresse] = useState('');
  const [ice, setIce] = useState('');
  const [solde, setSolde] = useState('0.00');
  const [encoursAutorise, setEncoursAutorise] = useState('0.00');

  // Add / Edit Payment form
  const [paymentTierType, setPaymentTierType] = useState<'Client' | 'Fournisseur'>('Client');
  const [selectedTierId, setSelectedTierId] = useState('');
  const [montantPaye, setMontantPaye] = useState('');
  const [datePaiement, setDatePaiement] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [modePaiement, setModePaiement] = useState<'Espèces' | 'Chèque' | 'Virement' | 'Traite'>('Espèces');
  const [paymentNote, setPaymentNote] = useState('');

  const loadData = async () => {
    if (!station) return;
    try {
      setLoading(true);
      const [tList, pList] = await Promise.all([
        api.getTiers(station.id),
        api.getPaiementsTiers(station.id),
      ]);
      setTiers(tList);
      setPaiements(pList);
      if (tList.length > 0 && !selectedTierId) {
        setSelectedTierId(tList[0].id);
      }
    } catch (err) {
      console.error('Failed to load tiers', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [station]);

  const handleExportExcel = (startDate: string, endDate: string) => {
    const rows = tiers.map((t) => ({
      'Nom du Compte': t.name,
      'Type de Tier': t.type,
      'Sous-Type / Réf': (t as any).sousType || (t.type === 'Client' ? 'Entreprise' : '-'),
      'Numéro ICE': t.ice || '-',
      'Solde Actuel (DH)': t.solde,
      'Encours Autorisé (DH)': t.encoursAutorise || 0,
      'Disponible (DH)': (t.encoursAutorise || 0) - (t.solde || 0),
      'Email': t.email || '-',
      'Téléphone': t.phone || '-',
      'Adresse': (t as any).adresse || '-',
    }));

    exportToExcel(`tiers_${station?.name || 'station'}_${formatDateDMY(startDate).replace(/\//g, '-')}`, [
      { sheetName: 'Comptes Tiers', data: rows },
    ]);
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !station) return;
    try {
      const records = await parseExcelOrCsvFile(file);
      let count = 0;
      for (const r of records) {
        const nom = r['Nom du Compte'] || r['Nom'] || r['name'] || r['nom'];
        if (nom) {
          const type = (r['Type de Tier'] || r['Type'] || r['type'] || 'Client') as any;
          await api.addTier(station.id, {
            name: String(nom),
            type: ['Client', 'Fournisseur', 'Banque', 'Caisse'].includes(type) ? type : 'Client',
            ice: String(r['Numéro ICE'] || r['ICE'] || r['ice'] || ''),
            solde: parseFloat(r['Solde Actuel (DH)'] || r['Solde'] || r['solde']) || 0,
            encoursAutorise: parseFloat(r['Encours Autorisé (DH)'] || r['encoursAutorise']) || 0,
            email: String(r['Email'] || r['email'] || ''),
            phone: String(r['Téléphone'] || r['phone'] || ''),
          });
          count++;
        }
      }
      alert(`Importation réussie : ${count} compte(s) ajouté(s).`);
      await loadData();
    } catch (err) {
      alert('Erreur lors de la lecture du fichier Excel/CSV');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!station) return;
    try {
      await api.addTier(station.id, {
        name,
        type,
        sousType: type === 'Client' ? sousTypeClient : undefined,
        adresse: type === 'Client' ? adresse : undefined,
        ice,
        solde: parseFloat(solde) || 0,
        encoursAutorise: parseFloat(encoursAutorise) || 0,
      });
      setIsAddAccountOpen(false);
      setName('');
      setIce('');
      setAdresse('');
      setSolde('0.00');
      setEncoursAutorise('0.00');
      await loadData();
    } catch (err) {
      alert('Erreur lors de l\'ajout du compte');
    }
  };

  const handleUpdateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!station || !editingTier) return;
    try {
      await api.updateTier(station.id, editingTier.id, {
        name,
        type,
        sousType: type === 'Client' ? sousTypeClient : undefined,
        adresse: type === 'Client' ? adresse : undefined,
        ice,
        encoursAutorise: parseFloat(encoursAutorise) || 0,
        // solde initial is NOT modifiable after creation
      });
      setEditingTier(null);
      await loadData();
    } catch (err) {
      alert('Erreur lors de la modification du compte');
    }
  };

  const handleDeleteAccount = async (t: Tier) => {
    if (!station) return;
    if (t.solde !== 0) {
      setCannotDeleteTier(t);
      return;
    }
    if (!confirm(`Supprimer définitivement le compte ${t.name} ?`)) return;
    try {
      await api.deleteTier(station.id, t.id);
      await loadData();
    } catch (err) {
      alert('Erreur lors de la suppression');
    }
  };

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!station || !selectedTierId) return;
    try {
      await api.addPaiementTier(station.id, {
        tierId: selectedTierId,
        tierType: paymentTierType,
        montant: parseFloat(montantPaye) || 0,
        date: datePaiement,
        mode: modePaiement,
        note: paymentNote,
      });
      setIsAddPaymentOpen(false);
      setMontantPaye('');
      setPaymentNote('');
      await loadData();
    } catch (err) {
      alert('Erreur lors de l\'enregistrement du paiement');
    }
  };

  const handleUpdatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!station || !editingPayment) return;
    try {
      await api.updatePaiementTier(station.id, editingPayment.id, {
        montant: parseFloat(montantPaye) || 0,
        date: datePaiement,
        mode: modePaiement,
        note: paymentNote,
      });
      setEditingPayment(null);
      await loadData();
    } catch (err) {
      alert('Erreur lors de la modification du paiement');
    }
  };

  const handleDeletePayment = async (pId: string) => {
    if (!station || !confirm('Êtes-vous sûr de vouloir supprimer ce paiement ? Le solde du compte sera réajusté.')) return;
    try {
      await api.deletePaiementTier(station.id, pId);
      await loadData();
    } catch (err) {
      alert('Erreur lors de la suppression du paiement');
    }
  };

  const openEdit = (t: Tier) => {
    setEditingTier(t);
    setName(t.name);
    setType(t.type);
    setSousTypeClient((t as any).sousType || 'Entreprise');
    setAdresse((t as any).adresse || '');
    setIce(t.ice || '');
    setSolde(t.solde.toString());
    setEncoursAutorise(t.encoursAutorise.toString());
  };

  const openEditPaymentModal = (p: PaiementTier) => {
    setEditingPayment(p);
    setSelectedTierId(p.tierId);
    setPaymentTierType(p.tierType as any);
    setMontantPaye(String(p.montant));
    setDatePaiement(p.date);
    setModePaiement(p.mode as any);
    setPaymentNote(p.note || '');
  };

  const filteredTiers = tiers.filter(
    (t) =>
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.ice && t.ice.includes(searchQuery))
  );

  const selectedTierObj = tiers.find((t) => t.id === selectedTierId);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Sub-Tabs matching PDF Page 5 & 6 */}
      <div className="flex items-center gap-4 border-b border-slate-200">
        <button
          onClick={() => setActiveSubTab('liste')}
          className={`pb-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 ${
            activeSubTab === 'liste'
              ? 'border-emerald-700 text-emerald-800'
              : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          1er : Liste des tiers (Comptes)
        </button>
        <button
          onClick={() => setActiveSubTab('paiements')}
          className={`pb-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 ${
            activeSubTab === 'paiements'
              ? 'border-emerald-700 text-emerald-800'
              : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          2eme : Paiements des tiers
        </button>
      </div>

      {/* SUB-TAB 1: Liste des Tiers */}
      {activeSubTab === 'liste' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="relative w-72">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher un compte..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImportFile}
                accept=".xlsx,.xls,.csv"
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg flex items-center gap-1.5 shadow-2xs transition-colors"
                title="Importer des comptes depuis un fichier Excel ou CSV"
              >
                <Upload className="w-3.5 h-3.5 text-slate-500" />
                <span>Importer (Excel/CSV)</span>
              </button>
              <button
                onClick={() => setIsExportModalOpen(true)}
                className="px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg flex items-center gap-1.5 shadow-2xs transition-colors"
                title="Exporter les comptes vers Excel avec sélection de période"
              >
                <Download className="w-3.5 h-3.5 text-emerald-600" />
                <span>Exporter vers Excel</span>
              </button>
              <button
                onClick={() => {
                  setName('');
                  setType('Client');
                  setSousTypeClient('Entreprise');
                  setAdresse('');
                  setIce('');
                  setSolde('0');
                  setEncoursAutorise('0');
                  setIsAddAccountOpen(true);
                }}
                className="px-3.5 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg flex items-center gap-1.5 shadow-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Ajouter un compte</span>
              </button>
            </div>
          </div>

          {/* Table matching PDF Page 5 */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
            <div className="px-4 py-3 bg-slate-50/80 border-b border-slate-200 text-xs font-bold text-slate-800">
              Comptes
            </div>
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <tr>
                  <th className="py-2.5 px-4">Nom</th>
                  <th className="py-2.5 px-4 text-right">Solde (DH)</th>
                  <th className="py-2.5 px-4 text-right">Encours Autorisé (DH)</th>
                  <th className="py-2.5 px-4 text-right">Disp. ou Dépass. (DH)</th>
                  <th className="py-2.5 px-4">Type</th>
                  <th className="py-2.5 px-4">Numéro ICE</th>
                  <th className="py-2.5 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTiers.map((t) => {
                  const disp = (t.encoursAutorise || 0) - (t.solde || 0);

                  return (
                    <tr key={t.id} className="hover:bg-slate-50/60">
                      <td className="py-3 px-4 font-bold text-slate-900">{t.name}</td>
                      <td
                        className={`py-3 px-4 text-right font-mono font-bold tabular-nums ${
                          t.solde > 0
                            ? 'text-sky-700'
                            : t.solde < 0
                            ? 'text-rose-700'
                            : 'text-slate-700'
                        }`}
                      >
                        {t.solde.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-600">
                        {t.encoursAutorise.toFixed(2)}
                      </td>
                      <td
                        className={`py-3 px-4 text-right font-mono tabular-nums ${
                          disp < 0 ? 'text-rose-600 font-bold' : 'text-slate-600'
                        }`}
                      >
                        {disp.toFixed(2)}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            t.type === 'Client'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : t.type === 'Fournisseur'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {t.type}
                        </span>
                        {(t as any).sousType && (
                          <span className="ml-1 text-[10px] text-slate-400">({(t as any).sousType})</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">
                        {t.ice ? `ICE: ${t.ice}` : '-'}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => openEdit(t)}
                            className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors"
                            title="Modifier"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteAccount(t)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                            title="Supprimer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: Paiements des Tiers */}
      {activeSubTab === 'paiements' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Paiements Reçus / Effectués
            </span>
            <button
              onClick={() => setIsAddPaymentOpen(true)}
              className="px-3.5 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Ajouter un paiement</span>
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <tr>
                  <th className="py-2.5 px-4">Tier</th>
                  <th className="py-2.5 px-4 text-right">Montant Payé (DH)</th>
                  <th className="py-2.5 px-4">Date</th>
                  <th className="py-2.5 px-4">Payé par</th>
                  <th className="py-2.5 px-4">Mode</th>
                  <th className="py-2.5 px-4">Note</th>
                  <th className="py-2.5 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paiements.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-slate-400 italic">
                      Aucun paiement enregistré pour l'instant.
                    </td>
                  </tr>
                ) : (
                  paiements.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/60">
                      <td className="py-3 px-4 font-bold text-slate-900">{p.tierName}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700 tabular-nums">
                        {p.montant.toFixed(2)} DH
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">{p.date}</td>
                      <td className="py-3 px-4 text-slate-700">{p.payePar}</td>
                      <td className="py-3 px-4">
                        <span className="text-[10px] font-semibold bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                          {p.mode}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500 text-[11px]">
                        {p.note || '-'}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => openEditPaymentModal(p)}
                            className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors"
                            title="Modifier ce paiement"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeletePayment(p.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                            title="Supprimer ce paiement"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: Ajouter un nouveau compte (Modernized SaaS UI) */}
      {isAddAccountOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200/80 dark:border-slate-800 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-xs">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">Nouveau Compte Tier</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Client, Fournisseur, Caisse ou Banque</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddAccountOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAccount} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Type de tiers *
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as any)}
                  className="w-full text-xs px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white transition-all font-medium"
                >
                  <option value="Client">Client</option>
                  <option value="Fournisseur">Fournisseur</option>
                  <option value="Banque">Banque</option>
                  <option value="Caisse">Caisse</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Nom du compte / Entreprise *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={
                    type === 'Client'
                      ? 'Ex: STE TRANSPORT ATLAS'
                      : type === 'Fournisseur'
                      ? 'Ex: TOTAL ENERGIES'
                      : type === 'Banque'
                      ? 'Ex: ATTIJARIWAFA BANK'
                      : 'Ex: Caisse Principale'
                  }
                  className="w-full text-xs px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white transition-all"
                />
              </div>

              {type === 'Client' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Catégorie client *
                    </label>
                    <select
                      value={sousTypeClient}
                      onChange={(e) => setSousTypeClient(e.target.value)}
                      className="w-full text-xs px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white transition-all font-medium"
                    >
                      <option value="Entreprise">Entreprise / B2B</option>
                      <option value="Particulier">Particulier / B2C</option>
                      <option value="Flotte">Flotte de transport</option>
                      <option value="Administration">Administration / Public</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Adresse de facturation
                    </label>
                    <input
                      type="text"
                      value={adresse}
                      onChange={(e) => setAdresse(e.target.value)}
                      placeholder="Ex: Bd Mohammed V, Casablanca"
                      className="w-full text-xs px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white transition-all"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Numéro ICE {type === 'Client' ? '(Recommandé)' : '(Facultatif)'}
                </label>
                <input
                  type="text"
                  value={ice}
                  onChange={(e) => setIce(e.target.value)}
                  placeholder="15 chiffres (ex: 002938475000041)"
                  className="w-full text-xs font-mono px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Solde initial (DH)
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={solde}
                    onChange={(e) => setSolde(e.target.value)}
                    placeholder="0.00"
                    className="w-full text-xs font-mono font-bold px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white transition-all"
                  />
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                    Fixé à l'ouverture.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Encours Autorisé (DH)
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={encoursAutorise}
                    onChange={(e) => setEncoursAutorise(e.target.value)}
                    placeholder="0.00"
                    className="w-full text-xs font-mono px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white transition-all"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddAccountOpen(false)}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 rounded-xl shadow-xs hover:shadow transition-all"
                >
                  Créer le compte
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Modifier un compte (Modernized SaaS UI) */}
      {editingTier && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200/80 dark:border-slate-800 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-xs">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">Modifier le compte</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{editingTier.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingTier(null)}
                className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateAccount} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Type de tiers
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as any)}
                  className="w-full text-xs px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white transition-all font-medium"
                >
                  <option value="Client">Client</option>
                  <option value="Fournisseur">Fournisseur</option>
                  <option value="Banque">Banque</option>
                  <option value="Caisse">Caisse</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Nom complet / Raison Sociale *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white transition-all"
                />
              </div>

              {type === 'Client' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Catégorie client
                    </label>
                    <select
                      value={sousTypeClient}
                      onChange={(e) => setSousTypeClient(e.target.value)}
                      className="w-full text-xs px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white transition-all font-medium"
                    >
                      <option value="Entreprise">Entreprise / B2B</option>
                      <option value="Particulier">Particulier / B2C</option>
                      <option value="Flotte">Flotte de transport</option>
                      <option value="Administration">Administration / Public</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Adresse
                    </label>
                    <input
                      type="text"
                      value={adresse}
                      onChange={(e) => setAdresse(e.target.value)}
                      className="w-full text-xs px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white transition-all"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Numéro ICE {type === 'Client' ? '(Recommandé)' : '(Facultatif)'}
                </label>
                <input
                  type="text"
                  value={ice}
                  onChange={(e) => setIce(e.target.value)}
                  className="w-full text-xs font-mono px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Solde actuel (DH) — Fixe
                </label>
                <input
                  type="text"
                  disabled
                  value={`${editingTier.solde.toFixed(2)} DH (Géré par les transactions)`}
                  className="w-full text-xs font-mono font-bold px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-500 dark:text-slate-400 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Encours Autorisé (DH)
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={encoursAutorise}
                  onChange={(e) => setEncoursAutorise(e.target.value)}
                  className="w-full text-xs font-mono px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white transition-all"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingTier(null)}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 rounded-xl shadow-xs hover:shadow transition-all"
                >
                  Enregistrer les modifications
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Guidance Solde Non-Nul pour Suppression */}
      {cannotDeleteTier && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-rose-200 w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 bg-rose-50 border-b border-rose-100 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-rose-900">Suppression impossible</h3>
                <p className="text-xs text-rose-700">Solde non nul ({cannotDeleteTier.solde.toFixed(2)} DH)</p>
              </div>
            </div>

            <div className="p-6 space-y-4 text-xs text-slate-600 leading-relaxed">
              <p>
                Vous ne pouvez pas supprimer le compte <strong>{cannotDeleteTier.name}</strong> ayant un solde différent de zéro.
              </p>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Solde actuel :</span>
                  <span className="font-mono font-bold text-slate-900">{cannotDeleteTier.solde.toFixed(2)} DH</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Règle de gestion :</span>
                  <span className="font-semibold text-slate-700">Solde exigé = 0.00 DH</span>
                </div>
              </div>
              <p>
                Veuillez clôturer les transactions de ce compte afin d'obtenir un solde nul avant de le supprimer.
              </p>

              <div className="pt-2 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const t = cannotDeleteTier;
                    setCannotDeleteTier(null);
                    setSelectedTierId(t.id);
                    setPaymentTierType(t.type === 'Fournisseur' ? 'Fournisseur' : 'Client');
                    setMontantPaye(Math.abs(t.solde).toString());
                    setPaymentNote(`Régularisation pour clôture compte (${t.solde > 0 ? 'Règlement client' : 'Règlement fournisseur'})`);
                    setActiveSubTab('paiements');
                    setIsAddPaymentOpen(true);
                  }}
                  className="w-full py-2.5 px-4 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg flex items-center justify-center gap-2 shadow-xs transition-colors"
                >
                  <DollarSign className="w-4 h-4" />
                  <span>Enregistrer un règlement équilibrant ({Math.abs(cannotDeleteTier.solde).toFixed(2)} DH)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCannotDeleteTier(null)}
                  className="w-full py-2 px-4 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Ajouter / Modifier des paiements (Modernized SaaS UI) */}
      {(isAddPaymentOpen || editingPayment) && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200/80 dark:border-slate-800 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-xs">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    {editingPayment ? 'Modifier le règlement' : 'Nouveau Règlement / Encaissement'}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Enregistrement de paiement Client ou règlement Fournisseur
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAddPaymentOpen(false);
                  setEditingPayment(null);
                }}
                className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={editingPayment ? handleUpdatePayment : handleAddPayment}
              className="p-6 space-y-4"
            >
              {!editingPayment && (
                <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl gap-1">
                  <button
                    type="button"
                    onClick={() => setPaymentTierType('Client')}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                      paymentTierType === 'Client'
                        ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Règlement Client (Encaissement)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentTierType('Fournisseur')}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                      paymentTierType === 'Fournisseur'
                        ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Règlement Fournisseur (Décaissement)
                  </button>
                </div>
              )}

              {/* Select Tier */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  {editingPayment ? 'Compte concerné' : `Sélectionner le compte ${paymentTierType} *`}
                </label>
                {editingPayment ? (
                  <input
                    type="text"
                    disabled
                    value={editingPayment.tierName}
                    className="w-full text-xs px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-700 dark:text-slate-300 font-bold"
                  />
                ) : (
                  <select
                    value={selectedTierId}
                    onChange={(e) => setSelectedTierId(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium transition-all"
                  >
                    {tiers
                      .filter((t) => t.type === paymentTierType)
                      .map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} (Solde : {t.solde.toFixed(2)} DH)
                        </option>
                      ))}
                  </select>
                )}
              </div>

              {/* Solde Actuel (Display) & Montant Payé */}
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Solde Actuel
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={`${(selectedTierObj?.solde || 0).toFixed(2)} DH`}
                    className="w-full text-xs font-mono font-bold px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/80 rounded-xl text-slate-700 dark:text-slate-300"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Montant du Règlement (DH) *
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    required
                    value={montantPaye}
                    onChange={(e) => setMontantPaye(e.target.value)}
                    placeholder="0.00"
                    className="w-full text-xs font-mono font-bold px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white transition-all text-right"
                  />
                </div>
              </div>

              {/* Date & Mode */}
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Date d'opération
                  </label>
                  <input
                    type="date"
                    required
                    value={datePaiement}
                    onChange={(e) => setDatePaiement(e.target.value)}
                    className="w-full text-xs font-mono px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Mode de règlement
                  </label>
                  <select
                    value={modePaiement}
                    onChange={(e) => setModePaiement(e.target.value as any)}
                    className="w-full text-xs px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white transition-all font-medium"
                  >
                    <option value="Espèces">Espèces</option>
                    <option value="Chèque">Chèque bancaire</option>
                    <option value="Virement">Virement bancaire</option>
                    <option value="Traite">Traite / LCN</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Référence / N° Chèque / Libellé
                </label>
                <input
                  type="text"
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  placeholder="Ex: CHQ N° 0928124 - Banque Populaire"
                  className="w-full text-xs px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white transition-all"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddPaymentOpen(false);
                    setEditingPayment(null);
                  }}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 rounded-xl shadow-xs hover:shadow transition-all"
                >
                  {editingPayment ? 'Enregistrer les modifications' : 'Valider le règlement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Date Range Export Modal */}
      <DateRangeExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        onExport={handleExportExcel}
        title="Exporter les comptes tiers vers Excel"
      />
    </div>
  );
};
