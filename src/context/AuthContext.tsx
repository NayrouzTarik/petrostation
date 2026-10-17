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
    logoUrl?: string;
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

  // Initialize from API / Local storage
  useEffect(() => {
    async function init() {
      try {
        const savedUser = localStorage.getItem('stationhub_user');
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
            setStation(currentStation);
          } else {
            // GERANT: Strictly isolated to his station only
            const myStation = stations.find((s) => s.id === parsed.stationId) || null;
            setAllStations(myStation ? [myStation] : []);
            setStation(myStation);
          }
        } else {
          // No auto-login: Unauthenticated visitors stay on login
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
      setStation(res.station || available[0] || null);
    } else {
      // Gérant: Strictly restricted to his own station
      setAllStations(res.station ? [res.station] : []);
      setStation(res.station);
    }

    localStorage.setItem('stationhub_user', JSON.stringify(res.user));
    localStorage.setItem('stationhub_token', res.token);
  };

  const signup = async (data: any) => {
    const res = await api.signup(data);
    setUser(res.user);
    setStation(res.station);
    setAllStations(res.station ? [res.station] : []);
    localStorage.setItem('stationhub_user', JSON.stringify(res.user));
    localStorage.setItem('stationhub_token', res.token);
  };

  const logout = () => {
    setUser(null);
    setStation(null);
    setAllStations([]);
    localStorage.removeItem('stationhub_user');
    localStorage.removeItem('stationhub_token');
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
        localStorage.setItem('stationhub_user', JSON.stringify(updatedUser));
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
    logoUrl?: string;
    currentPassword?: string;
    newPassword?: string;
  }) => {
    if (!user) throw new Error('Utilisateur non connecté');
    const res = await api.updateGerantProfile(user.id, data);
    if (res.user) {
      setUser((prev) => (prev ? { ...prev, name: res.user.name } : null));
      const saved = localStorage.getItem('stationhub_user');
      if (saved) {
        const parsed = JSON.parse(saved);
        parsed.name = res.user.name;
        localStorage.setItem('stationhub_user', JSON.stringify(parsed));
      }
    }
    if (data.logoUrl !== undefined) {
      if (station?.id) {
        if (data.logoUrl) {
          localStorage.setItem(`stationhub_logo_${station.id}`, data.logoUrl);
        } else {
          localStorage.removeItem(`stationhub_logo_${station.id}`);
        }
      }
      localStorage.removeItem('stationhub_custom_doc_logo');
      setStation((prev) => (prev ? { ...prev, logoUrl: data.logoUrl || '' } : null));
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
