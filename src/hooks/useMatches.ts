import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { MATCHES_URL } from '../config';

export type MatchStatus = 'scheduled' | 'finished' | 'live' | 'postponed';
export type Team = { id: string; name: string; city: string };
export type Match = {
  id: string;
  startsAt: string | null;
  status: MatchStatus;
  minute?: number;
  home: Team;
  away: Team;
  score: { home: number; away: number } | null;
};

type MatchesResponse = { round: number; matches: Match[] };

const POLL_INTERVAL_MS = 30_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isTeam(value: unknown): value is Team {
  return isRecord(value) && typeof value.id === 'string' &&
    typeof value.name === 'string' && typeof value.city === 'string';
}

function isMatch(value: unknown): value is Match {
  if (!isRecord(value)) return false;
  const validStatus = value.status === 'scheduled' || value.status === 'finished' ||
    value.status === 'live' || value.status === 'postponed';
  const validScore = value.score === null ||
    (isRecord(value.score) && typeof value.score.home === 'number' &&
      typeof value.score.away === 'number');
  return typeof value.id === 'string' &&
    (value.startsAt === null || typeof value.startsAt === 'string') &&
    validStatus && (value.minute === undefined || typeof value.minute === 'number') &&
    isTeam(value.home) && isTeam(value.away) && validScore;
}

function isMatchesResponse(value: unknown): value is MatchesResponse {
  return isRecord(value) && typeof value.round === 'number' &&
    Array.isArray(value.matches) && value.matches.every(isMatch);
}

function sameMatch(left: Match, right: Match) {
  return left.id === right.id && left.startsAt === right.startsAt &&
    left.status === right.status && left.minute === right.minute &&
    left.home.id === right.home.id && left.home.name === right.home.name &&
    left.home.city === right.home.city && left.away.id === right.away.id &&
    left.away.name === right.away.name && left.away.city === right.away.city &&
    left.score?.home === right.score?.home && left.score?.away === right.score?.away;
}

function keepUnchangedMatches(previous: Match[], incoming: Match[]) {
  const byId = new Map(previous.map((match) => [match.id, match]));
  const next = incoming.map((match) => {
    const old = byId.get(match.id);
    return old && sameMatch(old, match) ? old : match;
  });
  return next.length === previous.length && next.every((match, index) => match === previous[index])
    ? previous : next;
}

export function useMatches() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [round, setRound] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const requestRef = useRef<() => void>(() => {});

  const refresh = useCallback(() => requestRef.current(), []);

  useEffect(() => {
    let mounted = true;
    let active = Platform.OS === 'web'
      ? typeof document !== 'undefined' && !document.hidden
      : AppState.currentState === 'active' || AppState.currentState === null;
    let inFlight = false;
    let nextAttemptAt = 0;
    let lastSuccessAt = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let controller: AbortController | null = null;

    const clearTimer = () => {
      if (timer !== null) clearTimeout(timer);
      timer = null;
    };

    const schedule = () => {
      clearTimer();
      if (!mounted || !active || inFlight) return;
      timer = setTimeout(() => {
        timer = null;
        void load();
      }, Math.max(0, nextAttemptAt - Date.now()));
    };

    const load = async () => {
      if (!mounted || !active || inFlight) return;
      clearTimer();
      inFlight = true;
      const currentController = new AbortController();
      controller = currentController;
      setLoading(true);
      setError(false);

      try {
        const response = await fetch(MATCHES_URL, { signal: currentController.signal });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data: unknown = await response.json();
        if (!isMatchesResponse(data)) throw new Error('Неверный формат данных');
        if (!mounted || currentController.signal.aborted) return;
        setMatches((previous) => keepUnchangedMatches(previous, data.matches));
        setRound(data.round);
        const updatedAt = new Date();
        lastSuccessAt = updatedAt.getTime();
        setLastUpdated(updatedAt);
      } catch {
        if (mounted && !currentController.signal.aborted) setError(true);
      } finally {
        inFlight = false;
        controller = null;
        if (mounted) {
          setLoading(false);
          // Отсчёт после завершения запроса не создаёт быстрых повторов при ошибке.
          nextAttemptAt = Date.now() + POLL_INTERVAL_MS;
          schedule();
        }
      }
    };

    const pause = () => {
      active = false;
      clearTimer();
    };

    const resume = () => {
      if (!mounted || active) return;
      active = true;
      if (inFlight) return;
      if ((lastSuccessAt === 0 || Date.now() - lastSuccessAt >= POLL_INTERVAL_MS) &&
          Date.now() >= nextAttemptAt) {
        void load();
      } else {
        schedule();
      }
    };

    requestRef.current = () => { void load(); };

    let unsubscribe = () => {};
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const onVisibilityChange = () => {
        if (document.hidden) pause();
        else resume();
      };
      document.addEventListener('visibilitychange', onVisibilityChange);
      unsubscribe = () => document.removeEventListener('visibilitychange', onVisibilityChange);
    } else if (Platform.OS !== 'web') {
      const subscription = AppState.addEventListener('change', (state) => {
        if (state === 'active') resume();
        else pause();
      });
      unsubscribe = () => subscription.remove();
    }

    if (active) void load();

    return () => {
      mounted = false;
      clearTimer();
      unsubscribe();
      controller?.abort();
      requestRef.current = () => {};
    };
  }, []);

  return { matches, round, loading, error, lastUpdated, refresh };
}
