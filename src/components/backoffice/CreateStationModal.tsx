import React, { useState } from 'react';
import {
  X,
  Building2,
  Users,
  Fuel,
  Gauge,
  CheckCircle2,
  RefreshCw,
  Copy,
  Check,
  ArrowRight,
  ArrowLeft,
  Mail,
  Shield,
  Plus,
  Trash2,
  ImageIcon,
  Upload,
} from 'lucide-react';
import { api } from '../../services/api.ts';
import { Station } from '../../types/index.ts';

interface CreateStationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStationCreated: (station: Station) => void;
}

export const CreateStationModal: React.FC<CreateStationModalProps> = ({
  isOpen,
  onClose,
  onStationCreated,
}) => {
  const [step, setStep] = useState<number>(1);
  const [submitting, setSubmitting] = useState(false);
  const [createdResult, setCreatedResult] = useState<any | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Form State
  // 1. Station & Company
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('Winxo');
  const [location, setLocation] = useState('');
  const [city, setCity] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [ice, setIce] = useState('');
  const [patente, setPatente] = useState('');
  const [rc, setRc] = useState('');
  const [phone, setPhone] = useState('');
  const [logoUrl, setLogoUrl] = useState('/src/assets/images/station_modern_exterior_1792246841660.jpg');

  // 2. Users & Accounts
  const [managerName, setManagerName] = useState('');
  const [managerEmail, setManagerEmail] = useState('');
  const [managerPassword, setManagerPassword] = useState('');
  const [hasAccountant, setHasAccountant] = useState(false);
  const [accountantName, setAccountantName] = useState('');
  const [accountantEmail, setAccountantEmail] = useState('');
  const [accountantPassword, setAccountantPassword] = useState('');

  // 3. Fuel & Tanks
  const [gasPrice, setGasPrice] = useState('15.92');
  const [sspPrice, setSspPrice] = useState('15.62');
  const [cgasCapacity, setCgasCapacity] = useState('20000');
  const [cgasInitialStock, setCgasInitialStock] = useState('10000');
  const [csspCapacity, setCsspCapacity] = useState('15000');
  const [csspInitialStock, setCsspInitialStock] = useState('8000');

  // 4. Pumps & Starting Indexes
  const [pumps, setPumps] = useState<Array<{ code: string; carburantCode: string; initialIndex: number }>>([
    { code: 'P1', carburantCode: 'GAS', initialIndex: 1000 },
    { code: 'P2', carburantCode: 'SSP', initialIndex: 1000 },
    { code: 'P3', carburantCode: 'GAS', initialIndex: 1000 },
    { code: 'P4', carburantCode: 'GAS', initialIndex: 1000 },
    { code: 'P5', carburantCode: 'GAS', initialIndex: 1000 },
    { code: 'P6', carburantCode: 'GAS', initialIndex: 1000 },
    { code: 'P7', carburantCode: 'SSP', initialIndex: 1000 },
    { code: 'P8', carburantCode: 'GAS', initialIndex: 1000 },
  ]);

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setLogoUrl(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  if (!isOpen) return null;

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let pass = '';
    for (let i = 0; i < 10; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pass;
  };

  const handleInitManagerPassword = () => {
    setManagerPassword(generateRandomPassword());
  };

  const handleInitAccountantPassword = () => {
    setAccountantPassword(generateRandomPassword());
  };

  const updatePump = (index: number, field: string, value: any) => {
    const updated = [...pumps];
    updated[index] = { ...updated[index], [field]: value };
    setPumps(updated);
  };

  const addPumpRow = () => {
    const nextNum = pumps.length + 1;
    setPumps([
      ...pumps,
      {
        code: `P${nextNum}`,
        carburantCode: nextNum % 3 === 2 ? 'SSP' : 'GAS',
        initialIndex: 0,
      },
    ]);
  };

  const removePumpRow = (index: number) => {
    if (pumps.length <= 1) return;
    setPumps(pumps.filter((_, i) => i !== index));
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        name,
        brand,
        location,
        city,
        companyName: companyName || name,
        ice,
        patente,
        rc,
        phone,
        logoUrl,
        managerName,
        managerEmail,
        managerPassword: managerPassword || generateRandomPassword(),
        hasAccountant,
        accountantName: hasAccountant ? accountantName : undefined,
        accountantEmail: hasAccountant ? accountantEmail : undefined,
        accountantPassword: hasAccountant ? accountantPassword || generateRandomPassword() : undefined,
        gasPrice: parseFloat(gasPrice),
        sspPrice: parseFloat(sspPrice),
        cgasCapacity: parseFloat(cgasCapacity),
        cgasInitialStock: parseFloat(cgasInitialStock),
        csspCapacity: parseFloat(csspCapacity),
        csspInitialStock: parseFloat(csspInitialStock),
        pumpsCount: pumps.length,
        pumps,
      };

      const result = await api.createStation(payload);
      setCreatedResult(result);
      onStationCreated(result.station);
      setStep(5); // Confirmation & credential view
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la création');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Créer une Nouvelle Station-Service (Backoffice)
            </h2>
            <p className="text-xs text-slate-500">
              Configuration complète: Société, gérant, expert-comptable, citernes, pistolets et compteurs
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Indicator */}
        {!createdResult && (
          <div className="px-6 py-3 bg-white border-b border-slate-100 flex items-center justify-between">
            {[
              { num: 1, label: 'Station & Société', icon: Building2 },
              { num: 2, label: 'Utilisateurs & Accès', icon: Users },
              { num: 3, label: 'Carburants & Citernes', icon: Fuel },
              { num: 4, label: 'Pistolets & Index', icon: Gauge },
            ].map((s) => {
              const Icon = s.icon;
              const isActive = step === s.num;
              const isPast = step > s.num;
              return (
                <div key={s.num} className="flex items-center gap-2">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                      isActive
                        ? 'bg-purple-700 text-white'
                        : isPast
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {isPast ? <Check className="w-3.5 h-3.5" /> : s.num}
                  </div>
                  <span
                    className={`text-xs font-medium hidden sm:inline ${
                      isActive ? 'text-slate-900 font-semibold' : 'text-slate-500'
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal Form Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* STEP 1: Station and Company Information */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nom de la Station *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Station Winxo Sidi Ismail"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Enseigne / Marque *
                  </label>
                  <input
                    type="text"
                    required
                    list="brand-suggestions"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    placeholder="Saisissez le nom de la marque (ex: Winxo, Shell, TotalEnergies, Ola Energy...)"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 bg-white"
                  />
                  <datalist id="brand-suggestions">
                    <option value="Winxo" />
                    <option value="Afriquia" />
                    <option value="Shell" />
                    <option value="TotalEnergies" />
                    <option value="Petrom" />
                    <option value="Ola Energy" />
                    <option value="Ziz" />
                    <option value="Atlas" />
                  </datalist>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Emplacement / Adresse *
                  </label>
                  <input
                    type="text"
                    required
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Ex: Route Nationale 1, Km 14"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Ville *
                  </label>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Ex: El Jadida"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-3">
                  Informations Fiscales & Juridiques
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Raison Sociale
                    </label>
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Ex: STE SIDI ISMAIL DISTRIBUTION SARL"
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Numéro ICE
                    </label>
                    <input
                      type="text"
                      value={ice}
                      onChange={(e) => setIce(e.target.value)}
                      placeholder="Ex: 001594832000045"
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Patente
                    </label>
                    <input
                      type="text"
                      value={patente}
                      onChange={(e) => setPatente(e.target.value)}
                      placeholder="Ex: 34120984"
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Registre du Commerce (RC)
                    </label>
                    <input
                      type="text"
                      value={rc}
                      onChange={(e) => setRc(e.target.value)}
                      placeholder="Ex: 45892 El Jadida"
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
                    />
                  </div>
                </div>
              </div>

              {/* Logo Section */}
              <div className="pt-2 border-t border-slate-200">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-2">
                  Logo Officiel de la Station
                </span>
                <p className="text-[11px] text-slate-500 mb-3">
                  Ce logo sera automatiquement hérité par le gérant et imprimé sur ses factures, bons de livraison et devis commerciaux.
                </p>
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl border border-slate-200 bg-white p-1 flex items-center justify-center shrink-0 overflow-hidden shadow-2xs">
                    {logoUrl ? (
                      <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
                    ) : (
                      <ImageIcon className="w-6 h-6 text-slate-400" />
                    )}
                  </div>
                  <div className="space-y-1.5 flex-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      Joindre le logo (PNG, JPG, SVG, WebP)
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoFileChange}
                      className="w-full text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 cursor-pointer"
                    />
                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-[10px] text-slate-400">Ou URL :</span>
                      <input
                        type="text"
                        value={logoUrl}
                        onChange={(e) => setLogoUrl(e.target.value)}
                        placeholder="https://.../logo.png"
                        className="flex-1 text-[11px] px-2 py-1 border border-slate-200 rounded bg-white text-slate-700"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: User Accounts & Roles */}
          {step === 2 && (
            <div className="space-y-6">
              {/* Manager Section */}
              <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-emerald-700" />
                    <span className="text-xs font-bold text-emerald-900 uppercase">
                      Compte du Gérant de Station (Obligatoire)
                    </span>
                  </div>
                  <span className="text-[10px] text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded font-semibold">
                    Rôle: GÉRANT
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Nom complet du Gérant *
                    </label>
                    <input
                      type="text"
                      required
                      value={managerName}
                      onChange={(e) => setManagerName(e.target.value)}
                      placeholder="Ex: Rachid Tazi"
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Adresse email professionnelle *
                    </label>
                    <input
                      type="email"
                      required
                      value={managerEmail}
                      onChange={(e) => setManagerEmail(e.target.value)}
                      placeholder="gerant@station.ma"
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white font-mono"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium text-slate-700">
                      Mot de passe sécurisé généré automatiquement
                    </label>
                    <button
                      type="button"
                      onClick={handleInitManagerPassword}
                      className="text-xs text-emerald-700 hover:text-emerald-900 flex items-center gap-1 font-semibold"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Générer mot de passe
                    </button>
                  </div>
                  <input
                    type="text"
                    value={managerPassword || 'Généré automatiquement à la validation'}
                    onChange={(e) => setManagerPassword(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-emerald-300 bg-white rounded-lg font-mono text-emerald-900 font-bold tracking-wider"
                  />
                </div>
              </div>

              {/* Accountant Section */}
              <div className="p-4 bg-sky-50/50 border border-sky-200 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasAccountant}
                      onChange={(e) => {
                        setHasAccountant(e.target.checked);
                        if (e.target.checked && !accountantPassword) {
                          setAccountantPassword(generateRandomPassword());
                        }
                      }}
                      className="w-4 h-4 text-sky-600 rounded border-slate-300 focus:ring-sky-500"
                    />
                    <span className="text-xs font-bold text-sky-950 uppercase">
                      Créer un compte Expert-Comptable (Optionnel)
                    </span>
                  </label>
                  {hasAccountant && (
                    <span className="text-[10px] text-sky-700 bg-sky-100 px-2 py-0.5 rounded font-semibold">
                      Rôle: EXPERT_COMPTABLE
                    </span>
                  )}
                </div>

                {hasAccountant ? (
                  <div className="space-y-3 pt-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          Nom complet de l'expert-comptable *
                        </label>
                        <input
                          type="text"
                          required={hasAccountant}
                          value={accountantName}
                          onChange={(e) => setAccountantName(e.target.value)}
                          placeholder="Ex: Fatima Zahra Benali"
                          className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          Email professionnel de l'expert-comptable *
                        </label>
                        <input
                          type="email"
                          required={hasAccountant}
                          value={accountantEmail}
                          onChange={(e) => setAccountantEmail(e.target.value)}
                          placeholder="expert.comptable@cabinet.ma"
                          className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 bg-white font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-medium text-slate-700">
                          Mot de passe sécurisé de l'expert-comptable
                        </label>
                        <button
                          type="button"
                          onClick={handleInitAccountantPassword}
                          className="text-xs text-sky-700 hover:text-sky-900 flex items-center gap-1 font-semibold"
                        >
                          <RefreshCw className="w-3 h-3" />
                          Régénérer
                        </button>
                      </div>
                      <input
                        type="text"
                        value={accountantPassword || 'Généré automatiquement'}
                        onChange={(e) => setAccountantPassword(e.target.value)}
                        className="w-full text-xs px-3 py-2 border border-sky-300 bg-white rounded-lg font-mono text-sky-900 font-bold tracking-wider"
                      />
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-500">
                    Activez cette option pour accorder à un expert-comptable l'accès dédié au rapprochement bancaire et à la déclaration de TVA.
                  </p>
                )}
              </div>

              {/* Automatic Email Dispatch Notice */}
              <div className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600">
                <Mail className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  Les identifiants et mots de passe aléatoires générés seront automatiquement transmis par e-mail et consignés dans la boîte d'envoi.
                </span>
              </div>
            </div>
          )}

          {/* STEP 3: Fuel & Citernes (Tanks) */}
          {step === 3 && (
            <div className="space-y-6">
              {/* Selling Prices */}
              <div>
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-2">
                  Prix de Vente Initiaux des Carburants (DH / Litre)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                    <label className="block text-xs font-semibold text-slate-800 mb-1">
                      Prix Gasoil (DH / L) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={gasPrice}
                      onChange={(e) => setGasPrice(e.target.value)}
                      className="w-full text-sm font-mono font-bold px-3 py-2 border border-slate-300 rounded-lg bg-white"
                    />
                  </div>

                  <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50/50">
                    <label className="block text-xs font-semibold text-emerald-900 mb-1">
                      Prix Super Sans Plomb (SSP) (DH / L) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={sspPrice}
                      onChange={(e) => setSspPrice(e.target.value)}
                      className="w-full text-sm font-mono font-bold px-3 py-2 border border-emerald-300 rounded-lg bg-white text-emerald-800"
                    />
                  </div>
                </div>
              </div>

              {/* Citernes (Tanks) Configuration */}
              <div>
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-2">
                  Citernes & Stocks Quotidiens Initiaux
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Citerne CGAS */}
                  <div className="p-4 border border-slate-200 rounded-lg space-y-3 bg-white">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900">Citerne CGAS (Gasoil)</span>
                      <span className="text-[10px] font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded">GAS</span>
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-600 mb-0.5">Capacité maximale (Litres)</label>
                      <input
                        type="number"
                        value={cgasCapacity}
                        onChange={(e) => setCgasCapacity(e.target.value)}
                        className="w-full text-xs font-mono px-3 py-1.5 border border-slate-300 rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-600 mb-0.5">Stock initial au démarrage (Litres)</label>
                      <input
                        type="number"
                        value={cgasInitialStock}
                        onChange={(e) => setCgasInitialStock(e.target.value)}
                        className="w-full text-xs font-mono font-bold px-3 py-1.5 border border-slate-300 rounded text-slate-900"
                      />
                    </div>
                  </div>

                  {/* Citerne CSSP */}
                  <div className="p-4 border border-emerald-200 rounded-lg space-y-3 bg-white">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-emerald-900">Citerne CSSP (Sans Plomb)</span>
                      <span className="text-[10px] font-mono bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">SSP</span>
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-600 mb-0.5">Capacité maximale (Litres)</label>
                      <input
                        type="number"
                        value={csspCapacity}
                        onChange={(e) => setCsspCapacity(e.target.value)}
                        className="w-full text-xs font-mono px-3 py-1.5 border border-slate-300 rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-600 mb-0.5">Stock initial au démarrage (Litres)</label>
                      <input
                        type="number"
                        value={csspInitialStock}
                        onChange={(e) => setCsspInitialStock(e.target.value)}
                        className="w-full text-xs font-mono font-bold px-3 py-1.5 border border-slate-300 rounded text-emerald-900"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Pumps (Pistolets) & Initial Meters (Index) */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Pistolets de Distribution & Index Compteurs Initiaux
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Configurez le numéro du pistolet, le type de carburant et l'index de départ relevé
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addPumpRow}
                  className="px-2.5 py-1 text-xs font-semibold text-purple-700 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Ajouter un pistolet
                </button>
              </div>

              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <tr>
                      <th className="py-2 px-3">Identifiant</th>
                      <th className="py-2 px-3">Type Carburant</th>
                      <th className="py-2 px-3">Index Initial Compteur</th>
                      <th className="py-2 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pumps.map((pump, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/60">
                        <td className="py-2 px-3 font-bold text-slate-800">
                          <input
                            type="text"
                            value={pump.code}
                            onChange={(e) => updatePump(idx, 'code', e.target.value)}
                            className="w-16 px-2 py-1 text-xs font-bold border border-slate-300 rounded text-center"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <select
                            value={pump.carburantCode}
                            onChange={(e) => updatePump(idx, 'carburantCode', e.target.value)}
                            className={`px-2 py-1 text-xs font-semibold rounded border ${
                              pump.carburantCode === 'SSP'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                : 'bg-slate-100 text-slate-800 border-slate-300'
                            }`}
                          >
                            <option value="GAS">GAS (Gasoil)</option>
                            <option value="SSP">SSP (Super Sans Plomb)</option>
                          </select>
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="number"
                            value={pump.initialIndex}
                            onChange={(e) => updatePump(idx, 'initialIndex', parseFloat(e.target.value) || 0)}
                            className="w-32 px-2 py-1 text-xs font-mono font-bold border border-slate-300 rounded text-right"
                          />
                        </td>
                        <td className="py-2 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => removePumpRow(idx)}
                            className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                            title="Supprimer"
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
          )}

          {/* STEP 5: Success & Credentials View */}
          {step === 5 && createdResult && (
            <div className="space-y-6 text-center py-4">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7" />
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Station-Service Créée avec Succès !
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  La station "{createdResult.station.name}" est désormais opérationnelle. Les identifiants ont été envoyés par e-mail.
                </p>
              </div>

              {/* Credentials Box */}
              <div className="text-left bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 max-w-lg mx-auto">
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
                  Identifiants d'Accès Générés
                </span>

                {/* Manager */}
                <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1 text-xs">
                  <div className="flex items-center justify-between font-semibold text-slate-800">
                    <span>Gérant: {createdResult.station.managerName || managerName}</span>
                    <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">Rôle GÉRANT</span>
                  </div>
                  <div className="text-slate-600 font-mono text-[11px]">
                    Email: {createdResult.credentials.manager.email}
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-slate-500">Mot de passe:</span>
                    <div className="flex items-center gap-1">
                      <code className="font-mono font-bold bg-slate-100 px-2 py-0.5 rounded text-emerald-800">
                        {createdResult.credentials.manager.password}
                      </code>
                      <button
                        onClick={() => handleCopy(createdResult.credentials.manager.password, 'manager')}
                        className="p-1 text-slate-500 hover:text-slate-900"
                        title="Copier"
                      >
                        {copiedKey === 'manager' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Accountant if created */}
                {createdResult.credentials.accountant && (
                  <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1 text-xs">
                    <div className="flex items-center justify-between font-semibold text-slate-800">
                      <span>Expert-Comptable: {accountantName}</span>
                      <span className="text-[10px] text-sky-700 bg-sky-50 px-2 py-0.5 rounded">Rôle EXPERT_COMPTABLE</span>
                    </div>
                    <div className="text-slate-600 font-mono text-[11px]">
                      Email: {createdResult.credentials.accountant.email}
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] text-slate-500">Mot de passe:</span>
                      <div className="flex items-center gap-1">
                        <code className="font-mono font-bold bg-slate-100 px-2 py-0.5 rounded text-sky-800">
                          {createdResult.credentials.accountant.password}
                        </code>
                        <button
                          onClick={() => handleCopy(createdResult.credentials.accountant.password, 'accountant')}
                          className="p-1 text-slate-500 hover:text-slate-900"
                          title="Copier"
                        >
                          {copiedKey === 'accountant' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation Buttons */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          {step === 5 ? (
            <div className="w-full flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors"
              >
                Terminer & Accéder à la Liste
              </button>
            </div>
          ) : (
            <>
              {step > 1 ? (
                <button
                  type="button"
                  onClick={() => setStep(step - 1)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 flex items-center gap-1.5 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Précédent
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
                >
                  Annuler
                </button>
              )}

              {step < 4 ? (
                <button
                  type="button"
                  onClick={() => {
                    if (step === 1 && (!name || !location || !city)) {
                      alert('Veuillez renseigner le nom, l\'emplacement et la ville de la station.');
                      return;
                    }
                    if (step === 2 && (!managerName || !managerEmail)) {
                      alert('Veuillez renseigner le nom et l\'email du gérant.');
                      return;
                    }
                    if (step === 2 && hasAccountant && (!accountantName || !accountantEmail)) {
                      alert('Veuillez renseigner le nom et l\'email de l\'expert-comptable.');
                      return;
                    }
                    setStep(step + 1);
                  }}
                  className="px-4 py-2 text-xs font-bold text-white bg-purple-700 hover:bg-purple-800 rounded-lg flex items-center gap-1.5 transition-colors"
                >
                  Suivant
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleSubmit}
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
                >
                  {submitting ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  <span>Créer la Station & Générer les Accès</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
