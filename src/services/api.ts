import {
  Achat,
  Carburant,
  Citerne,
  CommercialDoc,
  Depense,
  EmailNotification,
  Journee,
  Pistolet,
  Produit,
  Salarie,
  ServiceStation,
  Station,
  Tier,
  User,
} from '../types/index.ts';

const BASE_URL = '/api';

export const api = {
  // Auth
  async login(email: string, password: string) {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Erreur de connexion' }));
      throw new Error(err.error || 'Identifiants invalides');
    }
    return res.json();
  },

  async signup(data: {
    stationName: string;
    brand?: string;
    location?: string;
    city?: string;
    managerName: string;
    email: string;
    password: string;
    phone?: string;
  }) {
    const res = await fetch(`${BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Erreur lors de l'inscription" }));
      throw new Error(err.error || "Erreur lors de l'inscription");
    }
    return res.json();
  },

  async resetPassword(email: string) {
    const res = await fetch(`${BASE_URL}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Erreur lors de la réinitialisation' }));
      throw new Error(err.error || 'Erreur lors de la réinitialisation');
    }
    return res.json();
  },

  async getUsers(): Promise<User[]> {
    const res = await fetch(`${BASE_URL}/users`);
    return res.json();
  },

  async updateUserStatus(id: string, status: 'ACTIF' | 'SUSPENDU'): Promise<{ success: boolean; user: User }> {
    const res = await fetch(`${BASE_URL}/users/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Erreur mise à jour statut' }));
      throw new Error(err.error || 'Erreur mise à jour statut');
    }
    return res.json();
  },

  async updateUserPassword(id: string, password?: string): Promise<{ success: boolean; newPassword: string }> {
    const res = await fetch(`${BASE_URL}/users/${id}/password`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Erreur modification mot de passe' }));
      throw new Error(err.error || 'Erreur modification mot de passe');
    }
    return res.json();
  },

  async updateGerantProfile(
    id: string,
    data: { name?: string; currentPassword?: string; newPassword?: string; logoUrl?: string }
  ): Promise<{ success: boolean; user: User; station?: Station; message: string }> {
    const res = await fetch(`${BASE_URL}/users/${id}/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Erreur mise à jour profil' }));
      throw new Error(err.error || 'Erreur mise à jour profil');
    }
    return res.json();
  },

  async updateStationStatus(id: string, status: 'ACTIVE' | 'SUSPENDED'): Promise<{ success: boolean; station: Station }> {
    const res = await fetch(`${BASE_URL}/stations/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Erreur mise à jour statut station' }));
      throw new Error(err.error || 'Erreur mise à jour statut station');
    }
    return res.json();
  },

  // Stations
  async getStations(): Promise<Station[]> {
    const res = await fetch(`${BASE_URL}/stations`);
    return res.json();
  },

  async getStation(id: string): Promise<Station> {
    const res = await fetch(`${BASE_URL}/stations/${id}`);
    return res.json();
  },

  async createStation(stationData: any): Promise<{
    station: Station;
    credentials: {
      manager: { email: string; password: string };
      accountant?: { email: string; password: string } | null;
    };
    emailsSent: EmailNotification[];
  }> {
    const res = await fetch(`${BASE_URL}/stations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(stationData),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Erreur lors de la création' }));
      throw new Error(err.error || 'Erreur lors de la création de la station');
    }
    return res.json();
  },

  async updateStation(id: string, data: Partial<Station>): Promise<Station> {
    const res = await fetch(`${BASE_URL}/stations/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async deleteStation(id: string): Promise<void> {
    await fetch(`${BASE_URL}/stations/${id}`, { method: 'DELETE' });
  },

  // Dashboard
  async getDashboard(stationId: string) {
    const res = await fetch(`${BASE_URL}/stations/${stationId}/dashboard`);
    return res.json();
  },

  // Carburants
  async getCarburants(stationId: string): Promise<Carburant[]> {
    const res = await fetch(`${BASE_URL}/stations/${stationId}/carburants`);
    return res.json();
  },

  async addCarburant(stationId: string, data: any): Promise<Carburant> {
    const res = await fetch(`${BASE_URL}/stations/${stationId}/carburants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async updateCarburant(stationId: string, carbId: string, data: any): Promise<Carburant> {
    const res = await fetch(`${BASE_URL}/stations/${stationId}/carburants/${carbId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async deleteCarburant(stationId: string, carbId: string): Promise<void> {
    await fetch(`${BASE_URL}/stations/${stationId}/carburants/${carbId}`, { method: 'DELETE' });
  },

  // Citernes & Jaugeage
  async getCiternes(stationId: string): Promise<Citerne[]> {
    const res = await fetch(`${BASE_URL}/stations/${stationId}/citernes`);
    return res.json();
  },

  async addCiterne(stationId: string, data: any): Promise<Citerne> {
    const res = await fetch(`${BASE_URL}/stations/${stationId}/citernes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async updateCiterne(stationId: string, citId: string, data: any): Promise<Citerne> {
    const res = await fetch(`${BASE_URL}/stations/${stationId}/citernes/${citId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Erreur lors de la modification de la citerne' }));
      throw new Error(err.error || 'Erreur lors de la modification de la citerne');
    }
    return res.json();
  },

  async deleteCiterne(stationId: string, citId: string): Promise<void> {
    await fetch(`${BASE_URL}/stations/${stationId}/citernes/${citId}`, { method: 'DELETE' });
  },

  async getCiterneHistory(stationId: string, citId: string) {
    const res = await fetch(`${BASE_URL}/stations/${stationId}/citernes/${citId}/history`);
    return res.json();
  },

  async submitJaugeage(stationId: string, payload: { date: string; readings: any[] }) {
    const res = await fetch(`${BASE_URL}/stations/${stationId}/citernes/jaugeage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  // Pistolets & Calibrage
  async getPistolets(stationId: string): Promise<Pistolet[]> {
    const res = await fetch(`${BASE_URL}/stations/${stationId}/pistolets`);
    return res.json();
  },

  async addPistolet(stationId: string, data: any): Promise<Pistolet> {
    const res = await fetch(`${BASE_URL}/stations/${stationId}/pistolets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Erreur lors de l\'ajout du pistolet' }));
      throw new Error(err.error || 'Erreur lors de l\'ajout du pistolet');
    }
    return res.json();
  },

  async updatePistolet(stationId: string, pistId: string, data: any): Promise<Pistolet> {
    const res = await fetch(`${BASE_URL}/stations/${stationId}/pistolets/${pistId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Erreur lors de la modification du pistolet' }));
      throw new Error(err.error || 'Erreur lors de la modification du pistolet');
    }
    return res.json();
  },

  async deletePistolet(stationId: string, pistId: string): Promise<void> {
    await fetch(`${BASE_URL}/stations/${stationId}/pistolets/${pistId}`, { method: 'DELETE' });
  },

  async getPistoletHistory(stationId: string, pistId: string) {
    const res = await fetch(`${BASE_URL}/stations/${stationId}/pistolets/${pistId}/history`);
    return res.json();
  },

  async submitCalibrage(stationId: string, payload: { date: string; adjustments: any[] }) {
    const res = await fetch(`${BASE_URL}/stations/${stationId}/pistolets/calibrage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  // Salariés
  async getSalaries(stationId: string): Promise<Salarie[]> {
    const res = await fetch(`${BASE_URL}/stations/${stationId}/salaries`);
    return res.json();
  },

  async addSalarie(stationId: string, data: any): Promise<Salarie> {
    const res = await fetch(`${BASE_URL}/stations/${stationId}/salaries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async updateSalarie(stationId: string, salId: string, data: any): Promise<Salarie> {
    const res = await fetch(`${BASE_URL}/stations/${stationId}/salaries/${salId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async deleteSalarie(stationId: string, salId: string): Promise<void> {
    await fetch(`${BASE_URL}/stations/${stationId}/salaries/${salId}`, { method: 'DELETE' });
  },

  // Tiers & Paiements
  async getTiers(stationId: string): Promise<Tier[]> {
    const res = await fetch(`${BASE_URL}/stations/${stationId}/tiers`);
    return res.json();
  },

  async addTier(stationId: string, data: any): Promise<Tier> {
    const res = await fetch(`${BASE_URL}/stations/${stationId}/tiers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async updateTier(stationId: string, tierId: string, data: any): Promise<Tier> {
    const res = await fetch(`${BASE_URL}/stations/${stationId}/tiers/${tierId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async deleteTier(stationId: string, tierId: string): Promise<void> {
    await fetch(`${BASE_URL}/stations/${stationId}/tiers/${tierId}`, { method: 'DELETE' });
  },

  async getPaiementsTiers(stationId: string) {
    const res = await fetch(`${BASE_URL}/stations/${stationId}/paiements-tiers`);
    return res.json();
  },

  async addPaiementTier(stationId: string, data: any) {
    const res = await fetch(`${BASE_URL}/stations/${stationId}/paiements-tiers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async updatePaiementTier(stationId: string, pmtId: string, data: any) {
    const res = await fetch(`${BASE_URL}/stations/${stationId}/paiements-tiers/${pmtId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async deletePaiementTier(stationId: string, pmtId: string): Promise<void> {
    await fetch(`${BASE_URL}/stations/${stationId}/paiements-tiers/${pmtId}`, { method: 'DELETE' });
  },

  // Produits
  async getProduits(stationId: string): Promise<Produit[]> {
    const res = await fetch(`${BASE_URL}/stations/${stationId}/produits`);
    return res.json();
  },

  async addProduit(stationId: string, data: any): Promise<Produit> {
    const res = await fetch(`${BASE_URL}/stations/${stationId}/produits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async updateProduit(stationId: string, prodId: string, data: any): Promise<Produit> {
    const res = await fetch(`${BASE_URL}/stations/${stationId}/produits/${prodId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async deleteProduit(stationId: string, prodId: string): Promise<void> {
    await fetch(`${BASE_URL}/stations/${stationId}/produits/${prodId}`, { method: 'DELETE' });
  },

  // Services
  async getServices(stationId: string): Promise<ServiceStation[]> {
    const res = await fetch(`${BASE_URL}/stations/${stationId}/services`);
    return res.json();
  },

  async addService(stationId: string, data: any): Promise<ServiceStation> {
    const res = await fetch(`${BASE_URL}/stations/${stationId}/services`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async updateService(stationId: string, servId: string, data: any): Promise<ServiceStation> {
    const res = await fetch(`${BASE_URL}/stations/${stationId}/services/${servId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async deleteService(stationId: string, servId: string): Promise<void> {
    await fetch(`${BASE_URL}/stations/${stationId}/services/${servId}`, { method: 'DELETE' });
  },

  // Journées
  async getJournees(stationId: string): Promise<Journee[]> {
    const res = await fetch(`${BASE_URL}/stations/${stationId}/journees`);
    return res.json();
  },

  async submitJournee(stationId: string, journeeData: any): Promise<Journee> {
    const res = await fetch(`${BASE_URL}/stations/${stationId}/journees`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(journeeData),
    });
    return res.json();
  },

  // Achats
  async getAchats(stationId: string): Promise<Achat[]> {
    const res = await fetch(`${BASE_URL}/stations/${stationId}/achats`);
    return res.json();
  },

  async addAchat(stationId: string, data: any): Promise<Achat> {
    const res = await fetch(`${BASE_URL}/stations/${stationId}/achats`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async updateAchat(stationId: string, achId: string, data: any): Promise<Achat> {
    const res = await fetch(`${BASE_URL}/stations/${stationId}/achats/${achId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async deleteAchat(stationId: string, achId: string): Promise<void> {
    await fetch(`${BASE_URL}/stations/${stationId}/achats/${achId}`, { method: 'DELETE' });
  },

  // Dépenses
  async getDepenses(stationId: string): Promise<Depense[]> {
    const res = await fetch(`${BASE_URL}/stations/${stationId}/depenses`);
    return res.json();
  },

  async addDepense(stationId: string, data: any): Promise<Depense> {
    const res = await fetch(`${BASE_URL}/stations/${stationId}/depenses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async updateDepense(stationId: string, depId: string, data: any): Promise<Depense> {
    const res = await fetch(`${BASE_URL}/stations/${stationId}/depenses/${depId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async deleteDepense(stationId: string, depId: string): Promise<void> {
    await fetch(`${BASE_URL}/stations/${stationId}/depenses/${depId}`, { method: 'DELETE' });
  },

  // Factures, BL & Devis
  async getCommercialDocs(stationId: string, docType?: string): Promise<CommercialDoc[]> {
    const query = docType ? `?docType=${docType}` : '';
    const res = await fetch(`${BASE_URL}/stations/${stationId}/commercial-docs${query}`);
    return res.json();
  },

  async addCommercialDoc(stationId: string, data: any): Promise<CommercialDoc> {
    const res = await fetch(`${BASE_URL}/stations/${stationId}/commercial-docs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async updateCommercialDoc(stationId: string, docId: string, data: any): Promise<CommercialDoc> {
    const res = await fetch(`${BASE_URL}/stations/${stationId}/commercial-docs/${docId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async deleteCommercialDoc(stationId: string, docId: string): Promise<void> {
    await fetch(`${BASE_URL}/stations/${stationId}/commercial-docs/${docId}`, { method: 'DELETE' });
  },

  // Rapports
  async getRapports(stationId: string, params?: { startDate?: string; endDate?: string; year?: string }) {
    const q = new URLSearchParams(params as any).toString();
    const res = await fetch(`${BASE_URL}/stations/${stationId}/rapports?${q}`);
    return res.json();
  },

  // Emails outbox & SMTP
  async getEmails(): Promise<EmailNotification[]> {
    const res = await fetch(`${BASE_URL}/emails`);
    return res.json();
  },

  async resendEmail(id: string): Promise<{ success: boolean; message: string; email: EmailNotification }> {
    const res = await fetch(`${BASE_URL}/emails/${id}/resend`, { method: 'POST' });
    return res.json();
  },

  async getSmtpStatus(): Promise<{
    configured: boolean;
    host: string;
    port: number;
    user: string;
    secure: boolean;
    from: string;
    readyForLinking: boolean;
    supportedProviders: string[];
  }> {
    const res = await fetch(`${BASE_URL}/smtp/status`);
    return res.json();
  },

  async testSmtp(testEmail: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${BASE_URL}/smtp/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ testEmail }),
    });
    return res.json();
  },
};
