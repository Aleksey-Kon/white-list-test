import { ThemedText } from '@/components/themed-text';
import { useLocalization } from '@/hooks/useLocalization';
import { setLanguage } from '@/utils/localization';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

export function LanguageSwitcher() {
  const { language } = useLocalization();
  return (
    <View style={styles.container}>
      {(['ru', 'en'] as const).map((option) => (
        <TouchableOpacity
          key={option}
          accessibilityRole="button"
          accessibilityLabel={option === 'ru' ? 'Русский' : 'English'}
          accessibilityState={{ selected: language === option }}
          onPress={() => { void setLanguage(option).catch((error) => console.warn('Could not save language preference:', error)); }}
          style={[styles.button, language === option && styles.selected]}
        >
          <ThemedText style={[styles.label, language === option && styles.selectedLabel]}>
            {option.toUpperCase()}
          </ThemedText>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignSelf: 'flex-end', marginRight: 24, marginTop: 8, gap: 4 },
  button: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  selected: { backgroundColor: '#4CAF50' },
  label: { fontSize: 14, fontWeight: '600' },
  selectedLabel: { color: '#FFFFFF' },
});
