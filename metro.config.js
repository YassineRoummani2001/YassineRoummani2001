const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// ── Increase parallel workers for faster bundling ────────────────────────────
config.maxWorkers = Math.max(2, require('os').cpus().length - 1);

// ── Resolver: put TS/TSX first for faster resolution ────────────────────────
config.resolver.sourceExts = [
  'tsx', 'ts', 'jsx', 'js', 'json', 'mjs', 'cjs',
];

module.exports = config;
