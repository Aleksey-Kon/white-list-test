import React, { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Keyboard, KeyboardAvoidingView, Linking, Platform, ScrollView, StyleSheet, Switch, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BackgroundMonitorToggle } from "@/components/BackgroundMonitorToggle";
import { NetworkInfoDisplay } from "@/components/NetworkInfo";
import { Results } from "@/components/Results";
import { TestButton } from "@/components/TestButton";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useBackgroundMonitor } from "@/hooks/useBackgroundMonitor";
import { useNetworkInfo } from "@/hooks/useNetworkInfo";
import { runFullTest, TestResult } from "@/utils/sitePinger";
import { loadCustomSites, normalizeCustomSite, saveCustomSites } from "../utils/customSitesStorage";

const SHOW_BACKGROUND_TEST = false;

export default function HomeScreen() {
  const isDark = useColorScheme() === "dark";
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
  const [customSites, setCustomSites] = useState<string[]>([]);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(() => Keyboard.isVisible());
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollOffset = useRef(0);
  const scrollOffsetBeforeKeyboard = useRef<number | null>(null);

  const keepCustomSiteInputVisible = useCallback(() => {
    if (Keyboard.isVisible() && scrollOffsetBeforeKeyboard.current !== null) {
      // The form is at the bottom; keep both the input and its button visible.
      scrollViewRef.current?.scrollToEnd({ animated: false });
    }
  }, []);

  const handleCustomSiteInputFocus = useCallback(() => {
    if (scrollOffsetBeforeKeyboard.current === null) {
      scrollOffsetBeforeKeyboard.current = scrollOffset.current;
    }
    keepCustomSiteInputVisible();
  }, [keepCustomSiteInputVisible]);

  useEffect(() => {
    // Also handle reopening the Android keyboard while the input retains focus.
    const showSubscription = Keyboard.addListener("keyboardDidShow", () => {
      setIsKeyboardVisible(true);
      handleCustomSiteInputFocus();
    });
    const hideSubscription = Keyboard.addListener("keyboardDidHide", () => {
      setIsKeyboardVisible(false);
      const previousOffset = scrollOffsetBeforeKeyboard.current;
      scrollOffsetBeforeKeyboard.current = null;
      if (previousOffset !== null) {
        scrollViewRef.current?.scrollTo({ y: previousOffset, animated: false });
      }
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [handleCustomSiteInputFocus]);

  useEffect(() => {
    void loadCustomSites().then(setCustomSites);
  }, []);

  const runTest = useCallback(async () => {
    setIsTesting(true);
    setTestResult(null);

    try {
      const result = await runFullTest(customSites);
      setTestResult(result);
    } catch (error) {
      console.error("Test error:", error);
      Alert.alert("Ошибка", "Произошла ошибка во время теста");
    } finally {
      setIsTesting(false);
    }
  }, [customSites]);

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
  }, [networkInfo.isCellular, networkInfo.isWifi, networkInfo.isVpn, runTest]);

  const handleAddCustomSite = async (value: string): Promise<boolean> => {
    const site = normalizeCustomSite(value);
    if (!site) {
      Alert.alert("Ошибка", "Введите корректный адрес сайта.");
      return false;
    }
    if (customSites.includes(site)) {
      Alert.alert("Сайт уже добавлен", "Этот сайт уже есть в пользовательском списке.");
      return false;
    }

    const nextSites = [...customSites, site];
    try {
      await saveCustomSites(nextSites);
      setCustomSites(nextSites);
      return true;
    } catch (error) {
      console.error("Custom site save error:", error);
      Alert.alert("Ошибка", "Не удалось сохранить сайт в памяти телефона.");
      return false;
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
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        // Android hide-event coordinates can leave a stale height reduction.
        // Remove the height override entirely when the keyboard is hidden.
        behavior={Platform.OS === "ios" ? "padding" : isKeyboardVisible ? "height" : undefined}
      >
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onScroll={(event) => { scrollOffset.current = event.nativeEvent.contentOffset.y; }}
          scrollEventThrottle={16}
          onLayout={keepCustomSiteInputVisible}
          onContentSizeChange={keepCustomSiteInputVisible}
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

        <ThemedView style={[styles.batteryWarning, isDark && darkStyles.batteryWarning]}>
          <ThemedText style={[styles.batteryWarningText, isDark && darkStyles.batteryWarningText]}>
            Система выбирает время запуска: от {intervalMinutes} минут, иногда дольше.
            Для проверки сайтов нужен мобильный интернет без Wi-Fi и VPN.
            В настройках батареи разрешите приложению работу в фоне.
          </ThemedText>
        </ThemedView>

        {SHOW_BACKGROUND_TEST && (
        <ThemedView style={styles.monitorStatus}>
          <ThemedText>
            {isMonitorBusy ? "Проверяем настройки…" : isRegistered
              ? "Фоновая задача зарегистрирована"
              : "Фоновая задача не зарегистрирована"}
          </ThemedText>
          {monitorError && <ThemedText style={[styles.monitorError, isDark && darkStyles.monitorError]}>{monitorError}</ThemedText>}
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
        )}

        {/* Кнопка теста */}
        <TestButton onPress={handleTest} isTesting={isTesting} />

        {/* Результаты */}
        <Results
          result={testResult}
          customSites={customSites}
          onAddCustomSite={handleAddCustomSite}
          onCustomSiteInputFocus={handleCustomSiteInputFocus}
        />

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
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 32,
  },
  header: {
    textAlign: "center",
    marginTop: 28,
    marginBottom: 6,
  },
  description: {
    textAlign: "center",
    paddingHorizontal: 24,
    marginBottom: 20,
    opacity: 0.68,
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
    gap: 10,
  },
  monitorDetails: { fontSize: 13, lineHeight: 19, opacity: 0.72 },
  monitorError: { color: "#C62828", fontSize: 14, fontWeight: "600" },
  batteryWarning: {
    marginHorizontal: 24,
    marginBottom: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: "#FFF4DB",
    borderWidth: 1,
    borderColor: "#F2D49A",
  },
  batteryWarningText: {
    color: "#8A5A00",
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
  },
});

const darkStyles = StyleSheet.create({
  batteryWarning: { backgroundColor: Colors.dark.warningSurface, borderColor: Colors.dark.warningBorder },
  batteryWarningText: { color: Colors.dark.warning },
  monitorError: { color: Colors.dark.error },
});
