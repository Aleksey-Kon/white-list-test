import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { NetworkInfo } from "@/hooks/useNetworkInfo";
import React from "react";
import { StyleSheet, View } from "react-native";

interface NetworkInfoProps {
  networkInfo: NetworkInfo;
}

export function NetworkInfoDisplay({ networkInfo }: NetworkInfoProps) {
  return (
    <ThemedView style={styles.container}>
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
        <View style={styles.warningRow}>
          <ThemedText style={styles.warningText}>
            ⚠️ Для теста отключите WiFi и используйте мобильный интернет
          </ThemedText>
        </View>
      )}

      {networkInfo.isVpn && (
        <View style={styles.warningRow}>
          <ThemedText style={styles.warningText}>
            ⚠️ Обнаружен активный VPN. Для корректной работы отключите VPN
          </ThemedText>
        </View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    marginBottom: 16,
    borderRadius: 12,
  },
  title: {
    fontSize: 18,
    marginBottom: 12,
    textAlign: "center",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
  },
  value: {
    fontSize: 14,
    fontWeight: "600",
  },
  connected: {
    color: "#4CAF50",
  },
  disconnected: {
    color: "#F44336",
  },
  warningRow: {
    backgroundColor: "rgba(255, 152, 0, 0.1)",
    padding: 8,
    borderRadius: 8,
    marginVertical: 8,
  },
  warningText: {
    fontSize: 12,
    color: "#FF9800",
    textAlign: "center",
  },
});
