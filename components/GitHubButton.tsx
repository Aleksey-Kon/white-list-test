import GitHubBlack from "@/assets/images/icons/GitHub_Invertocat_Black.svg";
import GitHubWhite from "@/assets/images/icons/GitHub_Invertocat_White.svg";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useLocalization } from "@/hooks/useLocalization";
import { Linking, StyleSheet, TouchableOpacity } from "react-native";

const PROJECT_URL = "https://github.com/Aleksey-Kon/white-list-test";

export function GitHubButton() {
  const isDark = useColorScheme() === "dark";
  const { t } = useLocalization();
  const Icon = isDark ? GitHubWhite : GitHubBlack;

  return (
    <TouchableOpacity
      style={[styles.button, isDark && styles.darkButton]}
      accessibilityRole="button"
      accessibilityLabel={t("openGithubRepository")}
      activeOpacity={0.8}
      onPress={() => {
        void Linking.openURL(PROJECT_URL).catch((error) => {
          console.warn("Could not open GitHub project:", error);
        });
      }}
    >
      <Icon width={22} height={22} accessible={false} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#CDD5DF",
    backgroundColor: "#EEF1F5",
    shadowColor: "#102A43",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  darkButton: {
    backgroundColor: Colors.dark.surface,
    borderColor: Colors.dark.border,
  },
});