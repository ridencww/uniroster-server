const crypto = require('crypto');
const config = require('../config');
const db = require('../utils/database');

module.exports = {
    getUserFromClient: function (client) {
        const query = "SELECT dataset FROM clients WHERE client_id = ?";
        return db.queryDatabase(config.auth.database, query, [client.clientId]).then((results) => {
            return results.length > 0 ? {
                dataset: results[0].dataset
            } : false;
        });
    },

    getClient: function (clientId, clientSecret) {
        const shaSecret = crypto.createHash("sha256").update(clientSecret).digest("hex");
        const query = "SELECT client_id, client_secret FROM clients WHERE client_id = ? AND client_secret = ?";
        return db.queryDatabase(config.auth.database, query, [clientId, shaSecret]).then((results) => {
            return results.length > 0 ? {
                clientId: results[0].client_id,
                clientSecret: results[0].client_secret,
                grants: ['client_credentials']
            } : false;
        });
    },

    saveToken: (token, client, user) => {
        const shaToken = crypto.createHash("sha256").update(token.accessToken).digest("hex");
        const query = "INSERT INTO tokens (access_token, access_token_expires_at, client_id) VALUES (?)";
        const values = [[shaToken, token.accessTokenExpiresAt.getTime(), client.clientId]]
        return db.queryDatabase(config.auth.database, query, values).then((results) => {
            return {
                accessToken: token.accessToken,
                accessTokenExpiresAt: token.accessTokenExpiresAt,
                client: client,
                user: user,
            };
        });
    },

    getAccessToken: token => {
        const shaToken = crypto.createHash("sha256").update(token).digest("hex");
        const query = "SELECT access_token, access_token_expires_at, client_id FROM tokens WHERE access_token = ?";
        const values = [shaToken];
        return db.queryDatabase(config.auth.database, query, values).then((results) => {
            return results.length > 0 ? {
                accessToken: results[0].access_token,
                accessTokenExpiresAt: new Date(results[0].access_token_expires_at),
                client: {id: results[0].client_id},
                user: {}
            } : false;
        });
    },

    // Just return true, give every client_id access to all endpoints
    verifyScope: (token, scope) => {
      return new Promise(resolve => resolve(true));
    }
}