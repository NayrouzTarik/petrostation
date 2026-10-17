import React, { useEffect, useState, useRef } from 'react';
import {
  Plus,
  Search,
  Printer,
  Edit2,
  Trash2,
  X,
  FileText,
  Truck,
  CheckCircle,
  ArrowRight,
  Download,
  Calculator,
  Image as ImageIcon,
  Upload,
  Calendar,
  Sparkles,
  Coins,
  SlidersHorizontal,
  Hash,
} from 'lucide-react';
import { api } from '../../services/api.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { CommercialDoc, CommercialDocLigne, Tier, Carburant, Produit } from '../../types/index.ts';
import { StationLogo } from '../common/StationLogo.tsx';
import { DateRangeExportModal } from '../common/DateRangeExportModal.tsx';
import { CalculatorModal } from '../common/CalculatorModal.tsx';
import { generateDocNumber, formatDateDMY, isDateInRange } from '../../utils/dateUtils.ts';
import { exportToExcel } from '../../utils/excelExport.ts';
import { printDocumentWithCustomName } from '../../utils/printDocument.ts';

export const FacturationView: React.FC = () => {
  const { station } = useAuth();
  const [activeTab, setActiveTab] = useState<'factures' | 'bl' | 'devis'>('factures');
  const [docs, setDocs] = useState<CommercialDoc[]>([]);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [carburants, setCarburants] = useState<Carburant[]>([]);
  const [produits, setProduits] = useState<Produit[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Custom Logo State (Item 12.1)
  const [customDocLogo, setCustomDocLogo] = useState<string>(
    localStorage.getItem('stationhub_custom_doc_logo') || ''
  );
  const [isLogoModalOpen, setIsLogoModalOpen] = useState(false);
  const [tempLogoUrl, setTempLogoUrl] = useState('');
  const logoFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleStationUpdate = () => {
      setCustomDocLogo(localStorage.getItem('stationhub_custom_doc_logo') || '');
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('stationhub_station_updated', handleStationUpdate);
      return () => {
        window.removeEventListener('stationhub_station_updated', handleStationUpdate);
      };
    }
  }, []);

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [viewingDoc, setViewingDoc] = useState<CommercialDoc | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Toggle Calculation Mode for Factures & Devis:
  // 'QUANTITY': Saisie de la quantité -> Total TTC calculé automatiquement
  // 'TOTAL_TTC': Saisie du Total TTC -> Quantité calculée automatiquement selon le prix et la TVA
  const [calculationMode, setCalculationMode] = useState<'QUANTITY' | 'TOTAL_TTC'>('QUANTITY');

  // Calculator state (Item 12.2 & 12.4)
  const [isCalcOpen, setIsCalcOpen] = useState(false);
  const [calcTarget, setCalcTarget] = useState<{
    lineIdx: number;
    field: 'quantite' | 'prixUnitaireTTC' | 'totalTTC';
  } | null>(null);

  // Form state
  const [docType, setDocType] = useState<'FACTURE' | 'BON_LIVRAISON' | 'DEVIS'>('FACTURE');
  const [numero, setNumero] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientNom, setClientNom] = useState('');
  const [clientICE, setClientICE] = useState('');
  const [clientAdresse, setClientAdresse] = useState('');
  const [dateDocument, setDateDocument] = useState(new Date().toISOString().split('T')[0]);
  const [dateEcheance, setDateEcheance] = useState(new Date().toISOString().split('T')[0]);
  const [numeroBLAssocie, setNumeroBLAssocie] = useState('');
  const [statut, setStatut] = useState<'PAYÉE' | 'À PAYER' | 'LIVRÉ' | 'EN_COURS'>('PAYÉE');
  const [modePaiement, setModePaiement] = useState<'Espèces' | 'Chèque' | 'Virement' | 'Traite'>('Virement');
  const [datePaiement, setDatePaiement] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [lignes, setLignes] = useState<CommercialDocLigne[]>([]);

  const loadData = async () => {
    if (!station) return;
    try {
      setLoading(true);
      const [docList, tList, carbList, prodList] = await Promise.all([
        api.getCommercialDocs(station.id),
        api.getTiers(station.id),
        api.getCarburants(station.id),
        api.getProduits(station.id),
      ]);
      setDocs(docList);
      setTiers(tList);
      setCarburants(carbList);
      setProduits(prodList);
      if (tList.length > 0 && !clientId) {
        const defaultClient = tList.find((t) => t.type === 'Client') || tList[0];
        setClientId(defaultClient.id);
        setClientNom(defaultClient.name);
        setClientICE(defaultClient.ice || '');
        setClientAdresse((defaultClient as any).adresse || '');
      }
    } catch (err) {
      console.error('Failed to load commercial documents', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [station]);

  // Handle Logo Upload / Selection
  const handleSaveLogo = () => {
    setCustomDocLogo(tempLogoUrl);
    localStorage.setItem('stationhub_custom_doc_logo', tempLogoUrl);
    setIsLogoModalOpen(false);
  };

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setTempLogoUrl(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Calculate next strictly unique, non-repeating document number
  const getNextDocNumber = (type: 'FACTURE' | 'BON_LIVRAISON' | 'DEVIS', dateStr: string) => {
    const existing = docs.filter((d) => d.docType === type);
    let counter = existing.length + 1;
    let candidate = generateDocNumber(type, dateStr, counter);
    while (docs.some((d) => d.numero === candidate)) {
      counter++;
      candidate = generateDocNumber(type, dateStr, counter);
    }
    return candidate;
  };

  // Initialize new document form with auto-numbering (Item 12.2, 12.3, 12.4)
  const initNewDoc = (type: 'FACTURE' | 'BON_LIVRAISON' | 'DEVIS') => {
    setDocType(type);
    const today = new Date().toISOString().split('T')[0];
    setDateDocument(today);
    setDateEcheance(today);
    setDatePaiement(today);
    setNumero(getNextDocNumber(type, today));
    setNumeroBLAssocie('');
    setStatut(type === 'FACTURE' ? 'PAYÉE' : type === 'BON_LIVRAISON' ? 'LIVRÉ' : 'EN_COURS');
    setNotes('');

    // Default item
    const defaultCarb = carburants[0];
    setLignes([
      {
        id: `l-${Date.now()}`,
        designation: defaultCarb ? `${defaultCarb.name} (${defaultCarb.code})` : 'Gasoil Premium',
        unite: 'L',
        quantite: 500,
        prixUnitaireTTC: defaultCarb ? defaultCarb.pricePerLiter : 15.92,
        tvaTaux: 10,
        tvaMontant: Math.round(((500 * (defaultCarb ? defaultCarb.pricePerLiter : 15.92)) - (500 * (defaultCarb ? defaultCarb.pricePerLiter : 15.92) / 1.1)) * 100) / 100,
        totalTTC: Math.round(500 * (defaultCarb ? defaultCarb.pricePerLiter : 15.92) * 100) / 100,
      },
    ]);
  };

  // When date changes, regenerate formatted doc number
  const handleDateChange = (newDate: string) => {
    setDateDocument(newDate);
    setNumero(getNextDocNumber(docType, newDate));
  };

  const addLine = () => {
    const defaultCarb = carburants[0];
    const pu = defaultCarb ? defaultCarb.pricePerLiter : 15.92;
    const initialTTC = 500;
    const qte = calculationMode === 'TOTAL_TTC'
      ? Math.round((initialTTC / (pu || 1)) * 100) / 100
      : 100;
    const ttc = calculationMode === 'TOTAL_TTC' ? initialTTC : Math.round(100 * pu * 100) / 100;
    const tva = Math.round((ttc - ttc / 1.1) * 100) / 100;

    setLignes([
      ...lignes,
      {
        id: `l-${Date.now()}`,
        designation: defaultCarb ? `${defaultCarb.name} (${defaultCarb.code})` : 'Gasoil',
        unite: 'L',
        quantite: qte,
        prixUnitaireTTC: pu,
        tvaTaux: 10,
        tvaMontant: tva,
        totalTTC: ttc,
      },
    ]);
  };

  // Item 12.2: Auto-adapt unit and default price when selecting a predefined article
  const handleSelectArticlePreset = (idx: number, presetValue: string) => {
    const updated = [...lignes];
    const item = { ...updated[idx] };

    // Check if it's a Carburant
    const carb = carburants.find((c) => c.code === presetValue || c.name === presetValue);
    if (carb) {
      item.designation = `${carb.name} (${carb.code})`;
      item.unite = 'L'; // Litre for carburants
      item.prixUnitaireTTC = carb.pricePerLiter;
      item.tvaTaux = 10;
    } else {
      // Check if it's a Product
      const prod = produits.find((p) => p.id === presetValue || p.name === presetValue);
      if (prod) {
        item.designation = `${prod.name} - ${prod.marque}`;
        // Auto-adapt unit: kg if kg, otherwise Unité
        const nameLower = (prod.name + ' ' + (prod as any).unite).toLowerCase();
        item.unite = nameLower.includes('kg') ? 'kg' : 'Unité';
        item.prixUnitaireTTC = prod.prixVenteTTC;
        item.tvaTaux = 20;
      }
    }

    const pu = item.prixUnitaireTTC || 0;
    const tva = item.tvaTaux || 10;

    if (calculationMode === 'TOTAL_TTC' && docType !== 'BON_LIVRAISON') {
      const ttc = item.totalTTC || 0;
      item.quantite = pu > 0 ? Math.round((ttc / pu) * 100) / 100 : 0;
      const ht = ttc / (1 + tva / 100);
      item.tvaMontant = Math.round((ttc - ht) * 100) / 100;
    } else {
      const ttc = Math.round((item.quantite * pu) * 100) / 100;
      const ht = ttc / (1 + tva / 100);
      item.tvaMontant = Math.round((ttc - ht) * 100) / 100;
      item.totalTTC = ttc;
    }

    updated[idx] = item;
    setLignes(updated);
  };

  const updateLine = (idx: number, field: string, val: any) => {
    const updated = [...lignes];
    const item = { ...updated[idx], [field]: val };
    const tvaTaux = item.tvaTaux ?? 10;
    const puTTC = item.prixUnitaireTTC || 0;

    if (field === 'totalTTC') {
      // Directly entered Total TTC: calculate Quantité based on PU TTC and TVA
      const ttc = Math.max(0, parseFloat(val) || 0);
      item.totalTTC = ttc;
      item.quantite = puTTC > 0 ? Math.round((ttc / puTTC) * 100) / 100 : 0;
      const ht = ttc / (1 + tvaTaux / 100);
      item.tvaMontant = Math.round((ttc - ht) * 100) / 100;
    } else if (field === 'quantite') {
      // Directly entered Quantité: calculate Total TTC based on PU TTC and TVA
      const qte = Math.max(0, parseFloat(val) || 0);
      item.quantite = qte;
      const ttc = Math.round((qte * puTTC) * 100) / 100;
      item.totalTTC = ttc;
      const ht = ttc / (1 + tvaTaux / 100);
      item.tvaMontant = Math.round((ttc - ht) * 100) / 100;
    } else if (field === 'prixUnitaireTTC') {
      // Unit price updated: recalculate either Qte (if in TOTAL_TTC mode) or Total TTC (if in QUANTITY mode)
      const newPu = Math.max(0, parseFloat(val) || 0);
      item.prixUnitaireTTC = newPu;
      if (calculationMode === 'TOTAL_TTC' && docType !== 'BON_LIVRAISON') {
        const ttc = item.totalTTC || 0;
        item.quantite = newPu > 0 ? Math.round((ttc / newPu) * 100) / 100 : 0;
        const ht = ttc / (1 + tvaTaux / 100);
        item.tvaMontant = Math.round((ttc - ht) * 100) / 100;
      } else {
        const qte = item.quantite || 0;
        const ttc = Math.round((qte * newPu) * 100) / 100;
        item.totalTTC = ttc;
        const ht = ttc / (1 + tvaTaux / 100);
        item.tvaMontant = Math.round((ttc - ht) * 100) / 100;
      }
    } else if (field === 'tvaTaux') {
      // TVA updated: preserve Total TTC and recompute HT & TVA montant
      item.tvaTaux = parseFloat(val) || 0;
      const ttc = item.totalTTC || 0;
      const ht = ttc / (1 + item.tvaTaux / 100);
      item.tvaMontant = Math.round((ttc - ht) * 100) / 100;
    } else {
      // designation, unite, etc.
      const ttc = item.totalTTC || 0;
      const ht = ttc / (1 + tvaTaux / 100);
      item.tvaMontant = Math.round((ttc - ht) * 100) / 100;
    }

    updated[idx] = item;
    setLignes(updated);
  };

  const removeLine = (idx: number) => {
    if (lignes.length <= 1) return;
    setLignes(lignes.filter((_, i) => i !== idx));
  };

  // Calculator callback (Item 12.2 & 12.4)
  const handleInsertCalculatorResult = (val: number) => {
    if (!calcTarget) return;
    updateLine(calcTarget.lineIdx, calcTarget.field, val);
    setIsCalcOpen(false);
    setCalcTarget(null);
  };

  // Calculations
  const totalTTC = Math.round(lignes.reduce((a, c) => a + c.totalTTC, 0) * 100) / 100;
  const totalTVA = Math.round(lignes.reduce((a, c) => a + c.tvaMontant, 0) * 100) / 100;
  const totalHT = Math.round((totalTTC - totalTVA) * 100) / 100;

  const handleSaveDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!station) return;
    try {
      const payload: Partial<CommercialDoc> = {
        docType,
        numero,
        clientId,
        clientNom,
        clientICE,
        clientAdresse,
        dateDocument,
        dateEcheance,
        numeroBLAssocie,
        lignes,
        totalHT,
        totalTVA,
        totalTTC,
        statut,
        modePaiement: statut === 'PAYÉE' ? modePaiement : undefined,
        notes,
      };

      await api.addCommercialDoc(station.id, payload);
      setIsFormOpen(false);
      await loadData();
    } catch (err) {
      alert('Erreur lors de la création du document');
    }
  };

  const handleDelete = async (id: string) => {
    if (!station || !confirm('Supprimer ce document ?')) return;
    try {
      await api.deleteCommercialDoc(station.id, id);
      await loadData();
    } catch (err) {
      alert('Erreur lors de la suppression');
    }
  };

  const handleConvertToFacture = async (doc: CommercialDoc) => {
    if (!station) return;
    try {
      const today = new Date().toISOString().split('T')[0];
      const newFacture: Partial<CommercialDoc> = {
        docType: 'FACTURE',
        numero: getNextDocNumber('FACTURE', today),
        clientId: doc.clientId,
        clientNom: doc.clientNom,
        clientICE: doc.clientICE,
        clientAdresse: doc.clientAdresse,
        dateDocument: today,
        dateEcheance: today,
        numeroBLAssocie: doc.numero,
        lignes: doc.lignes,
        totalHT: doc.totalHT,
        totalTVA: doc.totalTVA,
        totalTTC: doc.totalTTC,
        statut: 'PAYÉE',
        modePaiement: 'Virement',
        notes: `Facturation établie sur base du document ${doc.numero}`,
      };

      await api.addCommercialDoc(station.id, newFacture);
      alert(`Document converti en Facture avec succès : ${newFacture.numero}`);
      setActiveTab('factures');
      await loadData();
    } catch (err) {
      alert('Erreur lors de la conversion');
    }
  };

  // Export to Excel with date range (Item 12.1 & 13.4)
  const handleExportExcel = (startDate: string, endDate: string) => {
    const tabDocs = docs.filter((d) => {
      if (activeTab === 'factures') return d.docType === 'FACTURE';
      if (activeTab === 'bl') return d.docType === 'BON_LIVRAISON';
      return d.docType === 'DEVIS';
    });

    const filteredDocs = tabDocs.filter((d) => isDateInRange(d.dateDocument, startDate, endDate));

    const rows = filteredDocs.map((d) => ({
      'Type': d.docType,
      'Numéro Document': d.numero,
      'Nom Client': d.clientNom,
      'ICE Client': d.clientICE || '-',
      'Date Document': formatDateDMY(d.dateDocument),
      'Date Échéance / Validité': formatDateDMY(d.dateEcheance || d.dateDocument),
      'Réf BL Associé': d.numeroBLAssocie || '-',
      'Total HT (DH)': d.totalHT,
      'Total TVA (DH)': d.totalTVA,
      'Total TTC (DH)': d.totalTTC,
      'Statut': d.statut,
      'Mode Paiement': d.modePaiement || '-',
    }));

    const label = activeTab === 'factures' ? 'factures' : activeTab === 'bl' ? 'bons_livraison' : 'devis';
    exportToExcel(
      `${label}_${station?.name || 'station'}_${formatDateDMY(startDate).replace(/\//g, '-')}_au_${formatDateDMY(endDate).replace(/\//g, '-')}`,
      [{ sheetName: label.toUpperCase(), data: rows }]
    );
  };

  const currentDocs = docs.filter((d) => {
    if (activeTab === 'factures') return d.docType === 'FACTURE';
    if (activeTab === 'bl') return d.docType === 'BON_LIVRAISON';
    return d.docType === 'DEVIS';
  });

  const filtered = currentDocs.filter(
    (d) =>
      d.numero.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.clientNom.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto print:p-0 print:m-0 print:max-w-none">
      {/* Background operational content completely hidden on print */}
      <div className={viewingDoc ? 'print:hidden' : 'space-y-6'}>
        {/* 3 Sub-tabs matching PDF Page 12, 13, 14 */}
        <div className="flex items-center gap-6 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('factures')}
          className={`pb-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 ${
            activeTab === 'factures'
              ? 'border-emerald-700 text-emerald-800'
              : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          1er : Factures
        </button>
        <button
          onClick={() => setActiveTab('bl')}
          className={`pb-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 ${
            activeTab === 'bl'
              ? 'border-emerald-700 text-emerald-800'
              : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          2eme : Bons de Livraison (BL)
        </button>
        <button
          onClick={() => setActiveTab('devis')}
          className={`pb-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 ${
            activeTab === 'devis'
              ? 'border-emerald-700 text-emerald-800'
              : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          3eme : Devis (Offres de Prix)
        </button>
      </div>

      {/* Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative w-72">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Filtrer par n° ou client..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white"
          />
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Custom Document Logo Button (Item 12.1) */}
          <button
            onClick={() => {
              setTempLogoUrl(customDocLogo);
              setIsLogoModalOpen(true);
            }}
            className="px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg flex items-center gap-1.5 shadow-2xs transition-colors"
            title="Joindre ou modifier le logo officiel pour les documents commerciaux"
          >
            <ImageIcon className="w-3.5 h-3.5 text-slate-500" />
            <span>{customDocLogo ? 'Logo personnalisé (Actif)' : 'Joindre un logo document'}</span>
          </button>

          {/* Export Excel (Item 12.1) */}
          <button
            onClick={() => setIsExportModalOpen(true)}
            className="px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg flex items-center gap-1.5 shadow-2xs transition-colors"
            title="Exporter la liste au format Excel"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span>Exporter vers Excel</span>
          </button>

          <button
            onClick={() => {
              initNewDoc(
                activeTab === 'factures'
                  ? 'FACTURE'
                  : activeTab === 'bl'
                  ? 'BON_LIVRAISON'
                  : 'DEVIS'
              );
              setIsFormOpen(true);
            }}
            className="px-3.5 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>
              {activeTab === 'factures'
                ? 'Ajouter une facture'
                : activeTab === 'bl'
                ? 'Ajouter un bon de livraison'
                : 'Ajouter un devis'}
            </span>
          </button>
        </div>
      </div>

      {/* Documents Table matching PDF Screenshots */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
            <tr>
              <th className="py-2.5 px-3">
                {activeTab === 'factures'
                  ? 'N° de Facture'
                  : activeTab === 'bl'
                  ? 'N° du Bon de Livraison'
                  : 'N° du Devis'}
              </th>
              <th className="py-2.5 px-3">Nom Client</th>
              <th className="py-2.5 px-3">Date</th>
              {activeTab === 'factures' && <th className="py-2.5 px-3">Réf BL Associé</th>}
              <th className="py-2.5 px-3 text-right">Montant (DH TTC)</th>
              <th className="py-2.5 px-3 text-center">Statut</th>
              <th className="py-2.5 px-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-400 italic">
                  Aucun document enregistré dans cet onglet.
                </td>
              </tr>
            ) : (
              filtered.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50/60">
                  <td className="py-3 px-3 font-bold font-mono text-slate-900">{d.numero}</td>
                  <td className="py-3 px-3">
                    <span className="font-semibold text-slate-800">{d.clientNom}</span>
                    {d.clientICE && (
                      <span className="text-[10px] text-slate-400 block font-mono">
                        ICE: {d.clientICE}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-600">{formatDateDMY(d.dateDocument)}</td>
                  {activeTab === 'factures' && (
                    <td className="py-3 px-3 font-mono text-slate-500 text-[11px]">
                      {d.numeroBLAssocie || '-'}
                    </td>
                  )}
                  <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 tabular-nums">
                    {d.totalTTC.toFixed(2)} DH
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        d.statut === 'PAYÉE' || d.statut === 'LIVRÉ'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-amber-50 text-amber-800 border-amber-200'
                      }`}
                    >
                      {d.statut}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => setViewingDoc(d)}
                        className="p-1 text-slate-500 hover:text-emerald-700 rounded transition-colors"
                        title="Visualiser et Imprimer (PDF)"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>

                      {/* Convert button for BL or Devis */}
                      {d.docType !== 'FACTURE' && (
                        <button
                          onClick={() => handleConvertToFacture(d)}
                          className="px-2 py-0.5 text-[10px] font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded flex items-center gap-1"
                          title="Convertir en Facture"
                        >
                          <ArrowRight className="w-3 h-3" />
                          <span>Facturer</span>
                        </button>
                      )}

                      <button
                        onClick={() => handleDelete(d.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                        title="Supprimer"
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

      {/* MODAL: Printable Document Viewer with Station Header (Item 12.1, 12.2, 12.3, 12.4) */}
      {viewingDoc && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] overflow-y-auto force-light">
            {/* Top Bar (Hidden on print) */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 print:hidden">
              <button
                onClick={() => {
                  if (!viewingDoc) return;
                  printDocumentWithCustomName({
                    type: viewingDoc.docType,
                    reference: viewingDoc.numero,
                    partnerOrEntity: viewingDoc.clientNom,
                    date: viewingDoc.dateDocument,
                    stationName: station?.name,
                  });
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg flex items-center gap-2 shadow-xs transition-colors"
                title={`Imprimer / Télécharger ${viewingDoc.docType}`}
              >
                <Printer className="w-4 h-4" />
                <span>Imprimer / Télécharger PDF</span>
              </button>
              <button
                onClick={() => setViewingDoc(null)}
                className="px-3 py-1.5 text-xs font-semibold bg-slate-200 rounded-lg text-slate-700 hover:bg-slate-300"
              >
                Fermer
              </button>
            </div>

            {/* Document Content with Authentic Station Branding (Spacious A4 Layout) */}
            <div className="p-8 sm:p-12 print:p-0 space-y-6 print:space-y-4 text-sm bg-white text-slate-900" id="printable-commercial-doc">
              {/* Station Header */}
              <div className="flex items-start justify-between pb-6 border-b-2 border-slate-900">
                <div className="flex items-center gap-4">
                  <StationLogo
                    stationId={station?.id}
                    brand={station?.brand}
                    name={station?.name}
                    logoUrl={customDocLogo || station?.logoUrl}
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
                  <span className="inline-block text-xs uppercase font-extrabold px-3.5 py-1.5 bg-slate-900 text-white rounded shadow-xs tracking-wider">
                    {viewingDoc.docType === 'FACTURE'
                      ? 'FACTURE CLIENT'
                      : viewingDoc.docType === 'BON_LIVRAISON'
                      ? 'BON DE LIVRAISON'
                      : 'DEVIS COMMERCIAL'}
                  </span>
                  <div className="mt-2 font-mono font-bold text-base text-slate-900">
                    N° {viewingDoc.numero}
                  </div>
                  <span className="text-slate-600 block font-mono text-xs mt-1">
                    Date d'émission : <strong>{formatDateDMY(viewingDoc.dateDocument)}</strong>
                  </span>
                  {viewingDoc.numeroBLAssocie && (
                    <span className="text-emerald-700 block font-mono text-xs font-semibold mt-0.5">
                      Réf BL Associé : {viewingDoc.numeroBLAssocie}
                    </span>
                  )}
                  <div className="mt-1.5">
                    <span className="inline-block px-2.5 py-0.5 text-[10px] font-bold rounded bg-slate-100 text-slate-800 border border-slate-300">
                      STATUT : {viewingDoc.statut.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Client & Document Metadata */}
              <div className="grid grid-cols-2 gap-6">
                <div className="p-5 rounded-xl bg-slate-50 border border-slate-200">
                  <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Client Destinataire
                  </h3>
                  <div className="text-base font-bold text-slate-900">{viewingDoc.clientNom}</div>
                  {viewingDoc.clientICE && (
                    <div className="text-xs font-mono text-slate-700 mt-1">
                      ICE : <strong>{viewingDoc.clientICE}</strong>
                    </div>
                  )}
                  {viewingDoc.clientAdresse && (
                    <div className="text-xs text-slate-600 mt-1">
                      Adresse : {viewingDoc.clientAdresse}
                    </div>
                  )}
                </div>

                <div className="p-5 rounded-xl bg-slate-50 border border-slate-200">
                  <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Modalités & Conditions
                  </h3>
                  <div className="space-y-1.5 text-xs text-slate-700">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Date d'échéance :</span>
                      <span className="font-mono font-bold text-slate-900">{formatDateDMY(viewingDoc.dateEcheance || viewingDoc.dateDocument)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Mode de règlement :</span>
                      <span className="font-semibold text-slate-900">{viewingDoc.modePaiement || 'Virement / Chèque / Espèces'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Lieu de livraison :</span>
                      <span className="font-semibold text-slate-700">Sur piste (Station)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold uppercase text-[11px]">
                    <tr>
                      <th className="py-3 px-4">Désignation du Produit / Service</th>
                      <th className="py-3 px-4 text-center">Unité</th>
                      <th className="py-3 px-4 text-right">Quantité</th>
                      {viewingDoc.docType !== 'BON_LIVRAISON' && (
                        <>
                          <th className="py-3 px-4 text-right">P.U TTC</th>
                          <th className="py-3 px-4 text-right">TVA %</th>
                          <th className="py-3 px-4 text-right">Total TTC</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {viewingDoc.lignes.map((l, i) => (
                      <tr key={i} className={i % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'}>
                        <td className="py-3 px-4 font-sans font-semibold text-slate-900">{l.designation}</td>
                        <td className="py-3 px-4 text-center text-slate-600 font-sans">{l.unite}</td>
                        <td className="py-3 px-4 text-right font-bold text-slate-900">
                          {l.quantite.toLocaleString('fr-FR')}
                        </td>
                        {viewingDoc.docType !== 'BON_LIVRAISON' && (
                          <>
                            <td className="py-3 px-4 text-right text-slate-700">{l.prixUnitaireTTC.toFixed(2)} DH</td>
                            <td className="py-3 px-4 text-right text-slate-600">{l.tvaTaux}%</td>
                            <td className="py-3 px-4 text-right font-bold text-slate-900">{l.totalTTC.toFixed(2)} DH</td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals Summary */}
              {viewingDoc.docType !== 'BON_LIVRAISON' && (
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pt-2">
                  <div className="text-xs text-slate-600 italic bg-slate-50 p-4 rounded-xl border border-slate-200 max-w-md">
                    <p className="font-semibold text-slate-700 not-italic uppercase text-[10px] tracking-wider mb-1">
                      Mention Légale
                    </p>
                    Arrêtée la présente pièce commerciale à la somme totale de :{' '}
                    <strong className="text-slate-900">{viewingDoc.totalTTC.toFixed(2)} Dirhams TTC</strong>.
                  </div>

                  <div className="w-full sm:w-80 space-y-2 p-4 bg-slate-50 rounded-xl border border-slate-200 font-mono text-xs">
                    <div className="flex justify-between font-sans text-slate-600">
                      <span>Total Hors Taxes (HT) :</span>
                      <span className="font-mono font-semibold">{viewingDoc.totalHT.toFixed(2)} DH</span>
                    </div>
                    <div className="flex justify-between font-sans text-slate-600">
                      <span>Total TVA :</span>
                      <span className="font-mono font-semibold">{viewingDoc.totalTVA.toFixed(2)} DH</span>
                    </div>
                    <div className="flex justify-between font-sans font-black text-base text-slate-900 border-t border-slate-200 pt-2 bg-emerald-50/60 -mx-4 -mb-4 p-4 rounded-b-xl">
                      <span>Net à Payer TTC :</span>
                      <span className="font-mono text-emerald-900">{viewingDoc.totalTTC.toFixed(2)} DH</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Signatures & Stamps */}
              <div className="grid grid-cols-2 gap-8 pt-4">
                <div className="border border-slate-300 rounded-xl p-5 h-36 flex flex-col justify-between bg-slate-50/30">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                    <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                      Bon pour Accord & Réception (Client)
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">Date & Signature</span>
                  </div>
                  <div className="text-center text-[10px] text-slate-400 italic">
                    Signature précédée de la mention "Bon pour Accord" et Cachet
                  </div>
                </div>

                <div className="border border-slate-300 rounded-xl p-5 h-36 flex flex-col justify-between bg-slate-50/30">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                    <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                      Visa & Cachet Station-Service
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">Direction</span>
                  </div>
                  <div className="text-center text-[10px] text-slate-400 italic">
                    Cachet officiel et signature autorisée
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="pt-4 border-t border-slate-200 text-center text-[10px] text-slate-400">
                Document commercial conforme aux normes de facturation marocaine · En cas de contestation, le tribunal de commerce de la ville de la station est seul compétent.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Logo des documents commerciaux (Item 12.1) */}
      {isLogoModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h2 className="text-sm font-bold text-slate-900">Logo des Documents Commerciaux</h2>
              <button
                onClick={() => setIsLogoModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <p className="text-slate-600 leading-relaxed">
                Par défaut, le logo officiel configuré depuis le back-office est utilisé sur vos factures, BL et devis. Si votre station utilise un logo spécifique pour ses imprimés commerciaux, vous pouvez en joindre un ici.
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Téléverser une image de logo
                </label>
                <input
                  type="file"
                  ref={logoFileInputRef}
                  onChange={handleLogoFileChange}
                  accept="image/*"
                  className="w-full text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Ou renseigner l'URL directe de l'image
                </label>
                <input
                  type="text"
                  value={tempLogoUrl}
                  onChange={(e) => setTempLogoUrl(e.target.value)}
                  placeholder="https://.../mon-logo.png"
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              {tempLogoUrl && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-center">
                  <img
                    src={tempLogoUrl}
                    alt="Aperçu logo"
                    className="max-h-20 max-w-full object-contain"
                  />
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setTempLogoUrl('');
                    setCustomDocLogo('');
                    localStorage.removeItem('stationhub_custom_doc_logo');
                    setIsLogoModalOpen(false);
                  }}
                  className="text-xs text-rose-600 hover:text-rose-800 font-semibold"
                >
                  Rétablir logo par défaut
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsLogoModalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveLogo}
                    className="px-5 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg"
                  >
                    Enregistrer
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Formulaire de Création Document (Modernized Premium UI) */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/80 w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col">
            {/* Sleek Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200/80 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-sm">
                  {docType === 'FACTURE' ? (
                    <FileText className="w-5 h-5" />
                  ) : docType === 'BON_LIVRAISON' ? (
                    <Truck className="w-5 h-5" />
                  ) : (
                    <Sparkles className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-slate-900 tracking-tight">
                      {docType === 'FACTURE'
                        ? 'Édition de Facture Client'
                        : docType === 'BON_LIVRAISON'
                        ? 'Édition de Bon de Livraison (BL)'
                        : 'Édition de Devis Commercial'}
                    </h2>
                    <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                      {docType}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Générez et calculez automatiquement les montants avec conformité fiscale
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsFormOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveDoc} className="p-6 space-y-6 overflow-y-auto flex-1">
              {/* Section 1: Informations Générales */}
              <div className="p-4 bg-slate-50/60 rounded-xl border border-slate-200/70 space-y-3">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  1. Informations Générales & Client
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Client B2B Destinataire *
                    </label>
                    <select
                      value={clientId}
                      onChange={(e) => {
                        const cId = e.target.value;
                        setClientId(cId);
                        const cl = tiers.find((t) => t.id === cId);
                        if (cl) {
                          setClientNom(cl.name);
                          setClientICE(cl.ice || '');
                          setClientAdresse((cl as any).adresse || '');
                        }
                      }}
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white font-medium focus:ring-2 focus:ring-emerald-600 focus:outline-none transition-all"
                    >
                      {tiers
                        .filter((t) => t.type === 'Client')
                        .map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name} {t.ice ? `(ICE: ${t.ice})` : ''}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Date d'Émission
                    </label>
                    <input
                      type="date"
                      required
                      value={dateDocument}
                      onChange={(e) => handleDateChange(e.target.value)}
                      className="w-full text-xs font-mono px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {docType === 'DEVIS' ? 'Date de Validité' : "Date d'Échéance"}
                    </label>
                    <input
                      type="date"
                      required
                      value={dateEcheance}
                      onChange={(e) => setDateEcheance(e.target.value)}
                      className="w-full text-xs font-mono px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 font-medium">N° de document attribué :</span>
                    <span className="font-mono font-bold text-slate-900 bg-white px-2.5 py-1 rounded-md border border-slate-200">
                      {numero}
                    </span>
                  </div>
                  {clientICE && (
                    <div className="text-slate-500 font-mono text-[11px]">
                      ICE Client : <strong>{clientICE}</strong>
                    </div>
                  )}
                </div>
              </div>

              {/* Section 2: Articles & Lignes */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                      2. Lignes & Prestations
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Les unités s'adaptent automatiquement : <strong>Litre (L)</strong> pour carburants, <strong>kg / Unité</strong> pour produits.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Toggle Mode: Saisie par Quantité VS Saisie par Total TTC */}
                    {docType !== 'BON_LIVRAISON' && (
                      <div className="inline-flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs">
                        <button
                          type="button"
                          onClick={() => setCalculationMode('QUANTITY')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                            calculationMode === 'QUANTITY'
                              ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs border border-slate-200/80 dark:border-slate-700'
                              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                          }`}
                          title="Saisir la quantité : le Total TTC est calculé automatiquement"
                        >
                          <SlidersHorizontal className="w-3.5 h-3.5" />
                          <span>Par Quantité (Total calculé)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setCalculationMode('TOTAL_TTC')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                            calculationMode === 'TOTAL_TTC'
                              ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs border border-slate-200/80 dark:border-slate-700'
                              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                          }`}
                          title="Saisir le Total TTC : la Quantité est calculée automatiquement selon le prix et la TVA"
                        >
                          <Coins className="w-3.5 h-3.5" />
                          <span>Par Total TTC (Quantité calculée)</span>
                        </button>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={addLine}
                      className="px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl flex items-center gap-1.5 shadow-xs transition-colors shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Ajouter une ligne</span>
                    </button>
                  </div>
                </div>

                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xs bg-white dark:bg-slate-900">
                  <table className="w-full text-left text-xs min-w-[720px]">
                    <thead className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold uppercase text-[10px]">
                      <tr>
                        <th className="py-2.5 px-3">Modèle / Article Prédéfini</th>
                        <th className="py-2.5 px-3">Désignation</th>
                        <th className="py-2.5 px-3 text-center">Unité</th>
                        <th className="py-2.5 px-3 text-right">
                          <div className="inline-flex items-center gap-1 justify-end">
                            <span>Quantité</span>
                            {docType !== 'BON_LIVRAISON' && (
                              <span
                                className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                                  calculationMode === 'QUANTITY'
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                    : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                                }`}
                              >
                                {calculationMode === 'QUANTITY' ? 'Saisie' : 'Auto'}
                              </span>
                            )}
                          </div>
                        </th>
                        {docType !== 'BON_LIVRAISON' && (
                          <>
                            <th className="py-2.5 px-3 text-right">P.U TTC (DH)</th>
                            <th className="py-2.5 px-3 text-right">TVA %</th>
                            <th className="py-2.5 px-3 text-right">
                              <div className="inline-flex items-center gap-1 justify-end">
                                <span>Total TTC (DH)</span>
                                <span
                                  className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                                    calculationMode === 'TOTAL_TTC'
                                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                      : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                                  }`}
                                >
                                  {calculationMode === 'TOTAL_TTC' ? 'Saisie' : 'Auto'}
                                </span>
                              </div>
                            </th>
                          </>
                        )}
                        <th className="py-2.5 px-3 text-center">Calc.</th>
                        <th className="py-2.5 px-3 text-center">Suppr.</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {lignes.map((l, idx) => (
                        <tr key={l.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-2.5 px-3">
                            <select
                              onChange={(e) => handleSelectArticlePreset(idx, e.target.value)}
                              className="w-44 px-2 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg text-xs bg-slate-50/80 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:ring-1 focus:ring-emerald-600"
                            >
                              <option value="">Choisir un article...</option>
                              <optgroup label="Carburants Station">
                                {carburants.map((c) => (
                                  <option key={c.id} value={c.code}>
                                    {c.name} ({c.pricePerLiter.toFixed(2)} DH/L)
                                  </option>
                                ))}
                              </optgroup>
                              <optgroup label="Produits Boutique">
                                {produits.map((p) => (
                                  <option key={p.id} value={p.id}>
                                    {p.name} ({p.prixVenteTTC.toFixed(2)} DH)
                                  </option>
                                ))}
                              </optgroup>
                            </select>
                          </td>

                          <td className="py-2.5 px-3">
                            <input
                              type="text"
                              required
                              value={l.designation}
                              onChange={(e) => updateLine(idx, 'designation', e.target.value)}
                              placeholder="Désignation"
                              className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-1 focus:ring-emerald-600"
                            />
                          </td>

                          <td className="py-2.5 px-3 text-center">
                            <select
                              value={l.unite}
                              onChange={(e) => updateLine(idx, 'unite', e.target.value)}
                              className="px-2 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-center bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium focus:ring-1 focus:ring-emerald-600"
                            >
                              <option value="L">L</option>
                              <option value="Unité">Unité</option>
                              <option value="kg">kg</option>
                            </select>
                          </td>

                          <td className="py-2.5 px-3 text-right">
                            {calculationMode === 'QUANTITY' || docType === 'BON_LIVRAISON' ? (
                              <input
                                type="number"
                                step="0.01"
                                value={l.quantite}
                                onChange={(e) =>
                                  updateLine(idx, 'quantite', parseFloat(e.target.value) || 0)
                                }
                                className="w-24 px-2 py-1.5 font-mono text-xs border border-emerald-400 dark:border-emerald-600 bg-emerald-50/20 dark:bg-emerald-950/20 rounded-lg text-right font-bold focus:ring-2 focus:ring-emerald-500/40 text-slate-900 dark:text-white"
                              />
                            ) : (
                              <div className="text-right">
                                <span className="inline-block px-2.5 py-1 font-mono text-xs font-black text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg tabular-nums">
                                  {l.quantite.toFixed(2)}
                                </span>
                              </div>
                            )}
                          </td>

                          {docType !== 'BON_LIVRAISON' && (
                            <>
                              <td className="py-2.5 px-3 text-right">
                                <input
                                  type="number"
                                  step="0.01"
                                  value={l.prixUnitaireTTC}
                                  onChange={(e) =>
                                    updateLine(idx, 'prixUnitaireTTC', parseFloat(e.target.value) || 0)
                                  }
                                  className="w-20 px-2 py-1.5 font-mono text-xs border border-slate-300 dark:border-slate-700 rounded-lg text-right bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-1 focus:ring-emerald-600"
                                />
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                <select
                                  value={l.tvaTaux}
                                  onChange={(e) =>
                                    updateLine(idx, 'tvaTaux', parseFloat(e.target.value) || 0)
                                  }
                                  className="px-2 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono"
                                >
                                  <option value={10}>10%</option>
                                  <option value={20}>20%</option>
                                  <option value={14}>14%</option>
                                  <option value={7}>7%</option>
                                  <option value={0}>0%</option>
                                </select>
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                {calculationMode === 'TOTAL_TTC' ? (
                                  <div className="flex items-center justify-end gap-1">
                                    <input
                                      type="number"
                                      step="0.01"
                                      value={l.totalTTC}
                                      onChange={(e) =>
                                        updateLine(idx, 'totalTTC', parseFloat(e.target.value) || 0)
                                      }
                                      className="w-28 px-2 py-1.5 font-mono text-xs border border-emerald-400 dark:border-emerald-600 bg-emerald-50/20 dark:bg-emerald-950/20 rounded-lg text-right font-bold focus:ring-2 focus:ring-emerald-500/40 text-slate-900 dark:text-white"
                                    />
                                    <span className="text-[11px] font-semibold text-slate-500">DH</span>
                                  </div>
                                ) : (
                                  <span className="font-mono font-bold text-slate-900 dark:text-white tabular-nums">
                                    {l.totalTTC.toFixed(2)} DH
                                  </span>
                                )}
                              </td>
                            </>
                          )}

                          {/* Mini-Calculator Button */}
                          <td className="py-2.5 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                setCalcTarget({
                                  lineIdx: idx,
                                  field: calculationMode === 'TOTAL_TTC' ? 'totalTTC' : 'quantite',
                                });
                                setIsCalcOpen(true);
                              }}
                              className="p-1.5 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 rounded-lg border border-emerald-200 dark:border-emerald-800 transition-colors"
                              title={`Ouvrir la calculatrice intégrée pour ${calculationMode === 'TOTAL_TTC' ? 'le Total TTC' : 'la quantité'}`}
                            >
                              <Calculator className="w-3.5 h-3.5" />
                            </button>
                          </td>

                          <td className="py-2.5 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => removeLine(idx)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Section 3: Modalités & Paiement */}
              {docType === 'FACTURE' && (
                <div className="p-4 bg-slate-50/70 border border-slate-200/80 rounded-xl space-y-3">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    3. Règlement & Modalités
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Statut de Paiement
                      </label>
                      <select
                        value={statut}
                        onChange={(e) => setStatut(e.target.value as any)}
                        className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white font-bold"
                      >
                        <option value="PAYÉE">Payée</option>
                        <option value="À PAYER">À payer</option>
                      </select>
                    </div>

                    {statut === 'PAYÉE' && (
                      <>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Mode de Paiement
                          </label>
                          <select
                            value={modePaiement}
                            onChange={(e) => setModePaiement(e.target.value as any)}
                            className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white font-medium"
                          >
                            <option value="Virement">Virement bancaire</option>
                            <option value="Chèque">Chèque</option>
                            <option value="Espèces">Espèces</option>
                            <option value="Traite">Traite</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Date de Paiement
                          </label>
                          <input
                            type="date"
                            value={datePaiement}
                            onChange={(e) => setDatePaiement(e.target.value)}
                            className="w-full text-xs font-mono px-3 py-2 border border-slate-300 rounded-lg bg-white"
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Totals Summary */}
              {docType !== 'BON_LIVRAISON' && (
                <div className="flex justify-end pt-1">
                  <div className="w-80 space-y-2 p-4 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl border border-slate-200 text-xs shadow-2xs font-mono">
                    <div className="flex justify-between font-sans text-slate-600">
                      <span>Total HT :</span>
                      <span className="font-mono font-semibold text-slate-900">{totalHT.toFixed(2)} DH</span>
                    </div>
                    <div className="flex justify-between font-sans text-slate-600">
                      <span>Total TVA :</span>
                      <span className="font-mono font-semibold text-slate-900">{totalTVA.toFixed(2)} DH</span>
                    </div>
                    <div className="flex justify-between font-sans font-black text-sm text-slate-900 border-t border-slate-200 pt-2">
                      <span>Total TTC Net :</span>
                      <span className="font-mono text-emerald-800 text-base">{totalTTC.toFixed(2)} DH</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-5 py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 rounded-xl shadow-md shadow-emerald-900/20 transition-all flex items-center gap-1.5"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Enregistrer le document</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Date Range Export Modal (Item 12.1 & 13.4) */}
      <DateRangeExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        onExport={handleExportExcel}
        title={`Exporter les ${
          activeTab === 'factures'
            ? 'Factures'
            : activeTab === 'bl'
            ? 'Bons de Livraison'
            : 'Devis'
        } vers Excel`}
      />

      {/* Built-in Mini-Calculator Modal (Item 12.2 & 12.4) */}
      <CalculatorModal
        isOpen={isCalcOpen}
        onClose={() => {
          setIsCalcOpen(false);
          setCalcTarget(null);
        }}
        onInsert={handleInsertCalculatorResult}
        initialValue={
          calcTarget
            ? String(lignes[calcTarget.lineIdx]?.[calcTarget.field] || 0)
            : '0'
        }
      />
    </div>
  );
};
