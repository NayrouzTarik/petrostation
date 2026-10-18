export type UserRole = 'SUPER_ADMIN' | 'GERANT' | 'EXPERT_COMPTABLE';

export interface User {
  id: string;
  email: string;
  password?: string;
  name: string;
  role: UserRole;
  stationId?: string;
  phone?: string;
  status?: 'ACTIF' | 'SUSPENDU';
  createdAt: string;
}

export interface Station {
  id: string;
  name: string;
  code: string;
  brand: string; // 'Winxo' | 'Afriquia' | 'Shell' | 'TotalEnergies' | 'Petrom' | 'Autre'
  location: string;
  address?: string;
  city: string;
  logoUrl: string;
  companyName: string;
  ice: string;
  patente: string;
  rc: string;
  phone: string;
  email: string;
  managerId: string;
  accountantId?: string;
  createdAt: string;
  status: 'ACTIVE' | 'SUSPENDED';
}

export interface Carburant {
  id: string;
  stationId: string;
  name: string;
  code: string; // 'GAS' | 'SSP'
  pricePerLiter: number;
  color: string;
  history: Array<{
    date: string;
    price: number;
    updatedBy: string;
  }>;
}

export interface Citerne {
  id: string;
  stationId: string;
  name: string;
  carburantCode: string;
  capacity: number;
  minAlertLevel: number;
  currentStock: number;
  lastJaugeageDate?: string;
}

export interface JaugeageRecord {
  id: string;
  stationId: string;
  date: string;
  citerneId: string;
  citerneName: string;
  carburantCode: string;
  stockTheorique: number;
  stockReel: number;
  ecart: number;
}

export interface Pistolet {
  id: string;
  stationId: string;
  code: string; // 'P1', 'P2' ...
  citerneId: string;
  carburantCode: string;
  currentIndex: number;
  initialIndex: number;
  lastCalibrageDate?: string;
}

export interface CalibrageRecord {
  id: string;
  stationId: string;
  pistoletId: string;
  pistoletCode: string;
  date: string;
  indexActuel: number;
  nouveauIndex: number;
  difference: number;
  motif?: string;
}

export interface Salarie {
  id: string;
  stationId: string;
  name: string;
  matricule: string;
  role: 'GERANT' | 'POMPISTE' | 'LAVEUR' | 'GRAISSEUR' | 'CAISSIER';
  phone?: string;
  cin?: string;
  dateEmbauche: string;
  actif: boolean;
  baseSalary?: number;
}

export interface Tier {
  id: string;
  stationId: string;
  name: string;
  type: 'Client' | 'Fournisseur' | 'Banque' | 'Caisse';
  ice?: string;
  solde: number;
  encoursAutorise: number;
  email?: string;
  phone?: string;
}

export interface PaiementTier {
  id: string;
  stationId: string;
  tierId: string;
  tierName: string;
  tierType: 'Client' | 'Fournisseur';
  montant: number;
  date: string;
  payePar: string;
  mode: 'Espèces' | 'Chèque' | 'Virement' | 'Traite';
  note?: string;
  createdAt: string;
}

export interface Produit {
  id: string;
  stationId: string;
  name: string;
  category: string;
  marque: string;
  prixAchatHT: number;
  prixVenteTTC: number;
  stockBoutique: number;
  stockDepot: number;
}

export interface ServiceStation {
  id: string;
  stationId: string;
  name: string;
  category: string;
  prixTTC: number;
}

export interface PistoletDailyEntry {
  pistoletId: string;
  pistoletCode: string;
  carburantCode: string;
  indexEntree: number;
  indexSortie: number;
  remiseEnCuve: number;
  quantiteL: number;
  prixUnitaire: number;
  totalDH: number;
}

export interface ProduitDailyEntry {
  produitId: string;
  marque: string;
  nomProduit: string;
  stockEntree: number;
  stockSortie: number;
  quantiteVendue: number;
  prixUnitaire: number;
  totalDH: number;
}

export interface ServiceDailyEntry {
  serviceId: string;
  category: string;
  nomService: string;
  quantite: number;
  prixUnitaire: number;
  totalDH: number;
}

export interface NonEspeceEntry {
  id: string;
  clientId: string;
  clientNom: string;
  soldeActuel: number;
  modePaiement: 'Bon client' | 'TPE / Carte Bancaire' | 'Chèque' | 'Virement';
  montant: number;
  note?: string;
}

export interface DepenseCaisseEntry {
  id: string;
  typeDepense: string;
  description: string;
  montant: number;
  modePaiement: 'Espèces';
  notes?: string;
}

export interface ReglementDetteEntry {
  id: string;
  tierId?: string;
  tierNom?: string;
  clientId?: string;
  clientNom?: string;
  soldeActuel?: number;
  montant: number;
  modePaiement: 'Espèces';
  note?: string;
}

export interface RechargeEntry {
  id: string;
  clientId: string;
  clientNom: string;
  carteRechargee?: string;
  modePaiement: string;
  montant: number;
  note?: string;
}

export interface Journee {
  id: string;
  stationId: string;
  dateDebut: string;
  heureDebut: string;
  dateFin: string;
  heureFin: string;
  responsableId: string;
  responsableNom: string;
  remarques?: string;
  avancePompiste: number;
  pistoletEntries: PistoletDailyEntry[];
  produitEntries: ProduitDailyEntry[];
  serviceEntries: ServiceDailyEntry[];
  encaissementsNonEspeces: NonEspeceEntry[];
  depensesCaisse: DepenseCaisseEntry[];
  reglementsDettes: ReglementDetteEntry[];
  recharges: RechargeEntry[];
  totalCarburantsDH: number;
  totalProduitsDH: number;
  totalServicesDH: number;
  totalChiffreAffairesDH: number;
  totalNonEspecesDH: number;
  totalDepensesEspecesDH: number;
  totalReglementsDettesDH: number;
  totalRechargesDH: number;
  especesARemettreDH: number;
  statut: 'CLÔTURÉE' | 'EN_COURS';
  createdAt: string;
}

export interface AchatDetail {
  id: string;
  citerneOuProduitId: string;
  designation: string;
  quantite: number;
  livre: boolean;
  prixUnitaireHT: number;
  tvaTaux: number;
  tvaMontant: number;
  totalTTC: number;
}

export interface AchatPaiement {
  id: string;
  mode: 'Chèque' | 'Virement' | 'Espèces' | 'Traite';
  montant: number;
  datePaiement: string;
  numeroCheque?: string;
  decaisse: boolean;
  dateDecaissement?: string;
}

export interface Achat {
  id: string;
  stationId: string;
  numeroFacture: string;
  typeAchat: 'Carburants' | 'Produits';
  fournisseurId: string;
  fournisseurNom: string;
  dateFacturation: string;
  dateEcheance: string;
  details: AchatDetail[];
  paiements: AchatPaiement[];
  totalHT: number;
  totalTVA: number;
  totalTTC: number;
  totalPaye: number;
  resteAPayer: number;
  statutPaiement: 'Payé' | 'Partiel' | 'Impayé' | 'Partiellement payé' | 'À payer';
  statutLivraison: 'Livré' | 'En attente';
}

export interface DepenseDetail {
  id: string;
  designation: string;
  quantite: number;
  prixUnitaireHT: number;
  tvaTaux: number;
  tvaMontant: number;
  totalTTC: number;
}

export interface Depense {
  id: string;
  stationId: string;
  numeroFacture: string;
  typeDepense: string;
  fournisseurId: string;
  fournisseurNom: string;
  dateFacturation: string;
  dateEcheance: string;
  details: DepenseDetail[];
  remise: number;
  totalHT: number;
  totalTVA: number;
  totalTTC: number;
  statutPaiement: 'Payé' | 'En attente' | 'Partiel';
  modePaiement: string;
  datePaiement?: string;
  notes?: string;
}

export interface CommercialDocLigne {
  id: string;
  designation: string;
  unite: string;
  quantite: number;
  prixUnitaireTTC: number;
  tvaTaux: number;
  tvaMontant: number;
  totalTTC: number;
}

export interface CommercialDoc {
  id: string;
  stationId: string;
  docType: 'FACTURE' | 'BON_LIVRAISON' | 'DEVIS';
  numero: string;
  clientId: string;
  clientNom: string;
  clientICE: string;
  clientAdresse?: string;
  dateDocument: string;
  dateEcheance?: string;
  numeroBLAssocie?: string;
  lignes: CommercialDocLigne[];
  totalHT: number;
  totalTVA: number;
  totalTTC: number;
  statut: 'PAYÉE' | 'EN_ATTENTE' | 'LIVRÉ' | 'EN_COURS' | 'ACCEPTÉ' | 'ANNULÉ' | 'À PAYER';
  modePaiement?: string;
  numeroCheque?: string;
  notes?: string;
}

export interface EmailNotification {
  id: string;
  to: string;
  recipientName: string;
  role: UserRole;
  stationName: string;
  subject: string;
  bodyText: string;
  credentials: {
    email: string;
    password: string;
    loginUrl: string;
  };
  sentAt: string;
  status: 'DELIVERED';
}
