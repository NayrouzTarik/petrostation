import React, { useState, useEffect } from 'react';
import {
  X,
  User as UserIcon,
  Mail,
  Phone,
  Shield,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Building,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { api } from '../../services/api.ts';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({ isOpen, onClose }) => {
  const { user, station, updateUserProfile } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  // Password fields
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
      setPhone(user.phone || '');
      setNewPassword('');
      setConfirmPassword('');
      setSuccessMsg(null);
      setErrorMsg(null);
    }
  }, [user, isOpen]);

  if (!isOpen || !user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!name.trim()) {
      setErrorMsg('Le nom complet est obligatoire.');
      return;
    }
    if (!email.trim()) {
      setErrorMsg("L'adresse email est obligatoire.");
      return;
    }

    if (newPassword) {
      if (newPassword.length < 6) {
        setErrorMsg('Le nouveau mot de passe doit comporter au moins 6 caractères.');
        return;
      }
      if (newPassword !== confirmPassword) {
        setErrorMsg('Les mots de passe ne correspondent pas.');
        return;
      }
    }

    try {
      setSaving(true);
      await updateUserProfile({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
      });

      if (newPassword) {
        await api.updateUserPassword(user.id, newPassword);
      }

      setSuccessMsg('Vos informations de profil ont été mises à jour avec succès !');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setSuccessMsg(null);
      }, 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erreur lors de la mise à jour du profil.');
    } finally {
      setSaving(false);
    }
  };

  const roleLabel =
    user.role === 'SUPER_ADMIN'
      ? 'Super Administrateur'
      : user.role === 'EXPERT_COMPTABLE'
      ? 'Expert-Comptable Fiduciaire'
      : 'Gérant de Station';

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg p-6 space-y-5 animate-in fade-in zoom-in-95 text-slate-900 dark:text-white max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <UserIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Mon Espace Personnel & Profil
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Consultez et modifiez vos informations de compte
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* User Identity Summary Banner */}
        <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span className="font-semibold text-slate-700 dark:text-slate-300">Rôle :</span>
            <span className="px-2 py-0.5 rounded font-bold bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 text-[11px]">
              {roleLabel}
            </span>
          </div>

          {station && (
            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
              <Building className="w-3.5 h-3.5 text-slate-500" />
              <span>{station.name}</span>
            </div>
          )}
        </div>

        {/* Notifications */}
        {successMsg && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-800 dark:text-rose-200 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="space-y-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Nom complet *
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  placeholder="Votre nom"
                />
                <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Email de connexion *
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none font-mono"
                    placeholder="email@station.com"
                  />
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Numéro de Téléphone
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                    placeholder="+212 6 XX XX XX XX"
                  />
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                </div>
              </div>
            </div>
          </div>

          {/* Change password subsection */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
            <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-bold">
              <KeyRound className="w-3.5 h-3.5 text-purple-600" />
              <span>Changer de mot de passe (optionnel)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Nouveau mot de passe
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl text-xs focus:ring-2 focus:ring-purple-600 focus:outline-none font-mono"
                  placeholder="Min. 6 caractères"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Confirmer le mot de passe
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl text-xs focus:ring-2 focus:ring-purple-600 focus:outline-none font-mono"
                  placeholder="Répétez le mot de passe"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl font-medium"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl font-bold transition-all disabled:opacity-50 shadow-xs"
            >
              {saving ? 'Enregistrement...' : 'Enregistrer mon profil'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
