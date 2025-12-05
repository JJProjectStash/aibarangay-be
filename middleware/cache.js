/**
 * Simple in-memory cache for response caching
 * Note: For production with multiple instances, consider using Redis
 */
const cache = new Map();

/**
 * Cache middleware for caching GET responses
 * @param {number} duration - Cache duration in seconds (default: 60)
 * @returns {Function} Express middleware function
 */
const cacheMiddleware =
  (duration = parseInt(process.env.CACHE_TTL_SECONDS) || 60) =>
  (req, res, next) => {
    // Only cache GET requests
    if (req.method !== "GET") {
      return next();
    }

    const key = req.originalUrl;
    const cached = cache.get(key);

    if (cached && Date.now() - cached.timestamp < duration * 1000) {
      return res.json(cached.data);
    }

    const originalJson = res.json.bind(res);
    res.json = (data) => {
      cache.set(key, { data, timestamp: Date.now() });
      return originalJson(data);
    };

    next();
  };

/**
 * Clear cache for a specific key or all keys matching a pattern
 * @param {string} pattern - Optional pattern to match keys (clears all if not provided)
 */
export const clearCache = (pattern) => {
  if (!pattern) {
    cache.clear();
    return;
  }

  for (const key of cache.keys()) {
    if (key.includes(pattern)) {
      cache.delete(key);
    }
  }
};

export default cacheMiddleware;
