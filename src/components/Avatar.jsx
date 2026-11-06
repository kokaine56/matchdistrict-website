import React, { useState, useEffect } from 'react';

const PALETTES = [
  { bg: 'bg-indigo-600', text: 'text-white', border: 'border-indigo-500/50' },
  { bg: 'bg-cyan-700', text: 'text-white', border: 'border-cyan-500/50' },
  { bg: 'bg-violet-700', text: 'text-white', border: 'border-violet-500/50' },
  { bg: 'bg-emerald-700', text: 'text-white', border: 'border-emerald-500/50' },
  { bg: 'bg-amber-700', text: 'text-white', border: 'border-amber-500/50' },
  { bg: 'bg-rose-700', text: 'text-white', border: 'border-rose-500/50' },
  { bg: 'bg-sky-700', text: 'text-white', border: 'border-sky-500/50' },
  { bg: 'bg-fuchsia-700', text: 'text-white', border: 'border-fuchsia-500/50' },
];

function getPalette(seed) {
  if (!seed && seed !== 0) return PALETTES[0];
  const str = String(seed);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return PALETTES[Math.abs(hash) % PALETTES.length];
}

function getInitial(name, email) {
  const candidate = (name || '').trim() || (email || '').split('@')[0] || '?';
  const char = candidate.charAt(0) || '?';
  return char.toUpperCase();
}

const SIZE_MAP = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm font-semibold',
  lg: 'w-12 h-12 text-base font-semibold',
  xl: 'w-16 h-16 text-xl font-bold',
  '2xl': 'w-20 h-20 text-2xl font-bold',
  '3xl': 'w-24 h-24 text-3xl font-extrabold',
};

/**
 * Universal Avatar component.
 * Displays user's resolved avatar image (Google/Discord provider),
 * or falls back to a deterministic colored circle with their uppercase initial.
 */
export default function Avatar({
  user,
  src,
  name,
  email,
  districtId,
  size = 'md',
  className = '',
  alt,
  onClick,
}) {
  const resolvedAvatarUrl = src || user?.avatar || user?.avatarUrl || user?.avatar_url || user?.profile_image || user?.picture || user?.user_metadata?.avatar_url || user?.user_metadata?.picture || user?.raw_user_meta_data?.avatar_url || user?.raw_user_meta_data?.picture;
  const avatarUrl = typeof resolvedAvatarUrl === 'string' && !resolvedAvatarUrl.includes('photo-1566492031773-4f4e44671857') ? resolvedAvatarUrl : '';
  const displayName = name || user?.name || user?.display_name || user?.full_name || user?.displayName || '';
  const userEmail = email || user?.email || '';
  const seed = districtId ?? user?.district_id ?? user?.districtId ?? user?.id ?? displayName;

  const [hasError, setHasError] = useState(false);

  // Reset error state if avatar URL changes
  useEffect(() => {
    setHasError(false);
  }, [avatarUrl]);

  const palette = getPalette(seed);
  const initial = getInitial(displayName, userEmail);
  const sizeClasses = SIZE_MAP[size] || size || 'w-10 h-10 text-sm font-semibold';

  const showImage = Boolean(avatarUrl) && !hasError;

  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={`relative inline-flex items-center justify-center shrink-0 rounded-full select-none overflow-hidden border ${palette.border} ${palette.bg} ${sizeClasses} ${className}`}
      title={displayName || userEmail || 'User'}
    >
      {showImage ? (
        <img
          src={avatarUrl}
          alt={alt || displayName || 'Avatar'}
          onError={() => setHasError(true)}
          className="w-full h-full object-cover object-center"
          loading="lazy"
        />
      ) : (
        <span className={`font-headline-md font-bold tracking-tight uppercase ${palette.text}`}>
          {initial}
        </span>
      )}
    </div>
  );
}
