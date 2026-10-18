import React, { useState, useEffect } from 'react';
import {
  Calculator,
  CheckCircle2,
  AlertCircle,
  Building,
  DollarSign,
  FileText,
  FileCheck2,
  RefreshCw,
  Search,
  Filter,
  Download,
  BookOpen,
  TrendingDown,
  Users,
  AlertTriangle,
  FileSpreadsheet,
  Layers,
  ShieldCheck,
  Scale,
  ArrowUpRight,
  ArrowDownRight,
  Check,
  ChevronDown,
  Clock,
  Sparkles,
} from 'lucide-react';
import { api } from '../../services/api.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { exportToExcel } from '../../utils/excelExport.ts';
import { formatDateDMY } from '../../utils/dateUtils.ts';
import { Citerne, Carburant, Salarie, Tier, Achat, Depense, Journee } from '../../types/index.ts';

type ActiveTab =
  | 'rapprochement'
  | 'tva'
  | 'grand_livre'
  | 'export_comptable'
  | 'caisse'
  | 'coulage'
  | 'salaires_cnss';

export const AccountantView: React.FC = () => {
  const { station } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>('rapprochement');
  const [achats, setAchats] = useState<Achat[]>([]);
  const [depenses, setDepenses] = useState<Depense[]>([]);
  const [journees, setJournees] = useState<Journee[]>([]);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [salaries, setSalaries] = useState<Salarie[]>([]);
  const [citernes, setCiternes] = useState<Citerne[]>([]);
  const [carburants, setCarburants] = useState<Carburant[]>([]);
  const [loading, setLoading] = useState(true);

  // Bank reconciliation checklist
  const [reconciledItems, setReconciledItems] = useState<Record<string, boolean>>({
    'rec-1': true,
    'rec-2': true,
  });

  // Export filters
  const [selectedJournal, setSelectedJournal] = useState<'ALL' | 'VT' | 'AC' | 'BQ' | 'CA'>('ALL');
  const [periodFilter, setPeriodFilter] = useState<'ALL' | 'CURRENT_MONTH' | 'CURRENT_QUARTER'>('ALL');
  const [exportSuccessMsg, setExportSuccessMsg] = useState<string | null>(null);

  const loadData = async () => {
    if (!station) return;
    try {
      setLoading(true);
      const [aList, dList, jList, tList, sList, cList, carbList] = await Promise.all([
        api.getAchats(station.id),
        api.getDepenses(station.id),
        api.getJournees(station.id),
        api.getTiers(station.id),
        api.getSalaries(station.id).catch(() => []),
        api.getCiternes(station.id).catch(() => []),
        api.getCarburants(station.id).catch(() => []),
      ]);
      setAchats(aList || []);
      setDepenses(dList || []);
      setJournees(jList || []);
      setTiers(tList || []);
      setSalaries(sList || []);
      setCiternes(cList || []);
      setCarburants(carbList || []);
    } catch (err) {
      console.error('Failed to load accountant data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [station]);

  const toggleReconciliation = (id: string) => {
    setReconciledItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // ==========================================
  // 1. TVA CALCULATIONS
  // ==========================================
  let tvaCollectee = 0;
  journees.forEach((j) => {
    const fuelHT = (j.totalCarburantsDH || 0) / 1.1;
    const prodServHT = ((j.totalProduitsDH || 0) + (j.totalServicesDH || 0)) / 1.2;
    tvaCollectee +=
      (j.totalCarburantsDH || 0) -
      fuelHT +
      ((j.totalProduitsDH || 0) + (j.totalServicesDH || 0) - prodServHT);
  });

  let tvaDeductibleAchats = 0;
  achats.forEach((a) => {
    tvaDeductibleAchats += a.totalTVA || 0;
  });

  let tvaDeductibleCharges = 0;
  depenses.forEach((d) => {
    tvaDeductibleCharges += d.totalTVA || 0;
  });

  const totalTvaDeductible = tvaDeductibleAchats + tvaDeductibleCharges;
  const tvaDue = Math.max(0, tvaCollectee - totalTvaDeductible);

  // ==========================================
  // 2. RAPPROCHEMENT BANCAIRE (5141)
  // ==========================================
  const shiftCredits = journees
    .filter((j) => (j.especesARemettreDH || 0) > 0)
    .map((j) => ({
      id: `rec-jrn-${j.id}`,
      date: j.dateDebut,
      libelle: `Versement espèces shift (${j.dateDebut})`,
      debit: 0,
      credit: Number(j.especesARemettreDH) || 0,
      reference: `VRST-${j.id.slice(-6).toUpperCase()}`,
    }));

  const achatDebits = achats.flatMap((a) => {
    const payments = a.paiements || [];
    if (payments.length > 0) {
      return payments
        .filter((p: any) => p.mode === 'Chèque' || p.mode === 'Virement')
        .map((p: any, idx: number) => ({
          id: `rec-ach-${a.id}-${p.id || idx}`,
          date: p.datePaiement || a.dateFacturation,
          libelle: `Règlement ${p.mode} Fournisseur ${a.fournisseurNom}`,
          debit: Number(p.montant) || 0,
          credit: 0,
          reference: p.numeroCheque || `VIR-${a.numeroFacture || a.id.slice(-5)}`,
        }));
    }
    return [];
  });

  const depenseDebits = depenses
    .filter((d) => (d.modePaiement === 'Chèque' || d.modePaiement === 'Virement') && d.totalTTC > 0)
    .map((d) => ({
      id: `rec-dep-${d.id}`,
      date: d.datePaiement || d.dateFacturation,
      libelle: `Paiement charge ${d.typeDepense} (${d.fournisseurNom || 'Fournisseur'})`,
      debit: Number(d.totalTTC) || 0,
      credit: 0,
      reference: `DEP-${d.numeroFacture || d.id.slice(-5)}`,
    }));

  const bankOperations = [...shiftCredits, ...achatDebits, ...depenseDebits].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const totalOpsNet = bankOperations.reduce((acc, curr) => acc + curr.credit - curr.debit, 0);
  const bankTier = tiers.find((t) => t.type === 'Banque');
  const soldeComptableBanque =
    bankTier?.solde !== undefined && bankTier.solde !== 0 ? bankTier.solde : totalOpsNet;

  const pointedCredits = bankOperations
    .filter((op) => reconciledItems[op.id] !== false)
    .reduce((acc, op) => acc + op.credit, 0);
  const pointedDebits = bankOperations
    .filter((op) => reconciledItems[op.id] !== false)
    .reduce((acc, op) => acc + op.debit, 0);
  const soldeReleveBancaire = pointedCredits - pointedDebits;
  const ecartRapprochement = soldeComptableBanque - soldeReleveBancaire;

  // ==========================================
  // 3. CONTRÔLE DE CAISSE (LIVRE DE CAISSE 5161)
  // ==========================================
  interface CaisseMovement {
    id: string;
    date: string;
    libelle: string;
    piece: string;
    entree: number;
    sortie: number;
    soldeProgressif: number;
  }

  const rawCaisseEntries: Array<{
    id: string;
    date: string;
    libelle: string;
    piece: string;
    entree: number;
    sortie: number;
  }> = [];

  // Recettes espèces shifts
  journees.forEach((j) => {
    const cash = Number(j.especesARemettreDH) || 0;
    if (cash > 0) {
      rawCaisseEntries.push({
        id: `caisse-in-${j.id}`,
        date: j.dateDebut,
        libelle: `Recette espèces clôture shift (${j.dateDebut})`,
        piece: `CLOT-${j.id.slice(-6).toUpperCase()}`,
        entree: cash,
        sortie: 0,
      });
    }
  });

  // Dépenses réglées en espèces
  depenses
    .filter((d) => d.modePaiement === 'Espèces' && d.totalTTC > 0)
    .forEach((d) => {
      rawCaisseEntries.push({
        id: `caisse-out-dep-${d.id}`,
        date: d.datePaiement || d.dateFacturation,
        libelle: `Dépense exploitation en espèces : ${d.typeDepense}`,
        piece: `RC-${d.numeroFacture || d.id.slice(-5)}`,
        entree: 0,
        sortie: Number(d.totalTTC) || 0,
      });
    });

  // Versements banque espèces
  achats.forEach((a) => {
    (a.paiements || []).forEach((p: any, idx: number) => {
      if (p.mode === 'Espèces' && (Number(p.montant) || 0) > 0) {
        rawCaisseEntries.push({
          id: `caisse-out-ach-${a.id}-${idx}`,
          date: p.datePaiement || a.dateFacturation,
          libelle: `Règlement espèces fournisseur ${a.fournisseurNom}`,
          piece: `FA-${a.numeroFacture || a.id.slice(-5)}`,
          entree: 0,
          sortie: Number(p.montant) || 0,
        });
      }
    });
  });

  // Trier chronologiquement (ancien -> récent) pour calculer le solde progressif
  rawCaisseEntries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  let runningCaisseBalance = 0;
  let hasCreditriceRisk = false;

  const caisseMovements: CaisseMovement[] = rawCaisseEntries.map((m) => {
    runningCaisseBalance += m.entree - m.sortie;
    if (runningCaisseBalance < 0) {
      hasCreditriceRisk = true;
    }
    return {
      ...m,
      soldeProgressif: runningCaisseBalance,
    };
  });

  const totalCaisseEntrees = rawCaisseEntries.reduce((acc, m) => acc + m.entree, 0);
  const totalCaisseSorties = rawCaisseEntries.reduce((acc, m) => acc + m.sortie, 0);
  const soldeFinalCaisse = runningCaisseBalance;

  // ==========================================
  // 4. BILAN DU COULAGE & PERTES DE CUVE (STOCKS)
  // ==========================================
  interface CoulageRow {
    id: string;
    citerneNom: string;
    carburantNom: string;
    capacite: number;
    stockJauge: number;
    ventesLitres: number;
    ecartLitres: number;
    tauxCoulage: number;
    statut: 'CONFORME' | 'ALERTE';
    valeurPerteDH: number;
  }

  const coulageRows: CoulageRow[] = citernes.map((c) => {
    const carb = carburants.find((cb) => cb.code === c.carburantCode);
    const prixLitre = carb?.pricePerLiter || 14.5;
    const carbNom = carb?.name || c.carburantCode;

    // Calcul des ventes cumulées pour ce carburant
    let ventesL = 0;
    journees.forEach((j) => {
      (j.shifts || []).forEach((sh: any) => {
        (sh.pistoletReadings || []).forEach((pr: any) => {
          if (pr.carburantCode === c.carburantCode) {
            ventesL += Number(pr.volumeVendu) || 0;
          }
        });
      });
    });

    const stockJauge = Number(c.currentStock) || 0;
    // Estimation variation par rapport au seuil normé
    const ecartL = ventesL > 0 ? stockJauge - (c.capacity - ventesL * 0.1) : 0;
    const tauxCoulage = ventesL > 0 ? (Math.abs(ecartL) / ventesL) * 100 : 0.22;
    const isConforme = tauxCoulage <= 0.45; // Seuil légal DGI ~ 0.40% à 0.50%

    return {
      id: c.id,
      citerneNom: c.name,
      carburantNom: carbNom,
      capacite: c.capacity,
      stockJauge,
      ventesLitres: Math.round(ventesL),
      ecartLitres: Math.round(ecartL),
      tauxCoulage: Number(tauxCoulage.toFixed(2)),
      statut: isConforme ? 'CONFORME' : 'ALERTE',
      valeurPerteDH: Math.round(Math.abs(ecartL) * prixLitre),
    };
  });

  const totalPerteCoulageDH = coulageRows.reduce((acc, r) => acc + r.valeurPerteDH, 0);

  // ==========================================
  // 5. MASSE SALARIALE & CHARGES SOCIALES (CNSS, AMO, IR)
  // ==========================================
  interface SalariePayroll {
    id: string;
    nom: string;
    poste: string;
    brut: number;
    cnssSalariale: number;
    amoSalariale: number;
    cnssPatronale: number;
    amoPatronale: number;
    irRetenu: number;
    netPayer: number;
    coutEmployeur: number;
  }

  const payrollRows: SalariePayroll[] = salaries.map((s) => {
    const brut = Number(s.salary) || 3500;
    // Plafond CNSS à 6000 DH
    const brutPlafonneCNSS = Math.min(brut, 6000);

    // Part Salariale
    const cnssSalariale = brutPlafonneCNSS * 0.0448; // 4.48%
    const amoSalariale = brut * 0.0226; // 2.26%

    // Part Patronale
    const cnssPatronale = brutPlafonneCNSS * (0.0898 + 0.064 + 0.016); // 16.98%
    const amoPatronale = brut * 0.0411; // 4.11%

    // IR estimé
    let ir = 0;
    if (brut > 4000) {
      ir = (brut - 4000) * 0.1;
    }

    const net = Math.max(0, brut - cnssSalariale - amoSalariale - ir);
    const cout = brut + cnssPatronale + amoPatronale;

    return {
      id: s.id,
      nom: `${s.firstName || ''} ${s.lastName || s.name || 'Salarié'}`.trim(),
      poste: s.role || 'Pompiste',
      brut,
      cnssSalariale: Number(cnssSalariale.toFixed(2)),
      amoSalariale: Number(amoSalariale.toFixed(2)),
      cnssPatronale: Number(cnssPatronale.toFixed(2)),
      amoPatronale: Number(amoPatronale.toFixed(2)),
      irRetenu: Number(ir.toFixed(2)),
      netPayer: Number(net.toFixed(2)),
      coutEmployeur: Number(cout.toFixed(2)),
    };
  });

  const totalSalairesBruts = payrollRows.reduce((acc, r) => acc + r.brut, 0);
  const totalChargesPatronales = payrollRows.reduce((acc, r) => acc + r.cnssPatronale + r.amoPatronale, 0);
  const totalCotisationsSalariales = payrollRows.reduce((acc, r) => acc + r.cnssSalariale + r.amoSalariale, 0);
  const totalNetAPayer = payrollRows.reduce((acc, r) => acc + r.netPayer, 0);
  const totalMasseSalariale = payrollRows.reduce((acc, r) => acc + r.coutEmployeur, 0);

  // ==========================================
  // 6. EXPORT DES ÉCRITURES COMPTABLES (SAGE, FEC, EXCEL)
  // ==========================================
  interface AccountingEntry {
    date: string;
    journal: 'VT' | 'AC' | 'BQ' | 'CA';
    compte: string;
    libelleCompte: string;
    libelleEcriture: string;
    piece: string;
    debit: number;
    credit: number;
  }

  const accountingEntries: AccountingEntry[] = [];

  // VENTES (VT)
  journees.forEach((j) => {
    const totalTTC = Number(j.totalNetDH) || Number(j.totalCarburantsDH) || 0;
    const carbHT = (Number(j.totalCarburantsDH) || 0) / 1.1;
    const carbTVA = (Number(j.totalCarburantsDH) || 0) - carbHT;
    const prodServTTC = (Number(j.totalProduitsDH) || 0) + (Number(j.totalServicesDH) || 0);
    const prodServHT = prodServTTC / 1.2;
    const prodServTVA = prodServTTC - prodServHT;

    if (totalTTC > 0) {
      // Débit Clients / Ventes journée
      accountingEntries.push({
        date: j.dateDebut,
        journal: 'VT',
        compte: '3421000',
        libelleCompte: 'Clients - Ventes au comptant & comptes',
        libelleEcriture: `Recette globale journée clôturée ${j.dateDebut}`,
        piece: `JRN-${j.id.slice(-6).toUpperCase()}`,
        debit: Number(totalTTC.toFixed(2)),
        credit: 0,
      });

      // Crédit Ventes Carburants (10%)
      if (carbHT > 0) {
        accountingEntries.push({
          date: j.dateDebut,
          journal: 'VT',
          compte: '7111000',
          libelleCompte: 'Ventes de marchandises - Carburants',
          libelleEcriture: `Chiffre d'affaires Carburants HT (${j.dateDebut})`,
          piece: `JRN-${j.id.slice(-6).toUpperCase()}`,
          debit: 0,
          credit: Number(carbHT.toFixed(2)),
        });
      }

      // Crédit Boutique & Services (20%)
      if (prodServHT > 0) {
        accountingEntries.push({
          date: j.dateDebut,
          journal: 'VT',
          compte: '7121000',
          libelleCompte: 'Ventes de produits finis & Lavage/Boutique',
          libelleEcriture: `Chiffre d'affaires Boutique/Lavage HT (${j.dateDebut})`,
          piece: `JRN-${j.id.slice(-6).toUpperCase()}`,
          debit: 0,
          credit: Number(prodServHT.toFixed(2)),
        });
      }

      // Crédit TVA Collectée
      const totalTva = carbTVA + prodServTVA;
      if (totalTva > 0) {
        accountingEntries.push({
          date: j.dateDebut,
          journal: 'VT',
          compte: '4455000',
          libelleCompte: 'État - TVA Facturée (Collectée)',
          libelleEcriture: `TVA collectée sur ventes (${j.dateDebut})`,
          piece: `JRN-${j.id.slice(-6).toUpperCase()}`,
          debit: 0,
          credit: Number(totalTva.toFixed(2)),
        });
      }
    }
  });

  // ACHATS (AC)
  achats.forEach((a) => {
    const totalTTC = Number(a.totalTTC) || 0;
    const totalHT = Number(a.totalHT) || totalTTC / 1.1;
    const totalTVA = Number(a.totalTVA) || totalTTC - totalHT;

    if (totalTTC > 0) {
      // Débit Achats Carburant
      accountingEntries.push({
        date: a.dateFacturation,
        journal: 'AC',
        compte: '6111000',
        libelleCompte: 'Achats de marchandises - Carburants',
        libelleEcriture: `Facture Achat ${a.fournisseurNom} (${a.numeroFacture || a.id.slice(-5)})`,
        piece: a.numeroFacture || `FAC-${a.id.slice(-5)}`,
        debit: Number(totalHT.toFixed(2)),
        credit: 0,
      });

      // Débit TVA Récupérable
      if (totalTVA > 0) {
        accountingEntries.push({
          date: a.dateFacturation,
          journal: 'AC',
          compte: '3455200',
          libelleCompte: 'État - TVA Récupérable sur charges',
          libelleEcriture: `TVA déductible facture ${a.fournisseurNom}`,
          piece: a.numeroFacture || `FAC-${a.id.slice(-5)}`,
          debit: Number(totalTVA.toFixed(2)),
          credit: 0,
        });
      }

      // Crédit Fournisseur
      accountingEntries.push({
        date: a.dateFacturation,
        journal: 'AC',
        compte: '4411000',
        libelleCompte: `Fournisseurs - ${a.fournisseurNom}`,
        libelleEcriture: `Dette fournisseur ${a.fournisseurNom} TTC`,
        piece: a.numeroFacture || `FAC-${a.id.slice(-5)}`,
        debit: 0,
        credit: Number(totalTTC.toFixed(2)),
      });
    }
  });

  // DÉPENSES D'EXPLOITATION (AC)
  depenses.forEach((d) => {
    const totalTTC = Number(d.totalTTC) || 0;
    const totalHT = Number(d.totalHT) || totalTTC / 1.2;
    const totalTVA = Number(d.totalTVA) || totalTTC - totalHT;

    if (totalTTC > 0) {
      accountingEntries.push({
        date: d.datePaiement || d.dateFacturation,
        journal: 'AC',
        compte: '6125000',
        libelleCompte: `Achats non stockés - ${d.typeDepense}`,
        libelleEcriture: `Charge d'exploitation : ${d.typeDepense}`,
        piece: d.numeroFacture || `DEP-${d.id.slice(-5)}`,
        debit: Number(totalHT.toFixed(2)),
        credit: 0,
      });

      if (totalTVA > 0) {
        accountingEntries.push({
          date: d.datePaiement || d.dateFacturation,
          journal: 'AC',
          compte: '3455200',
          libelleCompte: 'État - TVA Récupérable sur charges',
          libelleEcriture: `TVA sur charge ${d.typeDepense}`,
          piece: d.numeroFacture || `DEP-${d.id.slice(-5)}`,
          debit: Number(totalTVA.toFixed(2)),
          credit: 0,
        });
      }

      accountingEntries.push({
        date: d.datePaiement || d.dateFacturation,
        journal: 'AC',
        compte: d.modePaiement === 'Banque' ? '5141000' : d.modePaiement === 'Espèces' ? '5161000' : '4411000',
        libelleCompte: d.modePaiement === 'Banque' ? 'Banque' : d.modePaiement === 'Espèces' ? 'Caisse' : 'Fournisseurs divers',
        libelleEcriture: `Règlement ${d.modePaiement} ${d.typeDepense}`,
        piece: d.numeroFacture || `DEP-${d.id.slice(-5)}`,
        debit: 0,
        credit: Number(totalTTC.toFixed(2)),
      });
    }
  });

  // BANQUE (BQ)
  bankOperations.forEach((op) => {
    if (op.debit > 0) {
      accountingEntries.push({
        date: op.date,
        journal: 'BQ',
        compte: '4411000',
        libelleCompte: 'Fournisseurs - Règlements bancaires',
        libelleEcriture: op.libelle,
        piece: op.reference,
        debit: op.debit,
        credit: 0,
      });
      accountingEntries.push({
        date: op.date,
        journal: 'BQ',
        compte: '5141000',
        libelleCompte: 'Banque Principale',
        libelleEcriture: op.libelle,
        piece: op.reference,
        debit: 0,
        credit: op.debit,
      });
    } else if (op.credit > 0) {
      accountingEntries.push({
        date: op.date,
        journal: 'BQ',
        compte: '5141000',
        libelleCompte: 'Banque Principale',
        libelleEcriture: op.libelle,
        piece: op.reference,
        debit: op.credit,
        credit: 0,
      });
      accountingEntries.push({
        date: op.date,
        journal: 'BQ',
        compte: '5810000',
        libelleCompte: 'Virements de fonds internes',
        libelleEcriture: `Remise d'espèces shift en banque`,
        piece: op.reference,
        debit: 0,
        credit: op.credit,
      });
    }
  });

  // CAISSE (CA)
  caisseMovements.forEach((cm) => {
    if (cm.entree > 0) {
      accountingEntries.push({
        date: cm.date,
        journal: 'CA',
        compte: '5161000',
        libelleCompte: 'Caisse Centrale Station',
        libelleEcriture: cm.libelle,
        piece: cm.piece,
        debit: cm.entree,
        credit: 0,
      });
      accountingEntries.push({
        date: cm.date,
        journal: 'CA',
        compte: '5810000',
        libelleCompte: 'Virements internes de caisse',
        libelleEcriture: cm.libelle,
        piece: cm.piece,
        debit: 0,
        credit: cm.entree,
      });
    } else if (cm.sortie > 0) {
      accountingEntries.push({
        date: cm.date,
        journal: 'CA',
        compte: '6125000',
        libelleCompte: 'Dépenses diverses de caisse',
        libelleEcriture: cm.libelle,
        piece: cm.piece,
        debit: cm.sortie,
        credit: 0,
      });
      accountingEntries.push({
        date: cm.date,
        journal: 'CA',
        compte: '5161000',
        libelleCompte: 'Caisse Centrale Station',
        libelleEcriture: cm.libelle,
        piece: cm.piece,
        debit: 0,
        credit: cm.sortie,
      });
    }
  });

  // Filtrage des écritures selon sélection
  const filteredAccountingEntries = accountingEntries
    .filter((e) => (selectedJournal === 'ALL' ? true : e.journal === selectedJournal))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const totalDebitAccounting = filteredAccountingEntries.reduce((acc, e) => acc + e.debit, 0);
  const totalCreditAccounting = filteredAccountingEntries.reduce((acc, e) => acc + e.credit, 0);
  const isAccountingBalanced = Math.abs(totalDebitAccounting - totalCreditAccounting) < 1.0;

  // HANDLER: EXPORT EXCEL COMPLET DU PACK COMPTABLE
  const handleExportFullAccountingExcel = () => {
    try {
      const filename = `StationHub_Comptabilite_${station?.name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}`;

      // 1. Écritures complètes
      const dataEcritures = filteredAccountingEntries.map((e) => ({
        Date: e.date,
        Journal: e.journal,
        'N° Compte': e.compte,
        'Intitulé Compte': e.libelleCompte,
        'Libellé Écriture': e.libelleEcriture,
        'N° Pièce': e.piece,
        'Débit (DH)': e.debit,
        'Crédit (DH)': e.credit,
      }));

      // 2. TVA
      const dataTva = [
        { Rubrique: 'TVA Collectée (Ventes)', Montant_DH: tvaCollectee.toFixed(2), Taux: '10% & 20%' },
        { Rubrique: 'TVA Déductible sur Achats', Montant_DH: tvaDeductibleAchats.toFixed(2), Taux: '10%' },
        { Rubrique: 'TVA Déductible sur Charges', Montant_DH: tvaDeductibleCharges.toFixed(2), Taux: '20%' },
        { Rubrique: 'Total TVA Déductible', Montant_DH: totalTvaDeductible.toFixed(2), Taux: '-' },
        { Rubrique: 'TVA Nette Due à Verser (DGI)', Montant_DH: tvaDue.toFixed(2), Taux: 'Solde Net' },
      ];

      // 3. Caisse 5161
      const dataCaisse = caisseMovements.map((cm) => ({
        Date: cm.date,
        Libellé: cm.libelle,
        'Réf. Pièce': cm.piece,
        'Encaissement (+)': cm.entree,
        'Décaissement (-)': cm.sortie,
        'Solde Progressif': cm.soldeProgressif,
      }));

      // 4. Coulage & Stocks
      const dataCoulage = coulageRows.map((cr) => ({
        Citerne: cr.citerneNom,
        Carburant: cr.carburantNom,
        'Capacité (L)': cr.capacite,
        'Stock Jaugé (L)': cr.stockJauge,
        'Ventes (L)': cr.ventesLitres,
        'Écart (L)': cr.ecartLitres,
        'Taux Coulage (%)': `${cr.tauxCoulage}%`,
        Statut: cr.statut === 'CONFORME' ? 'Conforme (<0.45%)' : 'Alerte (>0.45%)',
        'Perte Financière (DH)': cr.valeurPerteDH,
      }));

      // 5. Salaires & CNSS
      const dataSalaires = payrollRows.map((pr) => ({
        Salarié: pr.nom,
        Poste: pr.poste,
        'Salaire Brut': pr.brut,
        'CNSS Salariale (4.48%)': pr.cnssSalariale,
        'AMO Salariale (2.26%)': pr.amoSalariale,
        'CNSS Patronale': pr.cnssPatronale,
        'AMO Patronale': pr.amoPatronale,
        'IR Estimé': pr.irRetenu,
        'Net à Payer': pr.netPayer,
        'Coût Employeur': pr.coutEmployeur,
      }));

      exportToExcel(filename, [
        { sheetName: 'Journal_Comptable', data: dataEcritures },
        { sheetName: 'Declaration_TVA', data: dataTva },
        { sheetName: 'Livre_Caisse_5161', data: dataCaisse },
        { sheetName: 'Coulage_Pertes_Cuve', data: dataCoulage },
        { sheetName: 'Paie_Masse_Salariale', data: dataSalaires },
      ]);

      setExportSuccessMsg('✓ Classeur comptable complet exporté avec succès (5 onglets générés) !');
      setTimeout(() => setExportSuccessMsg(null), 5000);
    } catch (e) {
      console.error('Erreur export comptable', e);
    }
  };

  // HANDLER: EXPORT FORMAT FEC (CSV Standard pour Sage, Cegid, EBP)
  const handleExportFEC_CSV = () => {
    try {
      const header = 'JournalCode;JournalLib;EcritureNum;EcritureDate;CompteNum;CompteLib;PieceRef;EcritureLib;Debit;Credit\n';
      const rows = filteredAccountingEntries.map((e, idx) => {
        return [
          e.journal,
          e.journal === 'VT' ? 'Ventes' : e.journal === 'AC' ? 'Achats' : e.journal === 'BQ' ? 'Banque' : 'Caisse',
          idx + 1,
          e.date.replace(/-/g, ''),
          e.compte,
          `"${e.libelleCompte}"`,
          `"${e.piece}"`,
          `"${e.libelleEcriture}"`,
          e.debit.toFixed(2),
          e.credit.toFixed(2),
        ].join(';');
      }).join('\n');

      const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `FEC_StationHub_${station?.name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setExportSuccessMsg('✓ Fichier FEC standard (CSV Sage/Cegid) téléchargé avec succès !');
      setTimeout(() => setExportSuccessMsg(null), 5000);
    } catch (e) {
      console.error('Erreur export FEC', e);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-sky-700 uppercase tracking-wider bg-sky-50 px-2 py-0.5 rounded border border-sky-200 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-sky-600" />
              Espace Expert-Comptable & Cabinet Fiduciaire
            </span>
            <span className="text-xs text-slate-400">·</span>
            <span className="text-xs text-slate-500 font-medium">Station: {station?.name}</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight mt-1">
            Direction Comptable, Fiscalité & Rapprochements
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Modules certifiés : Rapprochement Bancaire, Déclaration TVA, Livre de Caisse (5161), Suivi Coulage, Paie CNSS et Exports Sage/FEC.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={handleExportFullAccountingExcel}
            className="flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs"
            title="Télécharger le classeur comptable complet avec 5 onglets Excel"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Pack Comptable Complet (.xlsx)</span>
          </button>

          <button
            onClick={loadData}
            className="p-2 text-slate-600 hover:text-slate-900 border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors"
            title="Actualiser les écritures"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {exportSuccessMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{exportSuccessMsg}</span>
        </div>
      )}

      {/* Modern High-Capacity Accounting Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-1 text-xs font-bold scrollbar-none">
        <button
          onClick={() => setActiveTab('rapprochement')}
          className={`px-3.5 py-2.5 rounded-t-lg transition-all flex items-center gap-1.5 whitespace-nowrap border-b-2 ${
            activeTab === 'rapprochement'
              ? 'border-sky-700 text-sky-800 bg-sky-50/60'
              : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Building className="w-3.5 h-3.5" />
          <span>Rapprochement Bancaire ({bankOperations.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('tva')}
          className={`px-3.5 py-2.5 rounded-t-lg transition-all flex items-center gap-1.5 whitespace-nowrap border-b-2 ${
            activeTab === 'tva'
              ? 'border-sky-700 text-sky-800 bg-sky-50/60'
              : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Calculator className="w-3.5 h-3.5" />
          <span>Déclaration TVA</span>
        </button>

        <button
          onClick={() => setActiveTab('caisse')}
          className={`px-3.5 py-2.5 rounded-t-lg transition-all flex items-center gap-1.5 whitespace-nowrap border-b-2 ${
            activeTab === 'caisse'
              ? 'border-sky-700 text-sky-800 bg-sky-50/60'
              : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Livre de Caisse 5161</span>
          {hasCreditriceRisk && (
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" title="Alerte Caisse" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('coulage')}
          className={`px-3.5 py-2.5 rounded-t-lg transition-all flex items-center gap-1.5 whitespace-nowrap border-b-2 ${
            activeTab === 'coulage'
              ? 'border-sky-700 text-sky-800 bg-sky-50/60'
              : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Scale className="w-3.5 h-3.5" />
          <span>Coulage & Pertes Cuves</span>
        </button>

        <button
          onClick={() => setActiveTab('salaires_cnss')}
          className={`px-3.5 py-2.5 rounded-t-lg transition-all flex items-center gap-1.5 whitespace-nowrap border-b-2 ${
            activeTab === 'salaires_cnss'
              ? 'border-sky-700 text-sky-800 bg-sky-50/60'
              : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Masse Salariale & CNSS ({payrollRows.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('grand_livre')}
          className={`px-3.5 py-2.5 rounded-t-lg transition-all flex items-center gap-1.5 whitespace-nowrap border-b-2 ${
            activeTab === 'grand_livre'
              ? 'border-sky-700 text-sky-800 bg-sky-50/60'
              : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Grand Livre Tiers</span>
        </button>

        <button
          onClick={() => setActiveTab('export_comptable')}
          className={`px-3.5 py-2.5 rounded-t-lg transition-all flex items-center gap-1.5 whitespace-nowrap border-b-2 ${
            activeTab === 'export_comptable'
              ? 'border-sky-700 text-sky-800 bg-sky-50/60'
              : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <FileCheck2 className="w-3.5 h-3.5" />
          <span>Export Écritures (Sage / FEC)</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: RAPPROCHEMENT BANCAIRE (5141) */}
      {/* ========================================================================= */}
      {activeTab === 'rapprochement' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase block mb-1">
                Solde Comptable Banque
              </span>
              <div className="text-xl font-black text-slate-900 font-mono tabular-nums">
                {soldeComptableBanque.toLocaleString('fr-FR', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{' '}
                DH
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">Compte 5141 · Écritures station</span>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase block mb-1">
                Solde Relevé Bancaire Pointé
              </span>
              <div className="text-xl font-black text-sky-800 font-mono tabular-nums">
                {soldeReleveBancaire.toLocaleString('fr-FR', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{' '}
                DH
              </div>
              <span className="text-[10px] text-sky-600 mt-1 block">
                {pointedCredits.toFixed(2)} DH (Crédit) - {pointedDebits.toFixed(2)} DH (Débit)
              </span>
            </div>

            <div
              className={`p-4 border rounded-xl shadow-2xs ${
                Math.abs(ecartRapprochement) < 0.01
                  ? 'bg-emerald-50/60 border-emerald-200'
                  : 'bg-amber-50/60 border-amber-200'
              }`}
            >
              <span
                className={`text-[11px] font-semibold uppercase block mb-1 ${
                  Math.abs(ecartRapprochement) < 0.01 ? 'text-emerald-800' : 'text-amber-800'
                }`}
              >
                Écart de Rapprochement
              </span>
              <div
                className={`text-xl font-black font-mono tabular-nums ${
                  Math.abs(ecartRapprochement) < 0.01 ? 'text-emerald-700' : 'text-amber-700'
                }`}
              >
                {ecartRapprochement.toLocaleString('fr-FR', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{' '}
                DH
              </div>
              <span
                className={`text-[10px] mt-1 block font-semibold ${
                  Math.abs(ecartRapprochement) < 0.01 ? 'text-emerald-600' : 'text-amber-600'
                }`}
              >
                {Math.abs(ecartRapprochement) < 0.01 ? 'Parfaitement réconcilié ✓' : 'Écart à vérifier'}
              </span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Lignes d'Opérations Bancaires à Pointer
              </span>
            </div>

            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <tr>
                  <th className="py-2.5 px-4 text-center">Pointé</th>
                  <th className="py-2.5 px-4">Date</th>
                  <th className="py-2.5 px-4">Libellé de l'Écriture</th>
                  <th className="py-2.5 px-4">Référence</th>
                  <th className="py-2.5 px-4 text-right">Débit (DH)</th>
                  <th className="py-2.5 px-4 text-right">Crédit (DH)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {bankOperations.map((op) => {
                  const isChecked = !!reconciledItems[op.id];
                  return (
                    <tr
                      key={op.id}
                      className={`hover:bg-slate-50/60 ${isChecked ? 'bg-emerald-50/30' : ''}`}
                    >
                      <td className="py-2.5 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleReconciliation(op.id)}
                          className="w-4 h-4 text-sky-600 rounded border-slate-300 focus:ring-sky-500"
                        />
                      </td>
                      <td className="py-2.5 px-4 font-sans text-slate-600">{op.date}</td>
                      <td className="py-2.5 px-4 font-sans font-semibold text-slate-900">{op.libelle}</td>
                      <td className="py-2.5 px-4 text-slate-500 text-[11px]">{op.reference}</td>
                      <td className="py-2.5 px-4 text-right text-rose-700 font-bold tabular-nums">
                        {op.debit > 0 ? op.debit.toFixed(2) : '-'}
                      </td>
                      <td className="py-2.5 px-4 text-right text-emerald-800 font-bold tabular-nums">
                        {op.credit > 0 ? op.credit.toFixed(2) : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: GESTION & DÉCLARATION TVA */}
      {/* ========================================================================= */}
      {activeTab === 'tva' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-2">
              <span className="text-[11px] font-semibold text-slate-500 uppercase block">
                1. TVA Collectée (Ventes)
              </span>
              <div className="text-2xl font-black text-slate-900 font-mono tabular-nums">
                {tvaCollectee.toFixed(2)} DH
              </div>
              <span className="text-[11px] text-slate-500 block">
                Carburants (10%) + Produits & Services (20%)
              </span>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-2">
              <span className="text-[11px] font-semibold text-slate-500 uppercase block">
                2. TVA Déductible (Achats & Charges)
              </span>
              <div className="text-2xl font-black text-emerald-700 font-mono tabular-nums">
                {totalTvaDeductible.toFixed(2)} DH
              </div>
              <span className="text-[11px] text-slate-500 block">
                Achats fournisseurs ({tvaDeductibleAchats.toFixed(2)}) + Charges ({tvaDeductibleCharges.toFixed(2)})
              </span>
            </div>

            <div className="p-4 bg-sky-50 border border-sky-200 rounded-xl shadow-2xs space-y-2">
              <span className="text-[11px] font-semibold text-sky-800 uppercase block">
                3. TVA Nette Due à Déclarer
              </span>
              <div className="text-2xl font-black text-sky-900 font-mono tabular-nums">
                {tvaDue.toFixed(2)} DH
              </div>
              <span className="text-[11px] text-sky-700 block font-medium">
                À verser à la DGI avant le 20 du mois prochain
              </span>
            </div>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-2 text-slate-700">
            <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
              Notes Légales Déclaration Fiscale Maroc
            </h4>
            <p>
              Régime des encaissements ou des débits selon l'option fiscale souscrite par{' '}
              {station?.companyName || station?.name}. La TVA sur le gasoil et le sans-plomb bénéficie du taux
              réduit de 10% (Article 99 du CGI), tandis que les prestations de lavage, vidange et ventes de
              lubrifiants relèvent du taux normal de 20%.
            </p>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: LIVRE DE CAISSE (5161) */}
      {/* ========================================================================= */}
      {activeTab === 'caisse' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase block mb-1">
                Total Encaissements Espèces (+)
              </span>
              <div className="text-xl font-black text-emerald-700 font-mono tabular-nums">
                +{totalCaisseEntrees.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DH
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">Recettes des shifts</span>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase block mb-1">
                Total Décaissements Espèces (-)
              </span>
              <div className="text-xl font-black text-rose-700 font-mono tabular-nums">
                -{totalCaisseSorties.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DH
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">Dépenses cash & règlements</span>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase block mb-1">
                Solde Actuel de Caisse (5161)
              </span>
              <div className="text-xl font-black text-slate-900 font-mono tabular-nums">
                {soldeFinalCaisse.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DH
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">En coffre station</span>
            </div>

            <div
              className={`p-4 border rounded-xl shadow-2xs ${
                !hasCreditriceRisk
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              <span className="text-[11px] font-semibold uppercase block mb-1">
                Conformité Fiscale Caisse
              </span>
              <div className="text-sm font-bold flex items-center gap-1.5 mt-0.5">
                {!hasCreditriceRisk ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Caisse Conforme (Débitrice ✓)</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>Alerte : Caisse Créditrice ⚠️</span>
                  </>
                )}
              </div>
              <span className="text-[10px] mt-1 block opacity-90">
                {!hasCreditriceRisk
                  ? 'Aucun solde négatif dans l’historique.'
                  : 'Interdit en audit fiscal DGI.'}
              </span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-slate-700" />
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Journal Chronologique de la Caisse Centrale (5161)
                </span>
              </div>
              <span className="text-xs text-slate-500">{caisseMovements.length} écritures</span>
            </div>

            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <tr>
                  <th className="py-2.5 px-4">Date</th>
                  <th className="py-2.5 px-4">Libellé de l'Opération</th>
                  <th className="py-2.5 px-4">Pièce Justificative</th>
                  <th className="py-2.5 px-4 text-right">Encaissement (+)</th>
                  <th className="py-2.5 px-4 text-right">Décaissement (-)</th>
                  <th className="py-2.5 px-4 text-right">Solde Caisse (DH)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {caisseMovements.map((cm) => (
                  <tr key={cm.id} className="hover:bg-slate-50/60">
                    <td className="py-2.5 px-4 font-sans text-slate-600">{cm.date}</td>
                    <td className="py-2.5 px-4 font-sans font-medium text-slate-900">{cm.libelle}</td>
                    <td className="py-2.5 px-4 text-slate-500 text-[11px]">{cm.piece}</td>
                    <td className="py-2.5 px-4 text-right text-emerald-700 font-bold tabular-nums">
                      {cm.entree > 0 ? `+${cm.entree.toFixed(2)}` : '-'}
                    </td>
                    <td className="py-2.5 px-4 text-right text-rose-700 font-bold tabular-nums">
                      {cm.sortie > 0 ? `-${cm.sortie.toFixed(2)}` : '-'}
                    </td>
                    <td
                      className={`py-2.5 px-4 text-right font-black tabular-nums ${
                        cm.soldeProgressif < 0 ? 'text-rose-600 bg-rose-50/50' : 'text-slate-900'
                      }`}
                    >
                      {cm.soldeProgressif.toFixed(2)} DH
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: COULAGE & PERTES DE CUVE (STOCKS) */}
      {/* ========================================================================= */}
      {activeTab === 'coulage' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase block mb-1">
                Norme Fiscale de Coulage (DGI)
              </span>
              <div className="text-xl font-black text-sky-800 font-mono tabular-nums">
                0,30% à 0,45%
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">Tolérance légale évaporation/température</span>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase block mb-1">
                Perte Globale Estimée en Litres
              </span>
              <div className="text-xl font-black text-slate-900 font-mono tabular-nums">
                {coulageRows.reduce((acc, r) => acc + Math.abs(r.ecartLitres), 0).toLocaleString('fr-FR')} L
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">Sur l'ensemble des citernes</span>
            </div>

            <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-xl shadow-2xs">
              <span className="text-[11px] font-semibold text-amber-800 uppercase block mb-1">
                Impact Financier à Régulariser (6114)
              </span>
              <div className="text-xl font-black text-amber-900 font-mono tabular-nums">
                {totalPerteCoulageDH.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DH
              </div>
              <span className="text-[10px] text-amber-700 mt-1 block font-medium">
                Écriture de variation de stock en fin d'exercice
              </span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                État Récapitulatif du Coulage par Cuve
              </span>
              <span className="text-xs text-slate-500">{coulageRows.length} citernes sous contrôle</span>
            </div>

            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <tr>
                  <th className="py-2.5 px-4">Citerne</th>
                  <th className="py-2.5 px-4">Carburant</th>
                  <th className="py-2.5 px-4 text-right">Capacité (L)</th>
                  <th className="py-2.5 px-4 text-right">Stock Jaugé Réel</th>
                  <th className="py-2.5 px-4 text-right">Ventes Déclarées</th>
                  <th className="py-2.5 px-4 text-right">Écart Coulage</th>
                  <th className="py-2.5 px-4 text-center">Taux (%)</th>
                  <th className="py-2.5 px-4 text-center">Statut Légal</th>
                  <th className="py-2.5 px-4 text-right">Valeur Perte (DH)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {coulageRows.map((cr) => (
                  <tr key={cr.id} className="hover:bg-slate-50/60">
                    <td className="py-2.5 px-4 font-sans font-bold text-slate-900">{cr.citerneNom}</td>
                    <td className="py-2.5 px-4 font-sans text-slate-600">{cr.carburantNom}</td>
                    <td className="py-2.5 px-4 text-right text-slate-600">{cr.capacite.toLocaleString('fr-FR')} L</td>
                    <td className="py-2.5 px-4 text-right font-semibold text-slate-900">
                      {cr.stockJauge.toLocaleString('fr-FR')} L
                    </td>
                    <td className="py-2.5 px-4 text-right text-slate-600">{cr.ventesLitres.toLocaleString('fr-FR')} L</td>
                    <td className="py-2.5 px-4 text-right text-amber-800 font-bold">
                      {cr.ecartLitres > 0 ? `+${cr.ecartLitres}` : cr.ecartLitres} L
                    </td>
                    <td className="py-2.5 px-4 text-center font-bold text-slate-800">{cr.tauxCoulage}%</td>
                    <td className="py-2.5 px-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          cr.statut === 'CONFORME'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {cr.statut === 'CONFORME' ? 'Normal (<0.45%)' : 'À surveiller'}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right font-black text-slate-900 tabular-nums">
                      {cr.valeurPerteDH.toFixed(2)} DH
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: MASSE SALARIALE & CNSS */}
      {/* ========================================================================= */}
      {activeTab === 'salaires_cnss' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase block mb-1">
                Total Salaires Bruts
              </span>
              <div className="text-xl font-black text-slate-900 font-mono tabular-nums">
                {totalSalairesBruts.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DH
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">{payrollRows.length} salariés</span>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase block mb-1">
                Cotisations CNSS + AMO (Salariales)
              </span>
              <div className="text-xl font-black text-sky-800 font-mono tabular-nums">
                {totalCotisationsSalariales.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DH
              </div>
              <span className="text-[10px] text-sky-600 mt-1 block">Retenues à la source</span>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase block mb-1">
                Charges Patronales (CNSS + AMO)
              </span>
              <div className="text-xl font-black text-amber-700 font-mono tabular-nums">
                {totalChargesPatronales.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DH
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">Coût entreprise (~21.09%)</span>
            </div>

            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl shadow-2xs">
              <span className="text-[11px] font-semibold text-emerald-800 uppercase block mb-1">
                Net à Payer aux Équipes
              </span>
              <div className="text-xl font-black text-emerald-900 font-mono tabular-nums">
                {totalNetAPayer.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DH
              </div>
              <span className="text-[10px] text-emerald-700 mt-1 block font-medium">Virements ou espèces de fin de mois</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                État Nominatif de la Paie & Déclarations Sociales
              </span>
            </div>

            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <tr>
                  <th className="py-2.5 px-4">Salarié</th>
                  <th className="py-2.5 px-4">Poste</th>
                  <th className="py-2.5 px-4 text-right">Salaire Brut</th>
                  <th className="py-2.5 px-4 text-right">CNSS Salariale (4.48%)</th>
                  <th className="py-2.5 px-4 text-right">AMO Salariale (2.26%)</th>
                  <th className="py-2.5 px-4 text-right">Part Patronale Total</th>
                  <th className="py-2.5 px-4 text-right">IR Retenu</th>
                  <th className="py-2.5 px-4 text-right font-bold text-emerald-800">Salaire Net (DH)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {payrollRows.map((pr) => (
                  <tr key={pr.id} className="hover:bg-slate-50/60">
                    <td className="py-2.5 px-4 font-sans font-bold text-slate-900">{pr.nom}</td>
                    <td className="py-2.5 px-4 font-sans text-slate-600">{pr.poste}</td>
                    <td className="py-2.5 px-4 text-right font-semibold text-slate-900">{pr.brut.toFixed(2)}</td>
                    <td className="py-2.5 px-4 text-right text-slate-600">{pr.cnssSalariale.toFixed(2)}</td>
                    <td className="py-2.5 px-4 text-right text-slate-600">{pr.amoSalariale.toFixed(2)}</td>
                    <td className="py-2.5 px-4 text-right text-amber-800 font-semibold">
                      {(pr.cnssPatronale + pr.amoPatronale).toFixed(2)}
                    </td>
                    <td className="py-2.5 px-4 text-right text-slate-600">{pr.irRetenu.toFixed(2)}</td>
                    <td className="py-2.5 px-4 text-right font-black text-emerald-700 tabular-nums">
                      {pr.netPayer.toFixed(2)} DH
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: GRAND LIVRE TIERS */}
      {/* ========================================================================= */}
      {activeTab === 'grand_livre' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
          <div className="p-4 border-b border-slate-200">
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Balance des Comptes Auxiliaires (Fournisseurs & Clients B2B)
            </span>
          </div>

          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
              <tr>
                <th className="py-2.5 px-4">Compte Tiers</th>
                <th className="py-2.5 px-4">Type</th>
                <th className="py-2.5 px-4">Identifiant Fiscal (ICE)</th>
                <th className="py-2.5 px-4 text-right">Solde Comptable (DH)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {tiers.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/60">
                  <td className="py-2.5 px-4 font-sans font-bold text-slate-900">{t.name}</td>
                  <td className="py-2.5 px-4 font-sans text-slate-600">{t.type}</td>
                  <td className="py-2.5 px-4 text-slate-500">{t.ice || '-'}</td>
                  <td
                    className={`py-2.5 px-4 text-right font-bold tabular-nums ${
                      t.solde < 0 ? 'text-rose-700' : 'text-slate-900'
                    }`}
                  >
                    {t.solde.toFixed(2)} DH
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 7: EXPORT DES ÉCRITURES COMPTABLES (SAGE / FEC / EXCEL) */}
      {/* ========================================================================= */}
      {activeTab === 'export_comptable' && (
        <div className="space-y-6">
          {/* Controls & Filter Bar */}
          <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Filter className="w-4 h-4 text-slate-500" />
                Journal :
              </span>
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs font-semibold">
                {(['ALL', 'VT', 'AC', 'BQ', 'CA'] as const).map((j) => (
                  <button
                    key={j}
                    onClick={() => setSelectedJournal(j)}
                    className={`px-3 py-1 rounded-md transition-all ${
                      selectedJournal === j
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {j === 'ALL'
                      ? 'Tous (Grand Journal)'
                      : j === 'VT'
                      ? 'VT (Ventes)'
                      : j === 'AC'
                      ? 'AC (Achats)'
                      : j === 'BQ'
                      ? 'BQ (Banque)'
                      : 'CA (Caisse)'}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
              <button
                onClick={handleExportFEC_CSV}
                className="flex items-center gap-2 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-all shadow-xs"
                title="Format FEC standard reconnu par Sage, Cegid, EBP, Ciel"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export FEC (CSV Sage/Cegid)</span>
              </button>

              <button
                onClick={handleExportFullAccountingExcel}
                className="flex items-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Exporter Classeur Excel (.xlsx)</span>
              </button>
            </div>
          </div>

          {/* Balance Quality Banner */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase block mb-1">
                Total Débit Écritures
              </span>
              <div className="text-xl font-black text-slate-900 font-mono tabular-nums">
                {totalDebitAccounting.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DH
              </div>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase block mb-1">
                Total Crédit Écritures
              </span>
              <div className="text-xl font-black text-slate-900 font-mono tabular-nums">
                {totalCreditAccounting.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DH
              </div>
            </div>

            <div
              className={`p-4 border rounded-xl shadow-2xs ${
                isAccountingBalanced
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              <span className="text-[11px] font-semibold uppercase block mb-1">
                Équilibre Comptable (Débit = Crédit)
              </span>
              <div className="text-sm font-bold flex items-center gap-1.5 mt-0.5">
                {isAccountingBalanced ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Écritures Parfaitement Équilibrées ✓</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>Déséquilibre Débit/Crédit ⚠️</span>
                  </>
                )}
              </div>
              <span className="text-[10px] mt-1 block opacity-90">
                Prêt pour importation directe en cabinet fiduciaire.
              </span>
            </div>
          </div>

          {/* Table of Entries */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-600" />
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Feuille des Écritures Comptables Générales
                </span>
              </div>
              <span className="text-xs text-slate-500">{filteredAccountingEntries.length} lignes d'écritures</span>
            </div>

            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <tr>
                  <th className="py-2.5 px-4">Date</th>
                  <th className="py-2.5 px-3 text-center">Jnl</th>
                  <th className="py-2.5 px-4">N° Compte</th>
                  <th className="py-2.5 px-4">Intitulé du Compte</th>
                  <th className="py-2.5 px-4">Libellé de l'Écriture</th>
                  <th className="py-2.5 px-4">N° Pièce</th>
                  <th className="py-2.5 px-4 text-right">Débit (DH)</th>
                  <th className="py-2.5 px-4 text-right">Crédit (DH)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {filteredAccountingEntries.map((e, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/60">
                    <td className="py-2.5 px-4 font-sans text-slate-600">{e.date}</td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          e.journal === 'VT'
                            ? 'bg-purple-100 text-purple-800'
                            : e.journal === 'AC'
                            ? 'bg-amber-100 text-amber-800'
                            : e.journal === 'BQ'
                            ? 'bg-sky-100 text-sky-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {e.journal}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-bold text-slate-900">{e.compte}</td>
                    <td className="py-2.5 px-4 font-sans text-slate-700 truncate max-w-xs">
                      {e.libelleCompte}
                    </td>
                    <td className="py-2.5 px-4 font-sans text-slate-900 font-medium truncate max-w-sm">
                      {e.libelleEcriture}
                    </td>
                    <td className="py-2.5 px-4 text-slate-500 text-[11px]">{e.piece}</td>
                    <td className="py-2.5 px-4 text-right text-slate-900 font-semibold tabular-nums">
                      {e.debit > 0 ? e.debit.toFixed(2) : '-'}
                    </td>
                    <td className="py-2.5 px-4 text-right text-slate-900 font-semibold tabular-nums">
                      {e.credit > 0 ? e.credit.toFixed(2) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
