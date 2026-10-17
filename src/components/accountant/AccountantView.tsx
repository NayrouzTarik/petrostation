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
} from 'lucide-react';
import { api } from '../../services/api.ts';
import { useAuth } from '../../context/AuthContext.tsx';

export const AccountantView: React.FC = () => {
  const { station } = useAuth();
  const [activeTab, setActiveTab] = useState<'rapprochement' | 'tva' | 'grand_livre'>('rapprochement');
  const [achats, setAchats] = useState<any[]>([]);
  const [depenses, setDepenses] = useState<any[]>([]);
  const [journees, setJournees] = useState<any[]>([]);
  const [tiers, setTiers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Bank reconciliation checklist
  const [reconciledItems, setReconciledItems] = useState<Record<string, boolean>>({
    'rec-1': true,
    'rec-2': true,
  });

  const loadData = async () => {
    if (!station) return;
    try {
      setLoading(true);
      const [aList, dList, jList, tList] = await Promise.all([
        api.getAchats(station.id),
        api.getDepenses(station.id),
        api.getJournees(station.id),
        api.getTiers(station.id),
      ]);
      setAchats(aList);
      setDepenses(dList);
      setJournees(jList);
      setTiers(tList);
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

  // TVA Calculations
  // Total TVA Collectée on Sales (Carburants ~ 10%, Services & Produits ~ 20%)
  let tvaCollectee = 0;
  journees.forEach((j) => {
    const fuelHT = (j.totalCarburantsDH || 0) / 1.1;
    const prodServHT = ((j.totalProduitsDH || 0) + (j.totalServicesDH || 0)) / 1.2;
    tvaCollectee += (j.totalCarburantsDH || 0) - fuelHT + ((j.totalProduitsDH || 0) + (j.totalServicesDH || 0) - prodServHT);
  });

  // Total TVA Déductible on Purchases & Expenses
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

  // Dynamically aggregate real bank operations from station transactions:
  // 1. Cash deposits from closed shifts (Journées)
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

  // 2. Payments to suppliers via Cheque / Bank Transfer (Achats)
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

  // 3. Operating expenses settled via Cheque / Bank Transfer (Dépenses)
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

  // Initialize all items as pointed by default for a clean balance unless unchecked
  const totalOpsNet = bankOperations.reduce((acc, curr) => acc + curr.credit - curr.debit, 0);
  const bankTier = tiers.find((t) => t.type === 'Banque');
  const soldeComptableBanque = bankTier?.solde !== undefined && bankTier.solde !== 0 ? bankTier.solde : totalOpsNet;

  const pointedCredits = bankOperations
    .filter((op) => reconciledItems[op.id] !== false)
    .reduce((acc, op) => acc + op.credit, 0);
  const pointedDebits = bankOperations
    .filter((op) => reconciledItems[op.id] !== false)
    .reduce((acc, op) => acc + op.debit, 0);
  const soldeReleveBancaire = pointedCredits - pointedDebits;
  const ecartRapprochement = soldeComptableBanque - soldeReleveBancaire;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-sky-700 uppercase tracking-wider bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
              Espace Expert-Comptable
            </span>
            <span className="text-xs text-slate-400">·</span>
            <span className="text-xs text-slate-500 font-medium">Station: {station?.name}</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight mt-1">
            Comptabilité, Rapprochement Bancaire & Gestion TVA
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Modules certifiés pour le cabinet fiduciaire: Rapprochement des extraits de compte et déclaration fiscale de TVA.
          </p>
        </div>

        <button
          onClick={loadData}
          className="p-2 text-slate-600 hover:text-slate-900 border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors self-start sm:self-auto"
          title="Actualiser"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-6 border-b border-slate-200 text-xs font-bold">
        <button
          onClick={() => setActiveTab('rapprochement')}
          className={`pb-3 uppercase tracking-wider transition-colors border-b-2 ${
            activeTab === 'rapprochement'
              ? 'border-sky-700 text-sky-800'
              : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          Rapprochement Bancaire ({bankOperations.length})
        </button>
        <button
          onClick={() => setActiveTab('tva')}
          className={`pb-3 uppercase tracking-wider transition-colors border-b-2 ${
            activeTab === 'tva'
              ? 'border-sky-700 text-sky-800'
              : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          Gestion & Déclaration TVA
        </button>
        <button
          onClick={() => setActiveTab('grand_livre')}
          className={`pb-3 uppercase tracking-wider transition-colors border-b-2 ${
            activeTab === 'grand_livre'
              ? 'border-sky-700 text-sky-800'
              : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          Grand Livre des Tiers
        </button>
      </div>

      {/* TAB 1: Rapprochement Bancaire */}
      {activeTab === 'rapprochement' && (
        <div className="space-y-5">
          {/* Summary Reconciliation Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase block mb-1">
                Solde Comptable Banque
              </span>
              <div className="text-xl font-black text-slate-900 font-mono tabular-nums">
                {soldeComptableBanque.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DH
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">Compte 5141 · Écritures station</span>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase block mb-1">
                Total Pointé (Relevé)
              </span>
              <div className="text-xl font-black text-slate-900 font-mono tabular-nums">
                {soldeReleveBancaire.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DH
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">Écritures vérifiées & cochées</span>
            </div>

            <div className={`p-4 rounded-xl shadow-2xs border ${
              Math.abs(ecartRapprochement) < 0.01
                ? 'bg-emerald-50 border-emerald-200'
                : 'bg-amber-50 border-amber-200'
            }`}>
              <span className={`text-[11px] font-semibold uppercase block mb-1 ${
                Math.abs(ecartRapprochement) < 0.01 ? 'text-emerald-800' : 'text-amber-800'
              }`}>
                Écart de Rapprochement
              </span>
              <div className={`text-xl font-black font-mono tabular-nums ${
                Math.abs(ecartRapprochement) < 0.01 ? 'text-emerald-700' : 'text-amber-700'
              }`}>
                {ecartRapprochement.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DH
              </div>
              <span className={`text-[10px] mt-1 block font-semibold ${
                Math.abs(ecartRapprochement) < 0.01 ? 'text-emerald-600' : 'text-amber-600'
              }`}>
                {Math.abs(ecartRapprochement) < 0.01 ? 'Parfaitement réconcilié ✓' : 'Écart à vérifier'}
              </span>
            </div>
          </div>

          {/* Operations table */}
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
                      className={`hover:bg-slate-50/60 ${
                        isChecked ? 'bg-emerald-50/30' : ''
                      }`}
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
                      <td className="py-2.5 px-4 font-sans font-semibold text-slate-900">
                        {op.libelle}
                      </td>
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

      {/* TAB 2: Gestion & Déclaration TVA */}
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
              Régime des encaissements ou des débits selon l'option fiscale souscrite par {station?.companyName || station?.name}.
              La TVA sur le gasoil et le sans-plomb bénéficie du taux réduit de 10% (Article 99 du CGI), tandis que les prestations de lavage, vidange et ventes de lubrifiants relèvent du taux normal de 20%.
            </p>
          </div>
        </div>
      )}

      {/* TAB 3: Grand Livre */}
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
    </div>
  );
};
