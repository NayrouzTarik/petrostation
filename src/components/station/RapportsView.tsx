import React, { useEffect, useState } from 'react';
import {
  BarChart3,
  Archive,
  Download,
  Calendar,
  Filter,
  DollarSign,
  Fuel,
  Package,
  Sparkles,
  TrendingUp,
  FileSpreadsheet,
  X,
  CheckCircle,
} from 'lucide-react';
import { api } from '../../services/api.ts';
import { useAuth } from '../../context/AuthContext.tsx';

type ReportTab =
  | 'ca_jour'
  | 'transactions_tiers'
  | 'ventes_carburants'
  | 'stock_carburants'
  | 'ventes_produits'
  | 'stock_produits'
  | 'ventes_services'
  | 'cpc';

export const RapportsView: React.FC = () => {
  const { station } = useAuth();
  const [activeTab, setActiveTab] = useState<ReportTab>(() => {
    const saved = localStorage.getItem('stationhub_rapport_tab') as ReportTab | null;
    if (saved) {
      localStorage.removeItem('stationhub_rapport_tab');
      return saved;
    }
    return 'ca_jour';
  });
  const [reportsData, setReportsData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [startDate, setStartDate] = useState('2026-10-01');
  const [endDate, setEndDate] = useState('2026-10-31');
  const [year, setYear] = useState('2026');

  // Archive Modal State
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);
  const [archiveMonth, setArchiveMonth] = useState('10');
  const [archiveYear, setArchiveYear] = useState('2026');
  const [isDownloading, setIsDownloading] = useState(false);

  const loadData = async () => {
    if (!station) return;
    try {
      setLoading(true);
      const res = await api.getRapports(station.id, { startDate, endDate, year });
      setReportsData(res);
    } catch (err) {
      console.error('Failed to load reports', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [station, startDate, endDate, year]);

  const handleDownloadArchive = () => {
    setIsDownloading(true);
    setTimeout(() => {
      // Create downloadable JSON report summary
      const blob = new Blob(
        [
          JSON.stringify(
            {
              station: station?.name,
              mois: `${archiveMonth}/${archiveYear}`,
              generatedAt: new Date().toISOString(),
              data: reportsData,
            },
            null,
            2
          ),
        ],
        { type: 'application/json' }
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `archive_cloture_${station?.code || 'station'}_${archiveMonth}_${archiveYear}.json`;
      a.click();
      setIsDownloading(false);
      setIsArchiveOpen(false);
    }, 1000);
  };

  const tabsMeta: Array<{ key: ReportTab; label: string }> = [
    { key: 'ca_jour', label: '1er : C.A. par jour' },
    { key: 'transactions_tiers', label: '2eme : Transactions Tiers' },
    { key: 'ventes_carburants', label: '3eme : Ventes de Carburants' },
    { key: 'stock_carburants', label: '4em : Stock Carburants' },
    { key: 'ventes_produits', label: '5em : Ventes de Produits' },
    { key: 'stock_produits', label: '6em : Stock Produits' },
    { key: 'ventes_services', label: '7em : Ventes de Services' },
    { key: 'cpc', label: '8em : CPC (Résultat Net)' },
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* 8 Tabs Header matching PDF Page 15, 16, 17 */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-slate-200">
        <div className="flex flex-wrap items-center gap-1">
          {tabsMeta.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                activeTab === t.key
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Top Right Archivage Button matching PDF Page 17 */}
        <button
          onClick={() => setIsArchiveOpen(true)}
          className="px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg flex items-center gap-1.5 shadow-xs transition-colors shrink-0"
        >
          <Archive className="w-3.5 h-3.5" />
          <span>Archivage Mensuel</span>
        </button>
      </div>

      {/* Date Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <Calendar className="w-4 h-4 text-slate-400" />
          <span>Période d'analyse :</span>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">Du:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2.5 py-1 font-mono text-xs border border-slate-300 rounded bg-white"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">Au:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2.5 py-1 font-mono text-xs border border-slate-300 rounded bg-white"
            />
          </div>
        </div>
      </div>

      {/* REPORT 1: C.A. par jour (Page 15 top) */}
      {activeTab === 'ca_jour' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
          <div className="p-4 border-b border-slate-200 text-xs font-bold text-slate-900">
            Chiffre d'affaires par jour
          </div>
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
              <tr>
                <th className="py-2.5 px-4">Date</th>
                <th className="py-2.5 px-4 text-right">Chiffre d'Affaires (DH)</th>
                <th className="py-2.5 px-4 text-right">Bons Clients (DH)</th>
                <th className="py-2.5 px-4 text-right">Dépenses (DH)</th>
                <th className="py-2.5 px-4 text-right">Règ. Tiers (DH)</th>
                <th className="py-2.5 px-4 text-right">Encais. Espèces (DH)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {reportsData?.caParJour?.map((r: any, idx: number) => (
                <tr key={idx} className="hover:bg-slate-50/60">
                  <td className="py-2.5 px-4 text-slate-700 font-sans">{r.date}</td>
                  <td className="py-2.5 px-4 text-right font-bold text-slate-900 tabular-nums">
                    {r.chiffreAffaires.toFixed(2)}
                  </td>
                  <td className="py-2.5 px-4 text-right text-slate-600 tabular-nums">
                    {r.bonsClients.toFixed(2)}
                  </td>
                  <td className="py-2.5 px-4 text-right text-rose-600 tabular-nums">
                    {r.depenses.toFixed(2)}
                  </td>
                  <td className="py-2.5 px-4 text-right text-slate-600 tabular-nums">
                    {r.regTiers.toFixed(2)}
                  </td>
                  <td className="py-2.5 px-4 text-right font-bold text-emerald-800 tabular-nums">
                    {r.encaisEspeces.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* REPORT 2: Transactions Tiers (Page 15 middle) */}
      {activeTab === 'transactions_tiers' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
          <div className="p-4 border-b border-slate-200 text-xs font-bold text-slate-900">
            Transactions Tiers (Balances & Évolution)
          </div>
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
              <tr>
                <th className="py-2.5 px-4">Tier</th>
                <th className="py-2.5 px-4 text-right">Solde Début</th>
                <th className="py-2.5 px-4 text-right">Total Débit</th>
                <th className="py-2.5 px-4 text-right">Total Crédit</th>
                <th className="py-2.5 px-4 text-right">Solde Fin (DH)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {reportsData?.transactionsTiers?.map((t: any) => (
                <tr key={t.id} className="hover:bg-slate-50/60">
                  <td className="py-2.5 px-4 font-sans font-bold text-slate-900">{t.name}</td>
                  <td className="py-2.5 px-4 text-right text-slate-600 tabular-nums">{t.soldeDebut.toFixed(2)}</td>
                  <td className="py-2.5 px-4 text-right text-slate-600 tabular-nums">{t.totalDebit.toFixed(2)}</td>
                  <td className="py-2.5 px-4 text-right text-slate-600 tabular-nums">{t.totalCredit.toFixed(2)}</td>
                  <td className={`py-2.5 px-4 text-right font-bold tabular-nums ${t.soldeFin < 0 ? 'text-rose-700' : 'text-slate-900'}`}>
                    {t.soldeFin.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* REPORT 3: Ventes de Carburants (Page 15 bottom) */}
      {activeTab === 'ventes_carburants' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
          <div className="p-4 border-b border-slate-200 text-xs font-bold text-slate-900">
            Ventes de Carburants (Ventilation Gasoil & Super Sans Plomb)
          </div>
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
              <tr>
                <th className="py-2.5 px-4">Date</th>
                <th className="py-2.5 px-4 text-right">GAS (L)</th>
                <th className="py-2.5 px-4 text-right">GAS (DH)</th>
                <th className="py-2.5 px-4 text-right">SSP (L)</th>
                <th className="py-2.5 px-4 text-right">SSP (DH)</th>
                <th className="py-2.5 px-4 text-right">Total (L)</th>
                <th className="py-2.5 px-4 text-right">Total (DH)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {reportsData?.ventesCarburants?.map((vc: any, idx: number) => (
                <tr key={idx} className="hover:bg-slate-50/60">
                  <td className="py-2.5 px-4 font-sans text-slate-700">{vc.date}</td>
                  <td className="py-2.5 px-4 text-right text-slate-900">{vc.gasL} L</td>
                  <td className="py-2.5 px-4 text-right font-bold text-slate-900">{vc.gasDH.toFixed(2)}</td>
                  <td className="py-2.5 px-4 text-right text-emerald-800">{vc.sspL} L</td>
                  <td className="py-2.5 px-4 text-right font-bold text-emerald-800">{vc.sspDH.toFixed(2)}</td>
                  <td className="py-2.5 px-4 text-right font-black text-slate-900">{vc.totalL} L</td>
                  <td className="py-2.5 px-4 text-right font-black text-slate-900">{vc.totalDH.toFixed(2)} DH</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* REPORT 4: Stock Carburants (Page 16 top) */}
      {activeTab === 'stock_carburants' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
          <div className="p-4 border-b border-slate-200 text-xs font-bold text-slate-900">
            Stock Carburants (Réconciliation Citernes & Jaugeage)
          </div>
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
              <tr>
                <th className="py-2.5 px-4">Carburant</th>
                <th className="py-2.5 px-4 text-right">Stock Début (L)</th>
                <th className="py-2.5 px-4 text-right">Achats (Entrées) (L)</th>
                <th className="py-2.5 px-4 text-right">Ventes (Sorties) (L)</th>
                <th className="py-2.5 px-4 text-right">Écart Jaugeage (L)</th>
                <th className="py-2.5 px-4 text-right">Écart (% Ventes)</th>
                <th className="py-2.5 px-4 text-right">Stock Fin (L)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {reportsData?.stockCarburants?.map((sc: any, idx: number) => (
                <tr key={idx} className="hover:bg-slate-50/60">
                  <td className="py-2.5 px-4 font-sans font-bold text-slate-900">{sc.carburant} ({sc.code})</td>
                  <td className="py-2.5 px-4 text-right text-slate-600">{sc.stockDebut.toLocaleString('fr-FR')}</td>
                  <td className="py-2.5 px-4 text-right text-emerald-700 font-semibold">+{sc.achats.toLocaleString('fr-FR')}</td>
                  <td className="py-2.5 px-4 text-right text-rose-700 font-semibold">-{sc.ventes.toLocaleString('fr-FR')}</td>
                  <td className="py-2.5 px-4 text-right text-slate-600">{sc.ecartJaugeage}</td>
                  <td className="py-2.5 px-4 text-right text-slate-600">{sc.ecartPercent}</td>
                  <td className="py-2.5 px-4 text-right font-black text-slate-900">{sc.stockFin.toLocaleString('fr-FR')} L</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* REPORT 5: Ventes de Produits (Page 16 middle) */}
      {activeTab === 'ventes_produits' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
          <div className="p-4 border-b border-slate-200 text-xs font-bold text-slate-900">
            Ventes de Produits
          </div>
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
              <tr>
                <th className="py-2.5 px-4">Nom Produit</th>
                <th className="py-2.5 px-4">Marque</th>
                <th className="py-2.5 px-4 text-right">Quantité Vendue</th>
                <th className="py-2.5 px-4 text-right">Prix Unitaire Moyen</th>
                <th className="py-2.5 px-4 text-right">Total (DH)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {reportsData?.ventesProduits?.map((vp: any, idx: number) => (
                <tr key={idx} className="hover:bg-slate-50/60">
                  <td className="py-2.5 px-4 font-bold text-slate-900">{vp.nomProduit}</td>
                  <td className="py-2.5 px-4 text-slate-600">{vp.marque}</td>
                  <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">{vp.quantiteVendue}</td>
                  <td className="py-2.5 px-4 text-right font-mono text-slate-600">{vp.prixMoyen.toFixed(2)} DH</td>
                  <td className="py-2.5 px-4 text-right font-mono font-bold text-emerald-800">{vp.totalDH.toFixed(2)} DH</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* REPORT 6: Stock Produits (Page 16 bottom) */}
      {activeTab === 'stock_produits' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
          <div className="p-4 border-b border-slate-200 text-xs font-bold text-slate-900">
            Stock Produits & Valorisation
          </div>
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
              <tr>
                <th className="py-2.5 px-4">Produit</th>
                <th className="py-2.5 px-4 text-right">P.U Achat (TTC)</th>
                <th className="py-2.5 px-4 text-right">P.U Vente (TTC)</th>
                <th className="py-2.5 px-4 text-right">Stock Début</th>
                <th className="py-2.5 px-4 text-right">Ventes (Sorties)</th>
                <th className="py-2.5 px-4 text-right">Stock Fin (U)</th>
                <th className="py-2.5 px-4 text-right">Stock Fin Valorisé (DH)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {reportsData?.stockProduits?.map((sp: any, idx: number) => (
                <tr key={idx} className="hover:bg-slate-50/60">
                  <td className="py-2.5 px-4 font-sans font-bold text-slate-900">{sp.produit}</td>
                  <td className="py-2.5 px-4 text-right text-slate-600">{sp.puAchatTTC.toFixed(2)}</td>
                  <td className="py-2.5 px-4 text-right font-bold text-slate-800">{sp.puVenteTTC.toFixed(2)}</td>
                  <td className="py-2.5 px-4 text-right text-slate-500">{sp.stockDebut}</td>
                  <td className="py-2.5 px-4 text-right text-rose-600">-{sp.ventes}</td>
                  <td className="py-2.5 px-4 text-right font-bold text-slate-900">{sp.stockFin}</td>
                  <td className="py-2.5 px-4 text-right font-bold text-emerald-800">{sp.stockFinValorise.toFixed(2)} DH</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* REPORT 7: Ventes de Services (Page 17 top) */}
      {activeTab === 'ventes_services' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
          <div className="p-4 border-b border-slate-200 text-xs font-bold text-slate-900">
            Ventes de Services (Lavage & Vidange)
          </div>
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
              <tr>
                <th className="py-2.5 px-4">Date</th>
                <th className="py-2.5 px-4">Service</th>
                <th className="py-2.5 px-4">Catégorie</th>
                <th className="py-2.5 px-4 text-right">Quantité</th>
                <th className="py-2.5 px-4 text-right">Total (DH)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {reportsData?.ventesServices?.map((vs: any, idx: number) => (
                <tr key={idx} className="hover:bg-slate-50/60">
                  <td className="py-2.5 px-4 font-sans text-slate-700">{vs.date}</td>
                  <td className="py-2.5 px-4 font-sans font-bold text-slate-900">{vs.service}</td>
                  <td className="py-2.5 px-4 font-sans text-slate-600">{vs.category}</td>
                  <td className="py-2.5 px-4 text-right font-bold text-slate-900">{vs.quantite}</td>
                  <td className="py-2.5 px-4 text-right font-bold text-emerald-800">{vs.totalDH.toFixed(2)} DH</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* REPORT 8: CPC - Compte de Produits et Charges (Page 17 middle) */}
      {activeTab === 'cpc' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs space-y-4">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Compte de Produits et de Charges (CPC Annuel)
              </h2>
              <p className="text-[11px] text-slate-500">
                Chiffre d'affaires, Coût des marchandises vendues (CMV), charges et résultat net
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-600 font-semibold">Année :</span>
              <select
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="text-xs font-bold px-3 py-1 border border-slate-300 rounded-lg bg-white font-mono"
              >
                <option value="2026">2026</option>
                <option value="2025">2025</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[750px]">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Mois</th>
                  <th className="py-2.5 px-3 text-right">V. Carburants</th>
                  <th className="py-2.5 px-3 text-right">V. Produits</th>
                  <th className="py-2.5 px-3 text-right">V. Services</th>
                  <th className="py-2.5 px-3 text-right">Chiffre d'Affaires</th>
                  <th className="py-2.5 px-3 text-right">CMV</th>
                  <th className="py-2.5 px-3 text-right">Charges</th>
                  <th className="py-2.5 px-3 text-right">Résultat Net</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {reportsData?.cpcMensuel?.map((cpc: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-50/60">
                    <td className="py-2.5 px-3 font-sans font-bold text-slate-800">{cpc.mois}</td>
                    <td className="py-2.5 px-3 text-right text-slate-700">{cpc.vCarburants.toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-right text-slate-700">{cpc.vProduits.toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-right text-slate-700">{cpc.vServices.toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-900">{cpc.chiffreAffaires.toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-right text-slate-600">{cpc.cmv.toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-right text-amber-700">{cpc.charges.toFixed(2)}</td>
                    <td
                      className={`py-2.5 px-3 text-right font-black ${
                        cpc.resultatNet >= 0 ? 'text-emerald-800' : 'text-rose-700'
                      }`}
                    >
                      {cpc.resultatNet.toFixed(2)} DH
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: Module d'archivage (Faithful to PDF Page 17 bottom) */}
      {isArchiveOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h2 className="text-sm font-bold text-slate-900">Module d'archivage</h2>
              <button
                onClick={() => setIsArchiveOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs text-slate-700">
              <p className="leading-relaxed">
                Ce module vous permet de générer et de télécharger une archive complète contenant l'ensemble des rapports pour un mois spécifique.
              </p>

              {/* Exact 6-point archive structure from PDF screenshot */}
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5 font-medium text-slate-800">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                  L'archive comprend une structure organisée en dossiers :
                </span>
                <div>1. Rapports des journées</div>
                <div>2. Factures des achats</div>
                <div>3. Factures clients</div>
                <div>4. Factures des dépenses</div>
                <div>5. Rapports transactions tiers</div>
                <div>6. Rapports divers (CA, ventes, stock, etc.)</div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <label className="font-semibold text-slate-700">
                  Sélectionner le mois et l'année :
                </label>
                <div className="flex items-center gap-2">
                  <select
                    value={archiveMonth}
                    onChange={(e) => setArchiveMonth(e.target.value)}
                    className="px-2.5 py-1.5 border border-slate-300 rounded font-medium bg-white"
                  >
                    <option value="10">Octobre</option>
                    <option value="09">Septembre</option>
                    <option value="08">Août</option>
                    <option value="07">Juillet</option>
                  </select>
                  <select
                    value={archiveYear}
                    onChange={(e) => setArchiveYear(e.target.value)}
                    className="px-2.5 py-1.5 border border-slate-300 rounded font-medium bg-white font-mono"
                  >
                    <option value="2026">2026</option>
                    <option value="2025">2025</option>
                  </select>
                </div>
              </div>

              <p className="text-[11px] text-slate-500 italic">
                Vous pouvez ainsi les sauvegarder afin de conserver une archive complète en local.
              </p>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsArchiveOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  disabled={isDownloading}
                  onClick={handleDownloadArchive}
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{isDownloading ? 'Génération...' : 'Télécharger'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
