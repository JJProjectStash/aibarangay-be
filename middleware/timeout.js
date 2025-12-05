/**
 * Request timeout middleware
 * @param {number} seconds - Timeout duration in seconds (default: 30)
 * @returns {Function} Express middleware function
 */
const timeout =
  (seconds = parseInt(process.env.REQUEST_TIMEOUT_SECONDS) || 30) =>
  (req, res, next) => {
    req.setTimeout(seconds * 1000, () => {
      if (!res.headersSent) {
        res.status(408).json({ message: "Request timeout" });
      }
    });
    next();
  };

export default timeout;
