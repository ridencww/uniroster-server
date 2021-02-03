
module.exports = {
    getHrefBase: function(req) {
        return `${req.protocol}://${req.headers.host}${req.baseUrl}`;
    },
    reportBadRequest: function(res, err) {
        res.status(400);
        res.json({
            errors: {
                codeMajor: "FAILURE",
                severity: "ERROR",
                codeMinor: "INVALID DATA",
                description: err || "Bad Request"
            }
        });
    },
    reportServerError: function(res, err) {
        console.log(err);
        res.status(err ? err.status | 500 : 500);
        res.json({
            errors: {
                codeMajor: "FAILURE",
                severity: "ERROR",
                codeMinor: "UNKNOWN OBJECT",
                description: "Internal server error"
            }
        });
    },
    reportUnauthorized: function(res) {
        res.status(401);
        res.json({
            errors: {
                codeMajor: "FAILURE",
                severity: "ERROR",
                codeMinor: "UNAUTHORIZED",
                description: "Unauthorized - the request requires authorization"
            }
        });
    }
}