import React, { useState, useRef, useEffect } from 'react';
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
  Building,
  MapPin,
  Phone,
  FileBadge,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { StationLogo } from '../common/StationLogo.tsx';

// Helper to compress uploaded logo down to a lightweight, high-res canvas dataURL (<25 KB)
// This guarantees zero localStorage quota issues and instant real-time sync across devices.
function compressImage(file: File, maxDim = 360, quality = 0.88): Promise<string> {
  return new Promise((resolve, reject) => {
    if (file.type === 'image/svg+xml') {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new window.Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const outputType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        const compressedBase64 = canvas.toDataURL(outputType, quality);
        resolve(compressedBase64);
      };
      img.onerror = () => resolve(e.target?.result as string);
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export const SettingsView: React.FC = () => {
  const { user, station, updateGerantSettings } = useAuth();

  // 1. Manager Name State
  const [managerName, setManagerName] = useState(user?.name || '');

  // 2. Station Information States
  const [stationName, setStationName] = useState(station?.name || '');
  const [city, setCity] = useState(station?.city || '');
  const [location, setLocation] = useState(station?.location || '');
  const [stationPhone, setStationPhone] = useState(station?.phone || '');
  const [companyName, setCompanyName] = useState(station?.companyName || '');
  const [ice, setIce] = useState(station?.ice || '');

  // Update fields if station changes
  useEffect(() => {
    if (station) {
      setStationName(station.name || '');
      setCity(station.city || '');
      setLocation(station.location || '');
      setStationPhone(station.phone || '');
      setCompanyName(station.companyName || '');
      setIce(station.ice || '');
      if (station.logoUrl && !station.logoUrl.includes('station_modern_exterior')) {
        setLogoPreview(station.logoUrl);
      }
    }
  }, [station]);

  // 3. Station Logo State
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

  // 4. Password State
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

  // Handle Logo Upload with automatic lightweight compression
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage('Le fichier image ne doit pas dépasser 10 Mo');
      return;
    }

    try {
      const compressed = await compressImage(file, 360, 0.88);
      setLogoPreview(compressed);
      setErrorMessage(null);
    } catch (err) {
      console.warn('Erreur compression image, lecture directe:', err);
      const reader = new FileReader();
      reader.onload = () => {
        setLogoPreview(reader.result as string);
        setErrorMessage(null);
      };
      reader.readAsDataURL(file);
    }
  };

  // Reset to Default Brand Logo
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
    if (!stationName.trim()) {
      setErrorMessage('Le nom de la station est obligatoire.');
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
        stationName: stationName.trim(),
        city: city.trim(),
        location: location.trim(),
        phone: stationPhone.trim(),
        companyName: companyName.trim(),
        ice: ice.trim(),
        logoUrl: logoPreview,
        currentPassword: currentPassword || undefined,
        newPassword: newPassword || undefined,
      });

      setCurrentLogo(logoPreview);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      setSuccessMessage('Vos paramètres (logo, informations de la station et profil) ont été mis à jour avec succès.');
      setTimeout(() => setSuccessMessage(null), 6000);
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
            <Building className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              Paramètres de la Station & du Profil
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Gérez votre logo officiel, le nom et l'adresse de votre station ainsi que votre profil gérant.
            </p>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-3 shadow-xs">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
          <span className="font-semibold">{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-3 shadow-xs">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
          <span className="font-semibold">{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-8">
        {/* SECTION 1: LOGO DE LA STATION */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xs space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <Image className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                1. Logo Officiel de la Station
              </h2>
            </div>
            {logoPreview && (
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
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
                name={stationName || station?.name}
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
                  Ce logo s'applique immédiatement dans <strong>la barre supérieure permanente</strong> et sur <strong>toutes vos fiches et documents imprimables</strong> (Rapports de clôture journalière, Factures clients, Bons de Livraison, Devis et Achats).
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
                    <span>Rétablir logo {station?.brand || 'de la marque'}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2: INFORMATIONS DE LA STATION (Nom, Emplacement, Ville) */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xs space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
            <MapPin className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              2. Informations de la Station (Barre supérieure & Documents)
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Nom de la Station
              </label>
              <input
                type="text"
                value={stationName}
                onChange={(e) => setStationName(e.target.value)}
                placeholder="Ex: Station Shell Hay Salam"
                required
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-semibold"
              />
              <p className="text-[10px] text-slate-400">Affiché en gras dans la barre supérieure et sur les fiches.</p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Ville
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Ex: Salé"
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-semibold"
              />
              <p className="text-[10px] text-slate-400">Affiché à côté du nom dans la barre supérieure.</p>
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Adresse / Emplacement complet
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Ex: HAY SALAM AVENUE ASSAHARA SECT 8 N1037"
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
              />
              <p className="text-[10px] text-slate-400">Affiché sous le nom dans la barre supérieure et dans l'en-tête de vos factures et fiches.</p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Raison Sociale (SARL / Entreprise)
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Ex: STE PETROLEUM SERVICE SARL"
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Téléphone de la Station
              </label>
              <input
                type="text"
                value={stationPhone}
                onChange={(e) => setStationPhone(e.target.value)}
                placeholder="Ex: +212 537-889900"
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
              />
            </div>
          </div>
        </div>

        {/* SECTION 3: NOM DU GÉRANT */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xs space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
            <UserIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              3. Identité du Gérant
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
              Ce nom apparaît comme signataire officiel sur les rapports de clôture, factures, BL et devis.
            </p>
          </div>
        </div>

        {/* SECTION 4: MOT DE PASSE */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xs space-y-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
            <Lock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                4. Sécurité & Mot de Passe
              </h2>
            </div>
          </div>

          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Laissez ces champs vides si vous ne souhaitez pas modifier votre mot de passe d'accès.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
