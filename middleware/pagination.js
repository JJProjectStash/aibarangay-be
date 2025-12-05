/**
 * Pagination middleware to standardize pagination across routes
 * @param {number} defaultLimit - Default number of items per page
 * @param {number} maxLimit - Maximum allowed items per page
 * @returns {Function} Express middleware function
 */
const paginate =
  (defaultLimit = 50, maxLimit = 100) =>
  (req, res, next) => {
    let limit = parseInt(req.query.limit) || defaultLimit;
    limit = Math.min(limit, maxLimit);

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const skip = (page - 1) * limit;

    req.pagination = { limit, skip, page };
    next();
  };

export default paginate;
