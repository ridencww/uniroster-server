require('newrelic');

const express = require('express');
const config = require('./config');
const bodyParser = require('body-parser')
const oauthServer = require('./oauth/server')
const createError = require("http-errors");

const app = express()
const port = 3030



app.use(bodyParser.urlencoded({ extended: false }));

app.use('/oauth', require('./routes/auth'))

app.use('/learningdata', oauthServer.authenticate(), require('./routes/routes'));

app.use('/settings', require('./routes/settings'));

app.use((err, req, res, next) => {
    if (createError.isHttpError(err)) {
        res.status(err.status).send(err.message);
    } else {
        next(err);
    }
});

if (config.httpActive == true) {
    const http = require('http');
    var httpServer = http.createServer(app);
    httpServer.listen(config.httpPort);
    httpServer.on('error', onError);
    httpServer.on('listening', onListening);
}
  
if (config.httpsActive == true) {
    const https = require('https');
    const fs = require('fs');
    const privateKey = fs.readFileSync(config.httpsPrivateKey, 'utf8');
    const certificate = fs.readFileSync(config.httpsCert, 'utf8');
    const credentials = {key: privateKey, cert: certificate};
  
    var httpsServer = https.createServer(credentials, app);
    httpsServer.listen(config.httpsPort);
    httpsServer.on('error', onError);
    httpsServer.on('listening', onListeningSecure);
}

function onError(error) {
    if (error.syscall !== 'listen') {
      throw error;
    }
  
    const bind = typeof port === 'string'
      ? 'Pipe ' + port
      : 'Port ' + port;
  
    switch (error.code) {
      case 'EACCES':
        console.error(bind + ' requires elevated privileges');
        process.exit(1);
        break;
      case 'EADDRINUSE':
        console.error(bind + ' is already in use');
        process.exit(1);
        break;
      default:
        throw error;
    }
}
  
function onListening() {
    const addr = httpServer.address();
    const bind = typeof addr === 'string' ? 'pipe ' + addr : 'port ' + addr.port;
    console.log('HTTP listening on ' + bind);
}
  
function onListeningSecure() {
    const addr = httpsServer.address();
    const bind = typeof addr === 'string' ? 'pipe ' + addr : 'port ' + addr.port;
    console.log('HTTPS listening on ' + bind);
}

module.exports = app