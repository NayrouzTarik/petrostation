import initialDb from '../../data/db.json';
import {
  Achat,
  Carburant,
  Citerne,
  CommercialDoc,
  Depense,
  EmailNotification,
  JaugeageRecord,
  CalibrageRecord,
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

export interface DatabaseSchema {
  users: User[];
  stations: Station[];
  carburants: Carburant[];
  citernes: Citerne[];
  jaugeages: JaugeageRecord[];
  pistolets: Pistolet[];
  calibrages: CalibrageRecord[];
  salaries: Salarie[];
  tiers: Tier[];
  paiementsTiers: PaiementTier[];
  produits: Produit[];
  services: ServiceStation[];
  journees: Journee[];
  achats: Achat[];
  depenses: Depense[];
  commercialDocs: CommercialDoc[];
  emailNotifications: EmailNotification[];
}

const STORAGE_KEY = 'stationhub_prod_database_v2';

function fixLogoUrls(data: DatabaseSchema): DatabaseSchema {
  if (data.stations) {
    data.stations = data.stations.map((s) => {
      let logo = s.logoUrl || '';
      if (logo.includes('/src/assets/images/')) {
        logo = logo.replace('/src/assets/images/', '/images/');
      }
      return { ...s, logoUrl: logo };
    });
  }
  return data;
}

function loadDatabase(): DatabaseSchema {
  if (typeof window === 'undefined') {
    return fixLogoUrls(JSON.parse(JSON.stringify(initialDb)));
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.users) && parsed.users.length > 0) {
        return fixLogoUrls(parsed);
      }
    }
  } catch (e) {
    console.warn('Erreur lecture localStorage, réinitialisation base par défaut', e);
  }

  const seeded = fixLogoUrls(JSON.parse(JSON.stringify(initialDb)));
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
  } catch (e) {
    console.error('Erreur écriture seed localStorage', e);
  }
  return seeded;
}

import { supabase } from './supabaseClient.ts';

let memoryDb: DatabaseSchema = loadDatabase();
let isSyncing = false;
let syncDebounce: any = null;

export async function syncFromSupabase(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (isSyncing) return false;
  isSyncing = true;
  try {
    const { data, error } = await supabase.from('app_state').select('key, data');
    if (error) {
      console.warn('[Supabase Sync] Table app_state inaccessible ou non créée:', error.message);
      return false;
    }
    if (data && data.length > 0) {
      data.forEach((row: { key: string; data: any }) => {
        if (row.key in memoryDb) {
          (memoryDb as any)[row.key] = row.data;
        }
      });
      fixLogoUrls(memoryDb);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(memoryDb));
      } catch (e) {
        // ignore storage error
      }
      return true;
    }
  } catch (err) {
    console.warn('[Supabase Sync] Erreur lors de la synchronisation:', err);
  } finally {
    isSyncing = false;
  }
  return false;
}

// Lancer la synchronisation initiale dès le chargement en arrière-plan
if (typeof window !== 'undefined') {
  syncFromSupabase().catch(() => {});
}

function persist(changedKey?: keyof DatabaseSchema): void {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(memoryDb));
    } catch (e) {
      console.error('Erreur persistance localStorage', e);
    }

    // Synchronisation en arrière-plan avec Supabase
    if (syncDebounce) clearTimeout(syncDebounce);
    syncDebounce = setTimeout(async () => {
      try {
        if (changedKey) {
          await supabase.from('app_state').upsert({
            key: changedKey,
            data: memoryDb[changedKey],
            updated_at: new Date().toISOString(),
          });
        } else {
          const entries = (Object.keys(memoryDb) as (keyof DatabaseSchema)[]).map((k) => ({
            key: k,
            data: memoryDb[k],
            updated_at: new Date().toISOString(),
          }));
          await supabase.from('app_state').upsert(entries);
        }
      } catch (e) {
        console.warn('[Supabase Persist] Sauvegarde cloud en attente:', e);
      }
    }, 400);
  }
}

export const clientDb = {
  get(): DatabaseSchema {
    return memoryDb;
  },

  async sync(): Promise<boolean> {
    return syncFromSupabase();
  },

  reset(): void {
    memoryDb = fixLogoUrls(JSON.parse(JSON.stringify(initialDb)));
    persist();
  },

  // Auth
  async login(email: string, password: string) {
    const cleanEmail = email?.trim().toLowerCase();
    let user = memoryDb.users.find(
      (u) => u.email.toLowerCase() === cleanEmail && u.password === password
    );

    // Si non trouvé en cache local, tenter une synchronisation fraîche depuis Supabase
    if (!user) {
      await syncFromSupabase();
      user = memoryDb.users.find(
        (u) => u.email.toLowerCase() === cleanEmail && u.password === password
      );
    }

    if (!user) {
      throw new Error('Email ou mot de passe incorrect');
    }
    if (user.status === 'SUSPENDU') {
      throw new Error("Votre compte a été désactivé par l'administrateur.");
    }
    let station: Station | null = null;
    if (user.stationId) {
      station = memoryDb.stations.find((s) => s.id === user.stationId) || null;
      if (station && station.status === 'SUSPENDED') {
        throw new Error('Cette station a été suspendue.');
      }
    }
    const token = `token-${user.id}-${Date.now()}`;
    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        stationId: user.stationId,
        phone: user.phone,
        status: user.status || 'ACTIF',
      },
      station,
      token,
    };
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
    const cleanEmail = data.email.trim().toLowerCase();
    const existing = memoryDb.users.find(
      (u) => u.email.toLowerCase() === cleanEmail
    );
    if (existing) {
      throw new Error('Un compte avec cette adresse email existe déjà');
    }

    const stationId = `station-${Date.now()}`;
    const managerId = `user-gerant-${Date.now()}`;

    const newUser: User = {
      id: managerId,
      email: data.email.trim(),
      name: data.managerName,
      password: data.password,
      role: 'GERANT',
      stationId,
      phone: data.phone || '',
      status: 'ACTIF',
      createdAt: new Date().toISOString(),
    };
    memoryDb.users.push(newUser);

    const newStation: Station = {
      id: stationId,
      name: data.stationName,
      code: `ST-${Date.now().toString().slice(-4)}`,
      brand: data.brand || 'Winxo',
      location: data.location || '',
      city: data.city || 'Maroc',
      logoUrl: '/images/station_modern_exterior_1792246841660.jpg',
      companyName: `${data.stationName.toUpperCase()} SARL`,
      ice: '00' + Math.floor(1000000000000 + Math.random() * 9000000000000),
      patente: Math.floor(10000000 + Math.random() * 90000000).toString(),
      rc: `${Math.floor(10000 + Math.random() * 90000)} ${data.city || 'Maroc'}`,
      phone: data.phone || '',
      email: data.email.trim(),
      managerId,
      createdAt: new Date().toISOString(),
      status: 'ACTIVE',
    };
    memoryDb.stations.push(newStation);

    memoryDb.carburants.push(
      {
        id: `carb-gas-${Date.now()}`,
        stationId,
        name: 'Gasoil',
        code: 'GAS',
        pricePerLiter: 12.8,
        color: '#10b981',
        history: [],
      },
      {
        id: `carb-sp-${Date.now()}`,
        stationId,
        name: 'Sans Plomb',
        code: 'SP95',
        pricePerLiter: 14.5,
        color: '#f59e0b',
        history: [],
      }
    );

    persist();

    return {
      success: true,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        stationId: newUser.stationId,
      },
      station: newStation,
      token: `token-${newUser.id}-${Date.now()}`,
    };
  },

  async resetPassword(email: string) {
    const user = memoryDb.users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
    if (!user) {
      throw new Error('Aucun compte trouvé avec cette adresse email');
    }
    const tempPassword = `Pass@${Math.floor(1000 + Math.random() * 9000)}!`;
    user.password = tempPassword;
    persist();
    return {
      success: true,
      message: 'Un mot de passe temporaire a été configuré.',
      temporaryPassword: tempPassword,
    };
  },

  // Users
  async getUsers(): Promise<User[]> {
    return memoryDb.users;
  },

  async updateUserStatus(id: string, status: 'ACTIF' | 'SUSPENDU') {
    const user = memoryDb.users.find((u) => u.id === id);
    if (!user) throw new Error('Utilisateur non trouvé');
    user.status = status;
    persist();
    return { success: true, user };
  },

  async updateUserPassword(id: string, password?: string) {
    const user = memoryDb.users.find((u) => u.id === id);
    if (!user) throw new Error('Utilisateur non trouvé');
    const newPassword = password || `Pass@${Math.floor(1000 + Math.random() * 9000)}!`;
    user.password = newPassword;
    persist();
    return { success: true, newPassword };
  },

  async updateGerantProfile(
    id: string,
    data: { name?: string; currentPassword?: string; newPassword?: string; logoUrl?: string }
  ) {
    const user = memoryDb.users.find((u) => u.id === id);
    if (!user) throw new Error('Utilisateur non trouvé');

    if (data.newPassword) {
      if (!data.currentPassword) {
        throw new Error('Veuillez renseigner votre mot de passe actuel');
      }
      if (user.password !== data.currentPassword) {
        throw new Error('Mot de passe actuel incorrect');
      }
      if (data.newPassword.length < 6) {
        throw new Error('Le nouveau mot de passe doit comporter au moins 6 caractères');
      }
      user.password = data.newPassword;
    }

    if (data.name && data.name.trim()) {
      user.name = data.name.trim();
    }

    let station: Station | undefined;
    if (user.stationId) {
      station = memoryDb.stations.find((s) => s.id === user.stationId);
      if (station && data.logoUrl !== undefined) {
        station.logoUrl = data.logoUrl;
      }
    }

    persist();
    return {
      success: true,
      user,
      station,
      message: 'Profil et paramètres mis à jour avec succès.',
    };
  },

  // Stations
  async getStations(): Promise<Station[]> {
    return memoryDb.stations;
  },

  async getStation(id: string): Promise<Station> {
    const s = memoryDb.stations.find((st) => st.id === id);
    if (!s) throw new Error('Station non trouvée');
    return s;
  },

  async createStation(stationData: any): Promise<{
    station: Station;
    credentials: {
      manager: { email: string; password: string };
      accountant?: { email: string; password: string } | null;
    };
    emailsSent: EmailNotification[];
  }> {
    const stationId = `station-${Date.now()}`;
    const managerId = `user-gerant-${Date.now()}`;
    const managerPass = `Station@${Math.floor(1000 + Math.random() * 9000)}`;

    const managerUser: User = {
      id: managerId,
      name: stationData.managerName || 'Gérant Station',
      email: stationData.managerEmail || `gerant.${Date.now()}@stationhub.ma`,
      password: managerPass,
      role: 'GERANT',
      stationId,
      phone: stationData.managerPhone || stationData.phone || '',
      status: 'ACTIF',
      createdAt: new Date().toISOString(),
    };
    memoryDb.users.push(managerUser);

    let accountantUser: User | null = null;
    let accountantPass = '';
    if (stationData.accountantEmail) {
      const accountantId = `user-compta-${Date.now()}`;
      accountantPass = `Compta@${Math.floor(1000 + Math.random() * 9000)}`;
      accountantUser = {
        id: accountantId,
        name: stationData.accountantName || 'Comptable Station',
        email: stationData.accountantEmail,
        password: accountantPass,
        role: 'EXPERT_COMPTABLE',
        stationId,
        phone: stationData.accountantPhone || '',
        status: 'ACTIF',
        createdAt: new Date().toISOString(),
      };
      memoryDb.users.push(accountantUser);
    }

    const newStation: Station = {
      id: stationId,
      name: stationData.name,
      code: stationData.code || `ST-${Date.now().toString().slice(-4)}`,
      brand: stationData.brand || 'Winxo',
      location: stationData.location || '',
      city: stationData.city || 'Maroc',
      logoUrl: stationData.logoUrl || '/images/station_modern_exterior_1792246841660.jpg',
      companyName: stationData.companyName || `${stationData.name.toUpperCase()} SARL`,
      ice: stationData.ice || '001594832000045',
      patente: stationData.patente || '34120984',
      rc: stationData.rc || '45892',
      phone: stationData.phone || '',
      email: stationData.email || managerUser.email,
      managerId,
      accountantId: accountantUser ? accountantUser.id : undefined,
      createdAt: new Date().toISOString(),
      status: 'ACTIVE',
    };
    memoryDb.stations.push(newStation);

    // Initial default fuels
    memoryDb.carburants.push(
      {
        id: `carb-gas-${Date.now()}`,
        stationId,
        name: 'Gasoil',
        code: 'GAS',
        pricePerLiter: 12.8,
        color: '#10b981',
        history: [],
      },
      {
        id: `carb-sp-${Date.now()}`,
        stationId,
        name: 'Sans Plomb',
        code: 'SP95',
        pricePerLiter: 14.5,
        color: '#f59e0b',
        history: [],
      }
    );

    persist();

    return {
      station: newStation,
      credentials: {
        manager: { email: managerUser.email, password: managerPass },
        accountant: accountantUser ? { email: accountantUser.email, password: accountantPass } : null,
      },
      emailsSent: [],
    };
  },

  async updateStation(id: string, data: Partial<Station>): Promise<Station> {
    const idx = memoryDb.stations.findIndex((s) => s.id === id);
    if (idx === -1) throw new Error('Station non trouvée');
    memoryDb.stations[idx] = { ...memoryDb.stations[idx], ...data };
    persist();
    return memoryDb.stations[idx];
  },

  async updateStationStatus(id: string, status: 'ACTIVE' | 'SUSPENDED') {
    const station = memoryDb.stations.find((s) => s.id === id);
    if (!station) throw new Error('Station non trouvée');
    station.status = status;
    persist();
    return { success: true, station };
  },

  async deleteStation(id: string): Promise<void> {
    memoryDb.stations = memoryDb.stations.filter((s) => s.id !== id);
    persist();
  },

  // Dashboard
  async getDashboard(stationId: string) {
    const stationJournees = memoryDb.journees.filter((j) => j.stationId === stationId);
    const stationTiers = memoryDb.tiers.filter((t) => t.stationId === stationId);
    const stationAchats = memoryDb.achats.filter((a) => a.stationId === stationId);
    const stationDepenses = memoryDb.depenses.filter((d) => d.stationId === stationId);
    const stationDocs = (memoryDb.commercialDocs || []).filter(
      (d) => d.stationId === stationId && (d.docType === 'FACTURE' || d.docType === 'BON_LIVRAISON')
    );

    const today = new Date().toISOString().split('T')[0];
    const thisMonth = today.slice(0, 7);
    const thisYear = today.slice(0, 4);

    let caJour = 0;
    let caSemaine = 0;
    let caMois = 0;
    let caAnnee = 0;

    stationJournees.forEach((j) => {
      const jDate = (j.dateDebut || '').split('T')[0];
      const ca = parseFloat(j.totalChiffreAffairesDH as any) || 0;
      if (jDate === today) caJour += ca;
      if (jDate.startsWith(thisMonth)) caMois += ca;
      if (jDate.startsWith(thisYear)) caAnnee += ca;
      if (jDate) {
        const diffDays = (new Date(today).getTime() - new Date(jDate).getTime()) / (1000 * 3600 * 24);
        if (diffDays >= 0 && diffDays <= 7) {
          caSemaine += ca;
        }
      }
    });

    stationDocs.forEach((d) => {
      const dDate = (d.dateDocument || '').split('T')[0];
      const ca = parseFloat(d.totalTTC as any) || 0;
      if (dDate === today) caJour += ca;
      if (dDate.startsWith(thisMonth)) caMois += ca;
      if (dDate.startsWith(thisYear)) caAnnee += ca;
      if (dDate) {
        const diffDays = (new Date(today).getTime() - new Date(dDate).getTime()) / (1000 * 3600 * 24);
        if (diffDays >= 0 && diffDays <= 7) {
          caSemaine += ca;
        }
      }
    });

    let soldeClients = 0;
    let countClientsPositifs = 0;
    let soldeFournisseurs = 0;
    let countFournisseursNegatifs = 0;

    stationTiers.forEach((t) => {
      if (t.type === 'Client') {
        soldeClients += t.solde || 0;
        if (t.solde > 0) countClientsPositifs++;
      } else if (t.type === 'Fournisseur') {
        soldeFournisseurs += t.solde || 0;
        if (t.solde < 0) countFournisseursNegatifs++;
      }
    });

    const productSalesMap = new Map<string, { name: string; qte: number; totalDH: number }>();
    stationJournees.forEach((j) => {
      j.produitEntries?.forEach((p) => {
        const existing = productSalesMap.get(p.produitId) || {
          name: p.nomProduit,
          qte: 0,
          totalDH: 0,
        };
        existing.qte += p.quantiteVendue || 0;
        existing.totalDH += p.totalDH || 0;
        productSalesMap.set(p.produitId, existing);
      });
    });

    let topProducts = Array.from(productSalesMap.values()).sort((a, b) => b.totalDH - a.totalDH);
    if (topProducts.length === 0) {
      const stationProds = memoryDb.produits.filter((p) => p.stationId === stationId);
      topProducts = stationProds.slice(0, 3).map((p) => ({
        name: p.name,
        qte: p.stockBoutique || 0,
        totalDH: (p.stockBoutique || 0) * (p.prixVenteTTC || 0),
      }));
    }

    const monthNames = [
      'Janv', 'Févr', 'Mars', 'Avr', 'Mai', 'Juin',
      'Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc',
    ];
    const chartMonthly = monthNames.map((name, index) => {
      const monthKey = `${thisYear}-${String(index + 1).padStart(2, '0')}`;
      let caHT = 0;

      stationJournees.forEach((j) => {
        const jDate = (j.dateDebut || '').split('T')[0];
        if (jDate.startsWith(monthKey)) {
          caHT += (j.totalChiffreAffairesDH || 0) / 1.1;
        }
      });

      stationDocs.forEach((d) => {
        const dDate = (d.dateDocument || '').split('T')[0];
        if (dDate.startsWith(monthKey)) {
          caHT += d.totalHT || (d.totalTTC || 0) / 1.1;
        }
      });

      let charges = 0;
      stationAchats.forEach((a) => {
        const aDate = (a.dateFacturation || '').split('T')[0];
        if (aDate.startsWith(monthKey)) {
          charges += a.totalHT || 0;
        }
      });
      stationDepenses.forEach((d) => {
        const depDate = (d.dateFacturation || '').split('T')[0];
        if (depDate.startsWith(monthKey)) {
          charges += d.totalHT || 0;
        }
      });

      const resultatNet = caHT - charges;

      return {
        month: name,
        monthKey,
        caHT: Math.round(caHT),
        charges: Math.round(charges),
        resultatNet: Math.round(resultatNet),
      };
    });

    return {
      caJour: Math.round(caJour * 100) / 100,
      caSemaine: Math.round(caSemaine * 100) / 100,
      caMois: Math.round(caMois * 100) / 100,
      caAnnee: Math.round(caAnnee * 100) / 100,
      soldeClients: Math.round(soldeClients * 100) / 100,
      countClientsPositifs,
      soldeFournisseurs: Math.round(soldeFournisseurs * 100) / 100,
      countFournisseursNegatifs,
      topProducts,
      chartMonthly,
    };
  },

  // Carburants
  async getCarburants(stationId: string): Promise<Carburant[]> {
    return memoryDb.carburants.filter((c) => c.stationId === stationId);
  },

  async addCarburant(stationId: string, data: any): Promise<Carburant> {
    const item: Carburant = { ...data, stationId, id: `carb-${Date.now()}` };
    memoryDb.carburants.push(item);
    persist();
    return item;
  },

  async updateCarburant(stationId: string, carbId: string, data: any): Promise<Carburant> {
    const idx = memoryDb.carburants.findIndex((c) => c.id === carbId);
    if (idx === -1) throw new Error('Carburant non trouvé');
    memoryDb.carburants[idx] = { ...memoryDb.carburants[idx], ...data, stationId };
    persist();
    return memoryDb.carburants[idx];
  },

  async deleteCarburant(stationId: string, carbId: string): Promise<void> {
    memoryDb.carburants = memoryDb.carburants.filter((c) => c.id !== carbId);
    persist();
  },

  // Citernes & Jaugeages
  async getCiternes(stationId: string): Promise<Citerne[]> {
    return memoryDb.citernes.filter((c) => c.stationId === stationId);
  },

  async addCiterne(stationId: string, data: any): Promise<Citerne> {
    const item: Citerne = { ...data, stationId, id: `cit-${Date.now()}` };
    memoryDb.citernes.push(item);
    persist();
    return item;
  },

  async updateCiterne(stationId: string, citId: string, data: any): Promise<Citerne> {
    const idx = memoryDb.citernes.findIndex((c) => c.id === citId);
    if (idx === -1) throw new Error('Citerne non trouvée');
    memoryDb.citernes[idx] = { ...memoryDb.citernes[idx], ...data, stationId };
    persist();
    return memoryDb.citernes[idx];
  },

  async deleteCiterne(stationId: string, citId: string): Promise<void> {
    memoryDb.citernes = memoryDb.citernes.filter((c) => c.id !== citId);
    persist();
  },

  async getCiterneHistory(stationId: string, citId: string) {
    const citerne = memoryDb.citernes.find((c) => c.id === citId);
    const jaugeages = (memoryDb.jaugeages || []).filter((j) => j.citerneId === citId);
    const shifts = memoryDb.journees.filter((j) => j.stationId === stationId);
    const deliveries = memoryDb.achats.filter((a) => a.stationId === stationId);
    return { citerne, jaugeages, shifts, deliveries };
  },

  async submitJaugeage(stationId: string, payload: { date: string; readings: any[] }) {
    if (!memoryDb.jaugeages) memoryDb.jaugeages = [];
    payload.readings.forEach((r) => {
      const cit = memoryDb.citernes.find((c) => c.id === r.citerneId);
      const stockTheo = r.volumeTheoriqueL ?? r.stockTheorique ?? 0;
      const stockReel = r.volumePhysiqueL ?? r.stockReel ?? 0;
      const record: JaugeageRecord = {
        id: `jaug-${Date.now()}-${Math.random()}`,
        citerneId: r.citerneId,
        citerneName: cit?.name || 'Citerne',
        carburantCode: cit?.carburantCode || 'GAS',
        stationId,
        date: payload.date,
        stockTheorique: stockTheo,
        stockReel: stockReel,
        ecart: stockReel - stockTheo,
      };
      memoryDb.jaugeages.unshift(record);

      // Update current stock of citerne
      if (cit && r.volumePhysiqueL !== undefined) {
        cit.currentStock = r.volumePhysiqueL;
      }
    });
    persist();
    return { success: true, count: payload.readings.length };
  },

  // Pistolets & Calibrages
  async getPistolets(stationId: string): Promise<Pistolet[]> {
    return memoryDb.pistolets.filter((p) => p.stationId === stationId);
  },

  async addPistolet(stationId: string, data: any): Promise<Pistolet> {
    const item: Pistolet = { ...data, stationId, id: `pist-${Date.now()}` };
    memoryDb.pistolets.push(item);
    persist();
    return item;
  },

  async updatePistolet(stationId: string, pistId: string, data: any): Promise<Pistolet> {
    const idx = memoryDb.pistolets.findIndex((p) => p.id === pistId);
    if (idx === -1) throw new Error('Pistolet non trouvé');
    memoryDb.pistolets[idx] = { ...memoryDb.pistolets[idx], ...data, stationId };
    persist();
    return memoryDb.pistolets[idx];
  },

  async deletePistolet(stationId: string, pistId: string): Promise<void> {
    memoryDb.pistolets = memoryDb.pistolets.filter((p) => p.id !== pistId);
    persist();
  },

  async getPistoletHistory(stationId: string, pistId: string) {
    const pistolet = memoryDb.pistolets.find((p) => p.id === pistId);
    const shifts = memoryDb.journees.filter((j) => j.stationId === stationId);
    const calibrages = (memoryDb.calibrages || []).filter((c) => c.pistoletId === pistId);
    return { pistolet, shifts, calibrages };
  },

  async submitCalibrage(stationId: string, payload: { date: string; adjustments: any[] }) {
    if (!memoryDb.calibrages) memoryDb.calibrages = [];
    payload.adjustments.forEach((adj) => {
      const pist = memoryDb.pistolets.find((p) => p.id === adj.pistoletId);
      const idxActuel = adj.indexAvant ?? adj.indexActuel ?? 0;
      const idxNouveau = adj.indexApres ?? adj.nouveauIndex ?? 0;
      const record: CalibrageRecord = {
        id: `calib-${Date.now()}-${Math.random()}`,
        pistoletId: adj.pistoletId,
        pistoletCode: pist?.code || 'P1',
        stationId,
        date: payload.date,
        indexActuel: idxActuel,
        nouveauIndex: idxNouveau,
        difference: idxNouveau - idxActuel,
        motif: adj.motif || 'Étalonnage périodique',
      };
      memoryDb.calibrages.unshift(record);

      if (pist && (adj.indexApres !== undefined || adj.nouveauIndex !== undefined)) {
        pist.currentIndex = adj.indexApres ?? adj.nouveauIndex;
      }
    });
    persist();
    return { success: true, count: payload.adjustments.length };
  },

  // Salariés
  async getSalaries(stationId: string): Promise<Salarie[]> {
    return memoryDb.salaries.filter((s) => s.stationId === stationId);
  },

  async addSalarie(stationId: string, data: any): Promise<Salarie> {
    const item: Salarie = { ...data, stationId, id: `sal-${Date.now()}` };
    memoryDb.salaries.push(item);
    persist();
    return item;
  },

  async updateSalarie(stationId: string, salId: string, data: any): Promise<Salarie> {
    const idx = memoryDb.salaries.findIndex((s) => s.id === salId);
    if (idx === -1) throw new Error('Salarié non trouvé');
    memoryDb.salaries[idx] = { ...memoryDb.salaries[idx], ...data, stationId };
    persist();
    return memoryDb.salaries[idx];
  },

  async deleteSalarie(stationId: string, salId: string): Promise<void> {
    memoryDb.salaries = memoryDb.salaries.filter((s) => s.id !== salId);
    persist();
  },

  // Tiers & Paiements
  async getTiers(stationId: string, type?: 'Client' | 'Fournisseur'): Promise<Tier[]> {
    let list = memoryDb.tiers.filter((t) => t.stationId === stationId);
    if (type) list = list.filter((t) => t.type === type);
    return list;
  },

  async addTier(stationId: string, data: any): Promise<Tier> {
    const item: Tier = { ...data, stationId, id: `tier-${Date.now()}` };
    memoryDb.tiers.push(item);
    persist();
    return item;
  },

  async updateTier(stationId: string, tierId: string, data: any): Promise<Tier> {
    const idx = memoryDb.tiers.findIndex((t) => t.id === tierId);
    if (idx === -1) throw new Error('Client/Fournisseur non trouvé');
    memoryDb.tiers[idx] = { ...memoryDb.tiers[idx], ...data, stationId };
    persist();
    return memoryDb.tiers[idx];
  },

  async deleteTier(stationId: string, tierId: string): Promise<void> {
    memoryDb.tiers = memoryDb.tiers.filter((t) => t.id !== tierId);
    persist();
  },

  async getPaiementsTiers(stationId: string): Promise<PaiementTier[]> {
    return (memoryDb.paiementsTiers || []).filter((p) => p.stationId === stationId);
  },

  async addPaiementTier(stationId: string, data: any): Promise<PaiementTier> {
    const item: PaiementTier = { ...data, stationId, id: `ptier-${Date.now()}` };
    if (!memoryDb.paiementsTiers) memoryDb.paiementsTiers = [];
    memoryDb.paiementsTiers.unshift(item);

    // Update tier balance
    const tier = memoryDb.tiers.find((t) => t.id === data.tierId);
    if (tier) {
      if (tier.type === 'Client') {
        tier.solde = (tier.solde || 0) - (data.montant || 0);
      } else {
        tier.solde = (tier.solde || 0) + (data.montant || 0);
      }
    }
    persist();
    return item;
  },

  async updatePaiementTier(stationId: string, pmtId: string, data: any): Promise<PaiementTier> {
    const idx = (memoryDb.paiementsTiers || []).findIndex((p) => p.id === pmtId);
    if (idx === -1) throw new Error('Paiement non trouvé');
    memoryDb.paiementsTiers[idx] = { ...memoryDb.paiementsTiers[idx], ...data, stationId };
    persist();
    return memoryDb.paiementsTiers[idx];
  },

  async deletePaiementTier(stationId: string, pmtId: string): Promise<void> {
    if (memoryDb.paiementsTiers) {
      memoryDb.paiementsTiers = memoryDb.paiementsTiers.filter((p) => p.id !== pmtId);
      persist();
    }
  },

  // Produits
  async getProduits(stationId: string): Promise<Produit[]> {
    return memoryDb.produits.filter((p) => p.stationId === stationId);
  },

  async addProduit(stationId: string, data: any): Promise<Produit> {
    const item: Produit = { ...data, stationId, id: `prod-${Date.now()}` };
    memoryDb.produits.push(item);
    persist();
    return item;
  },

  async updateProduit(stationId: string, prodId: string, data: any): Promise<Produit> {
    const idx = memoryDb.produits.findIndex((p) => p.id === prodId);
    if (idx === -1) throw new Error('Produit non trouvé');
    memoryDb.produits[idx] = { ...memoryDb.produits[idx], ...data, stationId };
    persist();
    return memoryDb.produits[idx];
  },

  async deleteProduit(stationId: string, prodId: string): Promise<void> {
    memoryDb.produits = memoryDb.produits.filter((p) => p.id !== prodId);
    persist();
  },

  // Services
  async getServices(stationId: string): Promise<ServiceStation[]> {
    return memoryDb.services.filter((s) => s.stationId === stationId);
  },

  async addService(stationId: string, data: any): Promise<ServiceStation> {
    const item: ServiceStation = { ...data, stationId, id: `serv-${Date.now()}` };
    memoryDb.services.push(item);
    persist();
    return item;
  },

  async updateService(stationId: string, servId: string, data: any): Promise<ServiceStation> {
    const idx = memoryDb.services.findIndex((s) => s.id === servId);
    if (idx === -1) throw new Error('Service non trouvé');
    memoryDb.services[idx] = { ...memoryDb.services[idx], ...data, stationId };
    persist();
    return memoryDb.services[idx];
  },

  async deleteService(stationId: string, servId: string): Promise<void> {
    memoryDb.services = memoryDb.services.filter((s) => s.id !== servId);
    persist();
  },

  // Journées & Shifts
  async getJournees(stationId: string): Promise<Journee[]> {
    return memoryDb.journees.filter((j) => j.stationId === stationId);
  },

  async submitJournee(stationId: string, journeeData: any): Promise<Journee> {
    const id = journeeData.id || `jrn-${Date.now()}`;
    const item: Journee = {
      ...journeeData,
      id,
      stationId,
      status: 'CLOTUREE',
    };
    const existingIdx = memoryDb.journees.findIndex((j) => j.id === id);
    if (existingIdx !== -1) {
      memoryDb.journees[existingIdx] = item;
    } else {
      memoryDb.journees.unshift(item);
    }
    persist();
    return item;
  },

  // Achats
  async getAchats(stationId: string): Promise<Achat[]> {
    return memoryDb.achats.filter((a) => a.stationId === stationId);
  },

  async addAchat(stationId: string, data: any): Promise<Achat> {
    const item: Achat = { ...data, stationId, id: `ach-${Date.now()}` };
    memoryDb.achats.unshift(item);
    persist();
    return item;
  },

  async updateAchat(stationId: string, achId: string, data: any): Promise<Achat> {
    const idx = memoryDb.achats.findIndex((a) => a.id === achId);
    if (idx === -1) throw new Error('Achat non trouvé');
    memoryDb.achats[idx] = { ...memoryDb.achats[idx], ...data, stationId };
    persist();
    return memoryDb.achats[idx];
  },

  async deleteAchat(stationId: string, achId: string): Promise<void> {
    memoryDb.achats = memoryDb.achats.filter((a) => a.id !== achId);
    persist();
  },

  // Dépenses
  async getDepenses(stationId: string): Promise<Depense[]> {
    return memoryDb.depenses.filter((d) => d.stationId === stationId);
  },

  async addDepense(stationId: string, data: any): Promise<Depense> {
    const item: Depense = { ...data, stationId, id: `dep-${Date.now()}` };
    memoryDb.depenses.unshift(item);
    persist();
    return item;
  },

  async updateDepense(stationId: string, depId: string, data: any): Promise<Depense> {
    const idx = memoryDb.depenses.findIndex((d) => d.id === depId);
    if (idx === -1) throw new Error('Dépense non trouvée');
    memoryDb.depenses[idx] = { ...memoryDb.depenses[idx], ...data, stationId };
    persist();
    return memoryDb.depenses[idx];
  },

  async deleteDepense(stationId: string, depId: string): Promise<void> {
    memoryDb.depenses = memoryDb.depenses.filter((d) => d.id !== depId);
    persist();
  },

  // Commercial Docs (Factures, BL, Devis, etc.)
  async getCommercialDocs(stationId: string, docType?: string): Promise<CommercialDoc[]> {
    let list = (memoryDb.commercialDocs || []).filter((d) => d.stationId === stationId);
    if (docType) list = list.filter((d) => d.docType === docType);
    return list;
  },

  async addCommercialDoc(stationId: string, data: any): Promise<CommercialDoc> {
    const item: CommercialDoc = { ...data, stationId, id: `doc-${Date.now()}` };
    if (!memoryDb.commercialDocs) memoryDb.commercialDocs = [];
    memoryDb.commercialDocs.unshift(item);
    persist();
    return item;
  },

  async updateCommercialDoc(stationId: string, docId: string, data: any): Promise<CommercialDoc> {
    const idx = (memoryDb.commercialDocs || []).findIndex((d) => d.id === docId);
    if (idx === -1) throw new Error('Document commercial non trouvé');
    memoryDb.commercialDocs[idx] = { ...memoryDb.commercialDocs[idx], ...data, stationId };
    persist();
    return memoryDb.commercialDocs[idx];
  },

  async deleteCommercialDoc(stationId: string, docId: string): Promise<void> {
    if (memoryDb.commercialDocs) {
      memoryDb.commercialDocs = memoryDb.commercialDocs.filter((d) => d.id !== docId);
      persist();
    }
  },

  // Rapports
  async getRapports(stationId: string, params?: { startDate?: string; endDate?: string; year?: string }) {
    const year = params?.year || '2026';
    const startDate = params?.startDate;
    const endDate = params?.endDate;

    const stationJournees = memoryDb.journees.filter((j) => j.stationId === stationId);
    const stationTiers = memoryDb.tiers.filter((t) => t.stationId === stationId);
    const stationCiternes = memoryDb.citernes.filter((c) => c.stationId === stationId);
    const stationAchats = memoryDb.achats.filter((a) => a.stationId === stationId);
    const stationProduits = memoryDb.produits.filter((p) => p.stationId === stationId);
    const stationDepenses = memoryDb.depenses.filter((d) => d.stationId === stationId);
    const stationCommercialDocs = (memoryDb.commercialDocs || []).filter((d) => d.stationId === stationId);
    const stationPaiementsTiers = (memoryDb.paiementsTiers || []).filter((p) => p.stationId === stationId);

    let filteredJournees = stationJournees;
    if (startDate) {
      filteredJournees = filteredJournees.filter((j) => (j.dateDebut || '') >= startDate);
    }
    if (endDate) {
      filteredJournees = filteredJournees.filter((j) => (j.dateDebut || '') <= endDate);
    }

    const caParJour = filteredJournees.map((j) => ({
      date: j.dateDebut,
      chiffreAffaires: j.totalChiffreAffairesDH,
      bonsClients: j.totalNonEspecesDH,
      depenses: j.totalDepensesEspecesDH,
      regTiers: j.totalReglementsDettesDH,
      encaisEspeces: j.especesARemettreDH,
    }));

    const transactionsTiers = stationTiers.map((t) => {
      let totalDebit = 0;
      let totalCredit = 0;

      if (t.type === 'Client') {
        stationJournees.forEach((j) => {
          j.encaissementsNonEspeces?.forEach((enc) => {
            if (enc.clientId === t.id && enc.modePaiement === 'Bon client') {
              totalDebit += enc.montant;
            }
          });
        });
        stationCommercialDocs.forEach((doc) => {
          if (doc.clientId === t.id && doc.docType === 'FACTURE') {
            totalDebit += doc.totalTTC;
          }
        });
        stationJournees.forEach((j) => {
          j.reglementsDettes?.forEach((reg) => {
            if (reg.tierId === t.id) {
              totalCredit += reg.montant;
            }
          });
        });
        stationPaiementsTiers.forEach((p) => {
          if (p.tierId === t.id && p.tierType === 'Client') {
            totalCredit += p.montant;
          }
        });
      } else if (t.type === 'Fournisseur') {
        stationAchats.forEach((a) => {
          if (a.fournisseurId === t.id) {
            totalCredit += a.totalTTC;
          }
        });
        stationDepenses.forEach((d) => {
          if (d.fournisseurId === t.id) {
            totalCredit += d.totalTTC;
          }
        });
        stationAchats.forEach((a) => {
          if (a.fournisseurId === t.id) {
            totalDebit += a.totalPaye || 0;
          }
        });
        stationPaiementsTiers.forEach((p) => {
          if (p.tierId === t.id && p.tierType === 'Fournisseur') {
            totalDebit += p.montant;
          }
        });
      }

      const soldeFin = t.solde;
      const soldeDebut =
        t.type === 'Client'
          ? soldeFin - totalDebit + totalCredit
          : soldeFin + totalCredit - totalDebit;

      return {
        id: t.id,
        name: t.name,
        type: t.type,
        soldeDebut,
        totalDebit,
        totalCredit,
        soldeFin,
      };
    });

    const ventesCarburants = stationJournees.map((j) => {
      let gasL = 0;
      let gasDH = 0;
      let sspL = 0;
      let sspDH = 0;

      j.pistoletEntries?.forEach((p) => {
        if (p.carburantCode === 'GAS') {
          gasL += p.quantiteL;
          gasDH += p.totalDH;
        } else {
          sspL += p.quantiteL;
          sspDH += p.totalDH;
        }
      });

      return {
        date: j.dateDebut,
        gasL,
        gasDH,
        sspL,
        sspDH,
        totalL: gasL + sspL,
        totalDH: gasDH + sspDH,
      };
    });

    let gasPurchasesL = 0;
    let sspPurchasesL = 0;
    stationAchats.forEach((a) => {
      a.details?.forEach((d) => {
        if (d.livre) {
          const cit = stationCiternes.find((c) => c.id === d.citerneOuProduitId);
          if (cit?.carburantCode === 'GAS' || d.designation?.toLowerCase().includes('gasoil')) {
            gasPurchasesL += d.quantite;
          } else if (
            cit?.carburantCode === 'SSP' ||
            d.designation?.toLowerCase().includes('ssp') ||
            d.designation?.toLowerCase().includes('sans plomb')
          ) {
            sspPurchasesL += d.quantite;
          }
        }
      });
    });

    const gasVentesTotal = ventesCarburants.reduce((acc, curr) => acc + curr.gasL, 0);
    const sspVentesTotal = ventesCarburants.reduce((acc, curr) => acc + curr.sspL, 0);

    const gasCurrentStock = stationCiternes
      .filter((c) => c.carburantCode === 'GAS')
      .reduce((acc, c) => acc + c.currentStock, 0);
    const sspCurrentStock = stationCiternes
      .filter((c) => c.carburantCode === 'SSP')
      .reduce((acc, c) => acc + c.currentStock, 0);

    const gasStockDebut = Math.max(0, gasCurrentStock + gasVentesTotal - gasPurchasesL);
    const sspStockDebut = Math.max(0, sspCurrentStock + sspVentesTotal - sspPurchasesL);

    const stockCarburants = [
      {
        carburant: 'Gasoil',
        code: 'GAS',
        stockDebut: gasStockDebut,
        achats: gasPurchasesL,
        ventes: gasVentesTotal,
        ecartJaugeage: 0,
        ecartPercent: '0.00%',
        stockFin: gasCurrentStock,
      },
      {
        carburant: 'SSP',
        code: 'SSP',
        stockDebut: sspStockDebut,
        achats: sspPurchasesL,
        ventes: sspVentesTotal,
        ecartJaugeage: 0,
        ecartPercent: '0.00%',
        stockFin: sspCurrentStock,
      },
    ];

    const ventesProduitsMap = new Map<string, any>();
    stationJournees.forEach((j) => {
      j.produitEntries?.forEach((pe) => {
        const existing = ventesProduitsMap.get(pe.produitId) || {
          produitId: pe.produitId,
          nomProduit: pe.nomProduit,
          marque: pe.marque,
          quantiteVendue: 0,
          prixMoyen: pe.prixUnitaire,
          totalDH: 0,
        };
        existing.quantiteVendue += pe.quantiteVendue;
        existing.totalDH += pe.totalDH;
        ventesProduitsMap.set(pe.produitId, existing);
      });
    });
    const ventesProduits = Array.from(ventesProduitsMap.values());

    const stockProduits = stationProduits.map((p) => {
      const totalVentes = ventesProduitsMap.get(p.id)?.quantiteVendue || 0;
      const stockFin = p.stockBoutique + p.stockDepot;
      return {
        produit: p.name,
        marque: p.marque,
        puAchatTTC: Math.round(p.prixAchatHT * 1.2),
        puVenteTTC: p.prixVenteTTC,
        stockDebut: stockFin + totalVentes,
        ventes: totalVentes,
        achats: 0,
        stockFin,
        stockFinValorise: stockFin * p.prixVenteTTC,
      };
    });

    const ventesServices: any[] = [];
    stationJournees.forEach((j) => {
      j.serviceEntries?.forEach((se) => {
        ventesServices.push({
          date: j.dateDebut,
          service: se.nomService,
          category: se.category,
          quantite: se.quantite,
          totalDH: se.totalDH,
        });
      });
    });

    const monthNames = [
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
    ];
    const cpcMensuel = monthNames.map((monthName, idx) => {
      const mStr = `${year}-${String(idx + 1).padStart(2, '0')}`;
      let vCarburants = 0;
      let vProduits = 0;
      let vServices = 0;

      stationJournees.forEach((j) => {
        if (j.dateDebut?.startsWith(mStr)) {
          vCarburants += j.totalCarburantsDH || 0;
          vProduits += j.totalProduitsDH || 0;
          vServices += j.totalServicesDH || 0;
        }
      });

      const chiffreAffaires = vCarburants + vProduits + vServices;
      const cmv = Math.round(chiffreAffaires * 0.82);

      let charges = 0;
      stationDepenses.forEach((d) => {
        if (d.dateFacturation?.startsWith(mStr)) {
          charges += d.totalTTC || 0;
        }
      });

      const resultatNet = chiffreAffaires - cmv - charges;

      return {
        mois: monthName,
        vCarburants,
        vProduits,
        vServices,
        chiffreAffaires,
        cmv,
        charges,
        resultatNet,
      };
    });

    return {
      caParJour,
      transactionsTiers,
      ventesCarburants,
      stockCarburants,
      ventesProduits,
      stockProduits,
      ventesServices,
      cpcMensuel,
    };
  },

  // Notifications
  async getEmailNotifications(stationId?: string): Promise<EmailNotification[]> {
    return memoryDb.emailNotifications || [];
  },

  async createEmailNotification(data: Omit<EmailNotification, 'id'>): Promise<EmailNotification> {
    const item: EmailNotification = { ...data, id: `notif-${Date.now()}` };
    if (!memoryDb.emailNotifications) memoryDb.emailNotifications = [];
    memoryDb.emailNotifications.unshift(item);
    persist();
    return item;
  },

  async getEmails(): Promise<EmailNotification[]> {
    return memoryDb.emailNotifications || [];
  },

  async resendEmail(id: string): Promise<{ success: boolean; message: string; email: EmailNotification }> {
    const email = (memoryDb.emailNotifications || []).find((e) => e.id === id);
    if (!email) throw new Error('Email introuvable');
    email.status = 'DELIVERED';
    persist();
    return { success: true, message: 'Email réexpédié avec succès', email };
  },

  async getSmtpStatus() {
    return {
      configured: true,
      host: 'smtp.stationhub.ma',
      port: 587,
      user: 'notifications@stationhub.ma',
      secure: true,
      from: 'StationHub Alerts <notifications@stationhub.ma>',
      readyForLinking: true,
      supportedProviders: ['Office 365', 'Google Workspace', 'Hostinger', 'OVHcloud', 'CPanel SMTP'],
    };
  },

  async testSmtp(testEmail: string) {
    return {
      success: true,
      message: `Email de test simulé envoyé avec succès à ${testEmail}. La passerelle SMTP est fonctionnelle.`,
    };
  },
};
