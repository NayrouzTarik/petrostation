import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../services/api.ts';
import { Station, User, UserRole } from '../types/index.ts';

interface AuthContextType {
  user: User | null;
  station: Station | null;
  allStations: Station[];
  isAuthenticated: boolean;
  role: UserRole;
  login: (email: string, pass: string) => Promise<void>;
  signup: (data: any) => Promise<void>;
  logout: () => void;
  switchStation: (stationId: string) => Promise<void>;
  refreshStationData: () => Promise<void>;
  refreshStationsList: () => Promise<void>;
  updateGerantSettings: (data: {
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
  }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [station, setStation] = useState<Station | null>(null);
  const [allStations, setAllStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Initialize from API / Session storage
  useEffect(() => {
    async function init() {
      try {
        // Supprimer les résidus obsolètes de localStorage pour éviter toute connexion automatique indésirable à la saisie de l'URL
        try {
          localStorage.removeItem('stationhub_user');
          localStorage.removeItem('stationhub_token');
        } catch (e) {
          // ignore
        }

        // L'authentification est conservée uniquement pour la session d'onglet active (sessionStorage)
        const savedUser = sessionStorage.getItem('stationhub_user');
        if (savedUser) {
          const parsed: User = JSON.parse(savedUser);
          setUser(parsed);

          // Fetch stations based on tenant scope
          const stations = await api.getStations();
          
          if (parsed.role === 'SUPER_ADMIN') {
            setAllStations(stations);
            setStation(null);
          } else if (parsed.role === 'EXPERT_COMPTABLE') {
            // Only stations assigned to this accountant
            const assigned = stations.filter((s) => s.accountantId === parsed.id || parsed.stationId === s.id);
            const availableStations = assigned.length > 0 ? assigned : stations;
            setAllStations(availableStations);
            const currentStation = availableStations.find((s) => s.id === parsed.stationId) || availableStations[0] || null;
            if (currentStation && typeof window !== 'undefined') {
              const localLogo = localStorage.getItem(`stationhub_logo_${currentStation.id}`);
              if (localLogo && (!currentStation.logoUrl || currentStation.logoUrl.includes('station_modern_exterior') || currentStation.logoUrl.trim() === '')) {
                currentStation.logoUrl = localLogo;
              }
            }
            setStation(currentStation);
          } else {
            // GERANT: Strictly isolated to his station only
            const myStation = stations.find((s) => s.id === parsed.stationId) || null;
            if (myStation && typeof window !== 'undefined') {
              const localLogo = localStorage.getItem(`stationhub_logo_${myStation.id}`);
              if (localLogo && (!myStation.logoUrl || myStation.logoUrl.includes('station_modern_exterior') || myStation.logoUrl.trim() === '')) {
                myStation.logoUrl = localLogo;
              }
            }
            setAllStations(myStation ? [myStation] : []);
            setStation(myStation);
          }
        } else {
          // Unauthenticated visitors stay on login
          setUser(null);
          setStation(null);
          setAllStations([]);
        }
      } catch (err) {
        console.error('Initialization error:', err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  const login = async (email: string, pass: string) => {
    const res = await api.login(email, pass);
    setUser(res.user);
    
    // Fetch and scope stations
    const stations = await api.getStations();
    if (res.user.role === 'SUPER_ADMIN') {
      setAllStations(stations);
      setStation(null);
    } else if (res.user.role === 'EXPERT_COMPTABLE') {
      const assigned = stations.filter((s: Station) => s.accountantId === res.user.id || res.user.stationId === s.id);
      const available = assigned.length > 0 ? assigned : stations;
      setAllStations(available);
      const chosen = res.station || available[0] || null;
      if (chosen && typeof window !== 'undefined') {
        const localLogo = localStorage.getItem(`stationhub_logo_${chosen.id}`);
        if (localLogo && (!chosen.logoUrl || chosen.logoUrl.includes('station_modern_exterior') || chosen.logoUrl.trim() === '')) {
          chosen.logoUrl = localLogo;
        }
      }
      setStation(chosen);
    } else {
      // Gérant: Strictly restricted to his own station
      const myStation = stations.find((s: Station) => s.id === res.user.stationId) || res.station;
      if (myStation && typeof window !== 'undefined') {
        const localLogo = localStorage.getItem(`stationhub_logo_${myStation.id}`);
        if (localLogo && (!myStation.logoUrl || myStation.logoUrl.includes('station_modern_exterior') || myStation.logoUrl.trim() === '')) {
          myStation.logoUrl = localLogo;
        }
      }
      setAllStations(myStation ? [myStation] : []);
      setStation(myStation);
    }

    sessionStorage.setItem('stationhub_user', JSON.stringify(res.user));
    sessionStorage.setItem('stationhub_token', res.token);
    try {
      localStorage.removeItem('stationhub_user');
      localStorage.removeItem('stationhub_token');
    } catch (e) {
      // ignore
    }
  };

  const signup = async (data: any) => {
    const res = await api.signup(data);
    setUser(res.user);
    setStation(res.station);
    setAllStations(res.station ? [res.station] : []);
    sessionStorage.setItem('stationhub_user', JSON.stringify(res.user));
    sessionStorage.setItem('stationhub_token', res.token);
  };

  const logout = () => {
    setUser(null);
    setStation(null);
    setAllStations([]);
    sessionStorage.removeItem('stationhub_user');
    sessionStorage.removeItem('stationhub_token');
    try {
      localStorage.removeItem('stationhub_user');
      localStorage.removeItem('stationhub_token');
      localStorage.removeItem('stationhub_active_nav');
    } catch (e) {
      // ignore
    }
  };

  const switchStation = async (stationId: string) => {
    // Only allowed if user is EXPERT_COMPTABLE or SUPER_ADMIN
    if (user?.role !== 'EXPERT_COMPTABLE' && user?.role !== 'SUPER_ADMIN') {
      return;
    }
    const st = allStations.find((s) => s.id === stationId);
    if (st) {
      setStation(st);
      if (user && user.role === 'EXPERT_COMPTABLE') {
        const updatedUser = { ...user, stationId };
        setUser(updatedUser);
        sessionStorage.setItem('stationhub_user', JSON.stringify(updatedUser));
      }
    }
  };

  const refreshStationData = async () => {
    if (station) {
      const updated = await api.getStation(station.id);
      setStation(updated);
    }
  };

  const refreshStationsList = async () => {
    if (user?.role === 'SUPER_ADMIN') {
      const list = await api.getStations();
      setAllStations(list);
    } else if (user?.role === 'EXPERT_COMPTABLE') {
      const list = await api.getStations();
      const assigned = list.filter((s) => s.accountantId === user.id || user.stationId === s.id);
      setAllStations(assigned.length > 0 ? assigned : list);
    }
  };

  const updateGerantSettings = async (data: {
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
  }) => {
    if (!user) throw new Error('Utilisateur non connecté');
    const targetStationId = data.stationId || station?.id || user.stationId;
    const res = await api.updateGerantProfile(user.id, {
      ...data,
      stationId: targetStationId,
    });

    if (res.user) {
      setUser((prev) => (prev ? { ...prev, name: res.user.name } : null));
      try {
        const saved = sessionStorage.getItem('stationhub_user');
        if (saved) {
          const parsed = JSON.parse(saved);
          parsed.name = res.user.name;
          sessionStorage.setItem('stationhub_user', JSON.stringify(parsed));
        }
      } catch (e) {
        console.warn('sessionStorage user save handled safely', e);
      }
    }

    const updatedStation =
      res.station ||
      (station
        ? {
            ...station,
            name: data.stationName || station.name,
            location: data.location !== undefined ? data.location : station.location,
            city: data.city || station.city,
            phone: data.phone !== undefined ? data.phone : station.phone,
            companyName: data.companyName !== undefined ? data.companyName : station.companyName,
            ice: data.ice !== undefined ? data.ice : station.ice,
            rc: data.rc !== undefined ? data.rc : station.rc,
            patente: data.patente !== undefined ? data.patente : station.patente,
            brand: data.brand || station.brand,
            logoUrl: data.logoUrl !== undefined ? data.logoUrl : station.logoUrl,
          }
        : null);

    if (updatedStation) {
      setStation(updatedStation);
      setAllStations((prev) =>
        prev.map((s) => (s.id === updatedStation.id ? updatedStation : s))
      );

      try {
        localStorage.setItem('stationhub_station', JSON.stringify(updatedStation));
        if (updatedStation.id && data.logoUrl !== undefined) {
          if (data.logoUrl) {
            localStorage.setItem(`stationhub_logo_${updatedStation.id}`, data.logoUrl);
          } else {
            localStorage.removeItem(`stationhub_logo_${updatedStation.id}`);
          }
        }
        localStorage.removeItem('stationhub_custom_doc_logo');
      } catch (e) {
        console.warn('localStorage logo quota handled safely', e);
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('stationhub_station_updated', { detail: updatedStation })
        );
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-medium tracking-wide text-slate-300">
            Chargement sécurisé de StationHub...
          </span>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        station,
        allStations,
        isAuthenticated: !!user,
        role: user?.role || 'GERANT',
        login,
        signup,
        logout,
        switchStation,
        refreshStationData,
        refreshStationsList,
        updateGerantSettings,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
