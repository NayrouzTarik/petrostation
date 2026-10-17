import React, { useState, useRef } from 'react';
import {
  User as UserIcon,
  Image,
  Lock,
  Save,
  Upload,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  RotateCcw,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { StationLogo } from '../common/StationLogo.tsx';

export const SettingsView: React.FC = () => {
  const { user, station, updateGerantSettings } = useAuth();

  // 1. Manager Name State
  const [managerName, setManagerName] = useState(user?.name || '');

  // 2. Station Logo State (scoped to this station and client)
  const [currentLogo, setCurrentLogo] = useState<string>(() => {
    if (station?.logoUrl && !station.logoUrl.includes('station_modern_exterior')) {
      return station.logoUrl;
    }
    if (station?.id && typeof window !== 'undefined') {
      return localStorage.getItem(`stationhub_logo_${station.id}`) || '';
    }
    return '';
  });
  const [logoPreview, setLogoPreview] = useState<string>(currentLogo);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 3. Password State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  // UI status
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Handle Logo Upload from Local Computer
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('Le fichier image ne doit pas dépasser 5 Mo');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setLogoPreview(result);
      setErrorMessage(null);
    };
    reader.readAsDataURL(file);
  };

  // Reset to Default Brand Logo (Shell)
  const handleResetToDefaultLogo = () => {
    setLogoPreview('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    setErrorMessage(null);
  };

  // Save Settings
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    // Validation
    if (!managerName.trim()) {
      setErrorMessage('Le nom du gérant est obligatoire.');
      return;
    }

    if (newPassword || confirmPassword) {
      if (!currentPassword) {
        setErrorMessage('Veuillez saisir votre mot de passe actuel pour valider le changement.');
        return;
      }
      if (newPassword.length < 6) {
        setErrorMessage('Le nouveau mot de passe doit comporter au moins 6 caractères.');
        return;
      }
      if (newPassword !== confirmPassword) {
        setErrorMessage('Le nouveau mot de passe et sa confirmation ne correspondent pas.');
        return;
      }
    }

    try {
      setSaving(true);
      await updateGerantSettings({
        name: managerName.trim(),
        logoUrl: logoPreview,
        currentPassword: currentPassword || undefined,
        newPassword: newPassword || undefined,
      });

      setCurrentLogo(logoPreview);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      setSuccessMessage('Vos paramètres (nom, logo et mot de passe) ont été mis à jour avec succès.');
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Une erreur est survenue lors de la mise à jour.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8 animate-in fade-in duration-150">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center font-bold">
            <UserIcon className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              Paramètres du Profil Gérant
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Gérez votre identité, le logo officiel de votre station et la sécurité de votre compte.
            </p>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
          <span className="font-semibold">{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
          <span className="font-semibold">{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-8">
        {/* SECTION 1: NOM DU GÉRANT */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xs space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
            <UserIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              1. Nom du Gérant
            </h2>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Nom et Prénom du Gérant / Responsable
            </label>
            <input
              type="text"
              value={managerName}
              onChange={(e) => setManagerName(e.target.value)}
              placeholder="Ex: Nayrouz Tarik"
              required
              className="w-full px-4 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-semibold"
            />
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Ce nom apparaît dans la barre supérieure de StationHub, dans l'en-tête de session et comme signataire officiel sur les rapports de clôture, factures, BL et devis.
            </p>
          </div>
        </div>

        {/* SECTION 2: LOGO DE LA STATION */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xs space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <Image className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                2. Logo de la Station
              </h2>
            </div>
            {logoPreview && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                Logo Personnalisé Actif
              </span>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-6">
            {/* Live Logo Preview Box */}
            <div className="w-28 h-28 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex flex-col items-center justify-center p-3 relative group shrink-0">
              <StationLogo
                stationId={station?.id}
                brand={station?.brand}
                name={station?.name}
                logoUrl={logoPreview}
                size="xl"
                className="scale-125"
              />
            </div>

            {/* Logo Controls */}
            <div className="flex-1 space-y-3 text-center sm:text-left">
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white block">
                  Aperçu du logo actuel (Enseigne : {station?.brand || 'Marque'})
                </span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Ce logo est spécifique à votre station. Il s'applique automatiquement sur l'en-tête de votre session et sur <strong>tous vos PDF imprimables</strong> (Rapports de clôture journalière, Factures clients, Bons de Livraison, Devis, et Factures Fournisseurs).
                </p>
              </div>

              <div className="flex items-center gap-3 flex-wrap justify-center sm:justify-start">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/png, image/jpeg, image/webp, image/svg+xml"
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl transition-colors flex items-center gap-2 shadow-xs cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Téléverser un logo</span>
                </button>

                {logoPreview && (
                  <button
                    type="button"
                    onClick={handleResetToDefaultLogo}
                    className="px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                    title={`Rétablir le logo officiel de la marque (${station?.brand || 'par défaut'})`}
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                    <span>Rétablir logo {station?.brand || 'de la marque'} par défaut</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 3: MOT DE PASSE */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xs space-y-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
            <Lock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                3. Sécurité & Mot de Passe
              </h2>
            </div>
          </div>

          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Laissez ces champs vides si vous ne souhaitez pas modifier votre mot de passe d'accès.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Mot de passe actuel */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Mot de passe actuel
              </label>
              <div className="relative">
                <input
                  type={showCurrentPass ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white pr-9 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPass(!showCurrentPass)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Nouveau mot de passe */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Nouveau mot de passe
              </label>
              <div className="relative">
                <input
                  type={showNewPass ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min. 6 caractères"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white pr-9 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPass(!showNewPass)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirmer le nouveau mot de passe */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Confirmer nouveau mot de passe
              </label>
              <div className="relative">
                <input
                  type={showConfirmPass ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white pr-9 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPass(!showConfirmPass)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM SAVE BUTTON */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 rounded-xl transition-all flex items-center gap-2 shadow-sm cursor-pointer"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>{saving ? 'Enregistrement en cours...' : 'Enregistrer les modifications'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
