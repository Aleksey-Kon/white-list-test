import React, { useCallback, useState } from "react";
import { Alert, ScrollView, StyleSheet, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BackgroundMonitorToggle } from "@/components/BackgroundMonitorToggle";
import { NetworkInfoDisplay } from "@/components/NetworkInfo";
import { Results } from "@/components/Results";
import { TestButton } from "@/components/TestButton";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useBackgroundMonitor } from "@/hooks/useBackgroundMonitor";
import { useNetworkInfo } from "@/hooks/useNetworkInfo";
import { runFullTest, TestResult } from "@/utils/sitePinger";

export default function HomeScreen() {
  const networkInfo = useNetworkInfo();
  const {
    isEnabled: isMonitorEnabled,
    toggleMonitor,
    testBackgroundTask,
  } = useBackgroundMonitor();
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [isTestingBackground, setIsTestingBackground] = useState(false);
  const insets = useSafeAreaInsets();

  const handleTest = useCallback(async () => {
    const hasVpn = networkInfo.isVpn;
    const hasWifi = networkInfo.isWifi;
    const notCellular = !networkInfo.isCellular;

    // Сценарий: WiFi + VPN
    if (hasWifi && hasVpn) {
      Alert.alert(
        "Внимание",
        "Обнаружены WiFi и VPN одновременно. Для корректного теста: Отключите WiFi, Отключите VPN. Продолжить?",
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

    // Предупреждение если VPN
    if (hasVpn) {
      Alert.alert(
        "Внимание",
        "Обнаружен активный VPN. Для корректного теста отключите VPN. Продолжить?",
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

    // Предупреждение если не мобильный интернет
    if (notCellular) {
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
  }, [networkInfo.isCellular, networkInfo.isWifi, networkInfo.isVpn]);

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

  const handleTestBackground = useCallback(async () => {
    setIsTestingBackground(true);
    try {
      const result = await testBackgroundTask();
      if (result.error) {
        Alert.alert("Ошибка", `Ошибка при тестировании: ${result.error}`);
      } else if (result.skipped) {
        Alert.alert("Пропущено", `Тест пропущен: ${result.reason}`);
      } else {
        const message = `Результат: ${result.hasWhitelist ? "Обнаружен белый список" : "Белый список не обнаружен"}\nДоступно сайтов: ${result.accessibleCount}/${result.totalSites}\nУведомление отправлено`;
        Alert.alert("Результат теста фоновой проверки", message);
      }
    } catch (error) {
      console.error("Background test error:", error);
      Alert.alert(
        "Ошибка",
        "Произошла ошибка при тестировании фоновой проверки",
      );
    } finally {
      setIsTestingBackground(false);
    }
  }, [testBackgroundTask]);

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

        {/* Фоновый мониторинг */}
        <BackgroundMonitorToggle
          isEnabled={isMonitorEnabled}
          onToggle={toggleMonitor}
        />

        {/* Тест фоновой проверки */}
        <ThemedView style={styles.testBackgroundContainer}>
          <TouchableOpacity
            style={[
              styles.testBackgroundButton,
              isTestingBackground && styles.testBackgroundButtonDisabled,
            ]}
            onPress={handleTestBackground}
            disabled={isTestingBackground}
            activeOpacity={0.7}
          >
            <ThemedText
              style={[
                styles.testBackgroundText,
                isTestingBackground && styles.testBackgroundTextDisabled,
              ]}
            >
              {isTestingBackground
                ? "Тестирование..."
                : "Тест фоновой проверки"}
            </ThemedText>
          </TouchableOpacity>
        </ThemedView>

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
  testBackgroundContainer: {
    marginHorizontal: 24,
    marginBottom: 16,
  },
  testBackgroundButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: "center",
  },
  testBackgroundButtonDisabled: {
    backgroundColor: "#CCCCCC",
  },
  testBackgroundText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  testBackgroundTextDisabled: {
    color: "#999999",
  },
});
