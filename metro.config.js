const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
if (!config.resolver.assetExts.includes('wasm')) config.resolver.assetExts.push('wasm');

const enhanceMiddleware = config.server.enhanceMiddleware;
config.server.enhanceMiddleware = (middleware, server) => {
  const next = enhanceMiddleware?.(middleware, server) ?? middleware;
  return (request, response, done) => {
    response.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    response.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
    return next(request, response, done);
  };
};

module.exports = config;
