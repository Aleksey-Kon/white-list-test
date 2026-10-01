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
      [
        { $: { name: "app_name" }, _: "Whitelist test" },
        { $: { name: "app_name_en" }, _: "Whitelist test" },
        { $: { name: "app_name_ru" }, _: "Тест белых списков" },
      ],
      config.modResults,
    );
    return config;
  });

  config = withAndroidManifest(config, (config) => {
    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(
      config.modResults,
    );
    const aliases = [
      {
        name: `${config.android.package}.SystemLauncherAlias`,
        label: "@string/app_name",
        enabled: "true",
      },
      {
        name: `${config.android.package}.EnglishLauncherAlias`,
        label: "@string/app_name_en",
        enabled: "false",
      },
      {
        name: `${config.android.package}.RussianLauncherAlias`,
        label: "@string/app_name_ru",
        enabled: "false",
      },
    ];
    const aliasNames = new Set(aliases.map(({ name }) => name));
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

    const mainActivityName = mainActivity.$["android:name"];
    mainActivity["intent-filter"] = (
      mainActivity["intent-filter"] ?? []
    ).filter((intentFilter) => !isLauncherIntentFilter(intentFilter));

    application["activity-alias"] = (
      application["activity-alias"] ?? []
    ).filter((alias) => !aliasNames.has(alias.$["android:name"]));
    application["activity-alias"].push(
      ...aliases.map(({ name, label, enabled }) => ({
        $: {
          "android:name": name,
          "android:targetActivity": mainActivityName,
          "android:label": label,
          "android:icon": "@mipmap/ic_launcher",
          "android:enabled": enabled,
          "android:exported": "true",
        },
        "intent-filter": [
          {
            action: [{ $: { "android:name": "android.intent.action.MAIN" } }],
            category: [
              { $: { "android:name": "android.intent.category.LAUNCHER" } },
            ],
          },
        ],
      })),
    );
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
