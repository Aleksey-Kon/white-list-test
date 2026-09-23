import { useLocalization } from "@/hooks/useLocalization";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { NetworkInfo } from "@/hooks/useNetworkInfo";
import React from "react";
import { StyleSheet, View } from "react-native";

const networkTypeKey = (type: string) => {
  switch (type.toUpperCase()) {
    case "NONE": return "none";
    case "BLUETOOTH": return "bluetooth";
    case "ETHERNET": return "ethernet";
    case "WIMAX": return "wimax";
    case "VPN": return "vpn";
    case "OTHER": return "other";
    case "ERROR": return "error";
    default: return "unknown";
  }
};

interface NetworkInfoProps {
  networkInfo: NetworkInfo;
}

export function NetworkInfoDisplay({ networkInfo }: NetworkInfoProps) {
  const { t } = useLocalization();
  const isDark = useColorScheme() === "dark";
  return (
    <ThemedView style={[styles.container, isDark && darkStyles.container]}>
      <ThemedText type="defaultSemiBold" style={styles.title}>
        {t("networkInfo")}
      </ThemedText>

      <View style={styles.infoRow}>
        <ThemedText style={styles.label}>{t("connectionType")}</ThemedText>
        <ThemedText style={styles.value}>{networkInfo.isWifi ? t("wifi") : networkInfo.isCellular ? t("cellular") : t(networkTypeKey(networkInfo.type))}</ThemedText>
      </View>

      <View style={styles.infoRow}>
        <ThemedText style={styles.label}>{t("status")}</ThemedText>
        <ThemedText
          style={[
            styles.value,
            networkInfo.isConnected ? styles.connected : styles.disconnected,
            isDark && (networkInfo.isConnected ? darkStyles.connected : darkStyles.disconnected),
          ]}
        >
          {networkInfo.isConnected ? t("connected") : t("disconnected")}
        </ThemedText>
      </View>

      {networkInfo.carrier && (
        <View style={styles.infoRow}>
          <ThemedText style={styles.label}>{t("carrier")}</ThemedText>
          <ThemedText style={styles.value}>{networkInfo.carrier}</ThemedText>
        </View>
      )}

      {networkInfo.isWifi && (
        <View style={[styles.warningRow, isDark && darkStyles.warningRow]}>
          <ThemedText style={[styles.warningText, isDark && darkStyles.warningText]}>
            {t("wifiHint")}
          </ThemedText>
        </View>
      )}

      {networkInfo.isVpn && (
        <View style={[styles.warningRow, isDark && darkStyles.warningRow]}>
          <ThemedText style={[styles.warningText, isDark && darkStyles.warningText]}>
            {t("vpnHint")}
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
