module.exports = ({ config }) => {
  if (process.env.APP_VARIANT !== 'development') return config;

  return {
    ...config,
    name: `${config.name} (DEV)`,
    scheme: 'testwhitelist-dev',
    android: { ...config.android, package: `${config.android.package}.dev` },
    ios: { ...config.ios, bundleIdentifier: `${config.ios.bundleIdentifier}.dev` },
  };
};
