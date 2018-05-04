var oauthSignature = require("oauth-signature");

var parseAuthenticationHeader = function(req) {
  var auth = {};
  var authStr = req.get('authorization');
  if (authStr) {
    if (authStr.toLowerCase().indexOf("bearer") > -1) {
      authStr = authStr.replace('Bearer ', '');
      auth['bearer'] = authStr;
    } else {
      authStr = authStr.replace('OAuth ', '').split(",");
      for (var i = 0; i < authStr.length; i++) {
        var fields = authStr[i].split('=');
        auth[fields[0]] = fields[1].replace(/"/g, '');
      }
    }

    for (qp in req.query) {
      auth[qp] = req.query[qp];
    }
  }

  return auth;
};

var validateSignature = function(req, consumerSecret) {
  var offset = req.originalUrl.indexOf('?') != -1 ? req.originalUrl.indexOf('?') : req.originalUrl.length;
  var url = req.protocol + '://' + req.get('host') + req.originalUrl.substring(0, offset);

  var parameters = parseAuthenticationHeader(req);

  var incomingSignature = parameters['oauth_signature'];
  delete parameters['oauth_signature'];

  signature = oauthSignature.generate(req.method, url, parameters, consumerSecret, null);

  return signature === incomingSignature;
};

module.exports.parseAuthenticationHeader = parseAuthenticationHeader;
module.exports.validateSignature = validateSignature;
