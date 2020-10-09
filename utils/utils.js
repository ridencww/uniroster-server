
module.exports = {
    getHrefBase: function(req) {
        return `${req.protocol}://${req.headers.host}${req.baseUrl}`;
    },
    reportBadRequest: function(res, err) {
        res.json({
            errors: {
                codeMajor: "FAILURE",
                severity: "ERROR",
                codeMinor: "INVALID DATA",
                description: err || "Bad Request"
            },
            statusCode: 400
        });
    },
    reportServerError: function(res, err) {
        console.log(err);
        res.json({
            errors: {
                codeMajor: "FAILURE",
                severity: "ERROR",
                codeMinor: "UNKNOWN OBJECT",
                description: "Internal server error"
            },
            statusCode: err ? err.status | 500 : 500
        });
    },
    reportUnauthorized: function(res) {
        res.json({
            errors: {
                codeMajor: "FAILURE",
                severity: "ERROR",
                codeMinor: "UNAUTHORIZED",
                description: "Unauthorized - the request requires authorization"
            },
            statusCode: 401
        });
    }
}