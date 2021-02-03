const OAuthServer = require('express-oauth-server');
const config = require('../config');
const model = require('./model');

module.exports = new OAuthServer({
  model: model,
  grants: ['authorization_code', 'refresh_token'],
  accessTokenLifetime: config.auth.accessTokenLifetime,
  allowEmptyState: true,
  allowExtendedTokenAttributes: true,
});
