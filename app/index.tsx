import React, { useCallback, useState } from "react";
import { Alert, Linking, Platform, ScrollView, StyleSheet, Switch, TouchableOpacity } from "react-native";
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

const SHOW_BACKGROUND_TEST = true;

export default function HomeScreen() {
  const networkInfo = useNetworkInfo();
  const {
    isEnabled: isMonitorEnabled,
    isTestEnabled: isBackgroundTestEnabled,
    intervalMinutes,
    setIntervalMinutes,
    toggleMonitor,
    toggleBackgroundTest,
    isBusy: isMonitorBusy,
    isRegistered,
    lastRun,
    error: monitorError,
  } = useBackgroundMonitor();
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
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
          intervalMinutes={intervalMinutes}
          onIntervalChange={setIntervalMinutes}
          onToggle={toggleMonitor}
          disabled={isMonitorBusy}
          isTestEnabled={isBackgroundTestEnabled}
        />

        <ThemedView style={styles.batteryWarning}>
          <ThemedText style={styles.batteryWarningText}>
            Система выбирает время запуска: от {intervalMinutes} минут, иногда дольше.
            Для проверки сайтов нужен мобильный интернет без Wi-Fi и VPN.
            В настройках батареи разрешите приложению работу в фоне.
          </ThemedText>
        </ThemedView>

        <ThemedView style={styles.monitorStatus}>
          <ThemedText>
            {isMonitorBusy ? "Проверяем настройки…" : isRegistered
              ? "Фоновая задача зарегистрирована"
              : "Фоновая задача не зарегистрирована"}
          </ThemedText>
          {monitorError && <ThemedText style={styles.monitorError}>{monitorError}</ThemedText>}
          <ThemedText style={styles.monitorDetails}>
            {lastRun
              ? `Последний фоновый запуск: ${new Date(lastRun.startedAt).toLocaleString()}. ${lastRun.message}`
              : "Фоновых запусков пока нет. Сверните приложение и дождитесь запуска системой."}
          </ThemedText>
          {lastRun?.status === "running" && (
            <ThemedText style={styles.monitorDetails}>Завершение ещё не записано: проверка выполняется или была прервана системой.</ThemedText>
          )}
          {lastRun?.notification === "scheduled" && (
            <ThemedText style={styles.monitorDetails}>Уведомление передано системе для показа.</ThemedText>
          )}
          {Platform.OS !== "web" && (
            <TouchableOpacity accessibilityRole="button" onPress={() => {
              void Linking.openSettings().catch(() => Alert.alert("Настройки", "Откройте настройки приложения вручную."));
            }}>
              <ThemedText type="link">Открыть настройки приложения</ThemedText>
            </TouchableOpacity>
          )}
        </ThemedView>

        {/* Кнопка теста */}
        <TestButton onPress={handleTest} isTesting={isTesting} />

        {/* Результаты */}
        <Results result={testResult} />

        {SHOW_BACKGROUND_TEST && (
          <ThemedView style={styles.monitorStatus}>
            <ThemedView style={styles.backgroundTestRow}>
              <ThemedText style={styles.backgroundTestText}>
                Тест фонового мониторинга
              </ThemedText>
              <Switch
                value={isBackgroundTestEnabled}
                disabled={isMonitorBusy}
                onValueChange={toggleBackgroundTest}
                accessibilityLabel="Тест фонового мониторинга"
              />
            </ThemedView>
            <ThemedText style={styles.monitorDetails}>
              Включите и сверните приложение: примерно через 15 секунд придёт тест доставки.
              Затем каждый фактический фоновый запуск сообщит результат или причину пропуска,
              даже если состояние сети не изменилось. Выключение отменяет ожидающий тест доставки.
            </ThemedText>
          </ThemedView>
        )}
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
  backgroundTestRow: {
    marginTop: 8,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backgroundTestText: {
    flex: 1,
    marginRight: 12,
  },
  monitorStatus: {
    marginHorizontal: 24,
    marginBottom: 16,
    gap: 8,
  },
  monitorDetails: { fontSize: 13, opacity: 0.75 },
  monitorError: { color: "#D84315", fontSize: 14 },
  batteryWarning: {
    marginHorizontal: 24,
    marginBottom: 12,
    padding: 10,
    borderRadius: 8,
    backgroundColor: "rgba(255, 152, 0, 0.12)",
  },
  batteryWarningText: {
    color: "#FF9800",
    fontSize: 13,
    textAlign: "center",
  },
});
