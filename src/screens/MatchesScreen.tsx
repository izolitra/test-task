import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, FlatList, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
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
  ? { backgroundImage: `linear-gradient(0deg, ${colors.winnerGlow} 0%, transparent 82%)` } as ViewStyle
  : { experimental_backgroundImage: `linear-gradient(0deg, ${colors.winnerGlow} 0%, transparent 82%)` };
const loserGradient: ViewStyle = Platform.OS === 'web'
  ? { backgroundImage: `linear-gradient(0deg, ${colors.loserGlow} 0%, transparent 82%)` } as ViewStyle
  : { experimental_backgroundImage: `linear-gradient(0deg, ${colors.loserGlow} 0%, transparent 82%)` };
const drawGradient: ViewStyle = Platform.OS === 'web'
  ? { backgroundImage: `linear-gradient(0deg, ${colors.drawGlow} 0%, transparent 82%)` } as ViewStyle
  : { experimental_backgroundImage: `linear-gradient(0deg, ${colors.drawGlow} 0%, transparent 82%)` };
const liveGradient: ViewStyle = Platform.OS === 'web'
  ? { backgroundImage: `linear-gradient(0deg, ${colors.liveGlow} 0%, transparent 82%)` } as ViewStyle
  : { experimental_backgroundImage: `linear-gradient(0deg, ${colors.liveGlow} 0%, transparent 82%)` };

const LiveDot = memo(function LiveDot() {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(opacity, {
        toValue: 0.35, duration: 850, useNativeDriver: Platform.OS !== 'web', isInteraction: false,
      }),
      Animated.timing(opacity, {
        toValue: 1, duration: 850, useNativeDriver: Platform.OS !== 'web', isInteraction: false,
      }),
    ]));
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return <Animated.View style={[styles.liveDot, { opacity }]} />;
});

const MatchCard = memo(function MatchCard({ match, active, onToggle }: {
  match: Match;
  active: boolean;
  onToggle: (id: string) => void;
}) {
  const score = match.score === null ? '—' : `${match.score.home}:${match.score.away}`;
  const decided = match.status === 'finished' && match.score !== null &&
    match.score.home !== match.score.away;
  const draw = match.status === 'finished' && match.score !== null &&
    match.score.home === match.score.away;
  const homeWon = decided && match.score !== null && match.score.home > match.score.away;
  const awayWon = decided && !homeWon;
  const homeGradient = match.status === 'live' ? liveGradient
    : draw ? drawGradient : decided ? (homeWon ? winnerGradient : loserGradient) : null;
  const awayGradient = match.status === 'live' ? liveGradient
    : draw ? drawGradient : decided ? (awayWon ? winnerGradient : loserGradient) : null;
  const status = match.status === 'live' && match.minute !== undefined
    ? `${statusLabels.live} · ${match.minute}′` : statusLabels[match.status];
  return (
    <View style={styles.card}>
      <View style={styles.cardContent}>
        <View style={styles.cardTop}>
          <View style={styles.cardMeta}>
            <Text style={styles.date}>{formatStart(match.startsAt)}</Text>
            <View style={styles.statusRow}>
              {match.status === 'live' && <LiveDot />}
              <Text style={[
                styles.status,
                match.status === 'live' && styles.liveStatus,
                match.status === 'postponed' && styles.postponedStatus,
              ]}>{status}</Text>
            </View>
          </View>
          <FavoriteButton active={active} onPress={() => onToggle(match.id)} />
        </View>
        <View style={styles.matchRow}>
          <View style={[styles.teamSide, homeGradient]}>
            <Text style={styles.teamName} numberOfLines={4}>{match.home.name}</Text>
            <Text style={styles.teamLabel}>ХОЗЯЕВА</Text>
          </View>
          <View style={styles.scoreColumn}>
            <Text style={[styles.score, match.score === null && styles.noScore]} numberOfLines={1}>{score}</Text>
          </View>
          <View style={[styles.teamSide, styles.awaySide, awayGradient]}>
            <Text style={[styles.teamName, styles.awayName]} numberOfLines={4}>{match.away.name}</Text>
            <Text style={[styles.teamLabel, styles.awayName]}>ГОСТИ</Text>
          </View>
        </View>
        <View style={styles.cardFooter}>
          <Text style={styles.homeCity} numberOfLines={1}>{match.home.city}</Text>
          <Text style={styles.awayCity} numberOfLines={1}>{match.away.city}</Text>
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
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 8, marginBottom: 12, overflow: 'hidden' },
  cardContent: { paddingTop: 8 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 16, marginBottom: 10 },
  cardMeta: { flex: 1, minWidth: 0, paddingRight: 8, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', columnGap: 12, rowGap: 2 },
  statusRow: { flexDirection: 'row', alignItems: 'center' },
  liveDot: { width: 7, height: 7, borderRadius: 4, marginRight: 6, backgroundColor: colors.live },
  status: { color: colors.chipText, fontSize: 12, fontWeight: '400' },
  liveStatus: { color: colors.live },
  postponedStatus: { color: colors.warning, opacity: 0.8 },
  date: { color: colors.muted, fontSize: 12, fontWeight: '400' },
  matchRow: { flexDirection: 'row', alignItems: 'stretch' },
  teamSide: { flex: 1, minWidth: 0, minHeight: 76, justifyContent: 'center', paddingLeft: 16, paddingVertical: 7 },
  awaySide: { alignItems: 'flex-end', paddingLeft: 0, paddingRight: 16 },
  teamName: { color: colors.teamText, fontSize: 18, fontWeight: '700', lineHeight: 22 },
  awayName: { textAlign: 'right' },
  teamLabel: { color: colors.muted, fontSize: 10, fontWeight: '400', marginTop: 6 },
  scoreColumn: {
    width: 76, alignItems: 'center', justifyContent: 'center',
    borderLeftWidth: 1, borderRightWidth: 1, borderColor: colors.borderSoft,
  },
  score: { color: colors.text, fontSize: 27, fontWeight: '800', fontVariant: ['tabular-nums'], textAlign: 'center', letterSpacing: 1 },
  noScore: { color: colors.muted },
  cardFooter: {
    flexDirection: 'row', alignItems: 'center', borderTopWidth: 1,
    borderTopColor: colors.borderSoft, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 13,
  },
  homeCity: { flex: 1, minWidth: 0, color: colors.muted, fontSize: 11 },
  awayCity: { flex: 1, minWidth: 0, color: colors.muted, fontSize: 11, textAlign: 'right' },
  errorBox: { backgroundColor: colors.errorBg, borderColor: colors.errorBorder, borderWidth: 1, borderRadius: 14, padding: 18, marginBottom: 14 },
  errorTitle: { color: colors.errorText, fontWeight: '700', fontSize: 15 },
  errorText: { color: colors.errorText, fontSize: 13, marginTop: 4, marginBottom: 10 },
  retryText: { color: colors.accent, fontWeight: '700', fontSize: 14 },
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 56, gap: 8 },
  emptyTitle: { color: colors.text, fontSize: 17, fontWeight: '700' },
  emptyText: { color: colors.muted, fontSize: 14, textAlign: 'center' },
});
