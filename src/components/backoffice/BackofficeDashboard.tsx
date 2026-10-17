import React, { useState, useEffect } from 'react';
import {
  Building2,
  Plus,
  Users,
  Mail,
  Shield,
  Search,
  CheckCircle,
  KeyRound,
  UserX,
  UserCheck,
  Power,
  X,
  Copy,
  Check,
  Send,
  Server,
  RefreshCw,
  Sliders,
  Filter,
} from 'lucide-react';
import { api } from '../../services/api.ts';
import { Station, User, EmailNotification } from '../../types/index.ts';
import { StationLogo } from '../common/StationLogo.tsx';
import { CreateStationModal } from './CreateStationModal.tsx';
import { useAuth } from '../../context/AuthContext.tsx';

export const BackofficeDashboard: React.FC = () => {
  const { allStations, refreshStationsList, user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [emails, setEmails] = useState<EmailNotification[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'stations' | 'users' | 'emails'>('stations');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIF' | 'SUSPENDU'>('ALL');

  // Filter specific to a chosen station (from "Gérer les Comptes de la Station")
  const [selectedStationFilterId, setSelectedStationFilterId] = useState<string | null>(null);

  // Password modification modal state
  const [passwordModalUser, setPasswordModalUser] = useState<User | null>(null);
  const [newPasswordValue, setNewPasswordValue] = useState('');
  const [passwordModalSuccess, setPasswordModalSuccess] = useState<string | null>(null);
  const [passwordModalLoading, setPasswordModalLoading] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  // Status toggle loading state
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // SMTP Gateway Test & Config State
  const [smtpStatus, setSmtpStatus] = useState<any>(null);
  const [smtpTestEmail, setSmtpTestEmail] = useState('');
  const [smtpTestLoading, setSmtpTestLoading] = useState(false);
  const [resendingEmailId, setResendingEmailId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [uList, eList, sStatus] = await Promise.all([
        api.getUsers(),
        api.getEmails(),
        api.getSmtpStatus().catch(() => null),
      ]);
      setUsers(uList);
      setEmails(eList);
      if (sStatus) setSmtpStatus(sStatus);
    } catch (err) {
      console.error('Failed to load backoffice data', err);
    }
  };

  useEffect(() => {
    loadData();
  }, [allStations]);

  const handleStationCreated = async (st: Station) => {
    await refreshStationsList();
    await loadData();
    setSuccessToast(`Compte client pour la station "${st.name}" créé avec succès !`);
    setTimeout(() => setSuccessToast(null), 4000);
  };

  // Toggle user status: ACTIF <-> SUSPENDU
  const handleToggleUserStatus = async (userToToggle: User) => {
    const newStatus = (userToToggle.status === 'SUSPENDU' ? 'ACTIF' : 'SUSPENDU') as 'ACTIF' | 'SUSPENDU';
    try {
      setActionLoadingId(userToToggle.id);
      await api.updateUserStatus(userToToggle.id, newStatus);
      await loadData();
      setSuccessToast(
        `Le compte de ${userToToggle.name} est maintenant ${
          newStatus === 'ACTIF' ? 'ACTIF' : 'DÉSACTIVÉ / SUSPENDU'
        }.`
      );
      setTimeout(() => setSuccessToast(null), 4000);
    } catch (err: any) {
      alert(`Erreur: ${err.message || 'Impossible de modifier le statut'}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Toggle station status: ACTIVE <-> SUSPENDED
  const handleToggleStationStatus = async (stationToToggle: Station) => {
    const newStatus = (stationToToggle.status === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED') as 'ACTIVE' | 'SUSPENDED';
    try {
      setActionLoadingId(stationToToggle.id);
      await api.updateStationStatus(stationToToggle.id, newStatus);
      await refreshStationsList();
      await loadData();
      setSuccessToast(
        `L'accès pour la station "${stationToToggle.name}" est désormais ${
          newStatus === 'ACTIVE' ? 'ACTIF' : 'SUSPENDU'
        }.`
      );
      setTimeout(() => setSuccessToast(null), 4000);
    } catch (err: any) {
      alert(`Erreur: ${err.message || 'Impossible de modifier le statut de la station'}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Open password modification modal
  const handleOpenPasswordModal = (targetUser: User) => {
    setPasswordModalUser(targetUser);
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let pass = '';
    for (let i = 0; i < 12; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPasswordValue(pass);
    setPasswordModalSuccess(null);
  };

  const handleSaveNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordModalUser || !newPasswordValue) return;

    try {
      setPasswordModalLoading(true);
      const res = await api.updateUserPassword(passwordModalUser.id, newPasswordValue);
      await loadData();
      setPasswordModalSuccess(res.newPassword);
      setSuccessToast(`Mot de passe modifié pour ${passwordModalUser.name} !`);
      setTimeout(() => setSuccessToast(null), 4000);
    } catch (err: any) {
      alert(`Erreur: ${err.message || 'Impossible de modifier le mot de passe'}`);
    } finally {
      setPasswordModalLoading(false);
    }
  };

  const handleCopyPassword = () => {
    if (newPasswordValue) {
      navigator.clipboard.writeText(newPasswordValue);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  // Trigger real email resend
  const handleResendEmail = async (emailId: string) => {
    try {
      setResendingEmailId(emailId);
      const res = await api.resendEmail(emailId);
      await loadData();
      setSuccessToast(res.message || 'E-mail réémis avec succès !');
      setTimeout(() => setSuccessToast(null), 4000);
    } catch (err: any) {
      alert(`Erreur lors de la réémission: ${err.message}`);
    } finally {
      setResendingEmailId(null);
    }
  };

  // Trigger test SMTP
  const handleTestSmtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!smtpTestEmail) return;
    try {
      setSmtpTestLoading(true);
      const res = await api.testSmtp(smtpTestEmail);
      await loadData();
      setSuccessToast(res.message);
      setSmtpTestEmail('');
      setTimeout(() => setSuccessToast(null), 4000);
    } catch (err: any) {
      alert(`Erreur SMTP: ${err.message}`);
    } finally {
      setSmtpTestLoading(false);
    }
  };

  const filteredStations = allStations.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.ice && s.ice.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Multi-attribute search across all fields + station filter
  const filteredUsers = users.filter((u) => {
    // 1. Station specific filter (from "Gérer les Comptes de la Station")
    if (selectedStationFilterId) {
      const targetStation = allStations.find((s) => s.id === selectedStationFilterId);
      const isManagerOfStation = targetStation?.managerId === u.id || u.stationId === selectedStationFilterId;
      const isAccountantOfStation = targetStation?.accountantId === u.id;
      if (!isManagerOfStation && !isAccountantOfStation) {
        return false;
      }
    }

    // 2. Comprehensive search query
    const q = searchQuery.toLowerCase().trim();
    let matchesSearch = true;
    if (q) {
      const assignedStation = allStations.find(
        (s) => s.id === u.stationId || s.accountantId === u.id || s.managerId === u.id
      );

      const roleFrench =
        u.role === 'GERANT'
          ? 'gérant gerant'
          : u.role === 'EXPERT_COMPTABLE'
          ? 'expert comptable fiduciaire'
          : 'administrateur admin superadmin';

      const statusFrench = u.status === 'SUSPENDU' ? 'suspendu désactivé desactive' : 'actif active';

      const searchableText = [
        u.name,
        u.email,
        u.phone || '',
        u.role,
        roleFrench,
        statusFrench,
        assignedStation?.name || '',
        assignedStation?.city || '',
        assignedStation?.brand || '',
        assignedStation?.code || '',
        assignedStation?.ice || '',
        assignedStation?.location || '',
      ]
        .join(' ')
        .toLowerCase();

      matchesSearch = searchableText.includes(q);
    }

    // 3. Status filter
    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'ACTIF' && u.status !== 'SUSPENDU') ||
      (statusFilter === 'SUSPENDU' && u.status === 'SUSPENDU');

    return matchesSearch && matchesStatus;
  });

  const selectedStationObj = allStations.find((s) => s.id === selectedStationFilterId);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto text-slate-900 dark:text-slate-100 transition-colors">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed bottom-6 right-6 z-50 p-4 bg-slate-900 dark:bg-slate-800 text-white rounded-xl shadow-2xl flex items-center gap-3 border border-slate-700 animate-in fade-in slide-in-from-bottom-4">
          <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-semibold">{successToast}</span>
        </div>
      )}

      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wider bg-purple-50 dark:bg-purple-950/60 px-2 py-0.5 rounded border border-purple-200 dark:border-purple-800">
              Administration Centrale
            </span>
            <span className="text-xs text-slate-400">·</span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium font-mono">
              {currentUser?.email || 'admin@station.com'}
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-1">
            Gestion du Réseau de Stations & Comptes
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 max-w-3xl">
            Supervision du parc de stations-service, attribution des accès gérants et comptables, et audit des habilitations.
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="px-4 py-2.5 text-xs font-bold text-white bg-purple-700 hover:bg-purple-800 dark:bg-purple-600 dark:hover:bg-purple-500 rounded-xl flex items-center gap-2 shadow-xs transition-colors self-start md:self-auto shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Créer un Compte Station Client</span>
        </button>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Stations Réseau</span>
            <Building2 className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white tabular-nums">
            {allStations.length}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
              {allStations.filter((s) => s.status === 'ACTIVE').length} actives
            </span>
            <span className="text-slate-300 dark:text-slate-600">·</span>
            <span className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold">
              {allStations.filter((s) => s.status === 'SUSPENDED').length} suspendues
            </span>
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Comptes Utilisateurs</span>
            <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white tabular-nums">
            {users.length}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
              {users.filter((u) => u.status !== 'SUSPENDU').length} actifs
            </span>
            <span className="text-slate-300 dark:text-slate-600">·</span>
            <span className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold">
              {users.filter((u) => u.status === 'SUSPENDU').length} désactivés
            </span>
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Invitations Transmises</span>
            <Mail className="w-4 h-4 text-sky-600 dark:text-sky-400" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white tabular-nums">
            {emails.length}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Historique des accès et clés délivrés
          </span>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Passerelle SMTP</span>
            <Server className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-sm font-bold text-slate-900 dark:text-white mt-1 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Prêt pour Relais SMTP</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block font-mono">
            {smtpStatus?.host ? smtpStatus.host.split(' ')[0] : 'Relais standard'}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-800 text-xs font-medium">
        <button
          onClick={() => {
            setActiveTab('stations');
            setSelectedStationFilterId(null);
          }}
          className={`px-4 py-2.5 border-b-2 font-semibold transition-colors flex items-center gap-2 ${
            activeTab === 'stations'
              ? 'border-purple-700 text-purple-700 dark:border-purple-400 dark:text-purple-300'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>Stations Réseau ({allStations.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2.5 border-b-2 font-semibold transition-colors flex items-center gap-2 ${
            activeTab === 'users'
              ? 'border-purple-700 text-purple-700 dark:border-purple-400 dark:text-purple-300'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Comptes & Permissions ({users.length})</span>
          {selectedStationFilterId && (
            <span className="w-2 h-2 rounded-full bg-purple-600 animate-pulse" />
          )}
        </button>
        <button
          onClick={() => {
            setActiveTab('emails');
            setSelectedStationFilterId(null);
          }}
          className={`px-4 py-2.5 border-b-2 font-semibold transition-colors flex items-center gap-2 ${
            activeTab === 'emails'
              ? 'border-purple-700 text-purple-700 dark:border-purple-400 dark:text-purple-300'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Mail className="w-3.5 h-3.5" />
          <span>File d'Envoi SMTP & Journal ({emails.length})</span>
        </button>
      </div>

      {/* TAB 1: Stations List */}
      {activeTab === 'stations' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="relative w-72">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher nom, ville, enseigne, ICE..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs pl-8 pr-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              />
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {filteredStations.length} station(s) répertoriée(s)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredStations.map((st) => {
              const manager = users.find((u) => u.id === st.managerId);
              const accountant = users.find((u) => u.id === st.accountantId);
              const isSuspended = st.status === 'SUSPENDED';

              return (
                <div
                  key={st.id}
                  className={`bg-white dark:bg-slate-900 border rounded-xl p-5 shadow-2xs flex flex-col justify-between transition-all ${
                    isSuspended
                      ? 'border-rose-200 dark:border-rose-900/60 opacity-90'
                      : 'border-slate-200 dark:border-slate-800 hover:border-purple-300 dark:hover:border-purple-800'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <StationLogo
                          brand={st.brand}
                          name={st.name}
                          logoUrl={st.logoUrl}
                          size="md"
                        />
                        <div>
                          <h3 className="font-bold text-sm text-slate-900 dark:text-white leading-tight">
                            {st.name}
                          </h3>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                            <span className="font-semibold">{st.city}</span>
                            <span>·</span>
                            <span className="font-mono text-purple-700 dark:text-purple-400 font-bold">
                              {st.code}
                            </span>
                          </div>
                        </div>
                      </div>

                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          isSuspended
                            ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border-rose-300 dark:border-rose-800'
                            : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800'
                        }`}
                      >
                        {isSuspended ? 'SUSPENDU' : 'ACTIF'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                          Gérant de Station
                        </span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {manager?.name || 'Gérant Principal'}
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate font-mono">
                          {manager?.email || st.email}
                        </span>
                        {manager && (
                          <span
                            className={`inline-block mt-1 text-[9px] font-bold px-1.5 py-0.2 rounded ${
                              manager.status === 'SUSPENDU'
                                ? 'bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300'
                                : 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300'
                            }`}
                          >
                            Compte {manager.status === 'SUSPENDU' ? 'Désactivé' : 'Actif'}
                          </span>
                        )}
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                          Expert-Comptable
                        </span>
                        {accountant ? (
                          <>
                            <span className="font-semibold text-sky-800 dark:text-sky-300">
                              {accountant.name}
                            </span>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate font-mono">
                              {accountant.email}
                            </span>
                            <span
                              className={`inline-block mt-1 text-[9px] font-bold px-1.5 py-0.2 rounded ${
                                accountant.status === 'SUSPENDU'
                                  ? 'bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300'
                                  : 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300'
                              }`}
                            >
                              Compte {accountant.status === 'SUSPENDU' ? 'Désactivé' : 'Actif'}
                            </span>
                          </>
                        ) : (
                          <span className="text-slate-400 italic">Non configuré</span>
                        )}
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-500 dark:text-slate-400 flex flex-wrap gap-x-4 gap-y-1">
                      <span>Société: <strong className="text-slate-800 dark:text-slate-200">{st.companyName || st.name}</strong></span>
                      <span>ICE: <strong className="font-mono text-slate-700 dark:text-slate-300">{st.ice || '-'}</strong></span>
                      <span>Patente: <strong className="font-mono text-slate-700 dark:text-slate-300">{st.patente || '-'}</strong></span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 flex-wrap">
                    <button
                      onClick={() => handleToggleStationStatus(st)}
                      disabled={actionLoadingId === st.id}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors border ${
                        isSuspended
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100'
                          : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800 hover:bg-rose-100'
                      }`}
                    >
                      <Power className="w-3.5 h-3.5" />
                      <span>{isSuspended ? "Réactiver l'Accès" : "Suspendre l'Accès"}</span>
                    </button>

                    <button
                      onClick={() => {
                        setActiveTab('users');
                        setSelectedStationFilterId(st.id);
                        setSearchQuery('');
                      }}
                      className="px-3 py-1.5 text-xs font-semibold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 dark:hover:bg-purple-900 border border-purple-200 dark:border-purple-800 rounded-lg flex items-center gap-1.5 transition-colors"
                      title="Afficher tous les comptes (Gérant, Comptable, Staff) de cette station"
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>Gérer les Comptes de la Station</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: Users Accounts, Multi-Attribute Search, Isolation Filter & Password Reset */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          {/* Active Station Filter Chip */}
          {selectedStationObj && (
            <div className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 rounded-xl text-xs text-purple-900 dark:text-purple-200">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                <span>
                  Affichage ciblé pour la station : <strong>{selectedStationObj.name}</strong> ({selectedStationObj.city} · {selectedStationObj.brand})
                </span>
              </div>
              <button
                onClick={() => setSelectedStationFilterId(null)}
                className="px-2.5 py-1 text-[11px] font-bold text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/60 rounded-md transition-colors border border-purple-200 dark:border-purple-700"
              >
                ✕ Voir tous les comptes
              </button>
            </div>
          )}

          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="relative w-80">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Rechercher nom, email, téléphone, rôle, station, ville..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-xs pl-8 pr-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>

              {/* Status filter */}
              <div className="flex items-center gap-1 text-xs bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
                <button
                  onClick={() => setStatusFilter('ALL')}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                    statusFilter === 'ALL'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Tous ({users.length})
                </button>
                <button
                  onClick={() => setStatusFilter('ACTIF')}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                    statusFilter === 'ACTIF'
                      ? 'bg-white dark:bg-slate-900 text-emerald-800 dark:text-emerald-400 shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Actifs
                </button>
                <button
                  onClick={() => setStatusFilter('SUSPENDU')}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                    statusFilter === 'SUSPENDU'
                      ? 'bg-white dark:bg-slate-900 text-rose-800 dark:text-rose-400 shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Désactivés
                </button>
              </div>
            </div>

            <span className="text-xs text-slate-500 dark:text-slate-400">
              {filteredUsers.length} utilisateur(s) trouvé(s)
            </span>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold">
                  <tr>
                    <th className="py-3 px-4">Utilisateur</th>
                    <th className="py-3 px-4">Identifiant / Email</th>
                    <th className="py-3 px-4">Sécurité Accès</th>
                    <th className="py-3 px-4">Rôle</th>
                    <th className="py-3 px-4">Station Rattachée</th>
                    <th className="py-3 px-4">Statut d'Accès</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredUsers.map((u) => {
                    const assignedStation = allStations.find(
                      (s) => s.id === u.stationId || s.accountantId === u.id || s.managerId === u.id
                    );
                    const isSuspended = u.status === 'SUSPENDU';
                    const isOwner = u.role === 'SUPER_ADMIN';

                    return (
                      <tr
                        key={u.id}
                        className={`hover:bg-slate-50/60 dark:hover:bg-slate-800/40 ${
                          isSuspended ? 'bg-rose-50/30 dark:bg-rose-950/20' : ''
                        }`}
                      >
                        <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                          <div className="flex items-center gap-2">
                            <span>{u.name}</span>
                            {isOwner && (
                              <span className="text-[9px] bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 px-1.5 py-0.2 rounded font-bold border border-purple-200 dark:border-purple-800">
                                Administrateur
                              </span>
                            )}
                          </div>
                          {u.phone && (
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono block">
                              {u.phone}
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-slate-300 font-medium">
                          {u.email}
                        </td>

                        <td className="py-3.5 px-4 font-mono">
                          <span
                            className="px-2 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-400 font-bold text-[11px] tracking-widest"
                            title="Mot de passe chiffré et protégé"
                          >
                            ••••••••••••
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                              u.role === 'SUPER_ADMIN'
                                ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800'
                                : u.role === 'EXPERT_COMPTABLE'
                                ? 'bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 border-sky-200 dark:border-sky-800'
                                : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                            }`}
                          >
                            {u.role === 'SUPER_ADMIN'
                              ? 'Super Admin'
                              : u.role === 'EXPERT_COMPTABLE'
                              ? 'Expert-Comptable'
                              : 'Gérant Station'}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                          {assignedStation ? (
                            <div>
                              <span className="font-semibold">{assignedStation.name}</span>
                              <span className="text-[10px] text-slate-400 dark:text-slate-500 block">
                                {assignedStation.city} · {assignedStation.brand}
                              </span>
                            </div>
                          ) : isOwner ? (
                            <span className="text-slate-400 italic">Plateforme Globale</span>
                          ) : (
                            <span className="text-slate-400 italic">Non assigné</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                              isSuspended
                                ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border-rose-300 dark:border-rose-800'
                                : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isSuspended ? 'bg-rose-500' : 'bg-emerald-500'
                              }`}
                            ></span>
                            {isSuspended ? 'DÉSACTIVÉ' : 'ACTIF'}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Modify Password Button */}
                            <button
                              onClick={() => handleOpenPasswordModal(u)}
                              className="px-2.5 py-1 text-xs font-semibold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 dark:hover:bg-purple-900 border border-purple-200 dark:border-purple-800 rounded-lg transition-colors flex items-center gap-1"
                              title="Réinitialiser / Modifier le mot de passe"
                            >
                              <KeyRound className="w-3 h-3" />
                              <span>Modifier MDP</span>
                            </button>

                            {/* Activate / Deactivate Button (except owner themselves) */}
                            {!isOwner && (
                              <button
                                onClick={() => handleToggleUserStatus(u)}
                                disabled={actionLoadingId === u.id}
                                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors border flex items-center gap-1 ${
                                  isSuspended
                                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100'
                                    : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800 hover:bg-rose-100'
                                }`}
                                title={isSuspended ? 'Activer le compte' : 'Désactiver le compte'}
                              >
                                {isSuspended ? (
                                  <>
                                    <UserCheck className="w-3 h-3" />
                                    <span>Activer</span>
                                  </>
                                ) : (
                                  <>
                                    <UserX className="w-3 h-3" />
                                    <span>Désactiver</span>
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Real SMTP Queue & Outbox Manager */}
      {activeTab === 'emails' && (
        <div className="space-y-4">
          {/* SMTP Gateway Status & Test Drawer */}
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                  <Server className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                    Passerelle SMTP & Relais d'Envoi
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Prend en charge les variables d'environnement SMTP (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`)
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Prêt pour raccordement
                </span>
              </div>
            </div>

            {/* Test Form */}
            <form onSubmit={handleTestSmtp} className="flex flex-col sm:flex-row items-center gap-2 text-xs">
              <span className="text-slate-500 dark:text-slate-400 shrink-0 font-medium">
                Tester l'expédition vers :
              </span>
              <input
                type="email"
                required
                value={smtpTestEmail}
                onChange={(e) => setSmtpTestEmail(e.target.value)}
                placeholder="votre-email@domaine.com"
                className="flex-1 w-full sm:w-auto px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-purple-600"
              />
              <button
                type="submit"
                disabled={smtpTestLoading}
                className="w-full sm:w-auto px-4 py-1.5 font-bold text-white bg-slate-900 dark:bg-purple-600 hover:bg-slate-800 dark:hover:bg-purple-500 rounded-lg transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <Send className="w-3 h-3" />
                <span>{smtpTestLoading ? 'Envoi...' : 'Envoyer un Test'}</span>
              </button>
            </form>
          </div>

          {/* Email Outbox Log List */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xs">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2">
              <div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  Journal des Notifications Transmises
                </span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Traçabilité des e-mails d'invitation, mots de passe et alertes consignés
                </p>
              </div>

              <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                {emails.length} message(s) consigné(s)
              </span>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[600px] overflow-y-auto">
              {emails.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  Aucun message consigné dans la file d'attente.
                </div>
              ) : (
                emails.map((em) => (
                  <div
                    key={em.id}
                    className="p-4 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors space-y-2.5"
                  >
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          {em.recipientName} ({em.to})
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          {em.role}
                        </span>
                        <span className="text-xs text-slate-400">·</span>
                        <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                          {em.stationName}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">
                          {new Date(em.sentAt).toLocaleString('fr-FR')}
                        </span>

                        <button
                          onClick={() => handleResendEmail(em.id)}
                          disabled={resendingEmailId === em.id}
                          className="px-2.5 py-1 text-[11px] font-semibold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 dark:hover:bg-purple-900 border border-purple-200 dark:border-purple-800 rounded-md transition-colors flex items-center gap-1 disabled:opacity-50"
                          title="Renvoyer cet email via la passerelle"
                        >
                          <Send className="w-3 h-3" />
                          <span>{resendingEmailId === em.id ? 'Renvoi...' : 'Renvoyer'}</span>
                        </button>
                      </div>
                    </div>

                    <div className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                      Objet: {em.subject}
                    </div>

                    <div className="flex items-center gap-4 text-xs bg-slate-50 dark:bg-slate-800/80 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 font-mono flex-wrap">
                      <div>
                        <span className="text-slate-500 dark:text-slate-400 mr-1">Identifiant:</span>
                        <strong className="text-slate-900 dark:text-white">{em.credentials.email}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 dark:text-slate-400 mr-1">Mot de passe:</span>
                        <strong className="text-emerald-700 dark:text-emerald-300 bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                          {em.credentials.password}
                        </strong>
                      </div>
                      <div className="ml-auto text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 font-sans">
                        <CheckCircle className="w-3.5 h-3.5" />
                        Prêt pour expédition SMTP
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Creation Modal */}
      <CreateStationModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onStationCreated={handleStationCreated}
      />

      {/* PASSWORD MODIFICATION MODAL */}
      {passwordModalUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md p-6 space-y-4 animate-in fade-in zoom-in-95 text-slate-900 dark:text-white">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 flex items-center justify-center">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">
                    Modifier le Mot de Passe
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {passwordModalUser.name} ({passwordModalUser.email})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPasswordModalUser(null)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {passwordModalSuccess ? (
              <div className="space-y-4">
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-200 text-xs flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    Le nouveau mot de passe a été appliqué et consigné dans le journal des notifications.
                  </div>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl space-y-2">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold uppercase block">
                    Nouveau mot de passe généré :
                  </span>
                  <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700">
                    <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">
                      {passwordModalSuccess}
                    </span>
                    <button
                      onClick={handleCopyPassword}
                      className="px-2 py-1 text-xs font-semibold text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950 rounded flex items-center gap-1"
                    >
                      {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedKey ? 'Copié' : 'Copier'}</span>
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => setPasswordModalUser(null)}
                  className="w-full py-2 bg-slate-900 dark:bg-slate-800 text-white rounded-xl text-xs font-bold"
                >
                  Fermer
                </button>
              </div>
            ) : (
              <form onSubmit={handleSaveNewPassword} className="space-y-4 text-xs">
                <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                  Vous pouvez saisir manuellement un mot de passe ou utiliser la clé sécurisée générée automatiquement :
                </p>

                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    Nouveau mot de passe
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={newPasswordValue}
                      onChange={(e) => setNewPasswordValue(e.target.value)}
                      className="w-full pl-3 pr-10 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl font-mono text-xs focus:outline-none focus:ring-2 focus:ring-purple-600"
                    />
                    <button
                      type="button"
                      onClick={handleCopyPassword}
                      className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      title="Copier"
                    >
                      {copiedKey ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setPasswordModalUser(null)}
                    className="px-3.5 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={passwordModalLoading}
                    className="px-4 py-2 text-white bg-purple-700 hover:bg-purple-800 rounded-xl font-bold transition-colors disabled:opacity-50"
                  >
                    {passwordModalLoading ? 'Enregistrement...' : 'Enregistrer le mot de passe'}
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
