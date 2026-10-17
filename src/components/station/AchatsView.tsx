import React, { useEffect, useState, useRef } from 'react';
import {
  Plus,
  Truck,
  Printer,
  CheckCircle,
  Clock,
  Edit2,
  Trash2,
  X,
  FileText,
  Search,
  Upload,
  Download,
} from 'lucide-react';
import { api } from '../../services/api.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { Achat, AchatDetail, AchatPaiement, Citerne, Produit, Tier } from '../../types/index.ts';
import { DateRangeExportModal } from '../common/DateRangeExportModal.tsx';
import { exportToExcel, parseExcelOrCsvFile } from '../../utils/excelExport.ts';
import { formatDateDMY, isDateInRange } from '../../utils/dateUtils.ts';
import { StationLogo } from '../common/StationLogo.tsx';
import { printDocumentWithCustomName } from '../../utils/printDocument.ts';

export const AchatsView: React.FC = () => {
  const { station } = useAuth();
  const [achats, setAchats] = useState<Achat[]>([]);
  const [citernes, setCiternes] = useState<Citerne[]>([]);
  const [produits, setProduits] = useState<Produit[]>([]);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingAchat, setEditingAchat] = useState<Achat | null>(null);
  const [viewingAchat, setViewingAchat] = useState<Achat | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Form state
  const [typeAchat, setTypeAchat] = useState<'Carburants' | 'Produits'>('Carburants');
  const [fournisseurId, setFournisseurId] = useState('');
  const [numeroFacture, setNumeroFacture] = useState('');
  const [dateFacturation, setDateFacturation] = useState(new Date().toISOString().split('T')[0]);
  const [dateEcheance, setDateEcheance] = useState(new Date().toISOString().split('T')[0]);
  const [details, setDetails] = useState<AchatDetail[]>([]);
  const [paiements, setPaiements] = useState<AchatPaiement[]>([]);

  const loadData = async () => {
    if (!station) return;
    try {
      setLoading(true);
      const [aList, cList, pList, tList] = await Promise.all([
        api.getAchats(station.id),
        api.getCiternes(station.id),
        api.getProduits(station.id),
        api.getTiers(station.id),
      ]);
      setAchats(aList);
      setCiternes(cList);
      setProduits(pList);
      setTiers(tList);
      if (tList.length > 0 && !fournisseurId) {
        const defaultFourn = tList.find((t) => t.type === 'Fournisseur') || tList[0];
        setFournisseurId(defaultFourn.id);
      }
    } catch (err) {
      console.error('Failed to load purchases', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [station]);

  const initNewForm = () => {
    setTypeAchat('Carburants');
    setNumeroFacture(`FAC-${Date.now().toString().slice(-5)}`);
    setDateFacturation(new Date().toISOString().split('T')[0]);
    setDateEcheance(new Date().toISOString().split('T')[0]);

    if (citernes.length > 0) {
      setDetails([
        {
          id: `det-1`,
          citerneOuProduitId: citernes[0].id,
          designation: `${citernes[0].name} (${citernes[0].carburantCode})`,
          quantite: 5000,
          livre: true,
          prixUnitaireHT: 11.20,
          tvaTaux: 10,
          tvaMontant: 5600,
          totalTTC: 61600,
        },
      ]);
    } else {
      setDetails([]);
    }

    setPaiements([
      {
        id: `pay-1`,
        mode: 'Chèque',
        montant: 0,
        datePaiement: new Date().toISOString().split('T')[0],
        decaisse: false,
      },
    ]);
  };

  const addDetailRow = () => {
    const isCarb = typeAchat === 'Carburants';
    const firstItem = isCarb ? citernes[0] : produits[0];
    setDetails([
      ...details,
      {
        id: `det-${Date.now()}`,
        citerneOuProduitId: firstItem?.id || '',
        designation: isCarb ? `${(firstItem as any)?.name} (${(firstItem as any)?.carburantCode})` : (firstItem as any)?.name || 'Produit',
        quantite: 1000,
        livre: true,
        prixUnitaireHT: isCarb ? 11.20 : 150,
        tvaTaux: isCarb ? 10 : 20,
        tvaMontant: 0,
        totalTTC: 0,
      },
    ]);
  };

  const updateDetailRow = (idx: number, field: string, val: any) => {
    const updated = [...details];
    const row = { ...updated[idx], [field]: val };
    const ht = row.quantite * row.prixUnitaireHT;
    const tva = (ht * row.tvaTaux) / 100;
    row.tvaMontant = Math.round(tva * 100) / 100;
    row.totalTTC = Math.round((ht + tva) * 100) / 100;
    updated[idx] = row;
    setDetails(updated);
  };

  const removeDetailRow = (idx: number) => {
    setDetails(details.filter((_, i) => i !== idx));
  };

  // Export Excel with date range
  const handleExportExcel = (startDate: string, endDate: string) => {
    const filtered = achats.filter((a) => isDateInRange(a.dateFacturation, startDate, endDate));
    const rows = filtered.map((a) => ({
      'N° Facture': a.numeroFacture,
      'Type Achat': a.typeAchat,
      'Fournisseur': a.fournisseurNom,
      'Date Facturation': formatDateDMY(a.dateFacturation),
      'Date Échéance': formatDateDMY(a.dateEcheance),
      'Total HT (DH)': a.totalHT,
      'Total TVA (DH)': a.totalTVA,
      'Total TTC (DH)': a.totalTTC,
      'Total Payé (DH)': a.totalPaye,
      'Reste à Payer (DH)': a.resteAPayer,
      'Statut Paiement': a.statutPaiement,
      'Statut Livraison': a.statutLivraison,
    }));

    exportToExcel(
      `achats_${station?.name || 'station'}_${formatDateDMY(startDate).replace(/\//g, '-')}_au_${formatDateDMY(endDate).replace(/\//g, '-')}`,
      [{ sheetName: 'Achats', data: rows }]
    );
  };

  // Import Excel/CSV
  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !station) return;
    try {
      const records = await parseExcelOrCsvFile(file);
      let count = 0;
      for (const r of records) {
        const numFacture = r['N° Facture'] || r['numeroFacture'] || r['Facture'] || `FAC-${Date.now().toString().slice(-5)}`;
        const fournNom = r['Fournisseur'] || r['fournisseurNom'] || 'Fournisseur';
        const ttc = parseFloat(r['Total TTC (DH)'] || r['Montant TTC'] || r['totalTTC']) || 1000;
        const paye = parseFloat(r['Total Payé (DH)'] || r['totalPaye'] || r['Payé']) || 0;
        const ht = Math.round((ttc / 1.1) * 100) / 100;
        const tva = Math.round((ttc - ht) * 100) / 100;
        const reste = Math.max(0, ttc - paye);
        const statut: 'À payer' | 'Partiellement payé' | 'Payé' =
          paye <= 0 ? 'À payer' : paye >= ttc ? 'Payé' : 'Partiellement payé';

        await api.addAchat(station.id, {
          numeroFacture: String(numFacture),
          typeAchat: 'Carburants',
          fournisseurId: tiers[0]?.id || 'f1',
          fournisseurNom: String(fournNom),
          dateFacturation: new Date().toISOString().split('T')[0],
          dateEcheance: new Date().toISOString().split('T')[0],
          details: [],
          paiements: [],
          totalHT: ht,
          totalTVA: tva,
          totalTTC: ttc,
          totalPaye: paye,
          resteAPayer: reste,
          statutPaiement: statut,
          statutLivraison: 'Livré',
        });
        count++;
      }
      alert(`Importation réussie : ${count} achat(s) importé(s).`);
      await loadData();
    } catch (err) {
      alert('Erreur lors de l\'importation du fichier');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Totals calculations
  const totalHT = details.reduce((a, c) => a + c.quantite * c.prixUnitaireHT, 0);
  const totalTVA = details.reduce((a, c) => a + c.tvaMontant, 0);
  const totalTTC = details.reduce((a, c) => a + c.totalTTC, 0);
  const totalPaye = paiements.reduce((a, c) => a + (parseFloat(c.montant as any) || 0), 0);
  const resteAPayer = Math.max(0, totalTTC - totalPaye);

  // Exact automatic payment status logic (Item 10.4)
  const computeStatutPaiement = (paye: number, total: number): 'À payer' | 'Partiellement payé' | 'Payé' => {
    if (paye <= 0) return 'À payer';
    if (paye >= total) return 'Payé';
    return 'Partiellement payé';
  };

  const handleSaveAchat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!station) return;
    try {
      const fourn = tiers.find((t) => t.id === fournisseurId);
      const statutPaiement = computeStatutPaiement(totalPaye, totalTTC);

      const payload: Partial<Achat> = {
        typeAchat,
        numeroFacture,
        fournisseurId,
        fournisseurNom: fourn?.name || 'Fournisseur',
        dateFacturation,
        dateEcheance,
        details,
        paiements,
        totalHT: Math.round(totalHT * 100) / 100,
        totalTVA: Math.round(totalTVA * 100) / 100,
        totalTTC: Math.round(totalTTC * 100) / 100,
        totalPaye: Math.round(totalPaye * 100) / 100,
        resteAPayer: Math.round(resteAPayer * 100) / 100,
        statutPaiement,
        statutLivraison: 'Livré',
      };

      if (editingAchat) {
        await api.updateAchat(station.id, editingAchat.id, payload);
        setEditingAchat(null);
      } else {
        await api.addAchat(station.id, payload);
        setIsAddOpen(false);
      }
      await loadData();
    } catch (err) {
      alert('Erreur lors de l\'enregistrement de l\'achat');
    }
  };

  const handleDeleteAchat = async (id: string) => {
    if (!station || !confirm('Supprimer cet achat ?')) return;
    try {
      await api.deleteAchat(station.id, id);
      await loadData();
    } catch (err) {
      alert('Erreur lors de la suppression');
    }
  };

  const filteredAchats = achats.filter(
    (a) =>
      a.numeroFacture.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.fournisseurNom.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto print:p-0 print:m-0 print:max-w-none">
      {/* Background operational content completely hidden on print */}
      <div className={viewingAchat ? 'print:hidden' : 'space-y-6'}>
        {/* Header matching PDF Page 10 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Achats</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Commandes et livraisons de carburants en citerne et réapprovisionnements lubrifiants
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
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
            title="Importer des achats depuis Excel ou CSV"
          >
            <Upload className="w-3.5 h-3.5 text-slate-500" />
            <span>Importer (Excel/CSV)</span>
          </button>
          <button
            onClick={() => setIsExportModalOpen(true)}
            className="px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg flex items-center gap-1.5 shadow-2xs transition-colors"
            title="Exporter les achats vers Excel avec filtre par date"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span>Exporter vers Excel</span>
          </button>
          <button
            onClick={() => {
              initNewForm();
              setIsAddOpen(true);
            }}
            className="px-3.5 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Ajouter un achat</span>
          </button>
        </div>
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

        {/* Table matching PDF Page 10 */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
              <tr>
                <th className="py-2.5 px-3">N° de Facture</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Fournisseur</th>
                <th className="py-2.5 px-3">Date Facturation</th>
                <th className="py-2.5 px-3 text-right">Montant (DH TTC)</th>
                <th className="py-2.5 px-3 text-center">Paiement</th>
                <th className="py-2.5 px-3 text-right">Restant (DH)</th>
                <th className="py-2.5 px-3">Date d'échéance</th>
                <th className="py-2.5 px-3 text-center">Livraison</th>
                <th className="py-2.5 px-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAchats.map((ach) => (
                <tr key={ach.id} className="hover:bg-slate-50/60">
                  <td className="py-3 px-3 font-bold font-mono text-slate-900">
                    {ach.numeroFacture}
                  </td>
                  <td className="py-3 px-3">
                    <span className="text-[10px] font-semibold bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                      {ach.typeAchat}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-semibold text-slate-800">
                    {ach.fournisseurNom}
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-600">{ach.dateFacturation}</td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 tabular-nums">
                    {ach.totalTTC.toFixed(2)}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        ach.statutPaiement === 'Payé'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : ach.statutPaiement === 'Partiellement payé' || ach.statutPaiement === 'Partiel'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}
                    >
                      {ach.statutPaiement === 'Impayé'
                        ? 'À payer'
                        : ach.statutPaiement === 'Partiel'
                        ? 'Partiellement payé'
                        : ach.statutPaiement}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-600">
                    {ach.resteAPayer.toFixed(2)}
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-600">{ach.dateEcheance}</td>
                  <td className="py-3 px-3 text-center">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-700 text-white">
                      Livré
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => setViewingAchat(ach)}
                        className="p-1 text-slate-500 hover:text-emerald-700 rounded"
                        title="Voir Facture"
                      >
                        <FileText className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          setEditingAchat(ach);
                          setTypeAchat(ach.typeAchat);
                          setFournisseurId(ach.fournisseurId);
                          setNumeroFacture(ach.numeroFacture);
                          setDateFacturation(ach.dateFacturation);
                          setDateEcheance(ach.dateEcheance);
                          setDetails(ach.details || []);
                          setPaiements(ach.paiements || []);
                          setIsAddOpen(true);
                        }}
                        className="p-1 text-slate-500 hover:text-slate-800 rounded"
                        title="Modifier"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteAchat(ach.id)}
                        className="p-1 text-slate-500 hover:text-rose-600 rounded"
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
      </div>

      {/* MODAL: Facture d'achat / Printable Professional Document (Item 10.2) */}
      {viewingAchat && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] overflow-y-auto force-light">
            {/* Action Bar (Hidden on print) */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 print:hidden">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (!viewingAchat) return;
                    printDocumentWithCustomName({
                      type: 'BON_ACHAT',
                      reference: viewingAchat.numeroFacture || `ACH-${viewingAchat.id}`,
                      partnerOrEntity: viewingAchat.fournisseurNom || 'FOURNISSEUR',
                      date: viewingAchat.dateFacturation,
                      stationName: station?.name,
                    });
                  }}
                  className="px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg flex items-center gap-2 shadow-xs transition-colors"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimer le document (PDF)</span>
                </button>
              </div>
              <h2 className="text-sm font-bold text-slate-800">Aperçu Facture Fournisseur / Bon de Réception</h2>
              <button
                onClick={() => setViewingAchat(null)}
                className="px-3 py-1.5 text-xs font-semibold bg-slate-200 rounded-lg text-slate-700 hover:bg-slate-300"
              >
                Fermer
              </button>
            </div>

            {/* Printable Document Sheet (A4 Commercial Layout) */}
            <div className="p-8 sm:p-12 print:p-0 space-y-6 print:space-y-4 text-sm bg-white text-slate-900" id="printable-purchase-invoice">
              {/* Header: Station & Document Info */}
              <div className="flex justify-between items-start pb-6 border-b-2 border-slate-900">
                <div className="flex items-center gap-4">
                  <StationLogo
                    stationId={station?.id}
                    brand={station?.brand}
                    name={station?.name}
                    logoUrl={station?.logoUrl}
                    size="xl"
                  />
                  <div>
                    <h1 className="text-xl font-black uppercase text-slate-900 tracking-tight">
                      {station?.companyName || station?.name || 'STATION-SERVICE'}
                    </h1>
                    <p className="text-xs text-slate-600 font-medium mt-0.5">
                      Distribution de Carburants, Lubrifiants & Prestations de Services
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {station?.location || station?.address || 'Réseau National'}, {station?.city || 'Maroc'}
                    </p>
                    <div className="text-[11px] text-slate-500 font-mono mt-2 space-x-3">
                      <span>ICE: <strong>{station?.ice || '002938475000041'}</strong></span>
                      <span>IF: <strong>49201948</strong></span>
                      <span>RC: <strong>{station?.rc || '84920'}</strong></span>
                      <span>Patente: <strong>2940182</strong></span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span className="inline-block px-3.5 py-1.5 bg-slate-900 text-white font-black text-xs uppercase tracking-wider rounded shadow-xs">
                    FACTURE FOURNISSEUR & BON DE RÉCEPTION
                  </span>
                  <div className="mt-2 text-base font-black font-mono text-slate-900">
                    N° {viewingAchat.numeroFacture}
                  </div>
                  <div className="mt-1 text-xs text-slate-600 font-mono">
                    Date facture : <strong>{formatDateDMY(viewingAchat.dateFacturation)}</strong>
                  </div>
                  <div className="mt-1.5">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold border ${
                        viewingAchat.statutPaiement === 'Payé'
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : viewingAchat.statutPaiement === 'Partiellement payé' || viewingAchat.statutPaiement === 'Partiel'
                          ? 'bg-amber-100 text-amber-800 border-amber-300'
                          : 'bg-rose-100 text-rose-800 border-rose-300'
                      }`}
                    >
                      STATUT : {viewingAchat.statutPaiement.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Two Info Blocks: Fournisseur & Modalités */}
              <div className="grid grid-cols-2 gap-6">
                <div className="p-5 rounded-xl bg-slate-50 border border-slate-200">
                  <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Fournisseur Émetteur
                  </h3>
                  <div className="text-base font-bold text-slate-900">{viewingAchat.fournisseurNom}</div>
                  <div className="mt-1.5 text-slate-600 space-y-1 text-xs">
                    <p>Type d'approvisionnement : <strong>{viewingAchat.typeAchat}</strong></p>
                    <p className="font-mono text-slate-500">Réf. Interne : ACH-{viewingAchat.id.slice(-6).toUpperCase()}</p>
                  </div>
                </div>

                <div className="p-5 rounded-xl bg-slate-50 border border-slate-200">
                  <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Modalités & Livraisons
                  </h3>
                  <div className="space-y-1.5 text-xs text-slate-700">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Date d'échéance :</span>
                      <span className="font-mono font-bold text-slate-900">{formatDateDMY(viewingAchat.dateEcheance)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Statut de réception :</span>
                      <span className="font-semibold text-emerald-700">Réceptionné & Conforme</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Mode de règlement :</span>
                      <span className="font-semibold">{viewingAchat.paiements?.[0]?.mode || 'Virement / Chèque / Traite'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold uppercase text-[11px]">
                    <tr>
                      <th className="py-3 px-4">Désignation Produit / Citerne Réceptrice</th>
                      <th className="py-3 px-4 text-right">Quantité (L / U)</th>
                      <th className="py-3 px-4 text-right">Prix Unit. HT</th>
                      <th className="py-3 px-4 text-right">TVA %</th>
                      <th className="py-3 px-4 text-right">Montant TVA</th>
                      <th className="py-3 px-4 text-right">Total TTC</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {viewingAchat.details?.map((d, i) => (
                      <tr key={i} className={i % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'}>
                        <td className="py-3 px-4 font-sans font-semibold text-slate-900">{d.designation}</td>
                        <td className="py-3 px-4 text-right font-bold text-slate-900">
                          {d.quantite.toLocaleString('fr-FR')}
                        </td>
                        <td className="py-3 px-4 text-right text-slate-700">{d.prixUnitaireHT.toFixed(4)} DH</td>
                        <td className="py-3 px-4 text-right text-slate-600">{d.tvaTaux}%</td>
                        <td className="py-3 px-4 text-right text-slate-700">{d.tvaMontant.toFixed(2)} DH</td>
                        <td className="py-3 px-4 text-right font-bold text-slate-900">{d.totalTTC.toFixed(2)} DH</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Financial Totals & Signatures */}
              <div className="grid grid-cols-2 gap-8 items-start pt-2">
                {/* Signatures Blocks */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="border border-slate-300 rounded-xl p-4 text-center h-36 flex flex-col justify-between bg-slate-50/30">
                    <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Visa Fournisseur</span>
                    <span className="text-[10px] text-slate-400 italic">Signature & Cachet</span>
                  </div>
                  <div className="border border-slate-300 rounded-xl p-4 text-center h-36 flex flex-col justify-between bg-slate-50/30">
                    <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Réception Station</span>
                    <span className="text-[10px] text-slate-400 italic">Visa & Contrôle Volumétrique</span>
                  </div>
                </div>

                {/* Recap Financial Table */}
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50 font-mono text-xs">
                  <div className="p-4 space-y-2">
                    <div className="flex justify-between font-sans text-slate-600">
                      <span>Total Hors Taxes (HT) :</span>
                      <span className="font-mono font-semibold text-slate-900">{viewingAchat.totalHT.toFixed(2)} DH</span>
                    </div>
                    <div className="flex justify-between font-sans text-slate-600">
                      <span>Total TVA :</span>
                      <span className="font-mono font-semibold text-slate-900">{viewingAchat.totalTVA.toFixed(2)} DH</span>
                    </div>
                    <div className="flex justify-between font-sans font-black text-slate-900 border-t border-slate-200 pt-2 text-base">
                      <span>Total Facturé TTC :</span>
                      <span className="font-mono text-slate-900">{viewingAchat.totalTTC.toFixed(2)} DH</span>
                    </div>
                    <div className="flex justify-between font-sans font-semibold text-emerald-700 border-t border-slate-200 pt-2">
                      <span>Montant Réglé :</span>
                      <span className="font-mono">{viewingAchat.totalPaye.toFixed(2)} DH</span>
                    </div>
                    <div className="flex justify-between font-sans font-bold text-rose-700">
                      <span>Solde Restant Dû :</span>
                      <span className="font-mono">{viewingAchat.resteAPayer.toFixed(2)} DH</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer Note */}
              <div className="pt-4 border-t border-slate-200 text-center text-[10px] text-slate-400">
                Document d'approvisionnement officiel émis par StationHub · Conforme aux normes marocaines de comptabilisation des stocks et hydrocarbures.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Ajouter / Modifier un Achat (Modernized SaaS UI) */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200/80 dark:border-slate-800 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-xs">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    {editingAchat ? 'Modifier l\'Approvisionnement' : 'Nouvel Achat / Réception Marchandise'}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Enregistrez les livraisons carburants ou stocks boutiques avec calculs automatiques
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAddOpen(false);
                  setEditingAchat(null);
                }}
                className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAchat} className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Informations Générales */}
              <div className="bg-slate-50/60 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 rounded-xl p-4">
                <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
                  Informations Générales
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Type d'achat
                    </label>
                    <select
                      value={typeAchat}
                      onChange={(e) => setTypeAchat(e.target.value as any)}
                      className="w-full text-xs px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 transition-all"
                    >
                      <option value="Carburants">Carburants (Citernes)</option>
                      <option value="Produits">Produits & Lubrifiants</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Fournisseur
                    </label>
                    <select
                      value={fournisseurId}
                      onChange={(e) => setFournisseurId(e.target.value)}
                      className="w-full text-xs px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 transition-all"
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
                      N° Facture / BL
                    </label>
                    <input
                      type="text"
                      required
                      value={numeroFacture}
                      onChange={(e) => setNumeroFacture(e.target.value)}
                      placeholder="Ex: FAC-2026-0042"
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

              {/* Details table with Add line */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                      Lignes de Marchandises ({details.length})
                    </h3>
                  </div>
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
                    <table className="w-full text-left text-xs min-w-[700px]">
                      <thead className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold uppercase text-[11px]">
                        <tr>
                          <th className="py-2.5 px-3.5">Désignation / Citerne</th>
                          <th className="py-2.5 px-3.5 text-right">Quantité</th>
                          <th className="py-2.5 px-3.5 text-right">PU HT (DH)</th>
                          <th className="py-2.5 px-3.5 text-right">TVA (%)</th>
                          <th className="py-2.5 px-3.5 text-right">Total TTC</th>
                          <th className="py-2.5 px-3 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {details.map((det, idx) => (
                          <tr key={det.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                            <td className="py-2 px-3.5">
                              <input
                                type="text"
                                value={det.designation}
                                onChange={(e) => updateDetailRow(idx, 'designation', e.target.value)}
                                className="w-full px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                              />
                            </td>
                            <td className="py-2 px-3.5 text-right">
                              <input
                                type="number"
                                value={det.quantite}
                                onChange={(e) =>
                                  updateDetailRow(idx, 'quantite', parseFloat(e.target.value) || 0)
                                }
                                className="w-24 px-2.5 py-1.5 font-mono text-xs border border-slate-200 dark:border-slate-700 rounded-lg text-right font-bold bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                              />
                            </td>
                            <td className="py-2 px-3.5 text-right">
                              <input
                                type="number"
                                step="0.01"
                                value={det.prixUnitaireHT}
                                onChange={(e) =>
                                  updateDetailRow(idx, 'prixUnitaireHT', parseFloat(e.target.value) || 0)
                                }
                                className="w-24 px-2.5 py-1.5 font-mono text-xs border border-slate-200 dark:border-slate-700 rounded-lg text-right bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                              />
                            </td>
                            <td className="py-2 px-3.5 text-right">
                              <input
                                type="number"
                                value={det.tvaTaux}
                                onChange={(e) =>
                                  updateDetailRow(idx, 'tvaTaux', parseFloat(e.target.value) || 0)
                                }
                                className="w-16 px-2.5 py-1.5 font-mono text-xs border border-slate-200 dark:border-slate-700 rounded-lg text-right bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                              />
                            </td>
                            <td className="py-2 px-3.5 text-right font-mono font-bold text-slate-900 dark:text-white">
                              {det.totalTTC.toFixed(2)} DH
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

              {/* Payments Section & Summary side-by-side */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                {/* Payments Section */}
                <div className="bg-slate-50/60 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 rounded-xl p-4 space-y-3">
                  <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Règlement / Modalités
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Mode de Règlement
                      </label>
                      <select
                        value={paiements[0]?.mode || 'Chèque'}
                        onChange={(e) => {
                          const updated = [...paiements];
                          updated[0] = { ...updated[0], mode: e.target.value as any };
                          setPaiements(updated);
                        }}
                        className="w-full text-xs px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      >
                        <option value="Chèque">Chèque bancaire</option>
                        <option value="Virement">Virement bancaire</option>
                        <option value="Espèces">Espèces</option>
                        <option value="Traite">Traite / LCN</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Acompte Payé (DH)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={paiements[0]?.montant || 0}
                          onChange={(e) => {
                            const updated = [...paiements];
                            updated[0] = {
                              ...updated[0],
                              montant: parseFloat(e.target.value) || 0,
                            };
                            setPaiements(updated);
                          }}
                          className="w-full text-xs font-mono font-bold px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-right focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          N° Réf / Chèque
                        </label>
                        <input
                          type="text"
                          value={paiements[0]?.numeroCheque || ''}
                          onChange={(e) => {
                            const updated = [...paiements];
                            updated[0] = { ...updated[0], numeroCheque: e.target.value };
                            setPaiements(updated);
                          }}
                          placeholder="Ex: CHQ-89410"
                          className="w-full text-xs font-mono px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Totals Summary */}
                <div className="bg-slate-50/80 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/80 p-4 space-y-2 font-mono text-xs">
                  <div className="text-[11px] font-bold font-sans text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                    Récapitulatif Financier
                  </div>
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span className="font-sans">Total HT :</span>
                    <span>{totalHT.toFixed(2)} DH</span>
                  </div>
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span className="font-sans">Total TVA :</span>
                    <span>{totalTVA.toFixed(2)} DH</span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-900 dark:text-white border-t border-slate-200 dark:border-slate-700 pt-2 text-sm">
                    <span className="font-sans">Total TTC :</span>
                    <span className="text-emerald-700 dark:text-emerald-400">{totalTTC.toFixed(2)} DH</span>
                  </div>
                  <div className="flex justify-between text-emerald-700 dark:text-emerald-400 font-semibold">
                    <span className="font-sans">Total Payé :</span>
                    <span>{totalPaye.toFixed(2)} DH</span>
                  </div>
                  <div className="flex justify-between font-bold text-rose-600 dark:text-rose-400 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                    <span className="font-sans">Reste à Payer :</span>
                    <span>{resteAPayer.toFixed(2)} DH</span>
                  </div>
                </div>
              </div>

              {/* Modal Footer Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddOpen(false);
                    setEditingAchat(null);
                  }}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 rounded-xl shadow-xs hover:shadow transition-all"
                >
                  {editingAchat ? 'Enregistrer les modifications' : 'Valider l\'approvisionnement'}
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
        title="Exporter les achats vers Excel"
      />
    </div>
  );
};
