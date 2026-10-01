const { withInfoPlist } = require('expo/config-plugins');

module.exports = (config) => withInfoPlist(config, (config) => {
  // ATS must permit manual server trust for arbitrary user-supplied domains.
  // Certificate acceptance is still scoped to SiteProbe's URLSession delegate.
  const ats = config.modResults.NSAppTransportSecurity ?? {};
  ats.NSAllowsArbitraryLoads = true;
  // Presence of these keys makes iOS ignore NSAllowsArbitraryLoads, even if false.
  delete ats.NSAllowsLocalNetworking;
  delete ats.NSAllowsArbitraryLoadsForMedia;
  delete ats.NSAllowsArbitraryLoadsInWebContent;
  config.modResults.NSAppTransportSecurity = ats;
  return config;
});
