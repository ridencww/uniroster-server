
module.exports = {
    getHrefBase: function(req) {
        return `${req.protocol}://${req.headers.host}${req.baseUrl}`;
    },
    reportBadRequest: function(res, err) {
        var wrapper = {};
        wrapper.errors = {};
        wrapper.errors.codeMajor = 'FAILURE';
        wrapper.errors.severity = 'ERROR';
        wrapper.errors.codeMinor = 'INVALID DATA';
        wrapper.errors.description = 'Bad request ‐ the request was invalid and cannot be served.';
        if (err) wrapper.errors.description += ' ' + err;
        res.statusCode = 400;
        res.json(wrapper);
    },
    reportServerError: function(res, err) {
        console.trace(err);
        var wrapper = {};
        wrapper.errors = {};
        wrapper.errors.codeMajor = 'FAILURE';
        wrapper.errors.severity = 'ERROR';
        wrapper.errors.codeMinor = 'UNKNOWN OBJECT';
        wrapper.errors.description = 'Internal server error.';
        res.statusCode = err ? err.status | 500 : 500;
        res.json(wrapper);
    }
}