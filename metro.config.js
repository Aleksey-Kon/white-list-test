const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

config.transformer = {
  ...config.transformer,
  babelTransformerPath: require.resolve("react-native-svg-transformer/expo"),
};
config.resolver = {
  ...config.resolver,
  assetExts: config.resolver.assetExts.filter(
    (extension) => extension !== "svg",
  ),
  sourceExts: [...config.resolver.sourceExts, "svg"],
};

module.exports = config;
