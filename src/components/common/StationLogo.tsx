import React, { useEffect, useState } from 'react';

interface StationLogoProps {
  stationId?: string;
  brand?: string;
  name?: string;
  logoUrl?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const StationLogo: React.FC<StationLogoProps> = ({
  stationId,
  brand = 'Winxo',
  name = '',
  logoUrl,
  className = '',
  size = 'md',
}) => {
  const [liveLogo, setLiveLogo] = useState<string | undefined>(logoUrl);

  useEffect(() => {
    setLiveLogo(logoUrl);
  }, [logoUrl]);

  useEffect(() => {
    const handleStationUpdate = (e: any) => {
      const updated = e.detail;
      if (updated && (!stationId || updated.id === stationId)) {
        if (updated.logoUrl !== undefined) {
          setLiveLogo(updated.logoUrl);
        }
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('stationhub_station_updated', handleStationUpdate);
      return () => {
        window.removeEventListener('stationhub_station_updated', handleStationUpdate);
      };
    }
  }, [stationId]);

  const sizeClasses = {
    sm: 'w-7 h-7 text-xs',
    md: 'w-9 h-9 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-lg',
  }[size];

  // 1. Resolve custom logo specifically for THIS station
  const currentLogoCandidate = liveLogo !== undefined ? liveLogo : logoUrl;
  const isResetToDefault = currentLogoCandidate === '';

  const scopedLocalLogo =
    typeof window !== 'undefined' && stationId && !isResetToDefault
      ? localStorage.getItem(`stationhub_logo_${stationId}`)
      : null;

  const isCustomLogoUrl =
    Boolean(currentLogoCandidate) &&
    !isResetToDefault &&
    (currentLogoCandidate!.startsWith('data:image') ||
      currentLogoCandidate!.startsWith('blob:') ||
      currentLogoCandidate!.startsWith('http') ||
      (!currentLogoCandidate!.includes('station_modern_exterior') && currentLogoCandidate!.trim() !== ''));

  const effectiveCustomLogo = isResetToDefault
    ? null
    : isCustomLogoUrl
    ? currentLogoCandidate
    : scopedLocalLogo;

  if (effectiveCustomLogo) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <img
          src={effectiveCustomLogo}
          alt={name || brand || 'Logo Station'}
          referrerPolicy="no-referrer"
          className={`${sizeClasses} rounded-lg object-contain border border-slate-200 dark:border-slate-700 bg-white p-0.5 shrink-0 shadow-2xs`}
        />
      </div>
    );
  }

  const brandLower = (brand || '').toLowerCase();

  // 2. Winxo: authentic multi-color 8-petal flower
  if (brandLower.includes('winxo')) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <svg
          viewBox="0 0 100 100"
          className={`${sizeClasses} shrink-0 drop-shadow-xs`}
          aria-hidden="true"
        >
          <g transform="translate(50,50)">
            <ellipse cx="0" cy="-28" rx="8" ry="18" fill="#16a34a" />
            <ellipse cx="20" cy="-20" rx="8" ry="18" fill="#84cc16" transform="rotate(45)" />
            <ellipse cx="28" cy="0" rx="8" ry="18" fill="#eab308" transform="rotate(90)" />
            <ellipse cx="20" cy="20" rx="8" ry="18" fill="#f97316" transform="rotate(135)" />
            <ellipse cx="0" cy="28" rx="8" ry="18" fill="#dc2626" transform="rotate(180)" />
            <ellipse cx="-20" cy="20" rx="8" ry="18" fill="#f97316" transform="rotate(225)" />
            <ellipse cx="-28" cy="0" rx="8" ry="18" fill="#eab308" transform="rotate(270)" />
            <ellipse cx="-20" cy="-20" rx="8" ry="18" fill="#84cc16" transform="rotate(315)" />
            <circle cx="0" cy="0" r="10" fill="#ffffff" />
            <circle cx="0" cy="0" r="6" fill="#16a34a" />
          </g>
        </svg>
      </div>
    );
  }

  // 3. Shell: iconic yellow seashell with red contour
  if (brandLower.includes('shell')) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <svg viewBox="0 0 100 100" className={`${sizeClasses} shrink-0 drop-shadow-xs`}>
          <path
            d="M 50 10 C 25 10 15 35 15 65 C 15 85 35 90 50 90 C 65 90 85 85 85 65 C 85 35 75 10 50 10 Z"
            fill="#dc2626"
          />
          <path
            d="M 50 18 C 30 18 22 40 22 65 C 22 80 38 84 50 84 C 62 84 78 80 78 65 C 78 40 70 18 50 18 Z"
            fill="#facc15"
          />
        </svg>
      </div>
    );
  }

  // 4. Afriquia: Blue emblem with bold yellow 'A'
  if (brandLower.includes('afriquia')) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div
          className={`${sizeClasses} bg-blue-700 text-white font-bold rounded-lg flex items-center justify-center shrink-0 tracking-tighter shadow-2xs`}
        >
          <span className="text-amber-400 font-black text-sm">A</span>
        </div>
      </div>
    );
  }

  // 5. Total / TotalEnergies: Multi-color circular ribbon
  if (brandLower.includes('total')) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <svg viewBox="0 0 100 100" className={`${sizeClasses} shrink-0 drop-shadow-xs`}>
          <circle cx="50" cy="50" r="44" fill="#ffffff" stroke="#e2e8f0" strokeWidth="2" />
          <path d="M 25 50 A 25 25 0 0 1 75 50" stroke="#dc2626" strokeWidth="10" fill="none" strokeLinecap="round" />
          <path d="M 32 62 A 22 22 0 0 1 78 38" stroke="#f97316" strokeWidth="8" fill="none" strokeLinecap="round" />
          <path d="M 50 25 A 25 25 0 0 1 50 75" stroke="#2563eb" strokeWidth="10" fill="none" strokeLinecap="round" />
          <circle cx="50" cy="50" r="10" fill="#10b981" />
        </svg>
      </div>
    );
  }

  // 6. Petrom: Red emblem with stylized 'P'
  if (brandLower.includes('petrom')) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div
          className={`${sizeClasses} bg-rose-600 text-white font-black rounded-lg flex items-center justify-center shrink-0 tracking-tighter shadow-2xs border border-rose-700`}
        >
          <span className="text-white font-black text-sm">P</span>
        </div>
      </div>
    );
  }

  // 7. Ola Energy: Blue & Yellow emblem
  if (brandLower.includes('ola')) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div
          className={`${sizeClasses} bg-sky-700 text-amber-300 font-black rounded-lg flex items-center justify-center shrink-0 tracking-tighter shadow-2xs border border-sky-800`}
        >
          <span className="font-black text-xs">OLA</span>
        </div>
      </div>
    );
  }

  // 8. Fallback generic building or text badge
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={name || brand}
        referrerPolicy="no-referrer"
        className={`${sizeClasses} rounded-lg object-cover border border-slate-200 shrink-0`}
      />
    );
  }

  return (
    <div
      className={`${sizeClasses} bg-emerald-600 text-white font-bold rounded-lg flex items-center justify-center shrink-0 uppercase tracking-wider`}
    >
      {(brand || name || 'ST').slice(0, 2)}
    </div>
  );
};
