
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
    }
}