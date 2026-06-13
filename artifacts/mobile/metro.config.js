const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Ignore macOS hidden AppleDouble files (._*) which crash Metro
config.resolver.blockList = [
  /.*\/._.*/,
  ...(config.resolver.blockList ? (Array.isArray(config.resolver.blockList) ? config.resolver.blockList : [config.resolver.blockList]) : [])
];

module.exports = config;
