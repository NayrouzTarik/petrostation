import React, { useState } from 'react';
import { X, Mail, Check, Copy, Shield, KeyRound, ExternalLink } from 'lucide-react';
import { EmailNotification } from '../../types/index.ts';

interface EmailOutboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  emails: EmailNotification[];
}

export const EmailOutboxModal: React.FC<EmailOutboxModalProps> = ({
  isOpen,
  onClose,
  emails,
}) => {
  const [selectedEmail, setSelectedEmail] = useState<EmailNotification | null>(
    emails.length > 0 ? emails[0] : null
  );
  const [copiedPass, setCopiedPass] = useState(false);

  if (!isOpen) return null;

  const activeEmail = selectedEmail || emails[0] || null;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPass(true);
    setTimeout(() => setCopiedPass(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Boîte d'Envoi des Identifiants & Notifications
              </h2>
              <p className="text-xs text-slate-500">
                Historique des e-mails d'invitation et mots de passe générés envoyés aux gérants et comptables
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Split: Email list on left, details on right */}
        <div className="flex-1 flex overflow-hidden min-h-[420px]">
          {/* Email List */}
          <div className="w-72 border-r border-slate-200 overflow-y-auto divide-y divide-slate-100 bg-slate-50/50 shrink-0">
            {emails.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                Aucun e-mail envoyé pour le moment.
              </div>
            ) : (
              emails.map((em) => (
                <button
                  key={em.id}
                  onClick={() => setSelectedEmail(em)}
                  className={`w-full text-left p-3.5 transition-colors text-xs ${
                    activeEmail?.id === em.id
                      ? 'bg-emerald-50/80 border-r-2 border-emerald-600'
                      : 'hover:bg-slate-100/60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-slate-900 truncate">
                      {em.recipientName}
                    </span>
                    <span className="text-[10px] text-emerald-600 font-mono font-medium">
                      Envoyé
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 truncate mb-1">
                    {em.to}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    {new Date(em.sentAt).toLocaleString('fr-FR', {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    })}
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Email Preview on Right */}
          <div className="flex-1 overflow-y-auto p-6 bg-white">
            {activeEmail ? (
              <div className="space-y-5">
                {/* Meta details */}
                <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Destinataire:</span>
                    <span className="font-semibold text-slate-900">
                      {activeEmail.recipientName} ({activeEmail.to})
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Rôle attribué:</span>
                    <span className="font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {activeEmail.role === 'GERANT'
                        ? 'Gérant de Station'
                        : activeEmail.role === 'EXPERT_COMPTABLE'
                        ? 'Expert-Comptable'
                        : 'Administrateur'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Station rattachée:</span>
                    <span className="font-medium text-slate-800">
                      {activeEmail.stationName}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Date d'expédition:</span>
                    <span className="font-mono text-slate-700">
                      {new Date(activeEmail.sentAt).toLocaleString('fr-FR')}
                    </span>
                  </div>
                </div>

                {/* Email Subject & Body */}
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <div className="px-4 py-2.5 bg-slate-100 border-b border-slate-200 text-xs font-semibold text-slate-800">
                    Objet: {activeEmail.subject}
                  </div>
                  <div className="p-4 space-y-4 text-xs text-slate-700 leading-relaxed font-sans">
                    <p className="whitespace-pre-line">{activeEmail.bodyText}</p>

                    {/* Highlighted Credentials Box */}
                    <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 space-y-2">
                      <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs uppercase tracking-wider mb-2">
                        <KeyRound className="w-4 h-4 text-emerald-700" />
                        Identifiants de Connexion Sécurisés
                      </div>

                      <div className="flex items-center justify-between text-xs py-1 border-b border-emerald-200/60">
                        <span className="text-emerald-800">Adresse e-mail:</span>
                        <span className="font-mono font-bold text-slate-900 select-all">
                          {activeEmail.credentials.email}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs py-1">
                        <span className="text-emerald-800">Mot de passe généré:</span>
                        <div className="flex items-center gap-2">
                          <code className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-emerald-300 text-xs tracking-wider">
                            {activeEmail.credentials.password}
                          </code>
                          <button
                            onClick={() => copyToClipboard(activeEmail.credentials.password)}
                            className="p-1 text-emerald-700 hover:text-emerald-900 hover:bg-emerald-100 rounded transition-colors"
                            title="Copier le mot de passe"
                          >
                            {copiedPass ? (
                              <Check className="w-3.5 h-3.5 text-emerald-700" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-500 italic">
                      Ces informations ont été transmises automatiquement via le service d'invitation sécurisé de StationHub.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Sélectionnez un email dans la liste pour afficher le contenu.
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
