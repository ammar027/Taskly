const { getDefaultConfig } = require("expo/metro-config");
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  'realm': path.resolve(__dirname, './realm.web.tsx'),
  'react-native-exit-app': path.resolve(__dirname, './exitApp.web.tsx'),
};

// Ensure the platform extensions are properly ordered
// Web extensions should come first for web builds
config.resolver.sourceExts = process.env.EXPO_PUBLIC_PLATFORM === 'web' 
  ? ['web.tsx', 'web.ts', 'web.jsx', 'web.js', 'tsx', 'ts', 'jsx', 'js', 'cjs', 'json']
  : [...config.resolver.sourceExts, 'cjs'];

config.transformer.getTransformOptions = async () => ({
  transform: {
    inlineRequires: true,
  },
});

module.exports = config;