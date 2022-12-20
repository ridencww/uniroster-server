const createError = require("http-errors");

module.exports = {
    getHrefBase: function(req) {
        return `${req.protocol}://${req.headers.host}${req.baseUrl}`;
    },
    reportNotFound: function(res, err) {
        throw createError(404, err || "Resource Not Found");
    },
    reportBadRequest: function(res, err) {
        throw createError(400, err || "Bad Request");
    },
    reportServerError: function(res, err) {
        throw createError(500, err || "Internal server error");
    },
    reportUnauthorized: function(res) {
        throw createError(401, "Unauthorized - the request requires authorization");
    }
}