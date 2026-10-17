import React, { useState } from 'react';
import {
  Lock,
  Mail,
  Shield,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowRight,
  Fuel,
  Gauge,
  CheckCircle2,
  Sun,
  Moon,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useTheme } from '../../context/ThemeContext.tsx';
import { api } from '../../services/api.ts';
import fuelNozzleImg from '../../assets/images/fuel_nozzle_station.jpg';

export const LoginView: React.FC = () => {
  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();

  // Login form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Forgot password modal state
  const [forgotModalOpen, setForgotModalOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetMsg, setResetMsg] = useState<string | null>(null);
  const [resetLoading, setResetLoading] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Identifiants incorrects. Veuillez vérifier votre adresse email et votre mot de passe.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) return;
    setResetLoading(true);
    try {
      const res = await api.resetPassword(resetEmail);
      setResetMsg(res.message || 'Un mot de passe temporaire a été généré et consigné pour votre compte.');
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la réinitialisation');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen bg-slate-50 dark:bg-slate-950 flex flex-col lg:flex-row overflow-x-hidden text-slate-900 dark:text-slate-100 font-sans selection:bg-emerald-500 selection:text-white transition-colors">
      {/* LEFT COLUMN: Cinematic Gas Station Visual & Brand Identity */}
      <div className="relative w-full lg:w-1/2 min-h-[380px] lg:min-h-screen flex flex-col justify-between p-8 sm:p-12 lg:p-16 overflow-hidden bg-slate-900 border-b lg:border-b-0 lg:border-r border-slate-800/80">
        {/* Background Image with Cinematic Darkness & Ambient Light Vignette */}
        <div className="absolute inset-0 z-0">
          <img
            src={fuelNozzleImg}
            alt="Pistolet de distribution de carburant haute précision"
            className="w-full h-full object-cover object-center filter brightness-[0.78] contrast-[1.12] scale-105 transition-transform duration-1000 ease-out hover:scale-100"
          />
          {/* Gradients to merge seamlessly with text */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-slate-950/30" />
          <div className="absolute inset-0 bg-radial from-transparent via-slate-950/40 to-slate-950/90" />
        </div>

        {/* Top Brand Header */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 flex items-center justify-center font-black text-base shadow-lg shadow-emerald-500/20 ring-1 ring-white/20">
              <Fuel className="w-5 h-5 text-slate-950" />
            </div>
            <div className="flex flex-col">
              <span className="text-white font-extrabold text-lg tracking-tight flex items-center gap-2">
                StationHub
                <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  Enterprise
                </span>
              </span>
              <span className="text-xs text-slate-300 font-medium">
                Système d'Exploitation Pétrolière & Gestion de Station
              </span>
            </div>
          </div>
        </div>

        {/* Center Value Proposition */}
        <div className="relative z-10 my-auto py-8 lg:py-0 max-w-lg space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/80 border border-slate-700/60 text-slate-300 text-xs backdrop-blur-md">
            <Gauge className="w-3.5 h-3.5 text-emerald-400" />
            <span>Gestion certifiée des pistes, cuves et compteurs volumétriques</span>
          </div>

          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white leading-tight tracking-tight">
            Contrôle rigoureux des flux de carburants et clôtures de quart.
          </h2>

          <p className="text-sm text-slate-300/90 leading-relaxed font-normal">
            Plateforme centralisée pour stations-service : relevé précis des index de pistolets, suivi de jaugeage des citernes, encaissements et rapprochements fiduciaires.
          </p>

          {/* Operational feature highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
            <div className="flex items-center gap-2.5 text-slate-200 bg-slate-900/60 p-2.5 rounded-xl border border-white/10 backdrop-blur-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Index pistolets & remises en cuve</span>
            </div>
            <div className="flex items-center gap-2.5 text-slate-200 bg-slate-900/60 p-2.5 rounded-xl border border-white/10 backdrop-blur-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Stocks théoriques vs réels jaugés</span>
            </div>
            <div className="flex items-center gap-2.5 text-slate-200 bg-slate-900/60 p-2.5 rounded-xl border border-white/10 backdrop-blur-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Bons clients & télécollecte TPE</span>
            </div>
            <div className="flex items-center gap-2.5 text-slate-200 bg-slate-900/60 p-2.5 rounded-xl border border-white/10 backdrop-blur-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Déclaration fiscale & TVA 10% / 20%</span>
            </div>
          </div>
        </div>

        {/* Bottom Security Assurance */}
        <div className="relative z-10 pt-4 flex items-center justify-between text-xs text-slate-400 border-t border-white/10">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-400" />
            <span>Accès sécurisé réservé aux exploitants autorisés</span>
          </div>
          <span className="text-[11px] font-mono text-slate-500">v2.6 Enterprise</span>
        </div>
      </div>

      {/* RIGHT COLUMN: Dedicated Secure Login Form (Adapts to Dark / Light theme) */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 lg:p-16 relative bg-white dark:bg-slate-950 transition-colors">
        {/* Floating Theme Toggle in top-right of login portal */}
        <div className="absolute top-6 right-6 z-20">
          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-all flex items-center gap-2 text-xs font-semibold shadow-xs"
            title={theme === 'dark' ? 'Basculer en mode clair' : 'Basculer en mode sombre'}
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-600" />
            )}
            <span className="hidden sm:inline">
              {theme === 'dark' ? 'Mode Clair' : 'Mode Sombre'}
            </span>
          </button>
        </div>

        <div className="w-full max-w-md space-y-8 relative z-10">
          {/* Welcome Message */}
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-semibold">
              <Lock className="w-3 h-3" />
              <span>Espace Authentifié</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Connexion à votre station
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              Veuillez saisir votre identifiant professionnel pour accéder au tableau de bord de votre station-service.
            </p>
          </div>

          {/* Error Alert Box */}
          {error && (
            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/80 rounded-xl text-rose-800 dark:text-rose-200 text-xs flex items-start gap-3 animate-in fade-in zoom-in-95 duration-150">
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <div className="leading-relaxed">{error}</div>
            </div>
          )}

          {/* Secure Login Form */}
          <form onSubmit={handleLoginSubmit} className="space-y-5">
            {/* Email Field */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Identifiant / Adresse e-mail
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500 group-focus-within:text-emerald-600 dark:group-focus-within:text-emerald-400 transition-colors">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="gerant@station.ma"
                  className="w-full text-sm pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all font-medium"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Mot de passe
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setForgotModalOpen(true);
                    setResetMsg(null);
                  }}
                  className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
                >
                  Mot de passe oublié ?
                </button>
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500 group-focus-within:text-emerald-600 dark:group-focus-within:text-emerald-400 transition-colors">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full text-sm pl-10 pr-11 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                  aria-label="Basculer la visibilité du mot de passe"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 px-4 rounded-xl text-sm font-bold text-white dark:text-slate-950 bg-slate-900 hover:bg-slate-800 dark:bg-gradient-to-r dark:from-emerald-400 dark:to-teal-300 dark:hover:from-emerald-300 dark:hover:to-teal-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:focus:ring-offset-slate-950 shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99]"
            >
              <span>{submitting ? 'Authentification en cours...' : 'Accéder au Poste de Gestion'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Corporate Closed Account Policy Notice */}
          <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800/80 space-y-1.5 text-xs">
            <div className="font-bold text-slate-800 dark:text-slate-300 flex items-center gap-2">
              <Shield className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Accès réservé aux stations enregistrées</span>
            </div>
            <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
              Les comptes gérants et accès comptables sont créés et délivrés directement par la Direction / Backoffice de la plateforme. Pour l'enregistrement d'une nouvelle station, contactez votre administrateur réseau.
            </p>
          </div>

          {/* Footer Security Badges */}
          <div className="pt-2 flex items-center justify-center gap-4 text-slate-400 dark:text-slate-500 text-[11px]">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Connexion TLS 1.3
            </span>
            <span>·</span>
            <span>Chiffrement AES-256</span>
            <span>·</span>
            <span>Isolation Multi-Tenant</span>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {forgotModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-sm p-6 space-y-4 text-slate-800 dark:text-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2 text-slate-900 dark:text-white">
              <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                <Lock className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold">
                Réinitialisation du mot de passe
              </h3>
            </div>

            {resetMsg ? (
              <div className="space-y-4 text-xs">
                <p className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/80 text-emerald-800 dark:text-emerald-300 rounded-xl leading-relaxed">
                  {resetMsg}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setForgotModalOpen(false);
                    setResetMsg(null);
                  }}
                  className="w-full py-2.5 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-xl font-bold transition-colors text-xs"
                >
                  Fermer
                </button>
              </div>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4 text-xs">
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  Saisissez l'adresse email professionnelle associée à votre station. Un mot de passe temporaire sera généré et consigné pour votre accès.
                </p>
                <div className="space-y-1">
                  <input
                    type="email"
                    required
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="gerant@station.ma"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setForgotModalOpen(false)}
                    className="px-3.5 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="px-4 py-2 text-white dark:text-slate-950 bg-slate-900 dark:bg-emerald-400 hover:bg-slate-800 dark:hover:bg-emerald-300 font-bold rounded-xl transition-colors disabled:opacity-50"
                  >
                    {resetLoading ? 'Envoi...' : 'Réinitialiser'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
