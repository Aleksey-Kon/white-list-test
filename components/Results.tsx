import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { SiteResult, TestResult } from "@/utils/sitePinger";
import React, { useState } from "react";
import { StyleSheet, TextInput, TouchableOpacity, View } from "react-native";

interface ResultsProps {
  result: TestResult | null;
  customSites: string[];
  onAddCustomSite: (site: string) => Promise<boolean>;
  onCustomSiteInputFocus: () => void;
}

type SectionKey = "whitelist" | "russian" | "neutral" | "custom";

export function Results({ result, customSites, onAddCustomSite, onCustomSiteInputFocus }: ResultsProps) {
  const [customSiteInput, setCustomSiteInput] = useState("");
  const [expandedSections, setExpandedSections] = useState<
    Record<SectionKey, boolean>
  >({
    whitelist: false,
    russian: false,
    neutral: false,
    custom: false,
  });

  const toggleSection = (section: SectionKey) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  if (!result) {
    return null;
  }

  const customSiteResults = customSites.map((url) => {
    const testedSite = result.customResults.find((site) => site.url === url);
    return testedSite ?? { url, accessible: false, pending: true };
  });

  const sections: { key: SectionKey; title: string; sites: SiteResult[] }[] = [
    {
      key: "whitelist",
      title: "📋 Белый список РФ",
      sites: result.whitelistResults,
    },
    {
      key: "russian",
      title: "🇷🇺 Другие российские сайты",
      sites: result.russianResults,
    },
    {
      key: "neutral",
      title: "🌍 Нейтральные зарубежные сайты",
      sites: result.neutralResults,
    },
    {
      key: "custom",
      title: "🔗 Пользовательские сайты",
      sites: customSiteResults,
    },
  ];

  return (
    <ThemedView style={styles.container}>
      {/* Главный результат */}
      <View style={styles.mainResult}>
        <ThemedText type="defaultSemiBold" style={styles.mainResultTitle}>
          Результат теста
        </ThemedText>
        {result.noInternet ? (
          <View style={[styles.statusBadge, styles.noInternetBadge]}>
            <ThemedText style={styles.statusText}>❌ Нет интернета</ThemedText>
          </View>
        ) : (
          <View
            style={[
              styles.statusBadge,
              result.hasWhitelist
                ? styles.whitelistDetected
                : styles.noWhitelist,
            ]}
          >
            <ThemedText style={styles.statusText}>
              {result.hasWhitelist
                ? "⚠️ Обнаружены белые списки!"
                : "✅ Белые списки не обнаружены"}
            </ThemedText>
          </View>
        )}
        <ThemedText style={styles.timestamp}>
          {result.timestamp.toLocaleString("ru-RU")}
        </ThemedText>
      </View>

      {/* Статистика */}
      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <ThemedText style={styles.statNumber}>
            {result.whitelistResults.filter((r) => r.accessible).length}/
            {result.whitelistResults.length}
          </ThemedText>
          <ThemedText style={styles.statLabel}>Белый список РФ</ThemedText>
        </View>
        <View style={styles.statBox}>
          <ThemedText style={styles.statNumber}>
            {result.russianResults.filter((r) => r.accessible).length}/
            {result.russianResults.length}
          </ThemedText>
          <ThemedText style={styles.statLabel}>Российские сайты</ThemedText>
        </View>
        <View style={styles.statBox}>
          <ThemedText style={styles.statNumber}>
            {result.neutralResults.filter((r) => r.accessible).length}/
            {result.neutralResults.length}
          </ThemedText>
          <ThemedText style={styles.statLabel}>Нейтральные сайты</ThemedText>
        </View>
      </View>

      {/* Детальные результаты - раскрывающиеся списки */}
      <View>
        {sections.map(({ key, title, sites }) => (
          <View key={key} style={styles.section}>
            <TouchableOpacity
              style={styles.sectionHeader}
              onPress={() => toggleSection(key)}
              activeOpacity={0.7}
            >
              <ThemedText
                type="defaultSemiBold"
                style={styles.sectionTitle}
              >
                {title}
              </ThemedText>
              <View style={styles.arrowContainer}>
                <View
                  style={[
                    styles.arrow,
                    expandedSections[key] && styles.arrowExpanded,
                  ]}
                />
              </View>
            </TouchableOpacity>

            {expandedSections[key] && (
              <View style={styles.sectionContent}>
                {sites.map((site, index) => (
                  <SiteResultRow key={index} site={site} />
                ))}
              </View>
            )}
          </View>
        ))}
        <View style={styles.addSiteContainer}>
          <TextInput
            value={customSiteInput}
            onChangeText={setCustomSiteInput}
            onFocus={onCustomSiteInputFocus}
            placeholder="example.com"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            style={styles.addSiteInput}
            accessibilityLabel="Адрес пользовательского сайта"
          />
          <TouchableOpacity
            style={styles.addSiteButton}
            onPress={async () => {
              if (await onAddCustomSite(customSiteInput)) setCustomSiteInput("");
            }}
            activeOpacity={0.8}
          >
            <ThemedText style={styles.addSiteButtonText}>Добавить сайт</ThemedText>
          </TouchableOpacity>
        </View>
      </View>
    </ThemedView>
  );
}

function SiteResultRow({ site }: { site: SiteResult & { pending?: boolean } }) {
  return (
    <View style={styles.siteRow}>
      <ThemedText style={styles.siteIcon}>
        {site.pending ? "⏳" : site.accessible ? "✅" : "❌"}
      </ThemedText>
      <ThemedText
        style={[styles.siteUrl, !site.accessible && !site.pending && styles.siteUrlInaccessible]}
      >
        {site.url.replace("https://", "")}
      </ThemedText>
      <ThemedText style={styles.siteTime}>
        {site.pending ? "Не проверен" : site.accessible && site.responseTime ? `${site.responseTime}ms` : "-"}
      </ThemedText>
    </View>
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
  mainResult: {
    alignItems: "center",
    marginBottom: 18,
  },
  mainResultTitle: {
    fontSize: 18,
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 18,
    paddingVertical: 13,
    borderRadius: 14,
    marginBottom: 8,
  },
  whitelistDetected: {
    backgroundColor: "#FDE8E7",
  },
  noWhitelist: {
    backgroundColor: "#E3F4EC",
  },
  noInternetBadge: {
    backgroundColor: "#E9EDF3",
  },
  statusText: {
    fontSize: 16,
    fontWeight: "700",
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
    borderRadius: 14,
    backgroundColor: "#F1F4F8",
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
  section: {
    marginBottom: 8,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#F7F9FC",
    borderWidth: 1,
    borderColor: "#E8EDF4",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
  },
  sectionTitle: {
    fontSize: 16,
    flex: 1,
    flexShrink: 1,
    marginRight: 10,
  },
  sectionArrow: {
    fontSize: 12,
    opacity: 0.6,
  },
  arrowContainer: {
    width: 24,
    height: 24,
    flexShrink: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  arrow: {
    width: 8,
    height: 8,
    borderRightWidth: 2,
    borderBottomWidth: 2,
    borderColor: "#718096",
    transform: [{ rotate: "45deg" }],
  },
  arrowExpanded: {
    transform: [{ rotate: "-135deg" }],
  },
  sectionContent: {
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  addSiteContainer: {
    marginTop: 8,
    gap: 8,
  },
  addSiteInput: {
    minHeight: 46,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#D5DDE8",
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    color: "#102A43",
    fontSize: 15,
  },
  addSiteButton: {
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    backgroundColor: "#176B87",
  },
  addSiteButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  siteRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E5EAF2",
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
