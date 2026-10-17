import React, { useEffect, useState } from 'react';
import {
  CalendarCheck,
  History,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  Check,
  Plus,
  Trash2,
  DollarSign,
  Fuel,
  Package,
  Sparkles,
  CreditCard,
  Receipt,
  FileText,
  Printer,
  X,
  AlertCircle,
  Users,
  Calendar,
  Wallet,
} from 'lucide-react';
import { api } from '../../services/api.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { StationLogo } from '../common/StationLogo.tsx';
import { printDocumentWithCustomName } from '../../utils/printDocument.ts';
import {
  Carburant,
  Citerne,
  DepenseCaisseEntry,
  Journee,
  NonEspeceEntry,
  Pistolet,
  PistoletDailyEntry,
  Produit,
  ProduitDailyEntry,
  RechargeEntry,
  ReglementDetteEntry,
  Salarie,
  ServiceDailyEntry,
  ServiceStation,
  Tier,
} from '../../types/index.ts';

export const JourneesView: React.FC = () => {
  const { station, user } = useAuth();
  const [activeTab, setActiveTab] = useState<'saisie' | 'historique'>('saisie');
  const [step, setStep] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Operational station data
  const [salaries, setSalaries] = useState<Salarie[]>([]);
  const [carburants, setCarburants] = useState<Carburant[]>([]);
  const [pistolets, setPistolets] = useState<Pistolet[]>([]);
  const [produits, setProduits] = useState<Produit[]>([]);
  const [services, setServices] = useState<ServiceStation[]>([]);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [historyJournees, setHistoryJournees] = useState<Journee[]>([]);
  const [selectedViewJournee, setSelectedViewJournee] = useState<Journee | null>(null);
  const [historyFilterMode, setHistoryFilterMode] = useState<'detail' | 'pompiste' | 'jour'>('detail');
  const [reportTitleOverride, setReportTitleOverride] = useState<string | null>(null);
  const [reportDateOverride, setReportDateOverride] = useState<string | null>(null);

  // WIZARD STATE
  // Step 1: General Info
  const [responsableId, setResponsableId] = useState('');
  const [responsableNom, setResponsableNom] = useState('GERANT');
  const [dateDebut, setDateDebut] = useState(new Date().toISOString().split('T')[0]);
  const [heureDebut, setHeureDebut] = useState('00:00');
  const [dateFin, setDateFin] = useState(new Date().toISOString().split('T')[0]);
  const [heureFin, setHeureFin] = useState('23:59');
  const [remarques, setRemarques] = useState('');
  const [avancePompiste, setAvancePompiste] = useState('0.00');

  // Step 2: Pistolets entries
  const [pistoletEntries, setPistoletEntries] = useState<PistoletDailyEntry[]>([]);

  // Step 3: Produits entries
  const [produitEntries, setProduitEntries] = useState<ProduitDailyEntry[]>([]);

  // Step 4: Services entries
  const [serviceEntries, setServiceEntries] = useState<ServiceDailyEntry[]>([]);

  // Step 5: Encaissements Non-Espèces
  const [encaissementsNonEspeces, setEncaissementsNonEspeces] = useState<NonEspeceEntry[]>([]);

  // Step 6: Dépenses caisse
  const [depensesCaisse, setDepensesCaisse] = useState<DepenseCaisseEntry[]>([]);

  // Step 7: Règlements dettes
  const [reglementsDettes, setReglementsDettes] = useState<ReglementDetteEntry[]>([]);

  // Step 8: Recharges
  const [recharges, setRecharges] = useState<RechargeEntry[]>([]);

  const loadOperationalData = async () => {
    if (!station) return;
    try {
      setLoading(true);
      const [salList, carbList, pistList, prodList, servList, tList, jList] =
        await Promise.all([
          api.getSalaries(station.id),
          api.getCarburants(station.id),
          api.getPistolets(station.id),
          api.getProduits(station.id),
          api.getServices(station.id),
          api.getTiers(station.id),
          api.getJournees(station.id),
        ]);

      setSalaries(salList);
      setCarburants(carbList);
      setPistolets(pistList);
      setProduits(prodList);
      setServices(servList);
      setTiers(tList);
      setHistoryJournees(jList);

      if (salList.length > 0 && !responsableId) {
        setResponsableId(salList[0].id);
        setResponsableNom(salList[0].name);
      }

      // Initialize Step 2: Pistolet Entries
      const priceMap: Record<string, number> = {};
      carbList.forEach((c) => {
        priceMap[c.code] = c.pricePerLiter;
      });

      const initialPistEntries: PistoletDailyEntry[] = pistList.map((p) => {
        const pu = priceMap[p.carburantCode] || (p.carburantCode === 'GAS' ? 15.92 : 15.62);
        return {
          pistoletId: p.id,
          pistoletCode: p.code,
          carburantCode: p.carburantCode,
          indexEntree: p.currentIndex,
          indexSortie: p.currentIndex,
          remiseEnCuve: 0,
          quantiteL: 0,
          prixUnitaire: pu,
          totalDH: 0,
        };
      });
      setPistoletEntries(initialPistEntries);

      // Initialize Step 3: Product Entries
      const initialProdEntries: ProduitDailyEntry[] = prodList.map((prod) => ({
        produitId: prod.id,
        marque: prod.marque,
        nomProduit: prod.name,
        stockEntree: prod.stockBoutique,
        stockSortie: prod.stockBoutique,
        quantiteVendue: 0,
        prixUnitaire: prod.prixVenteTTC,
        totalDH: 0,
      }));
      setProduitEntries(initialProdEntries);

      // Initialize Step 4: Service Entries
      const initialServEntries: ServiceDailyEntry[] = servList.map((s) => ({
        serviceId: s.id,
        category: s.category,
        nomService: s.name,
        quantite: 0,
        prixUnitaire: s.prixTTC,
        totalDH: 0,
      }));
      setServiceEntries(initialServEntries);
    } catch (err) {
      console.error('Failed to load daily shift data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOperationalData();
  }, [station]);

  // Update Pistolet Entry
  const updatePistEntry = (idx: number, field: 'indexSortie' | 'remiseEnCuve', val: number) => {
    const updated = [...pistoletEntries];
    const item = { ...updated[idx], [field]: val };
    const qte = Math.max(0, item.indexSortie - item.indexEntree - (item.remiseEnCuve || 0));
    item.quantiteL = qte;
    item.totalDH = Math.round(qte * item.prixUnitaire * 100) / 100;
    updated[idx] = item;
    setPistoletEntries(updated);
  };

  // Update Produit Entry
  const updateProdEntry = (idx: number, field: 'stockSortie' | 'quantiteVendue', val: number) => {
    const updated = [...produitEntries];
    const item = { ...updated[idx] };
    if (field === 'quantiteVendue') {
      item.quantiteVendue = Math.max(0, val);
      item.stockSortie = Math.max(0, item.stockEntree - item.quantiteVendue);
    } else {
      item.stockSortie = val;
      item.quantiteVendue = Math.max(0, item.stockEntree - val);
    }
    item.totalDH = Math.round(item.quantiteVendue * item.prixUnitaire * 100) / 100;
    updated[idx] = item;
    setProduitEntries(updated);
  };

  // Update Service Entry
  const updateServEntry = (idx: number, qte: number) => {
    const updated = [...serviceEntries];
    const item = { ...updated[idx] };
    item.quantite = Math.max(0, qte);
    item.totalDH = Math.round(item.quantite * item.prixUnitaire * 100) / 100;
    updated[idx] = item;
    setServiceEntries(updated);
  };

  // Step 5: Add Non-Espece Row
  const addNonEspeceRow = () => {
    const defaultClient = tiers.find((t) => t.type === 'Client') || tiers[0];
    setEncaissementsNonEspeces([
      ...encaissementsNonEspeces,
      {
        id: `ne-${Date.now()}`,
        clientId: defaultClient?.id || '',
        clientNom: defaultClient?.name || 'Client',
        soldeActuel: defaultClient?.solde || 0,
        modePaiement: 'Bon client',
        montant: 0,
        note: '',
      },
    ]);
  };

  const removeNonEspeceRow = (idx: number) => {
    setEncaissementsNonEspeces(encaissementsNonEspeces.filter((_, i) => i !== idx));
  };

  // Step 6: Add Dépense Row
  const addDepenseRow = () => {
    setDepensesCaisse([
      ...depensesCaisse,
      {
        id: `dc-${Date.now()}`,
        typeDepense: 'Fournitures',
        description: '',
        montant: 0,
        modePaiement: 'Espèces',
        notes: '',
      },
    ]);
  };

  const removeDepenseRow = (idx: number) => {
    setDepensesCaisse(depensesCaisse.filter((_, i) => i !== idx));
  };

  // Step 7: Add Règlement Dette Row
  const addReglementDetteRow = () => {
    const defaultClient = tiers.find((t) => t.type === 'Client') || tiers[0];
    setReglementsDettes([
      ...reglementsDettes,
      {
        id: `rd-${Date.now()}`,
        clientId: defaultClient?.id || '',
        clientNom: defaultClient?.name || 'Client',
        soldeActuel: defaultClient?.solde || 0,
        montant: 0,
        modePaiement: 'Espèces',
        note: '',
      },
    ]);
  };

  const removeReglementDetteRow = (idx: number) => {
    setReglementsDettes(reglementsDettes.filter((_, i) => i !== idx));
  };

  // Calculations
  const totalCarburantsDH = pistoletEntries.reduce((acc, curr) => acc + curr.totalDH, 0);
  const totalProduitsDH = produitEntries.reduce((acc, curr) => acc + curr.totalDH, 0);
  const totalServicesDH = serviceEntries.reduce((acc, curr) => acc + curr.totalDH, 0);
  const totalChiffreAffairesDH = totalCarburantsDH + totalProduitsDH + totalServicesDH;

  const totalNonEspecesDH = encaissementsNonEspeces.reduce((acc, curr) => acc + curr.montant, 0);
  const totalDepensesEspecesDH = depensesCaisse.reduce((acc, curr) => acc + curr.montant, 0);
  const totalReglementsDettesDH = reglementsDettes.reduce((acc, curr) => acc + curr.montant, 0);
  const totalRechargesDH = recharges.reduce((acc, curr) => acc + curr.montant, 0);

  // Exact Formula:
  // Especes a remettre = CA Total - Non Especes - Depenses Especes + Reglements dettes (especes) + Recharges
  const especesARemettreDH = Math.max(
    0,
    totalChiffreAffairesDH -
      totalNonEspecesDH -
      totalDepensesEspecesDH +
      totalReglementsDettesDH +
      totalRechargesDH -
      (parseFloat(avancePompiste) || 0)
  );

  // Final Submit
  const handleFinalSubmit = async () => {
    if (!station) return;
    setSubmitting(true);
    try {
      const payload: Partial<Journee> = {
        dateDebut,
        heureDebut,
        dateFin,
        heureFin,
        responsableId,
        responsableNom,
        remarques,
        avancePompiste: parseFloat(avancePompiste) || 0,
        pistoletEntries,
        produitEntries: produitEntries.filter((p) => p.quantiteVendue > 0),
        serviceEntries: serviceEntries.filter((s) => s.quantite > 0),
        encaissementsNonEspeces: encaissementsNonEspeces.filter((e) => e.montant > 0),
        depensesCaisse: depensesCaisse.filter((d) => d.montant > 0),
        reglementsDettes,
        recharges,
        totalCarburantsDH,
        totalProduitsDH,
        totalServicesDH,
        totalChiffreAffairesDH,
        totalNonEspecesDH,
        totalDepensesEspecesDH,
        totalReglementsDettesDH,
        totalRechargesDH,
        especesARemettreDH,
        statut: 'CLÔTURÉE',
      };

      await api.submitJournee(station.id, payload);
      alert('Journée clôturée et soumise avec succès ! Les index et stocks ont été mis à jour.');
      setStep(1);
      setActiveTab('historique');
      await loadOperationalData();
    } catch (err) {
      alert('Erreur lors de la soumission de la journée');
    } finally {
      setSubmitting(false);
    }
  };

  // Group history by Pompiste
  const pompisteGroups = React.useMemo(() => {
    const map = new Map<string, Journee[]>();
    historyJournees.forEach((j) => {
      const key = j.responsableNom || 'GERANT';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(j);
    });
    return Array.from(map.entries()).map(([nom, list]) => {
      const totalCA = list.reduce((sum, j) => sum + (j.totalChiffreAffairesDH || 0), 0);
      const totalCarburants = list.reduce((sum, j) => sum + (j.totalCarburantsDH || 0), 0);
      const totalProduits = list.reduce((sum, j) => sum + (j.totalProduitsDH || 0), 0);
      const totalServices = list.reduce((sum, j) => sum + (j.totalServicesDH || 0), 0);
      const totalNonEspeces = list.reduce((sum, j) => sum + (j.totalNonEspecesDH || 0), 0);
      const totalDepenses = list.reduce((sum, j) => sum + (j.totalDepensesEspecesDH || 0), 0);
      const totalReglements = list.reduce((sum, j) => sum + (j.totalReglementsDettesDH || 0), 0);
      const totalRecharges = list.reduce((sum, j) => sum + (j.totalRechargesDH || 0), 0);
      const totalEspeces = list.reduce((sum, j) => sum + (j.especesARemettreDH || 0), 0);
      return {
        nom,
        shiftsCount: list.length,
        totalCA,
        totalCarburants,
        totalProduits,
        totalServices,
        totalNonEspeces,
        totalDepenses,
        totalReglements,
        totalRecharges,
        totalEspeces,
        list,
      };
    });
  }, [historyJournees]);

  // Group history by Day (Jour)
  const jourGroups = React.useMemo(() => {
    const map = new Map<string, Journee[]>();
    historyJournees.forEach((j) => {
      const key = j.dateDebut || '2026-10-17';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(j);
    });
    return Array.from(map.entries()).map(([date, list]) => {
      const totalCA = list.reduce((sum, j) => sum + (j.totalChiffreAffairesDH || 0), 0);
      const totalCarburants = list.reduce((sum, j) => sum + (j.totalCarburantsDH || 0), 0);
      const totalProduits = list.reduce((sum, j) => sum + (j.totalProduitsDH || 0), 0);
      const totalServices = list.reduce((sum, j) => sum + (j.totalServicesDH || 0), 0);
      const totalNonEspeces = list.reduce((sum, j) => sum + (j.totalNonEspecesDH || 0), 0);
      const totalDepenses = list.reduce((sum, j) => sum + (j.totalDepensesEspecesDH || 0), 0);
      const totalReglements = list.reduce((sum, j) => sum + (j.totalReglementsDettesDH || 0), 0);
      const totalRecharges = list.reduce((sum, j) => sum + (j.totalRechargesDH || 0), 0);
      const totalEspeces = list.reduce((sum, j) => sum + (j.especesARemettreDH || 0), 0);
      const responsables = Array.from(new Set(list.map((j) => j.responsableNom))).join(', ');
      return {
        date,
        shiftsCount: list.length,
        responsables,
        totalCA,
        totalCarburants,
        totalProduits,
        totalServices,
        totalNonEspeces,
        totalDepenses,
        totalReglements,
        totalRecharges,
        totalEspeces,
        list,
      };
    });
  }, [historyJournees]);

  const handleOpenGroupSynthesis = (title: string, dateLabel: string, list: Journee[]) => {
    const combinedPistolet = list.flatMap((j) => j.pistoletEntries || []);
    const combinedProduit = list.flatMap((j) => j.produitEntries || []);
    const combinedService = list.flatMap((j) => j.serviceEntries || []);
    const combinedNonEsp = list.flatMap((j) => j.encaissementsNonEspeces || []);
    const combinedDep = list.flatMap((j) => j.depensesCaisse || []);
    const combinedReg = list.flatMap((j) => j.reglementsDettes || []);
    const combinedRech = list.flatMap((j) => j.recharges || []);

    const synthJournee: Journee = {
      id: `SYNTH-${Date.now()}`,
      stationId: station?.id || '',
      dateDebut: dateLabel || list[0]?.dateDebut || '',
      heureDebut: list[0]?.heureDebut || '00:00',
      dateFin: list[list.length - 1]?.dateFin || dateLabel || '',
      heureFin: list[list.length - 1]?.heureFin || '23:59',
      responsableId: list[0]?.responsableId || '',
      responsableNom: title,
      avancePompiste: list.reduce((s, j) => s + (j.avancePompiste || 0), 0),
      pistoletEntries: combinedPistolet,
      produitEntries: combinedProduit,
      serviceEntries: combinedService,
      encaissementsNonEspeces: combinedNonEsp,
      depensesCaisse: combinedDep,
      reglementsDettes: combinedReg,
      recharges: combinedRech,
      totalCarburantsDH: list.reduce((s, j) => s + (j.totalCarburantsDH || 0), 0),
      totalProduitsDH: list.reduce((s, j) => s + (j.totalProduitsDH || 0), 0),
      totalServicesDH: list.reduce((s, j) => s + (j.totalServicesDH || 0), 0),
      totalChiffreAffairesDH: list.reduce((s, j) => s + (j.totalChiffreAffairesDH || 0), 0),
      totalNonEspecesDH: list.reduce((s, j) => s + (j.totalNonEspecesDH || 0), 0),
      totalDepensesEspecesDH: list.reduce((s, j) => s + (j.totalDepensesEspecesDH || 0), 0),
      totalReglementsDettesDH: list.reduce((s, j) => s + (j.totalReglementsDettesDH || 0), 0),
      totalRechargesDH: list.reduce((s, j) => s + (j.totalRechargesDH || 0), 0),
      especesARemettreDH: list.reduce((s, j) => s + (j.especesARemettreDH || 0), 0),
      statut: 'CLÔTURÉE',
      createdAt: new Date().toISOString(),
    };

    setReportTitleOverride(title);
    setReportDateOverride(dateLabel);
    setSelectedViewJournee(synthJournee);
  };

  const stepsMeta = [
    { num: 1, label: 'Infos Générales' },
    { num: 2, label: 'Index Pistolets' },
    { num: 3, label: 'Produits' },
    { num: 4, label: 'Services' },
    { num: 5, label: 'Non-Espèces' },
    { num: 6, label: 'Dépenses' },
    { num: 7, label: 'Règlements' },
    { num: 8, label: 'Récapitulatif' },
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto print:p-0 print:m-0 print:max-w-none">
      {/* Background operational content completely hidden on print */}
      <div className={selectedViewJournee ? 'print:hidden' : 'space-y-6'}>
        {/* Top Tabs matching PDF Page 8 */}
        <div className="flex items-center gap-6 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('saisie')}
          className={`pb-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 ${
            activeTab === 'saisie'
              ? 'border-emerald-700 text-emerald-800'
              : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          1er : Saisie de Journées (Flow Guidé en 8 Étapes)
        </button>
        <button
          onClick={() => setActiveTab('historique')}
          className={`pb-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 ${
            activeTab === 'historique'
              ? 'border-emerald-700 text-emerald-800'
              : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          2eme : Historique des Clôtures ({historyJournees.length})
        </button>
      </div>

      {/* TAB 1: 8-STEP WIZARD (Faithful to Page 8 & 9) */}
      {activeTab === 'saisie' && (
        <div className="space-y-6">
          {/* Wizard Step Progression Bar with connected tracks */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs">
            <div className="flex items-center justify-between relative">
              {stepsMeta.map((s, idx) => {
                const isActive = step === s.num;
                const isPast = step > s.num;
                return (
                  <React.Fragment key={s.num}>
                    {idx > 0 && (
                      <div className="flex-1 h-0.5 mx-2 bg-slate-200 dark:bg-slate-700 relative -top-3">
                        <div
                          className="h-full bg-emerald-600 transition-all duration-300"
                          style={{ width: isPast || isActive ? '100%' : '0%' }}
                        />
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => setStep(s.num)}
                      className="flex flex-col items-center gap-1.5 group focus:outline-none shrink-0"
                    >
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                          isActive
                            ? 'bg-emerald-600 text-white ring-4 ring-emerald-100 dark:ring-emerald-950/80 font-extrabold shadow-xs'
                            : isPast
                            ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-400 group-hover:bg-slate-200 dark:group-hover:bg-slate-700'
                        }`}
                      >
                        {isPast ? <Check className="w-3.5 h-3.5" /> : s.num}
                      </div>
                      <span
                        className={`text-[10px] hidden md:inline font-semibold ${
                          isActive
                            ? 'text-emerald-800 dark:text-emerald-400 font-bold'
                            : isPast
                            ? 'text-slate-700 dark:text-slate-300'
                            : 'text-slate-400'
                        }`}
                      >
                        {s.label}
                      </span>
                    </button>
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* STEP 1: Informations Générales (Page 8 top) */}
          {step === 1 && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h2 className="text-sm font-bold text-slate-900">
                  Étape 1 : Informations Générales
                </h2>
                <button
                  onClick={() => setStep(2)}
                  className="px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg flex items-center gap-1.5 transition-colors"
                >
                  Suivant <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Pompiste / Responsable de Shift *
                    </label>
                    <select
                      value={responsableId}
                      onChange={(e) => {
                        setResponsableId(e.target.value);
                        const sal = salaries.find((s) => s.id === e.target.value);
                        if (sal) setResponsableNom(sal.name);
                      }}
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white font-semibold text-slate-900"
                    >
                      {salaries.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.role}) - {s.matricule}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Date Début
                      </label>
                      <input
                        type="date"
                        value={dateDebut}
                        onChange={(e) => setDateDebut(e.target.value)}
                        className="w-full text-xs font-mono px-3 py-2 border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Heure Début
                      </label>
                      <input
                        type="time"
                        value={heureDebut}
                        onChange={(e) => setHeureDebut(e.target.value)}
                        className="w-full text-xs font-mono px-3 py-2 border border-slate-300 rounded-lg"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Date Fin
                      </label>
                      <input
                        type="date"
                        value={dateFin}
                        onChange={(e) => setDateFin(e.target.value)}
                        className="w-full text-xs font-mono px-3 py-2 border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Heure Fin
                      </label>
                      <input
                        type="time"
                        value={heureFin}
                        onChange={(e) => setHeureFin(e.target.value)}
                        className="w-full text-xs font-mono px-3 py-2 border border-slate-300 rounded-lg"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Remarques / Commentaires de Service
                    </label>
                    <textarea
                      rows={4}
                      value={remarques}
                      onChange={(e) => setRemarques(e.target.value)}
                      placeholder="Incidents de piste, passage contrôleur, etc."
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    ></textarea>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Avance Pompiste (optionnelle) (DH)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={avancePompiste}
                      onChange={(e) => setAvancePompiste(e.target.value)}
                      className="w-full text-xs font-mono font-bold px-3 py-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between col-span-1 md:col-span-2">
                  <span className="text-xs text-slate-500">
                    Étape 1 sur 8 · Renseignez les informations de shift avant de passer aux index des pistolets.
                  </span>
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg flex items-center gap-2 shadow-xs transition-colors"
                  >
                    Passer aux Index Pistolets (Étape 2) <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Index Des Pistolets (Page 8 second) */}
          {step === 2 && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    Étape 2 : Index Des Pistolets
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    Saisissez l'index de sortie pour chaque pistolet. La quantité et le montant sont calculés automatiquement.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setStep(1)}
                    className="px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Précédent
                  </button>
                  <button
                    onClick={() => setStep(3)}
                    className="px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg flex items-center gap-1.5"
                  >
                    Suivant <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Table matching exact layout from PDF Page 8 */}
              <div className="border border-slate-200 rounded-lg overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[750px]">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">Pistolet</th>
                      <th className="py-2.5 px-3">Carburant</th>
                      <th className="py-2.5 px-3 text-right">Index Entrée</th>
                      <th className="py-2.5 px-3 text-right">Index Sortie (Fin)</th>
                      <th className="py-2.5 px-3 text-right">Remise en Cuve (L)</th>
                      <th className="py-2.5 px-3 text-right">Quantité (L)</th>
                      <th className="py-2.5 px-3 text-right">Prix Unit. (DH)</th>
                      <th className="py-2.5 px-3 text-right">Total (DH)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pistoletEntries.map((pEntry, idx) => (
                      <tr key={pEntry.pistoletId} className="hover:bg-slate-50/60">
                        <td className="py-2 px-3 font-bold text-slate-900">{pEntry.pistoletCode}</td>
                        <td className="py-2 px-3">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              pEntry.carburantCode === 'SSP'
                                ? 'bg-emerald-50 text-emerald-800'
                                : 'bg-slate-100 text-slate-800'
                            }`}
                          >
                            {pEntry.carburantCode}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-slate-500 tabular-nums">
                          {pEntry.indexEntree}
                        </td>
                        <td className="py-2 px-3 text-right">
                          <input
                            type="number"
                            required
                            value={pEntry.indexSortie}
                            onChange={(e) =>
                              updatePistEntry(idx, 'indexSortie', parseFloat(e.target.value) || 0)
                            }
                            className="w-24 px-2 py-1 text-xs font-mono font-bold border border-slate-300 rounded text-right focus:ring-2 focus:ring-emerald-600"
                          />
                        </td>
                        <td className="py-2 px-3 text-right">
                          <input
                            type="number"
                            value={pEntry.remiseEnCuve}
                            onChange={(e) =>
                              updatePistEntry(idx, 'remiseEnCuve', parseFloat(e.target.value) || 0)
                            }
                            className="w-16 px-2 py-1 text-xs font-mono border border-slate-300 rounded text-right"
                          />
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-800 tabular-nums">
                          {pEntry.quantiteL} L
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-slate-600 tabular-nums">
                          {pEntry.prixUnitaire.toFixed(2)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-emerald-800 tabular-nums">
                          {pEntry.totalDH.toFixed(2)} DH
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 font-bold border-t border-slate-200">
                    <tr>
                      <td colSpan={5} className="py-2.5 px-3 text-right uppercase text-[11px]">
                        Total Ventes Carburants :
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-900">
                        {pistoletEntries.reduce((a, c) => a + c.quantiteL, 0)} L
                      </td>
                      <td></td>
                      <td className="py-2.5 px-3 text-right font-mono text-emerald-800 text-sm">
                        {totalCarburantsDH.toFixed(2)} DH
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* STEP 3: Ventes De Produits (Page 8 third) */}
          {step === 3 && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    Étape 3 : Ventes De Produits (Lubrifiants & Boutique)
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    Indiquez la quantité vendue pour chaque lubrifiant ou produit
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setStep(2)}
                    className="px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Précédent
                  </button>
                  <button
                    onClick={() => setStep(4)}
                    className="px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg flex items-center gap-1.5"
                  >
                    Suivant <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">Marque</th>
                      <th className="py-2.5 px-3">Nom Produit</th>
                      <th className="py-2.5 px-3 text-right">Stock Entrée</th>
                      <th className="py-2.5 px-3 text-right">Quantité Vendue</th>
                      <th className="py-2.5 px-3 text-right">Prix Unitaire (DH)</th>
                      <th className="py-2.5 px-3 text-right">Total (DH)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {produitEntries.map((prod, idx) => (
                      <tr key={prod.produitId} className="hover:bg-slate-50/60">
                        <td className="py-2 px-3 font-semibold text-slate-700">{prod.marque}</td>
                        <td className="py-2 px-3 font-bold text-slate-900">{prod.nomProduit}</td>
                        <td className="py-2 px-3 text-right font-mono text-slate-500">{prod.stockEntree}</td>
                        <td className="py-2 px-3 text-right">
                          <input
                            type="number"
                            min="0"
                            value={prod.quantiteVendue}
                            onChange={(e) =>
                              updateProdEntry(idx, 'quantiteVendue', parseInt(e.target.value) || 0)
                            }
                            className="w-20 px-2 py-1 text-xs font-mono font-bold border border-slate-300 rounded text-right focus:ring-2 focus:ring-emerald-600"
                          />
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-slate-600">
                          {prod.prixUnitaire.toFixed(2)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-emerald-800">
                          {prod.totalDH.toFixed(2)} DH
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 font-bold border-t border-slate-200">
                    <tr>
                      <td colSpan={5} className="py-2.5 px-3 text-right uppercase text-[11px]">
                        Total Ventes Produits :
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-emerald-800 text-sm">
                        {totalProduitsDH.toFixed(2)} DH
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* STEP 4: Ventes De Services (Page 8 bottom) */}
          {step === 4 && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    Étape 4 : Ventes De Services (Lavage, Vidange)
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    Indiquez le nombre de prestations réalisées durant le shift
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setStep(3)}
                    className="px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Précédent
                  </button>
                  <button
                    onClick={() => setStep(5)}
                    className="px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg flex items-center gap-1.5"
                  >
                    Suivant <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">Catégorie</th>
                      <th className="py-2.5 px-3">Service</th>
                      <th className="py-2.5 px-3 text-right">Quantité (U)</th>
                      <th className="py-2.5 px-3 text-right">Prix Unitaire (DH)</th>
                      <th className="py-2.5 px-3 text-right">Total (DH)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {serviceEntries.map((serv, idx) => (
                      <tr key={serv.serviceId} className="hover:bg-slate-50/60">
                        <td className="py-2 px-3 text-slate-600 font-medium">{serv.category}</td>
                        <td className="py-2 px-3 font-bold text-slate-900">{serv.nomService}</td>
                        <td className="py-2 px-3 text-right">
                          <input
                            type="number"
                            min="0"
                            value={serv.quantite}
                            onChange={(e) => updateServEntry(idx, parseInt(e.target.value) || 0)}
                            className="w-20 px-2 py-1 text-xs font-mono font-bold border border-slate-300 rounded text-right focus:ring-2 focus:ring-emerald-600"
                          />
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-slate-600">
                          {serv.prixUnitaire.toFixed(2)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-emerald-800">
                          {serv.totalDH.toFixed(2)} DH
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 font-bold border-t border-slate-200">
                    <tr>
                      <td colSpan={4} className="py-2.5 px-3 text-right uppercase text-[11px]">
                        Total Ventes Services :
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-emerald-800 text-sm">
                        {totalServicesDH.toFixed(2)} DH
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* STEP 5: Encaissements Non-Espèces (Page 9 top) */}
          {step === 5 && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    Étape 5 : Encaissements Non-Espèces
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    Bons de carburant clients en compte, paiements par carte TPE ou chèques
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setStep(4)}
                    className="px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Précédent
                  </button>
                  <button
                    onClick={() => setStep(6)}
                    className="px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg flex items-center gap-1.5"
                  >
                    Suivant <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={addNonEspeceRow}
                  className="px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-1 hover:bg-emerald-100"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Ajouter un encaissement non-espèces
                </button>
              </div>

              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">Client</th>
                      <th className="py-2.5 px-3">Mode de Paiement</th>
                      <th className="py-2.5 px-3 text-right">Montant (DH)</th>
                      <th className="py-2.5 px-3">Note / N° Bon</th>
                      <th className="py-2.5 px-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {encaissementsNonEspeces.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-slate-400 italic">
                          Aucun encaissement non-espèces ajouté (TPE, bons clients ou chèques).
                        </td>
                      </tr>
                    ) : (
                      encaissementsNonEspeces.map((row, idx) => (
                        <tr key={row.id} className="hover:bg-slate-50/60">
                          <td className="py-2 px-3">
                            <select
                              value={row.clientId}
                              onChange={(e) => {
                                const cId = e.target.value;
                                const cl = tiers.find((t) => t.id === cId);
                                const updated = [...encaissementsNonEspeces];
                                updated[idx] = {
                                  ...updated[idx],
                                  clientId: cId,
                                  clientNom: cl?.name || '',
                                  soldeActuel: cl?.solde || 0,
                                };
                                setEncaissementsNonEspeces(updated);
                              }}
                              className="w-48 px-2 py-1 border border-slate-300 rounded text-xs"
                            >
                              {tiers
                                .filter((t) => t.type === 'Client')
                                .map((t) => (
                                  <option key={t.id} value={t.id}>
                                    {t.name}
                                  </option>
                                ))}
                            </select>
                          </td>
                          <td className="py-2 px-3">
                            <select
                              value={row.modePaiement}
                              onChange={(e) => {
                                const updated = [...encaissementsNonEspeces];
                                updated[idx] = {
                                  ...updated[idx],
                                  modePaiement: e.target.value as any,
                                };
                                setEncaissementsNonEspeces(updated);
                              }}
                              className="px-2 py-1 border border-slate-300 rounded text-xs"
                            >
                              <option value="Bon client">Bon client</option>
                              <option value="TPE / Carte Bancaire">TPE / Carte Bancaire</option>
                              <option value="Chèque">Chèque</option>
                              <option value="Virement">Virement</option>
                            </select>
                          </td>
                          <td className="py-2 px-3 text-right">
                            <input
                              type="number"
                              step="0.01"
                              value={row.montant}
                              onChange={(e) => {
                                const updated = [...encaissementsNonEspeces];
                                updated[idx] = {
                                  ...updated[idx],
                                  montant: parseFloat(e.target.value) || 0,
                                };
                                setEncaissementsNonEspeces(updated);
                              }}
                              className="w-28 px-2 py-1 text-xs font-mono font-bold border border-slate-300 rounded text-right"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              value={row.note || ''}
                              onChange={(e) => {
                                const updated = [...encaissementsNonEspeces];
                                updated[idx] = {
                                  ...updated[idx],
                                  note: e.target.value,
                                };
                                setEncaissementsNonEspeces(updated);
                              }}
                              placeholder="Réf bon ou reçu"
                              className="w-full px-2 py-1 text-xs border border-slate-300 rounded"
                            />
                          </td>
                          <td className="py-2 px-3 text-center">
                            <button
                              onClick={() => removeNonEspeceRow(idx)}
                              className="p-1 text-slate-400 hover:text-rose-600"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  <tfoot className="bg-slate-50 font-bold border-t border-slate-200">
                    <tr>
                      <td colSpan={2} className="py-2.5 px-3 text-right uppercase text-[11px]">
                        Total Non-Espèces :
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-900 text-sm">
                        {totalNonEspecesDH.toFixed(2)} DH
                      </td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* STEP 6: Dépenses (Page 9 second) */}
          {step === 6 && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    Étape 6 : Dépenses Réglées en Espèces par la Caisse
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    Petits frais payés en espèces sur la recette de la journée
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setStep(5)}
                    className="px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Précédent
                  </button>
                  <button
                    onClick={() => setStep(7)}
                    className="px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg flex items-center gap-1.5"
                  >
                    Suivant <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={addDepenseRow}
                  className="px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-1 hover:bg-emerald-100"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Ajouter une dépense caisse
                </button>
              </div>

              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">Type Dépense</th>
                      <th className="py-2.5 px-3">Description</th>
                      <th className="py-2.5 px-3 text-right">Montant (DH)</th>
                      <th className="py-2.5 px-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {depensesCaisse.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-6 text-center text-slate-400 italic">
                          Aucune dépense caisse à déduire pour ce shift.
                        </td>
                      </tr>
                    ) : (
                      depensesCaisse.map((row, idx) => (
                        <tr key={row.id} className="hover:bg-slate-50/60">
                          <td className="py-2 px-3">
                            <select
                              value={row.typeDepense}
                              onChange={(e) => {
                                const updated = [...depensesCaisse];
                                updated[idx] = { ...updated[idx], typeDepense: e.target.value };
                                setDepensesCaisse(updated);
                              }}
                              className="px-2 py-1 border border-slate-300 rounded text-xs"
                            >
                              <option value="Fournitures">Fournitures de caisse</option>
                              <option value="Entretien">Entretien / Nettoyage</option>
                              <option value="Frais généraux">Frais généraux</option>
                              <option value="Transport">Transport</option>
                              <option value="Divers">Divers</option>
                            </select>
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              value={row.description}
                              onChange={(e) => {
                                const updated = [...depensesCaisse];
                                updated[idx] = { ...updated[idx], description: e.target.value };
                                setDepensesCaisse(updated);
                              }}
                              placeholder="Ex: Rouleaux TPE, ampoules piste..."
                              className="w-full px-2 py-1 border border-slate-300 rounded text-xs"
                            />
                          </td>
                          <td className="py-2 px-3 text-right">
                            <input
                              type="number"
                              step="0.01"
                              value={row.montant}
                              onChange={(e) => {
                                const updated = [...depensesCaisse];
                                updated[idx] = {
                                  ...updated[idx],
                                  montant: parseFloat(e.target.value) || 0,
                                };
                                setDepensesCaisse(updated);
                              }}
                              className="w-24 px-2 py-1 text-xs font-mono font-bold border border-slate-300 rounded text-right"
                            />
                          </td>
                          <td className="py-2 px-3 text-center">
                            <button
                              onClick={() => removeDepenseRow(idx)}
                              className="p-1 text-slate-400 hover:text-rose-600"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  <tfoot className="bg-slate-50 font-bold border-t border-slate-200">
                    <tr>
                      <td colSpan={2} className="py-2.5 px-3 text-right uppercase text-[11px]">
                        Total Dépenses Espèces :
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-rose-700 text-sm">
                        {totalDepensesEspecesDH.toFixed(2)} DH
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* STEP 7: Règlements Dettes & Bons */}
          {step === 7 && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    Étape 7 : Règlements de Dettes reçus en Espèces
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    Clients ayant remboursé d'anciennes dettes en espèces pendant le service
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setStep(6)}
                    className="px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Précédent
                  </button>
                  <button
                    onClick={() => setStep(8)}
                    className="px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg flex items-center gap-1.5"
                  >
                    Suivant <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={addReglementDetteRow}
                  className="px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-1 hover:bg-emerald-100"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Ajouter un règlement client (Espèces)
                </button>
              </div>

              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">Client Débiteur</th>
                      <th className="py-2.5 px-3">Mode</th>
                      <th className="py-2.5 px-3 text-right">Montant Encaissé (DH)</th>
                      <th className="py-2.5 px-3">Réf. Reçu / Note</th>
                      <th className="py-2.5 px-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reglementsDettes.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-slate-400 italic">
                          Aucun règlement de dette client en espèces pour ce shift.
                        </td>
                      </tr>
                    ) : (
                      reglementsDettes.map((row, idx) => (
                        <tr key={row.id} className="hover:bg-slate-50/60">
                          <td className="py-2 px-3">
                            <select
                              value={row.clientId}
                              onChange={(e) => {
                                const cId = e.target.value;
                                const cl = tiers.find((t) => t.id === cId);
                                const updated = [...reglementsDettes];
                                updated[idx] = {
                                  ...updated[idx],
                                  clientId: cId,
                                  clientNom: cl?.name || '',
                                  soldeActuel: cl?.solde || 0,
                                };
                                setReglementsDettes(updated);
                              }}
                              className="w-56 px-2 py-1 border border-slate-300 rounded text-xs"
                            >
                              {tiers
                                .filter((t) => t.type === 'Client')
                                .map((t) => (
                                  <option key={t.id} value={t.id}>
                                    {t.name} (Dette: {t.solde.toFixed(2)} DH)
                                  </option>
                                ))}
                            </select>
                          </td>
                          <td className="py-2 px-3">
                            <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200">
                              Espèces
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right">
                            <input
                              type="number"
                              step="0.01"
                              value={row.montant}
                              onChange={(e) => {
                                const updated = [...reglementsDettes];
                                updated[idx] = {
                                  ...updated[idx],
                                  montant: parseFloat(e.target.value) || 0,
                                };
                                setReglementsDettes(updated);
                              }}
                              className="w-28 px-2 py-1 text-xs font-mono font-bold border border-slate-300 rounded text-right"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              value={row.note || ''}
                              onChange={(e) => {
                                const updated = [...reglementsDettes];
                                updated[idx] = {
                                  ...updated[idx],
                                  note: e.target.value,
                                };
                                setReglementsDettes(updated);
                              }}
                              placeholder="N° reçu, bon..."
                              className="w-full px-2 py-1 text-xs border border-slate-300 rounded"
                            />
                          </td>
                          <td className="py-2 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => removeReglementDetteRow(idx)}
                              className="p-1 text-slate-400 hover:text-rose-600"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  <tfoot className="bg-slate-50 font-bold border-t border-slate-200">
                    <tr>
                      <td colSpan={2} className="py-2.5 px-3 text-right uppercase text-[11px]">
                        Total Règlements Dettes (Espèces) :
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-emerald-700 text-sm">
                        {totalReglementsDettesDH.toFixed(2)} DH
                      </td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* STEP 8: RÉCAPITULATIF FINAL (Faithful to exact screenshot Page 9 bottom) */}
          {step === 8 && (
            <div className="space-y-6">
              {/* Green confirmation header banner */}
              <div className="bg-emerald-800 text-white rounded-xl p-4 text-center font-bold text-sm shadow-xs">
                Merci de vérifier le récapitulatif avant de soumettre
              </div>

              {/* Shift Metadata Card */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs uppercase">
                    {responsableNom.slice(0, 2)}
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                      Pompiste / Gérant
                    </span>
                    <span className="font-black text-sm text-slate-900">
                      {responsableNom}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <CalendarCheck className="w-5 h-5 text-emerald-600" />
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                      Période du Shift
                    </span>
                    <span className="font-semibold text-xs text-slate-800 font-mono">
                      {dateDebut} ({heureDebut}) &rarr; {dateFin} ({heureFin})
                    </span>
                  </div>
                </div>
              </div>

              {/* Two Side-by-Side Breakdown Tables matching PDF Page 9 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* CHIFFRE D'AFFAIRES */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-3">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100 flex items-center justify-between">
                    <span>Chiffre d'Affaires</span>
                    <DollarSign className="w-4 h-4 text-emerald-600" />
                  </h3>

                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Carburants</span>
                      <span className="font-mono font-bold text-slate-900">
                        {totalCarburantsDH.toFixed(2)} DH
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Produits</span>
                      <span className="font-mono font-bold text-slate-900">
                        {totalProduitsDH.toFixed(2)} DH
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Services</span>
                      <span className="font-mono font-bold text-slate-900">
                        {totalServicesDH.toFixed(2)} DH
                      </span>
                    </div>

                    <div className="pt-2 border-t border-slate-200 flex items-center justify-between font-bold text-sm text-slate-900">
                      <span>Total CA</span>
                      <span className="font-mono text-emerald-800">
                        {totalChiffreAffairesDH.toFixed(2)} DH
                      </span>
                    </div>
                  </div>
                </div>

                {/* MOUVEMENTS DE CAISSE */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-3">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100 flex items-center justify-between">
                    <span>Mouvements de Caisse</span>
                    <CreditCard className="w-4 h-4 text-sky-600" />
                  </h3>

                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Encaissements Non-Espèces</span>
                      <span className="font-mono font-bold text-rose-600">
                        - {totalNonEspecesDH.toFixed(2)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Dépenses (Espèces)</span>
                      <span className="font-mono font-bold text-rose-600">
                        - {totalDepensesEspecesDH.toFixed(2)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Règlements Dettes (Espèces)</span>
                      <span className="font-mono font-bold text-emerald-600">
                        + {totalReglementsDettesDH.toFixed(2)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Recharges (Espèces)</span>
                      <span className="font-mono font-bold text-emerald-600">
                        + {totalRechargesDH.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Big Highlighted Box: ESPÈCES À REMETTRE PAR LE GÉRANT / POMPISTE */}
              <div className="bg-emerald-900 text-white rounded-xl p-6 text-center shadow-lg space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-200">
                  ESPÈCES À REMETTRE PAR LE GÉRANT / POMPISTE
                </span>
                <div className="text-3xl sm:text-4xl font-black font-mono tracking-tight tabular-nums text-white">
                  {new Intl.NumberFormat('fr-FR', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  }).format(especesARemettreDH)}{' '}
                  DH
                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex items-center justify-center gap-4 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-5 py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  Revenir au formulaire
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleFinalSubmit}
                  className="px-6 py-2.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Soumettre la Journée</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: HISTORIQUE DES JOURNÉES AVEC 3 MODES D'AFFICHAGE */}
      {activeTab === 'historique' && (
        <div className="space-y-4">
          {/* Header Controls with 3 Display Filters matching user specifications */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Historique des Clôtures Journalières
              </h2>
              <p className="text-xs text-slate-500">
                Consultez le détail des shifts ou imprimez une synthèse par pompiste ou par jour.
              </p>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {/* 3 Display Filter Tabs */}
              <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setHistoryFilterMode('detail')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    historyFilterMode === 'detail'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Affichage détaillé
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryFilterMode('pompiste')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    historyFilterMode === 'pompiste'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Synthèse par pompiste
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryFilterMode('jour')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    historyFilterMode === 'jour'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Synthèse par jour
                </button>
              </div>
            </div>
          </div>

          {/* VIEW 1: AFFICHAGE DÉTAILLÉ (Individual shifts table) */}
          {historyFilterMode === 'detail' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-semibold">
                  <tr>
                    <th className="py-2.5 px-4">Statut</th>
                    <th className="py-2.5 px-4">Pompiste / Gérant</th>
                    <th className="py-2.5 px-4">Date de début</th>
                    <th className="py-2.5 px-4 text-right">Total des ventes</th>
                    <th className="py-2.5 px-4 text-right">Non-Espèces</th>
                    <th className="py-2.5 px-4 text-right">Dépenses</th>
                    <th className="py-2.5 px-4 text-right">Espèces à Remettre</th>
                    <th className="py-2.5 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {historyJournees.map((j) => (
                    <tr key={j.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          {j.statut}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                        {j.responsableNom}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-400">
                        {j.dateDebut} ({j.heureDebut})
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-white tabular-nums">
                        {(j.totalChiffreAffairesDH || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DH
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-600 dark:text-slate-400 tabular-nums">
                        {(j.totalNonEspecesDH || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DH
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-rose-600 tabular-nums">
                        {(j.totalDepensesEspecesDH || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DH
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                        {(j.especesARemettreDH || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DH
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            setReportTitleOverride(j.responsableNom);
                            setReportDateOverride(j.dateDebut);
                            setSelectedViewJournee(j);
                          }}
                          className="px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors"
                        >
                          Voir Fiche
                        </button>
                      </td>
                    </tr>
                  ))}
                  {historyJournees.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400 italic">
                        Aucune clôture enregistrée dans l'historique.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* VIEW 2: SYNTHÈSE PAR POMPISTE */}
          {historyFilterMode === 'pompiste' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-semibold">
                  <tr>
                    <th className="py-2.5 px-4">Pompiste / Responsable</th>
                    <th className="py-2.5 px-4 text-center">Nombre de Shifts</th>
                    <th className="py-2.5 px-4 text-right">Chiffre d'Affaires</th>
                    <th className="py-2.5 px-4 text-right">Carburants</th>
                    <th className="py-2.5 px-4 text-right">Boutique & Services</th>
                    <th className="py-2.5 px-4 text-right">Non-Espèces</th>
                    <th className="py-2.5 px-4 text-right">Dépenses</th>
                    <th className="py-2.5 px-4 text-right">Espèces Versées</th>
                    <th className="py-2.5 px-4 text-center">Rapport</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {pompisteGroups.map((p) => (
                    <tr key={p.nom} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 flex items-center justify-center font-bold text-[10px]">
                          {p.nom.slice(0, 2).toUpperCase()}
                        </div>
                        <span>{p.nom}</span>
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-slate-700 dark:text-slate-300">
                        {p.shiftsCount} shift{p.shiftsCount > 1 ? 's' : ''}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-white tabular-nums">
                        {p.totalCA.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DH
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-600 dark:text-slate-400 tabular-nums">
                        {p.totalCarburants.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DH
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-600 dark:text-slate-400 tabular-nums">
                        {(p.totalProduits + p.totalServices).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DH
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-purple-700 dark:text-purple-400 tabular-nums">
                        {p.totalNonEspeces.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DH
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-rose-600 tabular-nums">
                        {p.totalDepenses.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DH
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                        {p.totalEspeces.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DH
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleOpenGroupSynthesis(p.nom, p.list[0]?.dateDebut || '', p.list)}
                          className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors flex items-center gap-1.5 mx-auto"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Voir Rapport</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                  {pompisteGroups.length === 0 && (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400 italic">
                        Aucune donnée disponible pour la synthèse par pompiste.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* VIEW 3: SYNTHÈSE PAR JOUR */}
          {historyFilterMode === 'jour' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-semibold">
                  <tr>
                    <th className="py-2.5 px-4">Date de Journée</th>
                    <th className="py-2.5 px-4">Chef(s) de Piste / Pompiste</th>
                    <th className="py-2.5 px-4 text-center">Shifts Clôturés</th>
                    <th className="py-2.5 px-4 text-right">Chiffre d'Affaires</th>
                    <th className="py-2.5 px-4 text-right">Non-Espèces</th>
                    <th className="py-2.5 px-4 text-right">Dépenses Caisse</th>
                    <th className="py-2.5 px-4 text-right">Espèces Nettes</th>
                    <th className="py-2.5 px-4 text-center">Rapport</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {jourGroups.map((g) => (
                    <tr key={g.date} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-bold font-mono text-slate-900 dark:text-white flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-emerald-600" />
                        <span>{g.date}</span>
                      </td>
                      <td className="py-3 px-4 text-slate-700 dark:text-slate-300 font-semibold">
                        {g.responsables}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-slate-700 dark:text-slate-300">
                        {g.shiftsCount} shift{g.shiftsCount > 1 ? 's' : ''}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-white tabular-nums">
                        {g.totalCA.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DH
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-purple-700 dark:text-purple-400 tabular-nums">
                        {g.totalNonEspeces.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DH
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-rose-600 tabular-nums">
                        {g.totalDepenses.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DH
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                        {g.totalEspeces.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DH
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleOpenGroupSynthesis(g.responsables, g.date, g.list)}
                          className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors flex items-center gap-1.5 mx-auto"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Voir Rapport</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                  {jourGroups.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400 italic">
                        Aucune donnée disponible pour la synthèse par jour.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
      </div>

      {/* MODAL: RAPPORT DE LA JOURNÉE (Exact design matching user's joined screenshot, always pure white theme) */}
      {selectedViewJournee && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 print:p-0 print:static print:block print:bg-transparent print:overflow-visible print:h-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] overflow-y-auto p-6 space-y-6 print:max-h-none print:overflow-visible print:border-none print:shadow-none print:p-0 print:m-0 print:h-auto print:w-full print:max-w-none text-slate-900 force-light" id="printable-fiche-cloture">
            {/* Top Bar matching screenshot */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              {historyFilterMode !== 'detail' ? (
                <button
                  type="button"
                  onClick={() => {
                    if (!selectedViewJournee) return;
                    const shiftRef = selectedViewJournee.id || `JRN-${selectedViewJournee.dateDebut}`;
                    printDocumentWithCustomName({
                      type: 'CLOTURE_JOURNEE',
                      reference: shiftRef,
                      partnerOrEntity: selectedViewJournee.responsableNom || 'GERANT',
                      date: selectedViewJournee.dateDebut,
                      subInfo: `${selectedViewJournee.heureDebut || '00h'}-${selectedViewJournee.heureFin || '24h'}`,
                      stationName: station?.name,
                    });
                  }}
                  className="px-6 py-2.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-sm transition-colors flex items-center gap-2 print:hidden"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimer</span>
                </button>
              ) : (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-500 text-xs font-semibold print:hidden">
                  <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                  <span>Consultation seule</span>
                </div>
              )}

              <div className="flex items-center gap-4 text-center sm:text-left">
                <StationLogo
                  stationId={station?.id}
                  brand={station?.brand}
                  name={station?.name}
                  logoUrl={station?.logoUrl}
                  size="xl"
                  className="shrink-0"
                />
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                    Rapport de la journée - {reportTitleOverride || selectedViewJournee.responsableNom}
                  </h1>
                  <p className="text-xs text-slate-600 uppercase tracking-wider font-semibold mt-0.5">
                    STATION {station?.name || 'STATION SERVICE'} {station?.city ? `· ${station.city}` : ''}
                  </p>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">
                    {reportDateOverride || selectedViewJournee.dateDebut}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedViewJournee(null);
                  setReportTitleOverride(null);
                  setReportDateOverride(null);
                }}
                className="px-8 py-2.5 text-xs font-bold bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg transition-colors print:hidden"
              >
                OK
              </button>
            </div>

            {/* Notice for Detail View */}
            {historyFilterMode === 'detail' && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2 print:hidden">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                <span>
                  <strong>Mode Consultation :</strong> Cette vue sert à consulter les données du shift. Pour imprimer un rapport officiel, merci de choisir l'option <strong>« Synthèse par pompiste »</strong> ou <strong>« Synthèse par jour »</strong> depuis l'historique.
                </span>
              </div>
            )}

            {/* Section 1 : Récapitulatif des chiffres matching screenshot */}
            <div className="space-y-4">
              <h2 className="text-emerald-800 font-bold text-sm tracking-wide">
                Section 1 : Récapitulatif des chiffres
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Chiffre d'affaires (TTC) Left Big Box */}
                <div className="border-2 border-emerald-600/70 rounded-2xl p-6 flex flex-col items-center justify-center bg-white min-h-[140px] text-center">
                  <span className="text-sm font-semibold text-slate-700 mb-2">
                    Chiffre d'affaires (TTC)
                  </span>
                  <span className="text-3xl font-black text-slate-900 font-mono">
                    {(selectedViewJournee.totalChiffreAffairesDH || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DH
                  </span>
                </div>

                {/* Right Stacked 3 items */}
                <div className="space-y-3 flex flex-col justify-between">
                  <div className="border-2 border-emerald-600/70 rounded-xl px-4 py-3 flex items-center justify-between bg-white">
                    <span className="text-xs font-semibold text-slate-700">
                      Ventes Carburants :
                    </span>
                    <span className="font-bold font-mono text-slate-900 text-sm">
                      {(selectedViewJournee.totalCarburantsDH || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DH
                    </span>
                  </div>

                  <div className="border-2 border-emerald-600/70 rounded-xl px-4 py-3 flex items-center justify-between bg-white">
                    <span className="text-xs font-semibold text-slate-700">
                      Ventes Lubrifiants :
                    </span>
                    <span className="font-bold font-mono text-slate-900 text-sm">
                      {(selectedViewJournee.totalProduitsDH || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DH
                    </span>
                  </div>

                  <div className="border-2 border-emerald-600/70 rounded-xl px-4 py-3 flex items-center justify-between bg-white">
                    <span className="text-xs font-semibold text-slate-700">
                      Ventes Services :
                    </span>
                    <span className="font-bold font-mono text-slate-900 text-sm">
                      {(selectedViewJournee.totalServicesDH || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DH
                    </span>
                  </div>
                </div>
              </div>

              {/* Encaissements Box */}
              <div className="pt-2">
                <h3 className="text-xs font-bold text-slate-800 text-center mb-2">
                  Encaissements
                </h3>
                <div className="border-2 border-emerald-600/70 rounded-2xl p-4 bg-white flex items-center justify-center gap-4 flex-wrap">
                  <div className="bg-slate-50 rounded-xl py-3 px-8 text-center min-w-[140px]">
                    <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">
                      ESPÈCES
                    </span>
                    <span className="text-lg font-black text-emerald-700 font-mono mt-1 block">
                      {(selectedViewJournee.especesARemettreDH || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>

                  {selectedViewJournee.totalNonEspecesDH > 0 && (
                    <div className="bg-slate-50 rounded-xl py-3 px-8 text-center min-w-[140px]">
                      <span className="text-[11px] font-bold text-purple-700 uppercase tracking-wider block">
                        NON-ESPÈCES
                      </span>
                      <span className="text-lg font-black text-purple-700 font-mono mt-1 block">
                        {(selectedViewJournee.totalNonEspecesDH || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Autres opérations Box */}
              <div className="pt-2">
                <h3 className="text-xs font-bold text-slate-800 text-center mb-2">
                  Autres opérations
                </h3>
                <div className="border-2 border-emerald-600/70 rounded-2xl p-4 bg-white">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-slate-50 rounded-xl py-3 px-4 text-center">
                      <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                        DÉPENSES
                      </span>
                      <span className="text-base font-black text-slate-900 font-mono mt-1 block">
                        {(selectedViewJournee.totalDepensesEspecesDH || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="bg-slate-50 rounded-xl py-3 px-4 text-center">
                      <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                        RECHARGES
                      </span>
                      <span className="text-base font-black text-slate-900 font-mono mt-1 block">
                        {(selectedViewJournee.totalRechargesDH || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="bg-slate-50 rounded-xl py-3 px-4 text-center">
                      <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                        RÈGLEMENTS TIERS
                      </span>
                      <span className="text-base font-black text-slate-900 font-mono mt-1 block">
                        {(selectedViewJournee.totalReglementsDettesDH || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* DYNAMIC SECTIONS depending on what was entered during the flow */}
            {/* Section 2: Produits Boutique (if any) */}
            {selectedViewJournee.produitEntries && selectedViewJournee.produitEntries.some((p) => (p.quantiteVendue || 0) > 0) && (
              <div className="pt-2 space-y-3 print-break-inside-avoid">
                <h2 className="text-emerald-800 font-bold text-sm tracking-wide">
                  Section 2 : Ventes Boutique & Lubrifiants
                </h2>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-700 font-bold uppercase text-[10px]">
                      <tr>
                        <th className="py-2 px-3">Produit</th>
                        <th className="py-2 px-3 text-right">Quantité</th>
                        <th className="py-2 px-3 text-right">Total TTC</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {selectedViewJournee.produitEntries.filter((p) => (p.quantiteVendue || 0) > 0).map((p, idx) => (
                        <tr key={idx}>
                          <td className="py-2 px-3 font-semibold text-slate-900">{p.nomProduit}</td>
                          <td className="py-2 px-3 text-right">{p.quantiteVendue}</td>
                          <td className="py-2 px-3 text-right font-bold text-emerald-700">{(p.totalDH || 0).toFixed(2)} DH</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Section 3: Services (if any) */}
            {selectedViewJournee.serviceEntries && selectedViewJournee.serviceEntries.some((s) => (s.quantite || 0) > 0) && (
              <div className="pt-2 space-y-3 print-break-inside-avoid">
                <h2 className="text-emerald-800 font-bold text-sm tracking-wide">
                  Section 3 : Prestations de Services & Lavage
                </h2>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-700 font-bold uppercase text-[10px]">
                      <tr>
                        <th className="py-2 px-3">Service</th>
                        <th className="py-2 px-3 text-right">Quantité</th>
                        <th className="py-2 px-3 text-right">Total TTC</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {selectedViewJournee.serviceEntries.filter((s) => (s.quantite || 0) > 0).map((s, idx) => (
                        <tr key={idx}>
                          <td className="py-2 px-3 font-semibold text-slate-900">{s.nomService}</td>
                          <td className="py-2 px-3 text-right">{s.quantite}</td>
                          <td className="py-2 px-3 text-right font-bold text-emerald-700">{(s.totalDH || 0).toFixed(2)} DH</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Section 4: Encaissements Non-Espèces (if any) */}
            {selectedViewJournee.encaissementsNonEspeces && selectedViewJournee.encaissementsNonEspeces.length > 0 && (
              <div className="pt-2 space-y-3 print-break-inside-avoid">
                <h2 className="text-emerald-800 font-bold text-sm tracking-wide">
                  Section 4 : Encaissements Non-Espèces (Bons, TPE, Chèques)
                </h2>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-slate-50 text-slate-700 font-bold uppercase text-[10px]">
                      <tr>
                        <th className="py-2 px-3 font-sans">Client / Organisme</th>
                        <th className="py-2 px-3 font-sans">Mode</th>
                        <th className="py-2 px-3 text-right">Montant</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedViewJournee.encaissementsNonEspeces.map((ne, idx) => (
                        <tr key={idx}>
                          <td className="py-2 px-3 font-sans font-semibold text-slate-900">{ne.clientNom}</td>
                          <td className="py-2 px-3 font-sans text-slate-600">{ne.modePaiement}</td>
                          <td className="py-2 px-3 text-right font-bold text-slate-900">{(ne.montant || 0).toFixed(2)} DH</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Signatures & Cachet Block for Print */}
            <div className="pt-8 border-t border-slate-200 grid grid-cols-2 gap-8 print-break-inside-avoid">
              <div className="text-center p-4 border border-dashed border-slate-300 rounded-xl min-h-[90px] flex flex-col justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Signature & Visa du Pompiste / Responsable
                </span>
                <span className="text-[11px] text-slate-400 font-mono italic">
                  {reportTitleOverride || selectedViewJournee.responsableNom}
                </span>
              </div>
              <div className="text-center p-4 border border-dashed border-slate-300 rounded-xl min-h-[90px] flex flex-col justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Cachet & Visa de la Direction / Gérant
                </span>
                <span className="text-[11px] text-slate-400 font-mono italic">
                  Station {station?.name || 'WINXO'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
