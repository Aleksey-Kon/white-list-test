import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { NetworkInfo } from "@/hooks/useNetworkInfo";
import React from "react";
import { StyleSheet, View } from "react-native";

interface NetworkInfoProps {
  networkInfo: NetworkInfo;
}

export function NetworkInfoDisplay({ networkInfo }: NetworkInfoProps) {
  const isDark = useColorScheme() === "dark";
  return (
    <ThemedView style={[styles.container, isDark && darkStyles.container]}>
      <ThemedText type="defaultSemiBold" style={styles.title}>
        Информация о сети
      </ThemedText>

      <View style={styles.infoRow}>
        <ThemedText style={styles.label}>Тип подключения:</ThemedText>
        <ThemedText style={styles.value}>{networkInfo.type}</ThemedText>
      </View>

      <View style={styles.infoRow}>
        <ThemedText style={styles.label}>Статус:</ThemedText>
        <ThemedText
          style={[
            styles.value,
            networkInfo.isConnected ? styles.connected : styles.disconnected,
            isDark && (networkInfo.isConnected ? darkStyles.connected : darkStyles.disconnected),
          ]}
        >
          {networkInfo.isConnected ? "Подключено" : "Не подключено"}
        </ThemedText>
      </View>

      {networkInfo.carrier && (
        <View style={styles.infoRow}>
          <ThemedText style={styles.label}>Сеть:</ThemedText>
          <ThemedText style={styles.value}>{networkInfo.carrier}</ThemedText>
        </View>
      )}

      {networkInfo.isWifi && (
        <View style={[styles.warningRow, isDark && darkStyles.warningRow]}>
          <ThemedText style={[styles.warningText, isDark && darkStyles.warningText]}>
            ⚠️ Для теста отключите WiFi и используйте мобильный интернет
          </ThemedText>
        </View>
      )}

      {networkInfo.isVpn && (
        <View style={[styles.warningRow, isDark && darkStyles.warningRow]}>
          <ThemedText style={[styles.warningText, isDark && darkStyles.warningText]}>
            ⚠️ Обнаружен активный VPN. Для корректной работы отключите VPN
          </ThemedText>
        </View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 18,
    marginHorizontal: 24,
    marginBottom: 16,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5EAF2",
    shadowColor: "#102A43",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  title: {
    fontSize: 18,
    marginBottom: 14,
    textAlign: "left",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  label: {
    fontSize: 14,
  },
  value: {
    fontSize: 14,
    fontWeight: "600",
  },
  connected: {
    color: "#16805C",
  },
  disconnected: {
    color: "#C62828",
  },
  warningRow: {
    backgroundColor: "#FFF4DB",
    padding: 10,
    borderRadius: 12,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: "#F2D49A",
  },
  warningText: {
    fontSize: 12,
    color: "#8A5A00",
    textAlign: "center",
    lineHeight: 18,
  },
});

const darkStyles = StyleSheet.create({
  container: { backgroundColor: Colors.dark.surface, borderColor: Colors.dark.border },
  connected: { color: Colors.dark.success },
  disconnected: { color: Colors.dark.error },
  warningRow: { backgroundColor: Colors.dark.warningSurface, borderColor: Colors.dark.warningBorder },
  warningText: { color: Colors.dark.warning },
});
