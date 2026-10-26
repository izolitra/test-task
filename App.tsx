import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { MatchesScreen } from './src/screens/MatchesScreen';
import { colors } from './src/theme';

export default function App() {
  return (
    <View style={styles.root}>
      <MatchesScreen />
      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingTop: 48,
    backgroundColor: colors.page,
  },
});
