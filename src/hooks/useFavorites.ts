import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';

const STORAGE_KEY = 'favoriteMatchIds';

function readFavorites(): string[] {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return [];

  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) return [];
    const parsed: unknown = JSON.parse(saved);
    if (!Array.isArray(parsed)) return [];
    return [...new Set(parsed.filter((id): id is string => typeof id === 'string' && id.length > 0))];
  } catch {
    return [];
  }
}

// На вебе избранное сохраняется между загрузками страницы; на мобильных платформах — в памяти.
export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>(readFavorites);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
    } catch {
      // Хранилище может быть недоступно: избранное продолжит работать в памяти.
    }
  }, [favorites]);

  const isFavorite = (id: string) => favorites.includes(id);

  const toggle = useCallback((id: string) => {
    setFavorites((current) =>
      current.includes(id)
        ? current.filter((favoriteId) => favoriteId !== id)
        : [...current, id],
    );
  }, []);

  return { favorites, isFavorite, toggle };
}
