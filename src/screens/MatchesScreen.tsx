import { memo, useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import type { ListRenderItemInfo, ViewStyle } from 'react-native';
import { FavoriteButton } from '../components/FavoriteButton';
import { UpdatedAgo } from '../components/UpdatedAgo';
import { useFavorites } from '../hooks/useFavorites';
import { useMatches } from '../hooks/useMatches';
import type { Match, MatchStatus } from '../hooks/useMatches';
import { colors } from '../theme';

type Filter = 'all' | 'scheduled' | 'finished';

const filters: { key: Filter; label: string }[] = [
  { key: 'all', label: 'Все' },
  { key: 'scheduled', label: 'Предстоящие' },
  { key: 'finished', label: 'Завершённые' },
];
const statusLabels: Record<MatchStatus, string> = {
  scheduled: 'Предстоит', finished: 'Завершён', live: 'Идёт сейчас', postponed: 'Перенесён',
};

function formatStart(startsAt: string | null) {
  if (!startsAt) return 'Дата уточняется';
  const date = new Date(startsAt);
  if (Number.isNaN(date.getTime())) return 'Дата уточняется';
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
  }).format(date);
}

const getMatchId = (match: Match) => match.id;

const winnerGradient: ViewStyle = Platform.OS === 'web'
  ? { backgroundImage: `linear-gradient(120deg, ${colors.winnerStart}, ${colors.winnerEnd})` } as ViewStyle
  : { experimental_backgroundImage: `linear-gradient(120deg, ${colors.winnerStart}, ${colors.winnerEnd})` };
const loserGradient: ViewStyle = Platform.OS === 'web'
  ? { backgroundImage: `linear-gradient(120deg, ${colors.loserStart}, ${colors.loserEnd})` } as ViewStyle
  : { experimental_backgroundImage: `linear-gradient(120deg, ${colors.loserStart}, ${colors.loserEnd})` };

const MatchCard = memo(function MatchCard({ match, active, onToggle }: {
  match: Match;
  active: boolean;
  onToggle: (id: string) => void;
}) {
  const score = match.score === null ? '—' : `${match.score.home} : ${match.score.away}`;
  const decided = match.status === 'finished' && match.score !== null &&
    match.score.home !== match.score.away;
  const homeWon = decided && match.score !== null && match.score.home > match.score.away;
  const awayWon = decided && !homeWon;
  const status = match.status === 'live' && match.minute !== undefined
    ? `${statusLabels.live} · ${match.minute}′` : statusLabels[match.status];
  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.cardMeta}>
          <Text style={[styles.status, match.status === 'live' && styles.liveStatus]}>{status}</Text>
          <Text style={styles.date}>{formatStart(match.startsAt)}</Text>
        </View>
        <FavoriteButton active={active} onPress={() => onToggle(match.id)} />
      </View>
      <View style={styles.matchRow}>
        <View style={[
          styles.teamSide,
          decided && (homeWon ? styles.winnerSide : styles.loserSide),
          decided && (homeWon ? winnerGradient : loserGradient),
        ]}>
          <Text style={styles.teamLabel}>ХОЗЯЕВА</Text>
          <Text style={styles.teamName} numberOfLines={3}>{match.home.name}</Text>
        </View>
        <View style={styles.scoreColumn}>
          <Text style={[styles.score, match.score === null && styles.noScore]}>{score}</Text>
        </View>
        <View style={[
          styles.teamSide,
          styles.awaySide,
          decided && (awayWon ? styles.winnerSide : styles.loserSide),
          decided && (awayWon ? winnerGradient : loserGradient),
        ]}>
          <Text style={styles.teamLabel}>ГОСТИ</Text>
          <Text style={[styles.teamName, styles.awayName]} numberOfLines={3}>{match.away.name}</Text>
        </View>
      </View>
    </View>
  );
});

export function MatchesScreen() {
  const { matches, round, loading, error, lastUpdated, refresh } = useMatches();
  const [filter, setFilter] = useState<Filter>('all');
  const { favorites, toggle } = useFavorites();
  const favoriteIds = useMemo(() => new Set(favorites), [favorites]);

  const visibleMatches = useMemo(
    () => filter === 'all' ? matches : matches.filter((match) => match.status === filter),
    [filter, matches],
  );
  const renderMatch = useCallback(({ item }: ListRenderItemInfo<Match>) => (
    <MatchCard match={item} active={favoriteIds.has(item.id)} onToggle={toggle} />
  ), [favoriteIds, toggle]);

  return (
    <View style={styles.screen}>
      <FlatList
        data={visibleMatches}
        extraData={favoriteIds}
        keyExtractor={getMatchId}
        contentContainerStyle={styles.content}
        renderItem={renderMatch}
        ListHeaderComponent={(
          <View>
            <Text style={styles.eyebrow}>ФУТБОЛ · {round === null ? 'МАТЧИ' : `${round} ТУР`}</Text>
            <Text style={styles.title}>Матчи тура</Text>
            <Text style={styles.subtitle}>Расписание и результаты в одном месте</Text>
            <View style={styles.toolbar}>
              <View style={styles.filterRow}>
                {filters.map(({ key, label }) => (
                  <Pressable key={key} onPress={() => setFilter(key)} accessibilityRole="button"
                    accessibilityState={{ selected: filter === key }}
                    style={[styles.filter, filter === key && styles.filterActive]}>
                    <Text style={[styles.filterText, filter === key && styles.filterTextActive]}>{label}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
            <View style={styles.listHeading}>
              <View>
                <Text style={styles.sectionTitle}>Матчи</Text>
                {lastUpdated && <UpdatedAgo since={lastUpdated} />}
              </View>
              <Pressable onPress={refresh} disabled={loading}
                accessibilityRole="button" accessibilityLabel="Обновить матчи"
                style={[styles.refreshButton, loading && styles.refreshDisabled]}>
                <View style={styles.refreshContent}>
                  {loading && <ActivityIndicator size="small" color={colors.accent} />}
                  <Text style={styles.refreshText}>{loading ? 'Обновляем…' : '↻  Обновить'}</Text>
                </View>
              </Pressable>
            </View>
            {error && lastUpdated && (
              <Text style={styles.updateError}>Не удалось обновить. Показаны последние данные.</Text>
            )}
            {error && !lastUpdated && (
              <View style={styles.errorBox}>
                <Text style={styles.errorTitle}>Не удалось загрузить матчи</Text>
                <Text style={styles.errorText}>Проверьте подключение и попробуйте снова.</Text>
                <Pressable onPress={refresh} accessibilityRole="button">
                  <Text style={styles.retryText}>Повторить</Text>
                </Pressable>
              </View>
            )}
          </View>
        )}
        ListEmptyComponent={
          loading && !lastUpdated ? (
            <View style={styles.empty}><ActivityIndicator color={colors.accent} /><Text style={styles.emptyText}>Загружаем матчи…</Text></View>
          ) : error && !lastUpdated ? null : (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>Матчей пока нет</Text>
              <Text style={styles.emptyText}>
                {filter === 'all' ? 'Вернитесь позже или обновите список.' : 'В этой категории матчей нет.'}
              </Text>
            </View>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  content: { width: '100%', maxWidth: 760, alignSelf: 'center', paddingHorizontal: 20, paddingTop: 28, paddingBottom: 48, flexGrow: 1 },
  eyebrow: { color: colors.accent, fontSize: 11, fontWeight: '800', letterSpacing: 1.5, marginBottom: 8 },
  title: { color: colors.text, fontSize: 32, fontWeight: '800', letterSpacing: -0.8 },
  subtitle: { color: colors.muted, fontSize: 14, marginTop: 6 },
  toolbar: { marginTop: 28, marginBottom: 24 },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  filter: { paddingHorizontal: 15, paddingVertical: 10, borderRadius: 20, backgroundColor: colors.chip },
  filterActive: { backgroundColor: colors.accentStrong },
  filterText: { color: colors.chipText, fontWeight: '600', fontSize: 13 },
  filterTextActive: { color: colors.text },
  listHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, gap: 12 },
  sectionTitle: { color: colors.text, fontSize: 19, fontWeight: '700', marginBottom: 3 },
  refreshButton: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  refreshDisabled: { opacity: 0.55 },
  refreshContent: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  refreshText: { color: colors.accent, fontSize: 13, fontWeight: '700' },
  updateError: { color: colors.warning, fontSize: 12, marginBottom: 12 },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 18, padding: 16, marginBottom: 12 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 },
  cardMeta: { flex: 1, paddingRight: 10 },
  status: { color: colors.chipText, fontSize: 12, fontWeight: '700', marginBottom: 4 },
  liveStatus: { color: colors.live },
  date: { color: colors.muted, fontSize: 12 },
  matchRow: { flexDirection: 'row', alignItems: 'stretch', gap: 8 },
  teamSide: {
    flex: 1, minWidth: 0, minHeight: 90, justifyContent: 'center',
    paddingHorizontal: 10, paddingVertical: 12, borderRadius: 12,
    backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.borderSoft,
  },
  awaySide: { alignItems: 'flex-end' },
  winnerSide: { borderColor: colors.winnerBorder },
  loserSide: { borderColor: colors.loserBorder },
  teamLabel: { color: colors.muted, fontSize: 9, fontWeight: '800', letterSpacing: 1, marginBottom: 6 },
  teamName: { color: colors.text, fontSize: 14, fontWeight: '700', lineHeight: 18 },
  awayName: { textAlign: 'right' },
  scoreColumn: { width: 64, alignItems: 'center', justifyContent: 'center' },
  score: { color: colors.text, fontSize: 20, fontWeight: '800', fontVariant: ['tabular-nums'], textAlign: 'center' },
  noScore: { color: colors.muted },
  errorBox: { backgroundColor: colors.errorBg, borderColor: colors.errorBorder, borderWidth: 1, borderRadius: 14, padding: 18, marginBottom: 14 },
  errorTitle: { color: colors.errorText, fontWeight: '700', fontSize: 15 },
  errorText: { color: colors.errorText, fontSize: 13, marginTop: 4, marginBottom: 10 },
  retryText: { color: colors.accent, fontWeight: '700', fontSize: 14 },
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 56, gap: 8 },
  emptyTitle: { color: colors.text, fontSize: 17, fontWeight: '700' },
  emptyText: { color: colors.muted, fontSize: 14, textAlign: 'center' },
});
