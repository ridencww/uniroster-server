const config = require('../config');
const db = require('../utils/database');
const oauthServer = require('../oauth/server');
const utils = require('../utils/utils');

const crypto = require('crypto');
const router = require('express').Router();

function validateClientParams(req, res, next) {
    const missingParams = [];
    if (!req.body.client_id) missingParams.push("'client_id'");

    if (req.path !== '/removeClient') {
        if (!req.body.client_secret) missingParams.push("'client_secret'");
        if (!req.body.dataset) missingParams.push("'dataset'");
    }

    if (missingParams.length > 0) {
        utils.reportBadRequest(res, `Missing parameters: ${missingParams.join(', ')}`);
        return;
    }

    next();
}

function addClient(req, res, next) {
    const shaToken = crypto.createHash("sha256").update(req.body.client_secret).digest("hex");
    const sql = 'INSERT INTO clients VALUES (?)';
    db.queryDatabase(config.auth.database, sql, [[req.body.client_id, shaToken, req.body.dataset]]).then((result) => {
        res.json({success: true});
    }).catch((err) => {
        utils.reportServerError(res, err);
    });
}

function removeClient(req, res, next) {
    const sql = 'DELETE FROM clients where client_id = ?'
    db.queryDatabase(config.auth.database, sql, [req.body.client_id]).then((result) => {
        res.json({success: true});
    }).catch((err) => {
        utils.reportServerError(res, err);
    });
}

function clientCheck(req, res, next) {
    const shouldExist = (req.path === '/removeClient');
    let sql = 'SELECT COUNT(*) AS count FROM clients';
    if (req.path === '/registerClient') sql += ' WHERE client_id = ?';
    db.queryDatabase(config.auth.database, sql, [req.body.client_id]).then((result) => {
        if (result[0].count === 0) {
            if (shouldExist) {
                utils.reportNotFound(res, `'${req.body.client_id}' does not exist`);
            } else {
                next();
            }
        } else {
            if (shouldExist) {
                next();
            } else {
                const message = (req.path === '/initialRegistration') 
                               ? '/initialRegistration is not available, clients have already been registered' 
                               : `'${req.body.client_id}' has already been registered`
                utils.reportBadRequest(res, message);
            }
        }
    });
}

router.post('/token', oauthServer.token({
    requireClientAuthentication: { 
        'client_credentials': true, // require the client secret
    }
}));

if (config.auth.enableClientRegistration) {
    router.post('/registerClient', oauthServer.authenticate(), validateClientParams, clientCheck, addClient);
}

if (config.auth.enableInitialNoAuthRegistration) {
    router.post('/initialRegistration', validateClientParams, clientCheck, addClient);

// If initial registration is disabled, check if any clients are registered. If not, create a default one
} else {
    db.queryDatabase(config.auth.database, 'SELECT COUNT(*) as count FROM clients').then((result) => {
        if (result[0].count === 0) {
            console.log('Initial registration disabled and no clients have been registered. Creating a default client');
            const shaToken = crypto.createHash("sha256").update(config.auth.defaultClientSecret).digest("hex");
            return db.queryDatabase(config.auth.database, 
                             'INSERT INTO clients VALUES (?)', 
                             [[config.auth.defaultClientId, shaToken, config.auth.defaultDataset]]);
        }
    }).then((result) => {
        if (result) console.log('Successfully added default client');
    }).catch((err) => {
        console.log('Failed to add default client');
        console.log(err);
    });
}

if (config.auth.enableClientRemoval) {
    router.post('/removeClient', oauthServer.authenticate(), validateClientParams, clientCheck, removeClient);
}

module.exports = router