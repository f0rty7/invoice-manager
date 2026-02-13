const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Remove 'mjs' from sourceExts so Metro resolves CJS (.js) builds instead
// of ESM (.mjs) builds. Zustand v5's ESM middleware uses `import.meta.env`
// which causes "Cannot use 'import.meta' outside a module" on web because
// Metro's output bundle is loaded as a regular <script>, not a <script type="module">.
config.resolver.sourceExts = config.resolver.sourceExts.filter(
  (ext) => ext !== 'mjs'
);

module.exports = config;
