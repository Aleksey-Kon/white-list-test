import React, { useCallback, useState } from "react";
import { Alert, ScrollView, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { NetworkInfoDisplay } from "@/components/NetworkInfo";
import { Results } from "@/components/Results";
import { TestButton } from "@/components/TestButton";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useNetworkInfo } from "@/hooks/useNetworkInfo";
import { runFullTest, TestResult } from "@/utils/sitePinger";

export default function HomeScreen() {
  const networkInfo = useNetworkInfo();
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const insets = useSafeAreaInsets();

  const handleTest = useCallback(async () => {
    // Предупреждение если не мобильный интернет
    if (!networkInfo.isCellular) {
      Alert.alert(
        "Внимание",
        "Для корректного теста подключитесь к мобильному интернету и отключите WiFi. Продолжить?",
        [
          { text: "Отмена", style: "cancel" },
          {
            text: "Продолжить",
            onPress: () => runTest(),
          },
        ],
      );
      return;
    }

    await runTest();
  }, [networkInfo.isCellular]);

  const runTest = async () => {
    setIsTesting(true);
    setTestResult(null);

    try {
      const result = await runFullTest();
      setTestResult(result);
    } catch (error) {
      console.error("Test error:", error);
      Alert.alert("Ошибка", "Произошла ошибка во время теста");
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <ThemedView
      style={[
        styles.container,
        {
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
          paddingLeft: insets.left,
          paddingRight: insets.right,
        },
      ]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Заголовок */}
        <ThemedText type="title" style={styles.header}>
          Тест белых списков
        </ThemedText>

        <ThemedText style={styles.description}>
          Проверка наличия белых списков на мобильном интернете
        </ThemedText>

        {/* Информация о сети */}
        <NetworkInfoDisplay networkInfo={networkInfo} />

        {/* Кнопка теста */}
        <TestButton onPress={handleTest} isTesting={isTesting} />

        {/* Результаты */}
        <Results result={testResult} />
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 24,
  },
  header: {
    textAlign: "center",
    marginTop: 24,
    marginBottom: 8,
  },
  description: {
    textAlign: "center",
    paddingHorizontal: 24,
    marginBottom: 16,
    opacity: 0.7,
  },
});
