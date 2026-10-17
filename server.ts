import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { dbStore } from './src/services/dbStore.ts';
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
} from './src/types/index.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Helper function to generate secure password
function generateSecurePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
  let pass = '';
  for (let i = 0; i < 12; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pass;
}

// -----------------------------------------------------------------------------
// AUTH ENDPOINTS
// -----------------------------------------------------------------------------

app.post('/api/auth/login', (req: Request, res: Response) => {
  const { email, password } = req.body;
  const db = dbStore.get();
  const user = db.users.find(
    (u) => u.email.toLowerCase() === email?.toLowerCase() && u.password === password
  );

  if (!user) {
    return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
  }

  // Check if user is suspended
  if (user.status === 'SUSPENDU') {
    return res.status(403).json({
      error: 'Votre compte a été désactivé par l\'administrateur de la plateforme. Veuillez contacter le support.',
    });
  }

  // Find associated station
  let station = null;
  if (user.stationId) {
    station = db.stations.find((s) => s.id === user.stationId) || null;
    if (station && station.status === 'SUSPENDED') {
      return res.status(403).json({
        error: 'Cette station a été suspendue par l\'administrateur.',
      });
    }
  } else if (user.role === 'SUPER_ADMIN') {
    // Platform owner has NO station
    station = null;
  }

  const token = `token-${user.id}-${Date.now()}`;
  res.json({
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
  });
});

// SIGNUP ENDPOINT (Functional Client Registration)
app.post('/api/auth/signup', (req: Request, res: Response) => {
  const db = dbStore.get();
  const { stationName, brand, location, city, managerName, email, password, phone } = req.body;

  if (!email || !password || !managerName || !stationName) {
    return res.status(400).json({ error: 'Veuillez remplir tous les champs obligatoires' });
  }

  // Check if email already exists
  const existingUser = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (existingUser) {
    return res.status(400).json({ error: 'Un compte avec cette adresse email existe déjà' });
  }

  const stationId = `station-${Date.now()}`;
  const managerId = `user-gerant-${Date.now()}`;

  // 1. Create User
  const newUser: User = {
    id: managerId,
    email,
    name: managerName,
    password,
    role: 'GERANT',
    stationId,
    phone: phone || '',
    status: 'ACTIF',
    createdAt: new Date().toISOString(),
  };
  db.users.push(newUser);

  // 2. Create Station
  const newStation: Station = {
    id: stationId,
    name: stationName,
    code: `ST-${Date.now().toString().slice(-4)}`,
    brand: brand || 'Winxo',
    location: location || '',
    city: city || 'Maroc',
    logoUrl: '/src/assets/images/station_modern_exterior_1792246841660.jpg',
    companyName: `${stationName.toUpperCase()} SARL`,
    ice: '00' + Math.floor(1000000000000 + Math.random() * 9000000000000),
    patente: Math.floor(10000000 + Math.random() * 90000000).toString(),
    rc: `${Math.floor(10000 + Math.random() * 90000)} ${city || 'Maroc'}`,
    phone: phone || '',
    email,
    managerId,
    createdAt: new Date().toISOString(),
    status: 'ACTIVE',
  };
  db.stations.push(newStation);

  // 3. Create default fuels
  db.carburants.push(
    {
      id: `carb-gas-${Date.now()}`,
      stationId,
      name: 'Gasoil',
      code: 'GAS',
      pricePerLiter: 15.92,
      color: '#0f172a',
      history: [{ date: new Date().toISOString().split('T')[0], price: 15.92, updatedBy: managerName }],
    },
    {
      id: `carb-ssp-${Date.now()}`,
      stationId,
      name: 'SSP',
      code: 'SSP',
      pricePerLiter: 15.62,
      color: '#16a34a',
      history: [{ date: new Date().toISOString().split('T')[0], price: 15.62, updatedBy: managerName }],
    }
  );

  // 4. Create default tanks (Citernes)
  const citGasId = `cit-gas-${Date.now()}`;
  const citSspId = `cit-ssp-${Date.now()}`;
  db.citernes.push(
    {
      id: citGasId,
      stationId,
      name: 'CGAS',
      carburantCode: 'GAS',
      capacity: 25000,
      minAlertLevel: 3000,
      currentStock: 12000,
      lastJaugeageDate: new Date().toISOString().split('T')[0],
    },
    {
      id: citSspId,
      stationId,
      name: 'CSSP',
      carburantCode: 'SSP',
      capacity: 18000,
      minAlertLevel: 2500,
      currentStock: 9000,
      lastJaugeageDate: new Date().toISOString().split('T')[0],
    }
  );

  // 5. Create default pumps (P1..P6)
  for (let i = 1; i <= 6; i++) {
    const isSsp = i === 2 || i === 5;
    db.pistolets.push({
      id: `pist-${stationId}-${i}`,
      stationId,
      code: `P${i}`,
      citerneId: isSsp ? citSspId : citGasId,
      carburantCode: isSsp ? 'SSP' : 'GAS',
      currentIndex: 1000 * i,
      initialIndex: 1000 * i,
    });
  }

  // 6. Create default employee
  db.salaries.push({
    id: `sal-ger-${Date.now()}`,
    stationId,
    name: managerName,
    matricule: 'GER-001',
    role: 'GERANT',
    dateEmbauche: new Date().toISOString().split('T')[0],
    actif: true,
  });

  // 7. Standard accounts
  db.tiers.push(
    {
      id: `tier-bq-${Date.now()}`,
      stationId,
      name: 'BANQUE',
      type: 'Banque',
      solde: 0,
      encoursAutorise: 500000,
    },
    {
      id: `tier-cs-${Date.now()}`,
      stationId,
      name: 'CAISSE ESPECES',
      type: 'Caisse',
      solde: 0,
      encoursAutorise: 100000,
    },
    {
      id: `tier-cl-anon-${Date.now()}`,
      stationId,
      name: 'C SANS NOM',
      type: 'Client',
      solde: 0,
      encoursAutorise: 0,
    },
    {
      id: `tier-fr-anon-${Date.now()}`,
      stationId,
      name: 'F SANS NOM',
      type: 'Fournisseur',
      solde: 0,
      encoursAutorise: 0,
    }
  );

  // 8. Standard services
  db.services.push(
    {
      id: `serv-lav-${Date.now()}`,
      stationId,
      name: 'TOTAL SERVICES',
      category: 'TOTAL LAVAGE',
      prixTTC: 10.0,
    },
    {
      id: `serv-vid-${Date.now()}`,
      stationId,
      name: 'TOTAL VIDANGE',
      category: 'TOTAL VIDANGE',
      prixTTC: 15.0,
    }
  );

  // 9. Send welcome notification in outbox
  const welcomeEmail: EmailNotification = {
    id: `email-${Date.now()}`,
    to: email,
    recipientName: managerName,
    role: 'GERANT',
    stationName,
    subject: `Bienvenue sur StationHub - Confirmation de création de compte (${stationName})`,
    bodyText: `Bonjour ${managerName},\n\nVotre compte de Gérant pour la station "${stationName}" a été créé avec succès.\n\nIdentifiant de connexion : ${email}\nVotre compte est actif et prêt pour l'exploitation.`,
    credentials: {
      email,
      password,
      loginUrl: 'http://localhost:3000/login',
    },
    sentAt: new Date().toISOString(),
    status: 'DELIVERED',
  };
  db.emails.push(welcomeEmail);

  dbStore.saveData();

  const token = `token-${newUser.id}-${Date.now()}`;
  res.status(201).json({
    user: {
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      role: newUser.role,
      stationId: newUser.stationId,
      phone: newUser.phone,
      status: newUser.status,
    },
    station: newStation,
    token,
  });
});

// PASSWORD RESET
app.post('/api/auth/reset-password', (req: Request, res: Response) => {
  const { email } = req.body;
  const db = dbStore.get();
  const user = db.users.find((u) => u.email.toLowerCase() === email?.toLowerCase());
  if (!user) {
    return res.status(404).json({ error: 'Aucun compte trouvé avec cette adresse email' });
  }

  const tempPass = generateSecurePassword();
  user.password = tempPass;

  const notif: EmailNotification = {
    id: `email-reset-${Date.now()}`,
    to: user.email,
    recipientName: user.name,
    role: user.role,
    stationName: 'StationHub',
    subject: 'Réinitialisation de votre mot de passe StationHub',
    bodyText: `Bonjour ${user.name},\n\nVotre mot de passe a été réinitialisé avec succès.\n\nNouveau mot de passe temporaire : ${tempPass}\n\nVeuillez vous connecter avec cet identifiant.`,
    credentials: {
      email: user.email,
      password: tempPass,
      loginUrl: 'http://localhost:3000/login',
    },
    sentAt: new Date().toISOString(),
    status: 'DELIVERED',
  };
  db.emails.push(notif);
  dbStore.saveData();

  res.json({ success: true, message: 'Un mot de passe temporaire a été généré et consigné dans la boîte d\'envoi' });
});

// USERS MANAGEMENT BY PLATFORM OWNER
app.get('/api/users', (_req: Request, res: Response) => {
  const db = dbStore.get();
  // Strip plain-text passwords for enterprise privacy & security
  const sanitizedUsers = db.users.map(({ password, ...u }) => u);
  res.json(sanitizedUsers);
});

// UPDATE USER STATUS (ACTIVATE / DEACTIVATE)
app.put('/api/users/:id/status', (req: Request, res: Response) => {
  const db = dbStore.get();
  const user = db.users.find((u) => u.id === req.params.id);
  if (!user) {
    return res.status(404).json({ error: 'Utilisateur non trouvé' });
  }
  user.status = req.body.status === 'SUSPENDU' ? 'SUSPENDU' : 'ACTIF';
  dbStore.saveData();
  res.json({ success: true, user });
});

// UPDATE USER PASSWORD (MODIFY PASSWORD DIRECTLY)
app.put('/api/users/:id/password', (req: Request, res: Response) => {
  const db = dbStore.get();
  const user = db.users.find((u) => u.id === req.params.id);
  if (!user) {
    return res.status(404).json({ error: 'Utilisateur non trouvé' });
  }
  const newPass = req.body.password || generateSecurePassword();
  user.password = newPass;

  // Record email notification
  const notif: EmailNotification = {
    id: `email-pwd-${Date.now()}`,
    to: user.email,
    recipientName: user.name,
    role: user.role,
    stationName: 'StationHub Plateforme',
    subject: 'Modification de votre mot de passe par l\'administrateur',
    bodyText: `Bonjour ${user.name},\n\nVotre mot de passe d'accès a été modifié par l'administrateur de la plateforme.\n\nNouveau mot de passe : ${newPass}`,
    credentials: {
      email: user.email,
      password: newPass,
      loginUrl: 'http://localhost:3000/login',
    },
    sentAt: new Date().toISOString(),
    status: 'DELIVERED',
  };
  db.emails.push(notif);
  dbStore.saveData();

  res.json({ success: true, newPassword: newPass });
});

// UPDATE GERANT PROFILE (NAME, PASSWORD, STATION LOGO)
app.put('/api/users/:id/profile', (req: Request, res: Response) => {
  const db = dbStore.get();
  const user = db.users.find((u) => u.id === req.params.id);
  if (!user) {
    return res.status(404).json({ error: 'Utilisateur non trouvé' });
  }

  const { name, currentPassword, newPassword, logoUrl } = req.body;

  // 1. Password change validation if requested
  if (newPassword) {
    if (currentPassword && user.password !== currentPassword) {
      return res.status(400).json({ error: 'Le mot de passe actuel est incorrect' });
    }
    user.password = newPassword;
  }

  // 2. Name change
  if (name && typeof name === 'string' && name.trim()) {
    user.name = name.trim();
  }

  // 3. Logo change on associated station
  let station = null;
  if (user.stationId) {
    station = db.stations.find((s) => s.id === user.stationId);
    if (station && logoUrl !== undefined) {
      station.logoUrl = logoUrl;
    }
  }

  dbStore.saveData();

  const { password, ...sanitizedUser } = user;
  res.json({
    success: true,
    user: sanitizedUser,
    station,
    message: 'Profil et paramètres mis à jour avec succès',
  });
});

// UPDATE STATION STATUS (ACTIVATE / SUSPEND)
app.put('/api/stations/:id/status', (req: Request, res: Response) => {
  const db = dbStore.get();
  const station = db.stations.find((s) => s.id === req.params.id);
  if (!station) {
    return res.status(404).json({ error: 'Station non trouvée' });
  }
  station.status = req.body.status === 'SUSPENDED' ? 'SUSPENDED' : 'ACTIVE';
  dbStore.saveData();
  res.json({ success: true, station });
});

// -----------------------------------------------------------------------------
// STATIONS & BACKOFFICE ENDPOINTS
// -----------------------------------------------------------------------------

app.get('/api/stations', (_req: Request, res: Response) => {
  const db = dbStore.get();
  res.json(db.stations);
});

app.get('/api/stations/:id', (req: Request, res: Response) => {
  const db = dbStore.get();
  const station = db.stations.find((s) => s.id === req.params.id);
  if (!station) {
    return res.status(404).json({ error: 'Station introuvable' });
  }
  res.json(station);
});

// CREATE NEW STATION WITH FULL INITIAL DATA & USER ACCOUNTS (Backoffice)
app.post('/api/stations', (req: Request, res: Response) => {
  const db = dbStore.get();
  const body = req.body;

  const stationId = `station-${Date.now()}`;
  const managerId = `user-gerant-${Date.now()}`;
  const accountantId = body.hasAccountant ? `user-compta-${Date.now()}` : undefined;

  const managerPassword = body.managerPassword || generateSecurePassword();
  const accountantPassword = body.hasAccountant
    ? body.accountantPassword || generateSecurePassword()
    : undefined;

  // 1. Create Manager User
  const managerUser: User = {
    id: managerId,
    email: body.managerEmail,
    name: body.managerName,
    password: managerPassword,
    role: 'GERANT',
    stationId: stationId,
    phone: body.managerPhone || '',
    createdAt: new Date().toISOString(),
  };
  db.users.push(managerUser);

  // 2. Create Accountant User if requested
  if (body.hasAccountant && accountantId) {
    const accountantUser: User = {
      id: accountantId,
      email: body.accountantEmail,
      name: body.accountantName,
      password: accountantPassword,
      role: 'EXPERT_COMPTABLE',
      stationId: stationId,
      phone: body.accountantPhone || '',
      createdAt: new Date().toISOString(),
    };
    db.users.push(accountantUser);
  }

  // 3. Create Station
  const newStation: Station = {
    id: stationId,
    name: body.name,
    code: body.code || `ST-${Date.now().toString().slice(-4)}`,
    brand: body.brand || 'Winxo',
    location: body.location || '',
    city: body.city || '',
    logoUrl: body.logoUrl || '/src/assets/images/station_modern_exterior_1792246841660.jpg',
    companyName: body.companyName || body.name,
    ice: body.ice || '',
    patente: body.patente || '',
    rc: body.rc || '',
    phone: body.phone || '',
    email: body.email || body.managerEmail,
    managerId: managerId,
    accountantId: accountantId,
    createdAt: new Date().toISOString(),
    status: 'ACTIVE',
  };
  db.stations.push(newStation);

  // 4. Initial Fuel & Prices
  const carbGasId = `carb-gas-${Date.now()}`;
  const carbSspId = `carb-ssp-${Date.now()}`;
  const gasPrice = parseFloat(body.gasPrice) || 15.92;
  const sspPrice = parseFloat(body.sspPrice) || 15.62;

  db.carburants.push(
    {
      id: carbGasId,
      stationId,
      name: 'Gasoil',
      code: 'GAS',
      pricePerLiter: gasPrice,
      color: '#0f172a',
      history: [{ date: new Date().toISOString().split('T')[0], price: gasPrice, updatedBy: 'Admin' }],
    },
    {
      id: carbSspId,
      stationId,
      name: 'SSP',
      code: 'SSP',
      pricePerLiter: sspPrice,
      color: '#16a34a',
      history: [{ date: new Date().toISOString().split('T')[0], price: sspPrice, updatedBy: 'Admin' }],
    }
  );

  // 5. Initial Tanks (Citernes)
  const cgasCapacity = parseFloat(body.cgasCapacity) || 20000;
  const cgasInitialStock = parseFloat(body.cgasInitialStock) || 10000;
  const csspCapacity = parseFloat(body.csspCapacity) || 15000;
  const csspInitialStock = parseFloat(body.csspInitialStock) || 8000;

  const citerneGasId = `cit-gas-${Date.now()}`;
  const citerneSspId = `cit-ssp-${Date.now()}`;

  db.citernes.push(
    {
      id: citerneGasId,
      stationId,
      name: 'CGAS',
      carburantCode: 'GAS',
      capacity: cgasCapacity,
      minAlertLevel: 2500,
      currentStock: cgasInitialStock,
      lastJaugeageDate: new Date().toISOString().split('T')[0],
    },
    {
      id: citerneSspId,
      stationId,
      name: 'CSSP',
      carburantCode: 'SSP',
      capacity: csspCapacity,
      minAlertLevel: 2000,
      currentStock: csspInitialStock,
      lastJaugeageDate: new Date().toISOString().split('T')[0],
    }
  );

  // 6. Initial Pumps (Pistolets)
  const pumpsCount = parseInt(body.pumpsCount) || 8;
  const customPumps: Array<{ code: string; carburantCode: string; initialIndex: number }> =
    body.pumps || [];

  for (let i = 1; i <= pumpsCount; i++) {
    const code = `P${i}`;
    const customConfig = customPumps.find((p) => p.code === code);
    const fuelType = customConfig ? customConfig.carburantCode : i % 3 === 2 ? 'SSP' : 'GAS';
    const initIdx = customConfig ? Number(customConfig.initialIndex) || 0 : 1000 * i;
    const citerneId = fuelType === 'GAS' ? citerneGasId : citerneSspId;

    db.pistolets.push({
      id: `pist-${stationId}-${i}`,
      stationId,
      code,
      citerneId,
      carburantCode: fuelType,
      currentIndex: initIdx,
      initialIndex: initIdx,
    });
  }

  // 7. Initial Employees
  db.salaries.push(
    {
      id: `sal-ger-${Date.now()}`,
      stationId,
      name: 'GERANT',
      matricule: 'GER-001',
      role: 'GERANT',
      dateEmbauche: new Date().toISOString().split('T')[0],
      actif: true,
    },
    {
      id: `sal-pomp1-${Date.now()}`,
      stationId,
      name: 'POMPISTE 1',
      matricule: 'POMP-001',
      role: 'POMPISTE',
      dateEmbauche: new Date().toISOString().split('T')[0],
      actif: true,
    },
    {
      id: `sal-pomp2-${Date.now()}`,
      stationId,
      name: 'POMPISTE 2',
      matricule: 'POMP-002',
      role: 'POMPISTE',
      dateEmbauche: new Date().toISOString().split('T')[0],
      actif: true,
    }
  );

  // 8. Standard Tiers
  db.tiers.push(
    {
      id: `tier-bq-${Date.now()}`,
      stationId,
      name: 'BANQUE',
      type: 'Banque',
      solde: 0,
      encoursAutorise: 500000,
    },
    {
      id: `tier-cs-${Date.now()}`,
      stationId,
      name: 'CAISSE ESPECES',
      type: 'Caisse',
      solde: 0,
      encoursAutorise: 100000,
    },
    {
      id: `tier-cl-anon-${Date.now()}`,
      stationId,
      name: 'C SANS NOM',
      type: 'Client',
      solde: 0,
      encoursAutorise: 0,
    },
    {
      id: `tier-fr-anon-${Date.now()}`,
      stationId,
      name: 'F SANS NOM',
      type: 'Fournisseur',
      solde: 0,
      encoursAutorise: 0,
    },
    {
      id: `tier-fr-brand-${Date.now()}`,
      stationId,
      name: (body.brand || 'WINXO').toUpperCase(),
      type: 'Fournisseur',
      solde: 0,
      encoursAutorise: 300000,
    }
  );

  // 9. Standard Services
  db.services.push(
    {
      id: `serv-lav-${Date.now()}`,
      stationId,
      name: 'TOTAL SERVICES',
      category: 'TOTAL LAVAGE',
      prixTTC: 10.0,
    },
    {
      id: `serv-vid-${Date.now()}`,
      stationId,
      name: 'TOTAL VIDANGE',
      category: 'TOTAL VIDANGE',
      prixTTC: 15.0,
    }
  );

  // 10. Standard Lubricant Products
  db.produits.push(
    {
      id: `prod-lub1-${Date.now()}`,
      stationId,
      name: 'HUILE MOTEUR 15W40 (5L)',
      category: 'Lubrifiants',
      marque: body.brand || 'Station Brand',
      prixAchatHT: 140.0,
      prixVenteTTC: 210.0,
      stockBoutique: 20,
      stockDepot: 50,
    },
    {
      id: `prod-lub2-${Date.now()}`,
      stationId,
      name: 'LIQUIDE DE REFROIDISSEMENT (5L)',
      category: 'Entretien & Fluides',
      marque: body.brand || 'Station Brand',
      prixAchatHT: 35.0,
      prixVenteTTC: 55.0,
      stockBoutique: 25,
      stockDepot: 60,
    }
  );

  // 11. Send Credentials by Email (Recorded in outbox log)
  const managerEmailNotif: EmailNotification = {
    id: `email-${Date.now()}-1`,
    to: body.managerEmail,
    recipientName: body.managerName,
    role: 'GERANT',
    stationName: body.name,
    subject: `Vos identifiants d'accès StationHub - ${body.name}`,
    bodyText: `Bonjour ${body.managerName},\n\nVotre compte de Gérant de Station a été créé pour la station "${body.name}".\n\nIdentifiant: ${body.managerEmail}\nMot de passe: ${managerPassword}\nLien d'accès: ${req.headers.origin || 'http://localhost:3000'}/login\n\nConservez ces identifiants confidentiellement.`,
    credentials: {
      email: body.managerEmail,
      password: managerPassword,
      loginUrl: `${req.headers.origin || 'http://localhost:3000'}/login`,
    },
    sentAt: new Date().toISOString(),
    status: 'DELIVERED',
  };
  db.emails.push(managerEmailNotif);

  let accountantEmailNotif: EmailNotification | null = null;
  if (body.hasAccountant && accountantPassword) {
    accountantEmailNotif = {
      id: `email-${Date.now()}-2`,
      to: body.accountantEmail,
      recipientName: body.accountantName,
      role: 'EXPERT_COMPTABLE',
      stationName: body.name,
      subject: `Accès Expert-Comptable StationHub - ${body.name}`,
      bodyText: `Bonjour ${body.accountantName},\n\nUn compte Expert-Comptable vous a été attribué pour la gestion comptable et fiscale de la station "${body.name}".\n\nIdentifiant: ${body.accountantEmail}\nMot de passe: ${accountantPassword}\nLien d'accès: ${req.headers.origin || 'http://localhost:3000'}/login`,
      credentials: {
        email: body.accountantEmail,
        password: accountantPassword,
        loginUrl: `${req.headers.origin || 'http://localhost:3000'}/login`,
      },
      sentAt: new Date().toISOString(),
      status: 'DELIVERED',
    };
    db.emails.push(accountantEmailNotif);
  }

  dbStore.saveData();

  res.status(201).json({
    station: newStation,
    credentials: {
      manager: {
        email: body.managerEmail,
        password: managerPassword,
      },
      accountant: body.hasAccountant
        ? {
            email: body.accountantEmail,
            password: accountantPassword,
          }
        : null,
    },
    emailsSent: [managerEmailNotif, accountantEmailNotif].filter(Boolean),
  });
});

app.put('/api/stations/:id', (req: Request, res: Response) => {
  const db = dbStore.get();
  const index = db.stations.findIndex((s) => s.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Station non trouvée' });
  }
  db.stations[index] = { ...db.stations[index], ...req.body };
  dbStore.saveData();
  res.json(db.stations[index]);
});

app.delete('/api/stations/:id', (req: Request, res: Response) => {
  const db = dbStore.get();
  db.stations = db.stations.filter((s) => s.id !== req.params.id);
  dbStore.saveData();
  res.json({ success: true });
});

// -----------------------------------------------------------------------------
// DASHBOARD METRICS & CHARTS (Page 1)
// -----------------------------------------------------------------------------

app.get('/api/stations/:id/dashboard', (req: Request, res: Response) => {
  const db = dbStore.get();
  const stationId = req.params.id;
  const stationJournees = db.journees.filter((j) => j.stationId === stationId);
  const stationTiers = db.tiers.filter((t) => t.stationId === stationId);
  const stationAchats = db.achats.filter((a) => a.stationId === stationId);
  const stationDepenses = db.depenses.filter((d) => d.stationId === stationId);
  const stationDocs = (db.commercialDocs || []).filter(
    (d) => d.stationId === stationId && (d.docType === 'FACTURE' || d.docType === 'BON_LIVRAISON')
  );

  // Calculate CA Jour, Semaine, Mois, Année
  const today = new Date().toISOString().split('T')[0];
  const thisMonth = today.slice(0, 7); // 'YYYY-MM'
  const thisYear = today.slice(0, 4); // 'YYYY'

  let caJour = 0;
  let caSemaine = 0;
  let caMois = 0;
  let caAnnee = 0;

  // 1. Sum CA from Daily Shifts (Journées)
  stationJournees.forEach((j) => {
    const jDate = (j.dateDebut || '').split('T')[0];
    const ca = parseFloat(j.totalChiffreAffairesDH as any) || 0;
    if (jDate === today) caJour += ca;
    if (jDate.startsWith(thisMonth)) caMois += ca;
    if (jDate.startsWith(thisYear)) caAnnee += ca;
    
    // Check last 7 days
    if (jDate) {
      const diffDays = (new Date(today).getTime() - new Date(jDate).getTime()) / (1000 * 3600 * 24);
      if (diffDays >= 0 && diffDays <= 7) {
        caSemaine += ca;
      }
    }
  });

  // 2. Sum CA from Invoices & Delivery Notes (Commercial Docs)
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

  // Solde Clients & Fournisseurs
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

  // Top lubricant product sales (aggregated from Journees & Commercial Docs)
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

  stationDocs.forEach((d) => {
    d.lignes?.forEach((l: any) => {
      if (l.unite !== 'L') {
        const key = l.designation || 'Produit';
        const existing = productSalesMap.get(key) || {
          name: l.designation,
          qte: 0,
          totalDH: 0,
        };
        existing.qte += l.quantite || 0;
        existing.totalDH += l.totalTTC || 0;
        productSalesMap.set(key, existing);
      }
    });
  });

  // If no sales yet, show top catalog products
  let topProducts = Array.from(productSalesMap.values()).sort((a, b) => b.totalDH - a.totalDH);
  if (topProducts.length === 0) {
    const stationProds = db.produits.filter((p) => p.stationId === stationId);
    topProducts = stationProds.slice(0, 3).map((p) => ({
      name: p.name,
      qte: p.stockBoutique || 0,
      totalDH: (p.stockBoutique || 0) * (p.prixVenteTTC || 0),
    }));
  }

  // 12 Months data for Chart (CA HT, Charges, Résultat Net)
  const monthNames = [
    'Janv',
    'Févr',
    'Mars',
    'Avr',
    'Mai',
    'Juin',
    'Juil',
    'Août',
    'Sept',
    'Oct',
    'Nov',
    'Déc',
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

  res.json({
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
  });
});

// -----------------------------------------------------------------------------
// CARBURANTS (Page 1, 2)
// -----------------------------------------------------------------------------

app.get('/api/stations/:id/carburants', (req: Request, res: Response) => {
  const db = dbStore.get();
  res.json(db.carburants.filter((c) => c.stationId === req.params.id));
});

app.put('/api/stations/:id/carburants/:carbId', (req: Request, res: Response) => {
  const db = dbStore.get();
  const item = db.carburants.find((c) => c.id === req.params.carbId);
  if (!item) return res.status(404).json({ error: 'Carburant introuvable' });

  const oldPrice = item.pricePerLiter;
  const newPrice = parseFloat(req.body.pricePerLiter);

  item.name = req.body.name || item.name;
  item.code = req.body.code || item.code;
  if (!isNaN(newPrice) && newPrice !== oldPrice) {
    item.pricePerLiter = newPrice;
    item.history.push({
      date: new Date().toISOString().split('T')[0],
      price: newPrice,
      updatedBy: req.body.updatedBy || 'Gérant',
    });
  }

  dbStore.saveData();
  res.json(item);
});

app.post('/api/stations/:id/carburants', (req: Request, res: Response) => {
  const db = dbStore.get();
  const price = parseFloat(req.body.pricePerLiter) || 0;
  const newCarb: Carburant = {
    id: `carb-${Date.now()}`,
    stationId: req.params.id,
    name: req.body.name,
    code: req.body.code,
    pricePerLiter: price,
    color: req.body.color || (req.body.code.toUpperCase() === 'GAS' ? '#0f172a' : '#16a34a'),
    history: [
      {
        date: new Date().toISOString().split('T')[0],
        price,
        updatedBy: req.body.updatedBy || 'Gérant',
      },
    ],
  };
  db.carburants.push(newCarb);
  dbStore.saveData();
  res.status(201).json(newCarb);
});

app.delete('/api/stations/:id/carburants/:carbId', (req: Request, res: Response) => {
  const db = dbStore.get();
  db.carburants = db.carburants.filter((c) => c.id !== req.params.carbId);
  dbStore.saveData();
  res.json({ success: true });
});

// -----------------------------------------------------------------------------
// CITERNES & JAUGEAGE (Page 2)
// -----------------------------------------------------------------------------

app.get('/api/stations/:id/citernes', (req: Request, res: Response) => {
  const db = dbStore.get();
  res.json(db.citernes.filter((c) => c.stationId === req.params.id));
});

app.post('/api/stations/:id/citernes', (req: Request, res: Response) => {
  const db = dbStore.get();
  const citerne: Citerne = {
    id: `cit-${Date.now()}`,
    stationId: req.params.id,
    name: req.body.name,
    carburantCode: req.body.carburantCode,
    capacity: parseFloat(req.body.capacity) || 20000,
    minAlertLevel: parseFloat(req.body.minAlertLevel) || 2000,
    currentStock: parseFloat(req.body.currentStock) || 0,
    lastJaugeageDate: new Date().toISOString().split('T')[0],
  };
  db.citernes.push(citerne);
  dbStore.saveData();
  res.status(201).json(citerne);
});

app.put('/api/stations/:id/citernes/:citId', (req: Request, res: Response) => {
  const db = dbStore.get();
  const cit = db.citernes.find((c) => c.id === req.params.citId);
  if (!cit) return res.status(404).json({ error: 'Citerne introuvable' });

  cit.name = req.body.name || cit.name;
  cit.carburantCode = req.body.carburantCode || cit.carburantCode;
  if (req.body.capacity) cit.capacity = parseFloat(req.body.capacity);
  if (req.body.minAlertLevel) cit.minAlertLevel = parseFloat(req.body.minAlertLevel);
  if (req.body.currentStock !== undefined) cit.currentStock = parseFloat(req.body.currentStock);

  dbStore.saveData();
  res.json(cit);
});

app.delete('/api/stations/:id/citernes/:citId', (req: Request, res: Response) => {
  const db = dbStore.get();
  db.citernes = db.citernes.filter((c) => c.id !== req.params.citId);
  dbStore.saveData();
  res.json({ success: true });
});

app.get('/api/stations/:id/citernes/:citId/history', (req: Request, res: Response) => {
  const db = dbStore.get();
  const list = (db.jaugeages || []).filter((j) => j.citerneId === req.params.citId);
  res.json(list);
});

app.post('/api/stations/:id/citernes/jaugeage', (req: Request, res: Response) => {
  const db = dbStore.get();
  const { date, readings } = req.body;
  // readings: Array<{ citerneId: string; stockReel: number }>

  const results: any[] = [];
  readings.forEach((r: any) => {
    const cit = db.citernes.find((c) => c.id === r.citerneId);
    if (cit) {
      const stockTheorique = cit.currentStock;
      const stockReel = parseFloat(r.stockReel) || 0;
      const ecart = stockReel - stockTheorique;

      cit.currentStock = stockReel;
      cit.lastJaugeageDate = date;

      const record = {
        id: `jaug-${Date.now()}-${cit.id}`,
        stationId: req.params.id,
        date,
        citerneId: cit.id,
        citerneName: cit.name,
        carburantCode: cit.carburantCode,
        stockTheorique,
        stockReel,
        ecart,
      };
      db.jaugeages.push(record);
      results.push(record);
    }
  });

  dbStore.saveData();
  res.json({ success: true, records: results });
});

// -----------------------------------------------------------------------------
// PISTOLETS & CALIBRAGE (Page 3)
// -----------------------------------------------------------------------------

app.get('/api/stations/:id/pistolets', (req: Request, res: Response) => {
  const db = dbStore.get();
  res.json(db.pistolets.filter((p) => p.stationId === req.params.id));
});

app.post('/api/stations/:id/pistolets', (req: Request, res: Response) => {
  const db = dbStore.get();
  const initIndex = parseFloat(req.body.initialIndex) || 0;
  const pistolet: Pistolet = {
    id: `pist-${Date.now()}`,
    stationId: req.params.id,
    code: req.body.code,
    citerneId: req.body.citerneId,
    carburantCode: req.body.carburantCode,
    currentIndex: initIndex,
    initialIndex: initIndex,
  };
  db.pistolets.push(pistolet);
  dbStore.saveData();
  res.status(201).json(pistolet);
});

app.put('/api/stations/:id/pistolets/:pistId', (req: Request, res: Response) => {
  const db = dbStore.get();
  const pist = db.pistolets.find((p) => p.id === req.params.pistId);
  if (!pist) return res.status(404).json({ error: 'Pistolet introuvable' });

  const oldIndex = pist.currentIndex;
  const newIndex = req.body.currentIndex !== undefined ? parseFloat(req.body.currentIndex) : oldIndex;

  pist.code = req.body.code || pist.code;
  pist.citerneId = req.body.citerneId || pist.citerneId;
  pist.carburantCode = req.body.carburantCode || pist.carburantCode;
  pist.currentIndex = newIndex;

  if (!db.calibrages) db.calibrages = [];
  if (newIndex !== oldIndex || req.body.motif) {
    db.calibrages.push({
      id: `calib-${Date.now()}-${pist.id}`,
      stationId: req.params.id,
      pistoletId: pist.id,
      pistoletCode: pist.code,
      date: new Date().toISOString().split('T')[0],
      indexActuel: oldIndex,
      nouveauIndex: newIndex,
      difference: Math.round((newIndex - oldIndex) * 100) / 100,
      motif: req.body.motif || 'Modification directe / Ajustement index',
    });
  }

  dbStore.saveData();
  res.json(pist);
});

app.delete('/api/stations/:id/pistolets/:pistId', (req: Request, res: Response) => {
  const db = dbStore.get();
  db.pistolets = db.pistolets.filter((p) => p.id !== req.params.pistId);
  dbStore.saveData();
  res.json({ success: true });
});

app.get('/api/stations/:id/pistolets/:pistId/history', (req: Request, res: Response) => {
  const db = dbStore.get();
  let list = (db.calibrages || []).filter((c) => c.pistoletId === req.params.pistId);
  
  // If list is empty, synthesize an initial setup record so the history is never blank
  if (list.length === 0) {
    const pist = db.pistolets.find((p) => p.id === req.params.pistId);
    if (pist) {
      list = [
        {
          id: `init-${pist.id}`,
          stationId: req.params.id,
          pistoletId: pist.id,
          pistoletCode: pist.code,
          date: new Date().toISOString().split('T')[0],
          indexActuel: pist.initialIndex || 0,
          nouveauIndex: pist.currentIndex,
          difference: (pist.currentIndex || 0) - (pist.initialIndex || 0),
          motif: 'Mise en service initiale & Étalonnage de base',
        },
      ];
    }
  }

  res.json(list);
});

app.post('/api/stations/:id/pistolets/calibrage', (req: Request, res: Response) => {
  const db = dbStore.get();
  const { date, adjustments } = req.body;
  // adjustments: Array<{ pistoletId: string; nouveauIndex: number; motif?: string }>

  const records: any[] = [];
  adjustments.forEach((adj: any) => {
    const pist = db.pistolets.find((p) => p.id === adj.pistoletId);
    if (pist) {
      const indexActuel = pist.currentIndex;
      const nouveauIndex = parseFloat(adj.nouveauIndex);
      const difference = nouveauIndex - indexActuel;

      pist.currentIndex = nouveauIndex;
      pist.lastCalibrageDate = date;

      const record = {
        id: `calib-${Date.now()}-${pist.id}`,
        stationId: req.params.id,
        pistoletId: pist.id,
        pistoletCode: pist.code,
        date,
        indexActuel,
        nouveauIndex,
        difference,
        motif: adj.motif || 'Étalonnage de maintenance',
      };
      db.calibrages.push(record);
      records.push(record);
    }
  });

  dbStore.saveData();
  res.json({ success: true, records });
});

// -----------------------------------------------------------------------------
// SALARIÉS (Page 4)
// -----------------------------------------------------------------------------

app.get('/api/stations/:id/salaries', (req: Request, res: Response) => {
  const db = dbStore.get();
  res.json(db.salaries.filter((s) => s.stationId === req.params.id));
});

app.post('/api/stations/:id/salaries', (req: Request, res: Response) => {
  const db = dbStore.get();
  const salarie: Salarie = {
    id: `sal-${Date.now()}`,
    stationId: req.params.id,
    name: req.body.name,
    matricule: req.body.matricule || `M-${Date.now().toString().slice(-3)}`,
    role: req.body.role || 'POMPISTE',
    phone: req.body.phone,
    cin: req.body.cin,
    dateEmbauche: req.body.dateEmbauche || new Date().toISOString().split('T')[0],
    actif: true,
  };
  db.salaries.push(salarie);
  dbStore.saveData();
  res.status(201).json(salarie);
});

app.put('/api/stations/:id/salaries/:salId', (req: Request, res: Response) => {
  const db = dbStore.get();
  const index = db.salaries.findIndex((s) => s.id === req.params.salId);
  if (index === -1) return res.status(404).json({ error: 'Salarié non trouvé' });
  db.salaries[index] = { ...db.salaries[index], ...req.body };
  dbStore.saveData();
  res.json(db.salaries[index]);
});

app.delete('/api/stations/:id/salaries/:salId', (req: Request, res: Response) => {
  const db = dbStore.get();
  db.salaries = db.salaries.filter((s) => s.id !== req.params.salId);
  dbStore.saveData();
  res.json({ success: true });
});

// -----------------------------------------------------------------------------
// TIERS & PAIEMENTS (Page 5, 6)
// -----------------------------------------------------------------------------

app.get('/api/stations/:id/tiers', (req: Request, res: Response) => {
  const db = dbStore.get();
  res.json(db.tiers.filter((t) => t.stationId === req.params.id));
});

app.post('/api/stations/:id/tiers', (req: Request, res: Response) => {
  const db = dbStore.get();
  const tier: Tier = {
    id: `tier-${Date.now()}`,
    stationId: req.params.id,
    name: req.body.name,
    type: req.body.type || 'Client',
    ice: req.body.ice,
    solde: parseFloat(req.body.solde) || 0,
    encoursAutorise: parseFloat(req.body.encoursAutorise) || 0,
    email: req.body.email,
    phone: req.body.phone,
  };
  db.tiers.push(tier);
  dbStore.saveData();
  res.status(201).json(tier);
});

app.put('/api/stations/:id/tiers/:tierId', (req: Request, res: Response) => {
  const db = dbStore.get();
  const idx = db.tiers.findIndex((t) => t.id === req.params.tierId);
  if (idx === -1) return res.status(404).json({ error: 'Compte tier non trouvé' });
  db.tiers[idx] = { ...db.tiers[idx], ...req.body };
  dbStore.saveData();
  res.json(db.tiers[idx]);
});

app.delete('/api/stations/:id/tiers/:tierId', (req: Request, res: Response) => {
  const db = dbStore.get();
  db.tiers = db.tiers.filter((t) => t.id !== req.params.tierId);
  dbStore.saveData();
  res.json({ success: true });
});

app.get('/api/stations/:id/paiements-tiers', (req: Request, res: Response) => {
  const db = dbStore.get();
  res.json(db.paiementsTiers.filter((p) => p.stationId === req.params.id));
});

app.post('/api/stations/:id/paiements-tiers', (req: Request, res: Response) => {
  const db = dbStore.get();
  const montant = parseFloat(req.body.montant) || 0;
  const tier = db.tiers.find((t) => t.id === req.body.tierId);

  if (tier) {
    if (tier.type === 'Client') {
      // Payment reduces client balance
      tier.solde -= montant;
    } else if (tier.type === 'Fournisseur') {
      // Payment to supplier reduces supplier liability
      tier.solde += montant;
    }
  }

  const pmt: any = {
    id: `pt-${Date.now()}`,
    stationId: req.params.id,
    tierId: req.body.tierId,
    tierName: tier ? tier.name : req.body.tierName,
    tierType: tier ? tier.type : req.body.tierType,
    montant,
    date: req.body.date || new Date().toISOString().split('T')[0],
    payePar: req.body.payePar || 'Pompiste / Caissier',
    mode: req.body.mode || 'Espèces',
    note: req.body.note,
    createdAt: new Date().toISOString(),
  };
  db.paiementsTiers.push(pmt);
  dbStore.saveData();
  res.status(201).json(pmt);
});

app.put('/api/stations/:id/paiements-tiers/:pmtId', (req: Request, res: Response) => {
  const db = dbStore.get();
  const pmt = db.paiementsTiers.find((p) => p.id === req.params.pmtId);
  if (!pmt) return res.status(404).json({ error: 'Paiement introuvable' });

  const oldMontant = pmt.montant;
  const newMontant = parseFloat(req.body.montant) || 0;
  const tier = db.tiers.find((t) => t.id === pmt.tierId);

  if (tier) {
    if (tier.type === 'Client') {
      tier.solde += oldMontant;
      tier.solde -= newMontant;
    } else if (tier.type === 'Fournisseur') {
      tier.solde -= oldMontant;
      tier.solde += newMontant;
    }
  }

  pmt.montant = newMontant;
  if (req.body.date) pmt.date = req.body.date;
  if (req.body.mode) pmt.mode = req.body.mode;
  if (req.body.note !== undefined) pmt.note = req.body.note;

  dbStore.saveData();
  res.json(pmt);
});

app.delete('/api/stations/:id/paiements-tiers/:pmtId', (req: Request, res: Response) => {
  const db = dbStore.get();
  const pmt = db.paiementsTiers.find((p) => p.id === req.params.pmtId);
  if (!pmt) return res.status(404).json({ error: 'Paiement introuvable' });

  const tier = db.tiers.find((t) => t.id === pmt.tierId);
  if (tier) {
    if (tier.type === 'Client') {
      tier.solde += pmt.montant;
    } else if (tier.type === 'Fournisseur') {
      tier.solde -= pmt.montant;
    }
  }

  db.paiementsTiers = db.paiementsTiers.filter((p) => p.id !== req.params.pmtId);
  dbStore.saveData();
  res.json({ success: true });
});

// -----------------------------------------------------------------------------
// PRODUITS & SERVICES (Page 6, 7)
// -----------------------------------------------------------------------------

app.get('/api/stations/:id/produits', (req: Request, res: Response) => {
  const db = dbStore.get();
  res.json(db.produits.filter((p) => p.stationId === req.params.id));
});

app.post('/api/stations/:id/produits', (req: Request, res: Response) => {
  const db = dbStore.get();
  const prod: Produit = {
    id: `prod-${Date.now()}`,
    stationId: req.params.id,
    name: req.body.name,
    category: req.body.category || 'Lubrifiants',
    marque: req.body.marque || '',
    prixAchatHT: parseFloat(req.body.prixAchatHT) || 0,
    prixVenteTTC: parseFloat(req.body.prixVenteTTC) || 0,
    stockBoutique: parseFloat(req.body.stockBoutique) || 0,
    stockDepot: parseFloat(req.body.stockDepot) || 0,
  };
  db.produits.push(prod);
  dbStore.saveData();
  res.status(201).json(prod);
});

app.put('/api/stations/:id/produits/:prodId', (req: Request, res: Response) => {
  const db = dbStore.get();
  const idx = db.produits.findIndex((p) => p.id === req.params.prodId);
  if (idx === -1) return res.status(404).json({ error: 'Produit non trouvé' });
  db.produits[idx] = { ...db.produits[idx], ...req.body };
  dbStore.saveData();
  res.json(db.produits[idx]);
});

app.delete('/api/stations/:id/produits/:prodId', (req: Request, res: Response) => {
  const db = dbStore.get();
  db.produits = db.produits.filter((p) => p.id !== req.params.prodId);
  dbStore.saveData();
  res.json({ success: true });
});

app.get('/api/stations/:id/services', (req: Request, res: Response) => {
  const db = dbStore.get();
  res.json(db.services.filter((s) => s.stationId === req.params.id));
});

app.post('/api/stations/:id/services', (req: Request, res: Response) => {
  const db = dbStore.get();
  const serv: ServiceStation = {
    id: `serv-${Date.now()}`,
    stationId: req.params.id,
    name: req.body.name,
    category: req.body.category || 'TOTAL LAVAGE',
    prixTTC: parseFloat(req.body.prixTTC) || 0,
  };
  db.services.push(serv);
  dbStore.saveData();
  res.status(201).json(serv);
});

app.put('/api/stations/:id/services/:servId', (req: Request, res: Response) => {
  const db = dbStore.get();
  const idx = db.services.findIndex((s) => s.id === req.params.servId);
  if (idx === -1) return res.status(404).json({ error: 'Service non trouvé' });
  db.services[idx] = { ...db.services[idx], ...req.body };
  dbStore.saveData();
  res.json(db.services[idx]);
});

app.delete('/api/stations/:id/services/:servId', (req: Request, res: Response) => {
  const db = dbStore.get();
  db.services = db.services.filter((s) => s.id !== req.params.servId);
  dbStore.saveData();
  res.json({ success: true });
});

// -----------------------------------------------------------------------------
// JOURNÉES & CLÔTURE (Page 8, 9, 10 - 8-Step Daily Entry Flow)
// -----------------------------------------------------------------------------

app.get('/api/stations/:id/journees', (req: Request, res: Response) => {
  const db = dbStore.get();
  res.json(db.journees.filter((j) => j.stationId === req.params.id));
});

app.post('/api/stations/:id/journees', (req: Request, res: Response) => {
  const db = dbStore.get();
  const stationId = req.params.id;
  const journeeData: Journee = {
    ...req.body,
    id: `jrn-${Date.now()}`,
    stationId,
    createdAt: new Date().toISOString(),
  };

  // 1. Update pistolet currentIndex values based on indexSortie
  journeeData.pistoletEntries?.forEach((entry) => {
    const pist = db.pistolets.find((p) => p.id === entry.pistoletId);
    if (pist && entry.indexSortie > pist.currentIndex) {
      pist.currentIndex = entry.indexSortie;
    }

    // Deduct quantity from corresponding tank (citerne)
    if (pist) {
      const cit = db.citernes.find((c) => c.id === pist.citerneId);
      if (cit) {
        cit.currentStock = Math.max(0, cit.currentStock - entry.quantiteL);
      }
    }
  });

  // 2. Update product stock (stockBoutique decreases by quantiteVendue)
  journeeData.produitEntries?.forEach((prodEntry) => {
    const prod = db.produits.find((p) => p.id === prodEntry.produitId);
    if (prod) {
      prod.stockBoutique = Math.max(0, prod.stockBoutique - prodEntry.quantiteVendue);
    }
  });

  // 3. Update client balances for non-cash sales (Bons clients increase customer balance)
  journeeData.encaissementsNonEspeces?.forEach((enc) => {
    const client = db.tiers.find((t) => t.id === enc.clientId);
    if (client) {
      client.solde += enc.montant;
    }
  });

  // 4. Update client balances for debt settlements received in cash (settlements reduce client debt)
  journeeData.reglementsDettes?.forEach((reg: any) => {
    const cId = reg.tierId || reg.clientId;
    const client = db.tiers.find((t) => t.id === cId);
    if (client) {
      client.solde = Math.max(0, client.solde - (parseFloat(reg.montant) || 0));
    }
  });

  // 5. Integrate cash expenses into db.depenses
  journeeData.depensesCaisse?.forEach((dep) => {
    if (dep.montant > 0) {
      const depRecord: Depense = {
        id: `dep-shift-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        stationId,
        typeDepense: dep.typeDepense || 'Frais généraux',
        numeroFacture: `DEP-SHIFT-${journeeData.dateDebut || new Date().toISOString().split('T')[0]}`,
        fournisseurId: '',
        fournisseurNom: 'Caisse Shift',
        dateFacturation: journeeData.dateDebut || new Date().toISOString().split('T')[0],
        dateEcheance: journeeData.dateFin || new Date().toISOString().split('T')[0],
        details: [
          {
            id: `det-${Date.now()}`,
            designation: dep.description || dep.typeDepense,
            quantite: 1,
            prixUnitaireHT: dep.montant,
            tvaTaux: 0,
            tvaMontant: 0,
            totalTTC: dep.montant,
          },
        ],
        remise: 0,
        totalHT: dep.montant,
        totalTVA: 0,
        totalTTC: dep.montant,
        statutPaiement: 'Payé',
        modePaiement: 'Espèces',
        notes: `Dépense caisse shift (${dep.notes || ''})`,
      };
      db.depenses.push(depRecord);
    }
  });

  db.journees.unshift(journeeData);
  dbStore.saveData();

  res.status(201).json(journeeData);
});

// -----------------------------------------------------------------------------
// ACHATS (Page 10, 11)
// -----------------------------------------------------------------------------

app.get('/api/stations/:id/achats', (req: Request, res: Response) => {
  const db = dbStore.get();
  res.json(db.achats.filter((a) => a.stationId === req.params.id));
});

app.post('/api/stations/:id/achats', (req: Request, res: Response) => {
  const db = dbStore.get();
  const stationId = req.params.id;
  const achat: Achat = {
    ...req.body,
    id: `ach-${Date.now()}`,
    stationId,
  };

  // If fuel delivered, add quantity to tank stock
  achat.details?.forEach((det) => {
    if (det.livre) {
      const cit = db.citernes.find((c) => c.id === det.citerneOuProduitId);
      if (cit) {
        cit.currentStock += det.quantite;
      }
      const prod = db.produits.find((p) => p.id === det.citerneOuProduitId);
      if (prod) {
        prod.stockDepot += det.quantite;
      }
    }
  });

  // Update supplier liability if not fully paid
  const supplier = db.tiers.find((t) => t.id === achat.fournisseurId);
  if (supplier && achat.resteAPayer > 0) {
    supplier.solde -= achat.resteAPayer;
  }

  db.achats.unshift(achat);
  dbStore.saveData();
  res.status(201).json(achat);
});

app.put('/api/stations/:id/achats/:achId', (req: Request, res: Response) => {
  const db = dbStore.get();
  const idx = db.achats.findIndex((a) => a.id === req.params.achId);
  if (idx === -1) return res.status(404).json({ error: 'Achat non trouvé' });
  db.achats[idx] = { ...db.achats[idx], ...req.body };
  dbStore.saveData();
  res.json(db.achats[idx]);
});

app.delete('/api/stations/:id/achats/:achId', (req: Request, res: Response) => {
  const db = dbStore.get();
  db.achats = db.achats.filter((a) => a.id !== req.params.achId);
  dbStore.saveData();
  res.json({ success: true });
});

// -----------------------------------------------------------------------------
// DÉPENSES (Page 12)
// -----------------------------------------------------------------------------

app.get('/api/stations/:id/depenses', (req: Request, res: Response) => {
  const db = dbStore.get();
  res.json(db.depenses.filter((d) => d.stationId === req.params.id));
});

app.post('/api/stations/:id/depenses', (req: Request, res: Response) => {
  const db = dbStore.get();
  const dep: Depense = {
    ...req.body,
    id: `dep-${Date.now()}`,
    stationId: req.params.id,
  };
  db.depenses.unshift(dep);
  dbStore.saveData();
  res.status(201).json(dep);
});

app.put('/api/stations/:id/depenses/:depId', (req: Request, res: Response) => {
  const db = dbStore.get();
  const idx = db.depenses.findIndex((d) => d.id === req.params.depId);
  if (idx === -1) return res.status(404).json({ error: 'Dépense non trouvée' });
  db.depenses[idx] = { ...db.depenses[idx], ...req.body };
  dbStore.saveData();
  res.json(db.depenses[idx]);
});

app.delete('/api/stations/:id/depenses/:depId', (req: Request, res: Response) => {
  const db = dbStore.get();
  db.depenses = db.depenses.filter((d) => d.id !== req.params.depId);
  dbStore.saveData();
  res.json({ success: true });
});

// -----------------------------------------------------------------------------
// FACTURES, BONS DE LIVRAISON & DEVIS (Page 12, 13, 14)
// -----------------------------------------------------------------------------

app.get('/api/stations/:id/commercial-docs', (req: Request, res: Response) => {
  const db = dbStore.get();
  const { docType } = req.query;
  let docs = db.commercialDocs.filter((d) => d.stationId === req.params.id);
  if (docType) {
    docs = docs.filter((d) => d.docType === docType);
  }
  res.json(docs);
});

app.post('/api/stations/:id/commercial-docs', (req: Request, res: Response) => {
  const db = dbStore.get();
  const doc: CommercialDoc = {
    ...req.body,
    id: `doc-${Date.now()}`,
    stationId: req.params.id,
  };
  db.commercialDocs.unshift(doc);
  dbStore.saveData();
  res.status(201).json(doc);
});

app.put('/api/stations/:id/commercial-docs/:docId', (req: Request, res: Response) => {
  const db = dbStore.get();
  const idx = db.commercialDocs.findIndex((d) => d.id === req.params.docId);
  if (idx === -1) return res.status(404).json({ error: 'Document non trouvé' });
  db.commercialDocs[idx] = { ...db.commercialDocs[idx], ...req.body };
  dbStore.saveData();
  res.json(db.commercialDocs[idx]);
});

app.delete('/api/stations/:id/commercial-docs/:docId', (req: Request, res: Response) => {
  const db = dbStore.get();
  db.commercialDocs = db.commercialDocs.filter((d) => d.id !== req.params.docId);
  dbStore.saveData();
  res.json({ success: true });
});

// -----------------------------------------------------------------------------
// RAPPORTS (Page 15, 16, 17 - All 8 Reports + Archiving)
// -----------------------------------------------------------------------------

app.get('/api/stations/:id/rapports', (req: Request, res: Response) => {
  const db = dbStore.get();
  const stationId = req.params.id;
  const { startDate, endDate, year = '2026' } = req.query;

  const stationJournees = db.journees.filter((j) => j.stationId === stationId);
  const stationTiers = db.tiers.filter((t) => t.stationId === stationId);
  const stationCiternes = db.citernes.filter((c) => c.stationId === stationId);
  const stationAchats = db.achats.filter((a) => a.stationId === stationId);
  const stationProduits = db.produits.filter((p) => p.stationId === stationId);
  const stationDepenses = db.depenses.filter((d) => d.stationId === stationId);

  // Apply real period date filtering (JJ/MM/AA / ISO)
  let filteredJournees = stationJournees;
  if (startDate) {
    filteredJournees = filteredJournees.filter((j) => j.dateDebut >= (startDate as string));
  }
  if (endDate) {
    filteredJournees = filteredJournees.filter((j) => j.dateDebut <= (endDate as string));
  }

  // 1. C.A. par jour
  const caParJour = filteredJournees.map((j) => ({
    date: j.dateDebut,
    chiffreAffaires: j.totalChiffreAffairesDH,
    bonsClients: j.totalNonEspecesDH,
    depenses: j.totalDepensesEspecesDH,
    regTiers: j.totalReglementsDettesDH,
    encaisEspeces: j.especesARemettreDH,
  }));

  // 2. Transactions Tiers (Dynamic Ledgers & Balances)
  const stationCommercialDocs = db.commercialDocs.filter((d) => d.stationId === stationId);
  const stationPaiementsTiers = db.paiementsTiers.filter((p) => p.stationId === stationId);

  const transactionsTiers = stationTiers.map((t) => {
    let totalDebit = 0;
    let totalCredit = 0;

    if (t.type === 'Client') {
      // Debits: Credit sales (Bons clients in shifts) + Invoices
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
      // Credits: Settlements received from client
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
      // Credits: Deliveries / invoices from supplier
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
      // Debits: Payments made to supplier
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

  // 3. Ventes de Carburants (liters and DH for GAS & SSP per day)
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

  // 4. Stock Carburants (100% Dynamic from Citernes, Achats & Ventes)
  let gasPurchasesL = 0;
  let sspPurchasesL = 0;
  stationAchats.forEach((a) => {
    a.details?.forEach((d) => {
      if (d.livre) {
        const cit = stationCiternes.find((c) => c.id === d.citerneOuProduitId);
        if (cit?.carburantCode === 'GAS' || d.designation.toLowerCase().includes('gasoil')) {
          gasPurchasesL += d.quantite;
        } else if (
          cit?.carburantCode === 'SSP' ||
          d.designation.toLowerCase().includes('ssp') ||
          d.designation.toLowerCase().includes('sans plomb')
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

  // 5. Ventes de Produits
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

  // 6. Stock Produits
  const stockProduits = stationProduits.map((p) => {
    const totalVentes =
      ventesProduitsMap.get(p.id)?.quantiteVendue || 0;
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

  // 7. Ventes de Services
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

  // 8. CPC (Compte de Produits et Charges - Annual with 12 months)
  const monthNames = [
    'Janvier',
    'Février',
    'Mars',
    'Avril',
    'Mai',
    'Juin',
    'Juillet',
    'Août',
    'Septembre',
    'Octobre',
    'Novembre',
    'Décembre',
  ];
  const cpcMensuel = monthNames.map((monthName, idx) => {
    const mStr = `${year}-${String(idx + 1).padStart(2, '0')}`;
    let vCarburants = 0;
    let vProduits = 0;
    let vServices = 0;

    stationJournees.forEach((j) => {
      if (j.dateDebut.startsWith(mStr)) {
        vCarburants += j.totalCarburantsDH || 0;
        vProduits += j.totalProduitsDH || 0;
        vServices += j.totalServicesDH || 0;
      }
    });

    const chiffreAffaires = vCarburants + vProduits + vServices;
    // CMV ~ cost of fuels and products sold
    const cmv = Math.round(chiffreAffaires * 0.82);

    let charges = 0;
    stationDepenses.forEach((d) => {
      if (d.dateFacturation.startsWith(mStr)) {
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

  res.json({
    caParJour,
    transactionsTiers,
    ventesCarburants,
    stockCarburants,
    ventesProduits,
    stockProduits,
    ventesServices,
    cpcMensuel,
  });
});

// -----------------------------------------------------------------------------
// EMAILS & SMTP GATEWAY (Backoffice dispatch & queue manager)
// -----------------------------------------------------------------------------

app.get('/api/emails', (_req: Request, res: Response) => {
  const db = dbStore.get();
  res.json(db.emails);
});

// RESEND EMAIL DISPATCH
app.post('/api/emails/:id/resend', (req: Request, res: Response) => {
  const db = dbStore.get();
  const emailItem = db.emails.find((e) => e.id === req.params.id);
  if (!emailItem) {
    return res.status(404).json({ error: 'Notification introuvable' });
  }

  emailItem.sentAt = new Date().toISOString();
  emailItem.status = 'DELIVERED';
  dbStore.saveData();

  res.json({
    success: true,
    message: `E-mail réémis avec succès vers ${emailItem.to}`,
    email: emailItem,
  });
});

// GET SMTP GATEWAY CONFIGURATION STATUS
app.get('/api/smtp/status', (_req: Request, res: Response) => {
  const hasEnvSmtp = !!process.env.SMTP_HOST;
  res.json({
    configured: hasEnvSmtp,
    host: process.env.SMTP_HOST || 'smtp.stationhub.ma (en attente de liaison .env)',
    port: parseInt(process.env.SMTP_PORT || '587'),
    user: process.env.SMTP_USER || 'notifications@stationhub.ma',
    secure: process.env.SMTP_SECURE === 'true',
    from: process.env.SMTP_FROM || 'StationHub Notifications <notifications@stationhub.ma>',
    readyForLinking: true,
    supportedProviders: ['SendGrid', 'Amazon SES', 'Mailgun', 'Brevo (Sendinblue)', 'SMTP CPanel / Serveur Dédié'],
  });
});

// TEST SMTP DISPATCH
app.post('/api/smtp/test', (req: Request, res: Response) => {
  const { testEmail } = req.body;
  if (!testEmail) {
    return res.status(400).json({ error: 'Adresse e-mail requise pour le test' });
  }

  const db = dbStore.get();
  const testNotif: EmailNotification = {
    id: `email-test-${Date.now()}`,
    to: testEmail,
    recipientName: 'Administrateur Test',
    role: 'SUPER_ADMIN',
    stationName: 'StationHub Passerelle',
    subject: '[TEST SMTP] Validation de la passerelle d\'envoi StationHub',
    bodyText: `Ceci est un e-mail de test envoyé pour valider votre configuration SMTP.\n\nDate: ${new Date().toLocaleString('fr-FR')}\nStatut: Prêt pour le relais de production.`,
    credentials: {
      email: testEmail,
      password: '••••••••••••',
      loginUrl: 'http://localhost:3000/login',
    },
    sentAt: new Date().toISOString(),
    status: 'DELIVERED',
  };

  db.emails.unshift(testNotif);
  dbStore.saveData();

  res.json({
    success: true,
    message: `Test d'envoi consigné avec succès vers ${testEmail}. La passerelle est prête pour votre serveur SMTP.`,
    notification: testNotif,
  });
});

// -----------------------------------------------------------------------------
// VITE DEV SERVER / STATIC PRODUCTION MOUNT
// -----------------------------------------------------------------------------

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`StationHub server started successfully on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
