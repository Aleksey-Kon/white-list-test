const {
  AndroidConfig,
  withDangerousMod,
  withAndroidManifest,
  withStringsXml,
} = require("expo/config-plugins");
const fs = require("node:fs/promises");
const path = require("node:path");

module.exports = (config) => {
  config = withStringsXml(config, (config) => {
    config.modResults = AndroidConfig.Strings.setStringItem(
      [{ $: { name: "app_name" }, _: "Whitelist test" }],
      config.modResults,
    );
    return config;
  });

  config = withAndroidManifest(config, (config) => {
    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(
      config.modResults,
    );
    const aliasNames = new Set([
      `${config.android.package}.SystemLauncherAlias`,
      `${config.android.package}.EnglishLauncherAlias`,
      `${config.android.package}.RussianLauncherAlias`,
    ]);
    const existingAliases = (application["activity-alias"] ?? []).filter(
      (alias) => aliasNames.has(alias.$["android:name"]),
    );
    const mainActivity = (application.activity ?? []).find(
      (activity) =>
        (activity["intent-filter"] ?? []).some(isLauncherIntentFilter) ||
        existingAliases.some(
          (alias) =>
            alias.$["android:targetActivity"] === activity.$["android:name"],
        ),
    );
    if (!mainActivity) {
      throw new Error("Could not find the Android launcher activity");
    }

    mainActivity["intent-filter"] = (
      mainActivity["intent-filter"] ?? []
    ).filter((intentFilter) => !isLauncherIntentFilter(intentFilter));
    mainActivity["intent-filter"].push({
      action: [{ $: { "android:name": "android.intent.action.MAIN" } }],
      category: [{ $: { "android:name": "android.intent.category.LAUNCHER" } }],
    });
    application["activity-alias"] = (
      application["activity-alias"] ?? []
    ).filter((alias) => !aliasNames.has(alias.$["android:name"]));
    return config;
  });

  return withDangerousMod(config, [
    "android",
    async (config) => {
      const resourcesRoot = path.join(
        config.modRequest.platformProjectRoot,
        "app",
        "src",
        "main",
        "res",
      );
      for (const locale of ["en", "ru"]) {
        for (const density of ["hdpi", "mdpi", "xhdpi", "xxhdpi", "xxxhdpi"]) {
          await fs.rm(
            path.join(resourcesRoot, `drawable-${locale}-${density}`),
            {
              recursive: true,
              force: true,
            },
          );
          await fs.rm(path.join(resourcesRoot, `mipmap-${locale}-${density}`), {
            recursive: true,
            force: true,
          });
        }
        await fs.rm(path.join(resourcesRoot, `mipmap-${locale}-anydpi-v26`), {
          recursive: true,
          force: true,
        });
      }

      const russianValuesDirectory = path.join(resourcesRoot, "values-ru");
      await fs.mkdir(russianValuesDirectory, { recursive: true });
      await fs.writeFile(
        path.join(russianValuesDirectory, "strings.xml"),
        '<resources>\n  <string name="app_name">Тест белых списков</string>\n</resources>\n',
        "utf8",
      );
      return config;
    },
  ]);
};

function isLauncherIntentFilter(intentFilter) {
  const hasName = (entries, name) =>
    (entries ?? []).some((entry) => entry.$?.["android:name"] === name);
  return (
    hasName(intentFilter.action, "android.intent.action.MAIN") &&
    hasName(intentFilter.category, "android.intent.category.LAUNCHER")
  );
}
