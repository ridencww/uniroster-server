const config = require('../config');
const oauthServer = require('../oauth/server');

const router = require('express').Router();

if (config.auth.enableSettingsEndpoint) {
    router.post('/', oauthServer.authenticate(), function(req, res, next) {
        const redactedConfig = JSON.parse(JSON.stringify(config));
        redactedConfig.db.password = '*******************';
        redactedConfig.db.defaultClientSecret = '*********************';
        res.json(redactedConfig);
    });
}

module.exports = router