import matches from '../data/matches.json';

// В шаблоне нет адреса исходного репозитория: OWNER/REPO не является рабочим URL.
// Используем предоставленный JSON как URL для fetch, пока адрес публикации неизвестен.
export const MATCHES_URL =
  'https://raw.githubusercontent.com/Interlabs22/test-app/main/data/matches.json';
