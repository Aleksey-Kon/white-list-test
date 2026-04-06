import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { SiteResult, TestResult } from "@/utils/sitePinger";
import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";

interface ResultsProps {
  result: TestResult | null;
}

export function Results({ result }: ResultsProps) {
  if (!result) {
    return null;
  }

  return (
    <ThemedView style={styles.container}>
      {/* Главный результат */}
      <View style={styles.mainResult}>
        <ThemedText type="defaultSemiBold" style={styles.mainResultTitle}>
          Результат теста
        </ThemedText>
        <View
          style={[
            styles.statusBadge,
            result.hasWhitelist ? styles.whitelistDetected : styles.noWhitelist,
          ]}
        >
          <ThemedText style={styles.statusText}>
            {result.hasWhitelist
              ? "⚠️ Обнаружены белые списки!"
              : "✅ Белые списки не обнаружены"}
          </ThemedText>
        </View>
        <ThemedText style={styles.timestamp}>
          {result.timestamp.toLocaleString("ru-RU")}
        </ThemedText>
      </View>

      {/* Статистика */}
      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <ThemedText style={styles.statNumber}>
            {result.whitelistResults.filter((r) => r.accessible).length}/10
          </ThemedText>
          <ThemedText style={styles.statLabel}>Белый список РФ</ThemedText>
        </View>
        <View style={styles.statBox}>
          <ThemedText style={styles.statNumber}>
            {result.russianResults.filter((r) => r.accessible).length}/10
          </ThemedText>
          <ThemedText style={styles.statLabel}>Российские сайты</ThemedText>
        </View>
        <View style={styles.statBox}>
          <ThemedText style={styles.statNumber}>
            {result.neutralResults.filter((r) => r.accessible).length}/10
          </ThemedText>
          <ThemedText style={styles.statLabel}>Нейтральные сайты</ThemedText>
        </View>
      </View>

      {/* Детальные результаты */}
      <ScrollView style={styles.detailsContainer}>
        {/* Белый список РФ */}
        <View style={styles.section}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            📋 Белый список РФ
          </ThemedText>
          {result.whitelistResults.map((site, index) => (
            <SiteResultRow key={index} site={site} />
          ))}
        </View>

        {/* Российские сайты */}
        <View style={styles.section}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            🇷🇺 Российские сайты
          </ThemedText>
          {result.russianResults.map((site, index) => (
            <SiteResultRow key={index} site={site} />
          ))}
        </View>

        {/* Нейтральные сайты */}
        <View style={styles.section}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            🌍 Нейтральные зарубежные сайты
          </ThemedText>
          {result.neutralResults.map((site, index) => (
            <SiteResultRow key={index} site={site} />
          ))}
        </View>
      </ScrollView>
    </ThemedView>
  );
}

function SiteResultRow({ site }: { site: SiteResult }) {
  return (
    <View style={styles.siteRow}>
      <ThemedText style={styles.siteIcon}>
        {site.accessible ? "✅" : "❌"}
      </ThemedText>
      <ThemedText
        style={[styles.siteUrl, !site.accessible && styles.siteUrlInaccessible]}
      >
        {site.url.replace("https://", "")}
      </ThemedText>
      <ThemedText style={styles.siteTime}>
        {site.accessible && site.responseTime ? `${site.responseTime}ms` : "-"}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  mainResult: {
    alignItems: "center",
    marginBottom: 16,
  },
  mainResultTitle: {
    fontSize: 18,
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  whitelistDetected: {
    backgroundColor: "rgba(244, 67, 54, 0.2)",
  },
  noWhitelist: {
    backgroundColor: "rgba(76, 175, 80, 0.2)",
  },
  statusText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  timestamp: {
    fontSize: 12,
    opacity: 0.6,
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 16,
    gap: 8,
  },
  statBox: {
    flex: 1,
    alignItems: "center",
    padding: 12,
    borderRadius: 8,
    backgroundColor: "rgba(128, 128, 128, 0.1)",
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    textAlign: "center",
  },
  detailsContainer: {
    flex: 1,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    marginBottom: 8,
  },
  siteRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(128, 128, 128, 0.2)",
  },
  siteIcon: {
    fontSize: 16,
    width: 24,
  },
  siteUrl: {
    flex: 1,
    fontSize: 14,
    marginLeft: 8,
  },
  siteUrlInaccessible: {
    opacity: 0.5,
    textDecorationLine: "line-through",
  },
  siteTime: {
    fontSize: 12,
    opacity: 0.6,
    width: 60,
    textAlign: "right",
  },
});
