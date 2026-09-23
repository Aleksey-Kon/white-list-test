import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useLocalization } from '@/hooks/useLocalization';
import { useThemeToggle } from '@/hooks/useThemeToggle';
import { Ionicons } from '@expo/vector-icons';
import { Animated, StyleSheet, TouchableOpacity } from 'react-native';

export function ThemeSwitcher() {
  const isDark = useColorScheme() === 'dark';
  const { t } = useLocalization();
  const { rotation, isSwitching, toggleTheme } = useThemeToggle();

  return (
    <TouchableOpacity
      style={[styles.button, isDark && styles.darkButton]}
      accessibilityRole="button"
      accessibilityLabel={t(isDark ? 'switchToLightTheme' : 'switchToDarkTheme')}
      accessibilityState={{ disabled: isSwitching, busy: isSwitching }}
      disabled={isSwitching}
      activeOpacity={0.8}
      onPress={() => { void toggleTheme(); }}
    >
      <Animated.View style={{ transform: [{ rotate: rotation.interpolate({
        inputRange: [0, 1], outputRange: ['0deg', '360deg'],
      }) }] }}>
        <Ionicons
          name={isDark ? 'moon' : 'sunny'}
          size={28}
          color={isDark ? "#b3c5ff" : '#e0c200'}
          accessible={false}
        />
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#CDD5DF',
    backgroundColor: '#EEF1F5',
    shadowColor: '#102A43',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  darkButton: { backgroundColor: Colors.dark.surface, borderColor: Colors.dark.border },
});
