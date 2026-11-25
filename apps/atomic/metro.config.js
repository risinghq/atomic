const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// expo-sqlite runs on web as a WebAssembly build of SQLite in a worker. Metro
// must ship the .wasm file, and the worker needs SharedArrayBuffer, which the
// browser grants only to a cross-origin isolated page.
config.resolver.assetExts.push('wasm');

const enhanceMiddleware = config.server.enhanceMiddleware;

config.server.enhanceMiddleware = (middleware, server) => {
  const enhanced = enhanceMiddleware ? enhanceMiddleware(middleware, server) : middleware;

  return (req, res, next) => {
    res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');

    return enhanced(req, res, next);
  };
};

module.exports = config;
