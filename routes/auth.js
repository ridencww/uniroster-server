const oauthServer = require('../oauth/server.js')
const router = require('express').Router()

router.post('/token', oauthServer.token({
    requireClientAuthentication: { 
        'client_credentials': true, // require the client secret
    },
})) 

module.exports = router