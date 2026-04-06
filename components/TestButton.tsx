import React from 'react';
import { StyleSheet, TouchableOpacity, ActivityIndicator, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';

interface TestButtonProps {
  onPress: () => void;
  isTesting: boolean;
}

export function TestButton({ onPress, isTesting }: TestButtonProps) {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.button, isTesting && styles.buttonDisabled]}
        onPress={onPress}
        disabled={isTesting}
        activeOpacity={0.7}
      >
        {isTesting ? (
          <ActivityIndicator size="large" color="#FFFFFF" />
        ) : (
          <>
            <ThemedText style={styles.buttonText}>
              ТЕСТ
            </ThemedText>
            <ThemedText style={styles.buttonSubtext}>
              Проверка
            </ThemedText>
          </>
        )}
      </TouchableOpacity>
      
      {isTesting && (
        <ThemedText style={styles.testingText}>
          Тестирование...
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 24,
  },
  button: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
  },
  buttonDisabled: {
    backgroundColor: '#90CAF9',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  buttonSubtext: {
    color: '#FFFFFF',
    fontSize: 14,
    marginTop: 4,
  },
  testingText: {
    marginTop: 12,
    fontSize: 16,
    fontStyle: 'italic',
  },
});
