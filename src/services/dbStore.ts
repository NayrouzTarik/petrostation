import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  INITIAL_ACHATS,
  INITIAL_CARBURANTS,
  INITIAL_CITERNES,
  INITIAL_COMMERCIAL_DOCS,
  INITIAL_DEPENSES,
  INITIAL_EMAIL_NOTIFICATIONS,
  INITIAL_JOURNEES,
  INITIAL_PAIEMENTS_TIERS,
  INITIAL_PISTOLETS,
  INITIAL_PRODUITS,
  INITIAL_SALARIES,
  INITIAL_STATIONS,
  INITIAL_TIERS,
  INITIAL_USERS,
} from '../data/seedData.ts';
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
  Station,
  Tier,
  ServiceStation,
  User,
} from '../types/index.ts';
import { INITIAL_SERVICES } from '../data/seedData.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_FILE_PATH = path.resolve(__dirname, '../../data/db.json');

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
  emails: EmailNotification[];
}

class JsonDatabase {
  private data: DatabaseSchema;

  constructor() {
    this.data = this.loadData();
  }

  private loadData(): DatabaseSchema {
    try {
      if (fs.existsSync(DB_FILE_PATH)) {
        const fileContent = fs.readFileSync(DB_FILE_PATH, 'utf-8');
        return JSON.parse(fileContent);
      }
    } catch (err) {
      console.warn('Could not read existing db.json, initializing fresh seed data.', err);
    }

    const defaultData: DatabaseSchema = {
      users: INITIAL_USERS,
      stations: INITIAL_STATIONS,
      carburants: INITIAL_CARBURANTS,
      citernes: INITIAL_CITERNES,
      jaugeages: [
        {
          id: 'jaug-init-1',
          stationId: 'station-winxo-sidi-ismail',
          date: '2026-10-16',
          citerneId: 'cit-cgas-1',
          citerneName: 'CGAS',
          carburantCode: 'GAS',
          stockTheorique: 14850,
          stockReel: 14850,
          ecart: 0,
        },
        {
          id: 'jaug-init-2',
          stationId: 'station-winxo-sidi-ismail',
          date: '2026-10-16',
          citerneId: 'cit-cssp-1',
          citerneName: 'CSSP',
          carburantCode: 'SSP',
          stockTheorique: 10400,
          stockReel: 10400,
          ecart: 0,
        },
      ],
      pistolets: INITIAL_PISTOLETS,
      calibrages: [],
      salaries: INITIAL_SALARIES,
      tiers: INITIAL_TIERS,
      paiementsTiers: INITIAL_PAIEMENTS_TIERS,
      produits: INITIAL_PRODUITS,
      services: INITIAL_SERVICES,
      journees: INITIAL_JOURNEES,
      achats: INITIAL_ACHATS,
      depenses: INITIAL_DEPENSES,
      commercialDocs: INITIAL_COMMERCIAL_DOCS,
      emails: INITIAL_EMAIL_NOTIFICATIONS,
    };

    this.saveData(defaultData);
    return defaultData;
  }

  public saveData(data?: DatabaseSchema) {
    if (data) {
      this.data = data;
    }
    try {
      const dir = path.dirname(DB_FILE_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(DB_FILE_PATH, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to write db.json:', err);
    }
  }

  public get(): DatabaseSchema {
    return this.data;
  }
}

export const dbStore = new JsonDatabase();
