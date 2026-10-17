import { clientDb } from './clientDb.ts';
import {
  Achat,
  Carburant,
  Citerne,
  CommercialDoc,
  Depense,
  EmailNotification,
  Journee,
  PaiementTier,
  Pistolet,
  Produit,
  Salarie,
  ServiceStation,
  Station,
  Tier,
  User,
} from '../types/index.ts';

const isStaticOrNoBackend = (): boolean => {
  if (typeof window === 'undefined') return true;
  // If an external backend URL is specified (e.g. VITE_API_URL=https://api.myapp.com), use backend
  if (import.meta.env.VITE_API_URL) return false;
  // On Cloudflare Pages or any static deployment, hostname is not localhost
  const isLocal =
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname.endsWith('.localhost');
  return !isLocal;
};

const BASE_URL = import.meta.env.VITE_API_URL || '/api';

export const api = {
  // Auth
  async login(email: string, password: string) {
    if (isStaticOrNoBackend()) {
      return clientDb.login(email, password);
    }
    try {
      const res = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (res.status === 405 || res.status === 404) {
        return clientDb.login(email, password);
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Erreur de connexion' }));
        throw new Error(err.error || 'Identifiants invalides');
      }
      return res.json();
    } catch (e: any) {
      if (e.message && !e.message.includes('Identifiants') && !e.message.includes('désactivé')) {
        return clientDb.login(email, password);
      }
      throw e;
    }
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
    if (isStaticOrNoBackend()) {
      return clientDb.signup(data);
    }
    try {
      const res = await fetch(`${BASE_URL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.status === 405 || res.status === 404) {
        return clientDb.signup(data);
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Erreur lors de l'inscription" }));
        throw new Error(err.error || "Erreur lors de l'inscription");
      }
      return res.json();
    } catch (e: any) {
      if (e.message && !e.message.includes('existe déjà') && !e.message.includes('obligatoires')) {
        return clientDb.signup(data);
      }
      throw e;
    }
  },

  async resetPassword(email: string) {
    if (isStaticOrNoBackend()) {
      return clientDb.resetPassword(email);
    }
    try {
      const res = await fetch(`${BASE_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (res.status === 405 || res.status === 404) {
        return clientDb.resetPassword(email);
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Erreur lors de la réinitialisation' }));
        throw new Error(err.error || 'Erreur lors de la réinitialisation');
      }
      return res.json();
    } catch (e) {
      return clientDb.resetPassword(email);
    }
  },

  async getUsers(): Promise<User[]> {
    if (isStaticOrNoBackend()) return clientDb.getUsers();
    try {
      const res = await fetch(`${BASE_URL}/users`);
      if (res.status === 405 || res.status === 404) return clientDb.getUsers();
      return res.json();
    } catch {
      return clientDb.getUsers();
    }
  },

  async updateUserStatus(id: string, status: 'ACTIF' | 'SUSPENDU'): Promise<{ success: boolean; user: User }> {
    if (isStaticOrNoBackend()) return clientDb.updateUserStatus(id, status);
    try {
      const res = await fetch(`${BASE_URL}/users/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.status === 405 || res.status === 404) return clientDb.updateUserStatus(id, status);
      return res.json();
    } catch {
      return clientDb.updateUserStatus(id, status);
    }
  },

  async updateUserPassword(id: string, password?: string): Promise<{ success: boolean; newPassword: string }> {
    if (isStaticOrNoBackend()) return clientDb.updateUserPassword(id, password);
    try {
      const res = await fetch(`${BASE_URL}/users/${id}/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (res.status === 405 || res.status === 404) return clientDb.updateUserPassword(id, password);
      return res.json();
    } catch {
      return clientDb.updateUserPassword(id, password);
    }
  },

  async updateGerantProfile(
    id: string,
    data: {
      name?: string;
      stationName?: string;
      brand?: string;
      city?: string;
      location?: string;
      phone?: string;
      companyName?: string;
      ice?: string;
      rc?: string;
      patente?: string;
      logoUrl?: string;
      stationId?: string;
      currentPassword?: string;
      newPassword?: string;
    }
  ): Promise<{ success: boolean; user: User; station?: Station; message: string }> {
    if (isStaticOrNoBackend()) return clientDb.updateGerantProfile(id, data);
    try {
      const res = await fetch(`${BASE_URL}/users/${id}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.status === 405 || res.status === 404) return clientDb.updateGerantProfile(id, data);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Erreur mise à jour profil' }));
        throw new Error(err.error || 'Erreur mise à jour profil');
      }
      return res.json();
    } catch (e: any) {
      if (e.message && (e.message.includes('actuel') || e.message.includes('caractères'))) {
        throw e;
      }
      return clientDb.updateGerantProfile(id, data);
    }
  },

  async updateStationStatus(id: string, status: 'ACTIVE' | 'SUSPENDED'): Promise<{ success: boolean; station: Station }> {
    if (isStaticOrNoBackend()) return clientDb.updateStationStatus(id, status);
    try {
      const res = await fetch(`${BASE_URL}/stations/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.status === 405 || res.status === 404) return clientDb.updateStationStatus(id, status);
      return res.json();
    } catch {
      return clientDb.updateStationStatus(id, status);
    }
  },

  // Stations
  async getStations(): Promise<Station[]> {
    if (isStaticOrNoBackend()) return clientDb.getStations();
    try {
      const res = await fetch(`${BASE_URL}/stations`);
      if (res.status === 405 || res.status === 404) return clientDb.getStations();
      return res.json();
    } catch {
      return clientDb.getStations();
    }
  },

  async getStation(id: string): Promise<Station> {
    if (isStaticOrNoBackend()) return clientDb.getStation(id);
    try {
      const res = await fetch(`${BASE_URL}/stations/${id}`);
      if (res.status === 405 || res.status === 404) return clientDb.getStation(id);
      return res.json();
    } catch {
      return clientDb.getStation(id);
    }
  },

  async createStation(stationData: any): Promise<{
    station: Station;
    credentials: {
      manager: { email: string; password: string };
      accountant?: { email: string; password: string } | null;
    };
    emailsSent: EmailNotification[];
  }> {
    if (isStaticOrNoBackend()) return clientDb.createStation(stationData);
    try {
      const res = await fetch(`${BASE_URL}/stations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(stationData),
      });
      if (res.status === 405 || res.status === 404) return clientDb.createStation(stationData);
      return res.json();
    } catch {
      return clientDb.createStation(stationData);
    }
  },

  async updateStation(id: string, data: Partial<Station>): Promise<Station> {
    if (isStaticOrNoBackend()) return clientDb.updateStation(id, data);
    try {
      const res = await fetch(`${BASE_URL}/stations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.status === 405 || res.status === 404) return clientDb.updateStation(id, data);
      return res.json();
    } catch {
      return clientDb.updateStation(id, data);
    }
  },

  async deleteStation(id: string): Promise<void> {
    if (isStaticOrNoBackend()) return clientDb.deleteStation(id);
    try {
      const res = await fetch(`${BASE_URL}/stations/${id}`, { method: 'DELETE' });
      if (res.status === 405 || res.status === 404) return clientDb.deleteStation(id);
    } catch {
      return clientDb.deleteStation(id);
    }
  },

  // Dashboard
  async getDashboard(stationId: string) {
    if (isStaticOrNoBackend()) return clientDb.getDashboard(stationId);
    try {
      const res = await fetch(`${BASE_URL}/stations/${stationId}/dashboard`);
      if (res.status === 405 || res.status === 404) return clientDb.getDashboard(stationId);
      return res.json();
    } catch {
      return clientDb.getDashboard(stationId);
    }
  },

  // Carburants
  async getCarburants(stationId: string): Promise<Carburant[]> {
    if (isStaticOrNoBackend()) return clientDb.getCarburants(stationId);
    try {
      const res = await fetch(`${BASE_URL}/stations/${stationId}/carburants`);
      if (res.status === 405 || res.status === 404) return clientDb.getCarburants(stationId);
      return res.json();
    } catch {
      return clientDb.getCarburants(stationId);
    }
  },

  async addCarburant(stationId: string, data: any): Promise<Carburant> {
    if (isStaticOrNoBackend()) return clientDb.addCarburant(stationId, data);
    try {
      const res = await fetch(`${BASE_URL}/stations/${stationId}/carburants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.status === 405 || res.status === 404) return clientDb.addCarburant(stationId, data);
      return res.json();
    } catch {
      return clientDb.addCarburant(stationId, data);
    }
  },

  async updateCarburant(stationId: string, carbId: string, data: any): Promise<Carburant> {
    if (isStaticOrNoBackend()) return clientDb.updateCarburant(stationId, carbId, data);
    try {
      const res = await fetch(`${BASE_URL}/stations/${stationId}/carburants/${carbId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.status === 405 || res.status === 404) return clientDb.updateCarburant(stationId, carbId, data);
      return res.json();
    } catch {
      return clientDb.updateCarburant(stationId, carbId, data);
    }
  },

  async deleteCarburant(stationId: string, carbId: string): Promise<void> {
    if (isStaticOrNoBackend()) return clientDb.deleteCarburant(stationId, carbId);
    try {
      await fetch(`${BASE_URL}/stations/${stationId}/carburants/${carbId}`, { method: 'DELETE' });
    } catch {
      return clientDb.deleteCarburant(stationId, carbId);
    }
  },

  // Citernes & Jaugeage
  async getCiternes(stationId: string): Promise<Citerne[]> {
    if (isStaticOrNoBackend()) return clientDb.getCiternes(stationId);
    try {
      const res = await fetch(`${BASE_URL}/stations/${stationId}/citernes`);
      if (res.status === 405 || res.status === 404) return clientDb.getCiternes(stationId);
      return res.json();
    } catch {
      return clientDb.getCiternes(stationId);
    }
  },

  async addCiterne(stationId: string, data: any): Promise<Citerne> {
    if (isStaticOrNoBackend()) return clientDb.addCiterne(stationId, data);
    try {
      const res = await fetch(`${BASE_URL}/stations/${stationId}/citernes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.status === 405 || res.status === 404) return clientDb.addCiterne(stationId, data);
      return res.json();
    } catch {
      return clientDb.addCiterne(stationId, data);
    }
  },

  async updateCiterne(stationId: string, citId: string, data: any): Promise<Citerne> {
    if (isStaticOrNoBackend()) return clientDb.updateCiterne(stationId, citId, data);
    try {
      const res = await fetch(`${BASE_URL}/stations/${stationId}/citernes/${citId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.status === 405 || res.status === 404) return clientDb.updateCiterne(stationId, citId, data);
      return res.json();
    } catch {
      return clientDb.updateCiterne(stationId, citId, data);
    }
  },

  async deleteCiterne(stationId: string, citId: string): Promise<void> {
    if (isStaticOrNoBackend()) return clientDb.deleteCiterne(stationId, citId);
    try {
      await fetch(`${BASE_URL}/stations/${stationId}/citernes/${citId}`, { method: 'DELETE' });
    } catch {
      return clientDb.deleteCiterne(stationId, citId);
    }
  },

  async getCiterneHistory(stationId: string, citId: string) {
    if (isStaticOrNoBackend()) return clientDb.getCiterneHistory(stationId, citId);
    try {
      const res = await fetch(`${BASE_URL}/stations/${stationId}/citernes/${citId}/history`);
      if (res.status === 405 || res.status === 404) return clientDb.getCiterneHistory(stationId, citId);
      return res.json();
    } catch {
      return clientDb.getCiterneHistory(stationId, citId);
    }
  },

  async submitJaugeage(stationId: string, payload: { date: string; readings: any[] }) {
    if (isStaticOrNoBackend()) return clientDb.submitJaugeage(stationId, payload);
    try {
      const res = await fetch(`${BASE_URL}/stations/${stationId}/jaugeage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.status === 405 || res.status === 404) return clientDb.submitJaugeage(stationId, payload);
      return res.json();
    } catch {
      return clientDb.submitJaugeage(stationId, payload);
    }
  },

  // Pistolets
  async getPistolets(stationId: string): Promise<Pistolet[]> {
    if (isStaticOrNoBackend()) return clientDb.getPistolets(stationId);
    try {
      const res = await fetch(`${BASE_URL}/stations/${stationId}/pistolets`);
      if (res.status === 405 || res.status === 404) return clientDb.getPistolets(stationId);
      return res.json();
    } catch {
      return clientDb.getPistolets(stationId);
    }
  },

  async addPistolet(stationId: string, data: any): Promise<Pistolet> {
    if (isStaticOrNoBackend()) return clientDb.addPistolet(stationId, data);
    try {
      const res = await fetch(`${BASE_URL}/stations/${stationId}/pistolets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.status === 405 || res.status === 404) return clientDb.addPistolet(stationId, data);
      return res.json();
    } catch {
      return clientDb.addPistolet(stationId, data);
    }
  },

  async updatePistolet(stationId: string, pistId: string, data: any): Promise<Pistolet> {
    if (isStaticOrNoBackend()) return clientDb.updatePistolet(stationId, pistId, data);
    try {
      const res = await fetch(`${BASE_URL}/stations/${stationId}/pistolets/${pistId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.status === 405 || res.status === 404) return clientDb.updatePistolet(stationId, pistId, data);
      return res.json();
    } catch {
      return clientDb.updatePistolet(stationId, pistId, data);
    }
  },

  async deletePistolet(stationId: string, pistId: string): Promise<void> {
    if (isStaticOrNoBackend()) return clientDb.deletePistolet(stationId, pistId);
    try {
      await fetch(`${BASE_URL}/stations/${stationId}/pistolets/${pistId}`, { method: 'DELETE' });
    } catch {
      return clientDb.deletePistolet(stationId, pistId);
    }
  },

  async getPistoletHistory(stationId: string, pistId: string) {
    if (isStaticOrNoBackend()) return clientDb.getPistoletHistory(stationId, pistId);
    try {
      const res = await fetch(`${BASE_URL}/stations/${stationId}/pistolets/${pistId}/history`);
      if (res.status === 405 || res.status === 404) return clientDb.getPistoletHistory(stationId, pistId);
      return res.json();
    } catch {
      return clientDb.getPistoletHistory(stationId, pistId);
    }
  },

  async submitCalibrage(stationId: string, payload: { date: string; adjustments: any[] }) {
    if (isStaticOrNoBackend()) return clientDb.submitCalibrage(stationId, payload);
    try {
      const res = await fetch(`${BASE_URL}/stations/${stationId}/calibrage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.status === 405 || res.status === 404) return clientDb.submitCalibrage(stationId, payload);
      return res.json();
    } catch {
      return clientDb.submitCalibrage(stationId, payload);
    }
  },

  // Salariés
  async getSalaries(stationId: string): Promise<Salarie[]> {
    if (isStaticOrNoBackend()) return clientDb.getSalaries(stationId);
    try {
      const res = await fetch(`${BASE_URL}/stations/${stationId}/salaries`);
      if (res.status === 405 || res.status === 404) return clientDb.getSalaries(stationId);
      return res.json();
    } catch {
      return clientDb.getSalaries(stationId);
    }
  },

  async addSalarie(stationId: string, data: any): Promise<Salarie> {
    if (isStaticOrNoBackend()) return clientDb.addSalarie(stationId, data);
    try {
      const res = await fetch(`${BASE_URL}/stations/${stationId}/salaries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.status === 405 || res.status === 404) return clientDb.addSalarie(stationId, data);
      return res.json();
    } catch {
      return clientDb.addSalarie(stationId, data);
    }
  },

  async updateSalarie(stationId: string, salId: string, data: any): Promise<Salarie> {
    if (isStaticOrNoBackend()) return clientDb.updateSalarie(stationId, salId, data);
    try {
      const res = await fetch(`${BASE_URL}/stations/${stationId}/salaries/${salId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.status === 405 || res.status === 404) return clientDb.updateSalarie(stationId, salId, data);
      return res.json();
    } catch {
      return clientDb.updateSalarie(stationId, salId, data);
    }
  },

  async deleteSalarie(stationId: string, salId: string): Promise<void> {
    if (isStaticOrNoBackend()) return clientDb.deleteSalarie(stationId, salId);
    try {
      await fetch(`${BASE_URL}/stations/${stationId}/salaries/${salId}`, { method: 'DELETE' });
    } catch {
      return clientDb.deleteSalarie(stationId, salId);
    }
  },

  // Tiers (Clients / Fournisseurs)
  async getTiers(stationId: string, type?: 'Client' | 'Fournisseur'): Promise<Tier[]> {
    if (isStaticOrNoBackend()) return clientDb.getTiers(stationId, type);
    try {
      const query = type ? `?type=${type}` : '';
      const res = await fetch(`${BASE_URL}/stations/${stationId}/tiers${query}`);
      if (res.status === 405 || res.status === 404) return clientDb.getTiers(stationId, type);
      return res.json();
    } catch {
      return clientDb.getTiers(stationId, type);
    }
  },

  async addTier(stationId: string, data: any): Promise<Tier> {
    if (isStaticOrNoBackend()) return clientDb.addTier(stationId, data);
    try {
      const res = await fetch(`${BASE_URL}/stations/${stationId}/tiers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.status === 405 || res.status === 404) return clientDb.addTier(stationId, data);
      return res.json();
    } catch {
      return clientDb.addTier(stationId, data);
    }
  },

  async updateTier(stationId: string, tierId: string, data: any): Promise<Tier> {
    if (isStaticOrNoBackend()) return clientDb.updateTier(stationId, tierId, data);
    try {
      const res = await fetch(`${BASE_URL}/stations/${stationId}/tiers/${tierId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.status === 405 || res.status === 404) return clientDb.updateTier(stationId, tierId, data);
      return res.json();
    } catch {
      return clientDb.updateTier(stationId, tierId, data);
    }
  },

  async deleteTier(stationId: string, tierId: string): Promise<void> {
    if (isStaticOrNoBackend()) return clientDb.deleteTier(stationId, tierId);
    try {
      await fetch(`${BASE_URL}/stations/${stationId}/tiers/${tierId}`, { method: 'DELETE' });
    } catch {
      return clientDb.deleteTier(stationId, tierId);
    }
  },

  async getPaiementsTiers(stationId: string): Promise<PaiementTier[]> {
    if (isStaticOrNoBackend()) return clientDb.getPaiementsTiers(stationId);
    try {
      const res = await fetch(`${BASE_URL}/stations/${stationId}/paiements-tiers`);
      if (res.status === 405 || res.status === 404) return clientDb.getPaiementsTiers(stationId);
      return res.json();
    } catch {
      return clientDb.getPaiementsTiers(stationId);
    }
  },

  async addPaiementTier(stationId: string, data: any): Promise<PaiementTier> {
    if (isStaticOrNoBackend()) return clientDb.addPaiementTier(stationId, data);
    try {
      const res = await fetch(`${BASE_URL}/stations/${stationId}/paiements-tiers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.status === 405 || res.status === 404) return clientDb.addPaiementTier(stationId, data);
      return res.json();
    } catch {
      return clientDb.addPaiementTier(stationId, data);
    }
  },

  async updatePaiementTier(stationId: string, pmtId: string, data: any): Promise<PaiementTier> {
    if (isStaticOrNoBackend()) return clientDb.updatePaiementTier(stationId, pmtId, data);
    try {
      const res = await fetch(`${BASE_URL}/stations/${stationId}/paiements-tiers/${pmtId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.status === 405 || res.status === 404) return clientDb.updatePaiementTier(stationId, pmtId, data);
      return res.json();
    } catch {
      return clientDb.updatePaiementTier(stationId, pmtId, data);
    }
  },

  async deletePaiementTier(stationId: string, pmtId: string): Promise<void> {
    if (isStaticOrNoBackend()) return clientDb.deletePaiementTier(stationId, pmtId);
    try {
      await fetch(`${BASE_URL}/stations/${stationId}/paiements-tiers/${pmtId}`, { method: 'DELETE' });
    } catch {
      return clientDb.deletePaiementTier(stationId, pmtId);
    }
  },

  // Produits
  async getProduits(stationId: string): Promise<Produit[]> {
    if (isStaticOrNoBackend()) return clientDb.getProduits(stationId);
    try {
      const res = await fetch(`${BASE_URL}/stations/${stationId}/produits`);
      if (res.status === 405 || res.status === 404) return clientDb.getProduits(stationId);
      return res.json();
    } catch {
      return clientDb.getProduits(stationId);
    }
  },

  async addProduit(stationId: string, data: any): Promise<Produit> {
    if (isStaticOrNoBackend()) return clientDb.addProduit(stationId, data);
    try {
      const res = await fetch(`${BASE_URL}/stations/${stationId}/produits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.status === 405 || res.status === 404) return clientDb.addProduit(stationId, data);
      return res.json();
    } catch {
      return clientDb.addProduit(stationId, data);
    }
  },

  async updateProduit(stationId: string, prodId: string, data: any): Promise<Produit> {
    if (isStaticOrNoBackend()) return clientDb.updateProduit(stationId, prodId, data);
    try {
      const res = await fetch(`${BASE_URL}/stations/${stationId}/produits/${prodId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.status === 405 || res.status === 404) return clientDb.updateProduit(stationId, prodId, data);
      return res.json();
    } catch {
      return clientDb.updateProduit(stationId, prodId, data);
    }
  },

  async deleteProduit(stationId: string, prodId: string): Promise<void> {
    if (isStaticOrNoBackend()) return clientDb.deleteProduit(stationId, prodId);
    try {
      await fetch(`${BASE_URL}/stations/${stationId}/produits/${prodId}`, { method: 'DELETE' });
    } catch {
      return clientDb.deleteProduit(stationId, prodId);
    }
  },

  // Services
  async getServices(stationId: string): Promise<ServiceStation[]> {
    if (isStaticOrNoBackend()) return clientDb.getServices(stationId);
    try {
      const res = await fetch(`${BASE_URL}/stations/${stationId}/services`);
      if (res.status === 405 || res.status === 404) return clientDb.getServices(stationId);
      return res.json();
    } catch {
      return clientDb.getServices(stationId);
    }
  },

  async addService(stationId: string, data: any): Promise<ServiceStation> {
    if (isStaticOrNoBackend()) return clientDb.addService(stationId, data);
    try {
      const res = await fetch(`${BASE_URL}/stations/${stationId}/services`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.status === 405 || res.status === 404) return clientDb.addService(stationId, data);
      return res.json();
    } catch {
      return clientDb.addService(stationId, data);
    }
  },

  async updateService(stationId: string, servId: string, data: any): Promise<ServiceStation> {
    if (isStaticOrNoBackend()) return clientDb.updateService(stationId, servId, data);
    try {
      const res = await fetch(`${BASE_URL}/stations/${stationId}/services/${servId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.status === 405 || res.status === 404) return clientDb.updateService(stationId, servId, data);
      return res.json();
    } catch {
      return clientDb.updateService(stationId, servId, data);
    }
  },

  async deleteService(stationId: string, servId: string): Promise<void> {
    if (isStaticOrNoBackend()) return clientDb.deleteService(stationId, servId);
    try {
      await fetch(`${BASE_URL}/stations/${stationId}/services/${servId}`, { method: 'DELETE' });
    } catch {
      return clientDb.deleteService(stationId, servId);
    }
  },

  // Journées
  async getJournees(stationId: string): Promise<Journee[]> {
    if (isStaticOrNoBackend()) return clientDb.getJournees(stationId);
    try {
      const res = await fetch(`${BASE_URL}/stations/${stationId}/journees`);
      if (res.status === 405 || res.status === 404) return clientDb.getJournees(stationId);
      return res.json();
    } catch {
      return clientDb.getJournees(stationId);
    }
  },

  async submitJournee(stationId: string, journeeData: any): Promise<Journee> {
    if (isStaticOrNoBackend()) return clientDb.submitJournee(stationId, journeeData);
    try {
      const res = await fetch(`${BASE_URL}/stations/${stationId}/journees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(journeeData),
      });
      if (res.status === 405 || res.status === 404) return clientDb.submitJournee(stationId, journeeData);
      return res.json();
    } catch {
      return clientDb.submitJournee(stationId, journeeData);
    }
  },

  // Achats
  async getAchats(stationId: string): Promise<Achat[]> {
    if (isStaticOrNoBackend()) return clientDb.getAchats(stationId);
    try {
      const res = await fetch(`${BASE_URL}/stations/${stationId}/achats`);
      if (res.status === 405 || res.status === 404) return clientDb.getAchats(stationId);
      return res.json();
    } catch {
      return clientDb.getAchats(stationId);
    }
  },

  async addAchat(stationId: string, data: any): Promise<Achat> {
    if (isStaticOrNoBackend()) return clientDb.addAchat(stationId, data);
    try {
      const res = await fetch(`${BASE_URL}/stations/${stationId}/achats`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.status === 405 || res.status === 404) return clientDb.addAchat(stationId, data);
      return res.json();
    } catch {
      return clientDb.addAchat(stationId, data);
    }
  },

  async updateAchat(stationId: string, achId: string, data: any): Promise<Achat> {
    if (isStaticOrNoBackend()) return clientDb.updateAchat(stationId, achId, data);
    try {
      const res = await fetch(`${BASE_URL}/stations/${stationId}/achats/${achId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.status === 405 || res.status === 404) return clientDb.updateAchat(stationId, achId, data);
      return res.json();
    } catch {
      return clientDb.updateAchat(stationId, achId, data);
    }
  },

  async deleteAchat(stationId: string, achId: string): Promise<void> {
    if (isStaticOrNoBackend()) return clientDb.deleteAchat(stationId, achId);
    try {
      await fetch(`${BASE_URL}/stations/${stationId}/achats/${achId}`, { method: 'DELETE' });
    } catch {
      return clientDb.deleteAchat(stationId, achId);
    }
  },

  // Dépenses
  async getDepenses(stationId: string): Promise<Depense[]> {
    if (isStaticOrNoBackend()) return clientDb.getDepenses(stationId);
    try {
      const res = await fetch(`${BASE_URL}/stations/${stationId}/depenses`);
      if (res.status === 405 || res.status === 404) return clientDb.getDepenses(stationId);
      return res.json();
    } catch {
      return clientDb.getDepenses(stationId);
    }
  },

  async addDepense(stationId: string, data: any): Promise<Depense> {
    if (isStaticOrNoBackend()) return clientDb.addDepense(stationId, data);
    try {
      const res = await fetch(`${BASE_URL}/stations/${stationId}/depenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.status === 405 || res.status === 404) return clientDb.addDepense(stationId, data);
      return res.json();
    } catch {
      return clientDb.addDepense(stationId, data);
    }
  },

  async updateDepense(stationId: string, depId: string, data: any): Promise<Depense> {
    if (isStaticOrNoBackend()) return clientDb.updateDepense(stationId, depId, data);
    try {
      const res = await fetch(`${BASE_URL}/stations/${stationId}/depenses/${depId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.status === 405 || res.status === 404) return clientDb.updateDepense(stationId, depId, data);
      return res.json();
    } catch {
      return clientDb.updateDepense(stationId, depId, data);
    }
  },

  async deleteDepense(stationId: string, depId: string): Promise<void> {
    if (isStaticOrNoBackend()) return clientDb.deleteDepense(stationId, depId);
    try {
      await fetch(`${BASE_URL}/stations/${stationId}/depenses/${depId}`, { method: 'DELETE' });
    } catch {
      return clientDb.deleteDepense(stationId, depId);
    }
  },

  // Factures, BL & Devis
  async getCommercialDocs(stationId: string, docType?: string): Promise<CommercialDoc[]> {
    if (isStaticOrNoBackend()) return clientDb.getCommercialDocs(stationId, docType);
    try {
      const query = docType ? `?docType=${docType}` : '';
      const res = await fetch(`${BASE_URL}/stations/${stationId}/commercial-docs${query}`);
      if (res.status === 405 || res.status === 404) return clientDb.getCommercialDocs(stationId, docType);
      return res.json();
    } catch {
      return clientDb.getCommercialDocs(stationId, docType);
    }
  },

  async addCommercialDoc(stationId: string, data: any): Promise<CommercialDoc> {
    if (isStaticOrNoBackend()) return clientDb.addCommercialDoc(stationId, data);
    try {
      const res = await fetch(`${BASE_URL}/stations/${stationId}/commercial-docs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.status === 405 || res.status === 404) return clientDb.addCommercialDoc(stationId, data);
      return res.json();
    } catch {
      return clientDb.addCommercialDoc(stationId, data);
    }
  },

  async updateCommercialDoc(stationId: string, docId: string, data: any): Promise<CommercialDoc> {
    if (isStaticOrNoBackend()) return clientDb.updateCommercialDoc(stationId, docId, data);
    try {
      const res = await fetch(`${BASE_URL}/stations/${stationId}/commercial-docs/${docId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.status === 405 || res.status === 404) return clientDb.updateCommercialDoc(stationId, docId, data);
      return res.json();
    } catch {
      return clientDb.updateCommercialDoc(stationId, docId, data);
    }
  },

  async deleteCommercialDoc(stationId: string, docId: string): Promise<void> {
    if (isStaticOrNoBackend()) return clientDb.deleteCommercialDoc(stationId, docId);
    try {
      await fetch(`${BASE_URL}/stations/${stationId}/commercial-docs/${docId}`, { method: 'DELETE' });
    } catch {
      return clientDb.deleteCommercialDoc(stationId, docId);
    }
  },

  // Rapports
  async getRapports(stationId: string, params?: { startDate?: string; endDate?: string; year?: string }) {
    if (isStaticOrNoBackend()) return clientDb.getRapports(stationId, params);
    try {
      const q = new URLSearchParams(params as any).toString();
      const res = await fetch(`${BASE_URL}/stations/${stationId}/rapports?${q}`);
      if (res.status === 405 || res.status === 404) return clientDb.getRapports(stationId, params);
      return res.json();
    } catch {
      return clientDb.getRapports(stationId, params);
    }
  },

  // Emails outbox & SMTP
  async getEmails(): Promise<EmailNotification[]> {
    if (isStaticOrNoBackend()) return clientDb.getEmails();
    try {
      const res = await fetch(`${BASE_URL}/emails`);
      if (res.status === 405 || res.status === 404) return clientDb.getEmails();
      return res.json();
    } catch {
      return clientDb.getEmails();
    }
  },

  async resendEmail(id: string): Promise<{ success: boolean; message: string; email: EmailNotification }> {
    if (isStaticOrNoBackend()) return clientDb.resendEmail(id);
    try {
      const res = await fetch(`${BASE_URL}/emails/${id}/resend`, { method: 'POST' });
      if (res.status === 405 || res.status === 404) return clientDb.resendEmail(id);
      return res.json();
    } catch {
      return clientDb.resendEmail(id);
    }
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
    if (isStaticOrNoBackend()) return clientDb.getSmtpStatus();
    try {
      const res = await fetch(`${BASE_URL}/smtp/status`);
      if (res.status === 405 || res.status === 404) return clientDb.getSmtpStatus();
      return res.json();
    } catch {
      return clientDb.getSmtpStatus();
    }
  },

  async testSmtp(testEmail: string): Promise<{ success: boolean; message: string }> {
    if (isStaticOrNoBackend()) return clientDb.testSmtp(testEmail);
    try {
      const res = await fetch(`${BASE_URL}/smtp/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testEmail }),
      });
      if (res.status === 405 || res.status === 404) return clientDb.testSmtp(testEmail);
      return res.json();
    } catch {
      return clientDb.testSmtp(testEmail);
    }
  },
};
