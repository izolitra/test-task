import { Image, StyleSheet } from 'react-native';
import { colors } from '../theme';

type Props = { active: boolean };

// Растровые копии SVG для стандартного Image в Expo Go.
export function FavoriteStar({ active }: Props) {
  return (
    <Image
      source={active
        ? require('../../assets/favorite-star-filled.png')
        : require('../../assets/favorite-star-outline.png')}
      style={[styles.icon, active ? styles.active : styles.inactive]}
    />
  );
}

const styles = StyleSheet.create({
  icon: { width: 21, height: 21 },
  active: { tintColor: colors.starActive },
  inactive: { tintColor: colors.starInactive },
});
