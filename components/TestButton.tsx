import { useLocalization } from '@/hooks/useLocalization';
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import React from 'react';
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from 'react-native';

interface TestButtonProps {
  onPress: () => void;
  isTesting: boolean;
}

export function TestButton({ onPress, isTesting }: TestButtonProps) {
  const { t } = useLocalization();
  const isDark = useColorScheme() === 'dark';
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.button, isTesting && styles.buttonDisabled,
          isDark && (isTesting ? darkStyles.buttonDisabled : darkStyles.button)]}
        onPress={onPress}
        disabled={isTesting}
        activeOpacity={0.7}
      >
        {isTesting ? (
          <ActivityIndicator size="large" color="#FFFFFF" />
        ) : (
          <>
            <ThemedText style={styles.buttonText}>
              {t('test')}
            </ThemedText>
            <ThemedText style={styles.buttonSubtext}>
              {t('check')}
            </ThemedText>
          </>
        )}
      </TouchableOpacity>
      
      {isTesting && (
        <ThemedText style={styles.testingText}>
          {t('testing')}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 28,
  },
  button: {
    width: 156,
    height: 156,
    borderRadius: 78,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.24,
    shadowRadius: 8,
  },
  buttonDisabled: {
    backgroundColor: '#90CAF9',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 23,
    fontWeight: '800',
  },
  buttonSubtext: {
    color: '#FFFFFF',
    fontSize: 13,
    marginTop: 5,
    opacity: 0.9,
  },
  testingText: {
    marginTop: 12,
    fontSize: 16,
    fontStyle: 'italic',
  },
});

const darkStyles = StyleSheet.create({
  button: { backgroundColor: Colors.dark.button },
  buttonDisabled: { backgroundColor: Colors.dark.buttonDisabled },
});
