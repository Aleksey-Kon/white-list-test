import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useLocalization } from '@/hooks/useLocalization';
import { setLanguage } from '@/utils/localization';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

export function LanguageSwitcher() {
  const { language } = useLocalization();
  const isDark = useColorScheme() === 'dark';
  return (
    <View style={[styles.container, isDark && darkStyles.container]}>
      {(['ru', 'en'] as const).map((option) => (
        <TouchableOpacity
          key={option}
          accessibilityRole="button"
          accessibilityLabel={option === 'ru' ? 'Русский' : 'English'}
          accessibilityState={{ selected: language === option }}
          activeOpacity={0.8}
          onPress={() => { void setLanguage(option).catch((error) => console.warn('Could not save language preference:', error)); }}
          style={[styles.button, language === option && styles.selected,
            language === option && isDark && darkStyles.selected]}
        >
          <ThemedText style={[styles.label, isDark && darkStyles.label,
            language === option && styles.selectedLabel]}>
            {option.toUpperCase()}
          </ThemedText>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignSelf: 'flex-end',
    marginRight: 24,
    marginTop: 8,
    gap: 2,
    padding: 3,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#CDD5DF',
    backgroundColor: '#EEF1F5',
    shadowColor: '#102A43',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  button: {
    minWidth: 56,
    minHeight: 44,
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
  },
  selected: { backgroundColor: '#4CAF50' },
  label: { fontSize: 14, lineHeight: 20, fontWeight: '600', color: '#526174' },
  selectedLabel: { color: '#FFFFFF' },
});

const darkStyles = StyleSheet.create({
  container: { backgroundColor: Colors.dark.surface, borderColor: Colors.dark.border },
  selected: { backgroundColor: Colors.dark.controlActive },
  label: { color: Colors.dark.icon },
});
