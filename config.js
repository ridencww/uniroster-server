var db = {};
db.host = 'localhost';
db.user = 'uniroster';
db.password = 'password';
db.database = 'uniroster';
db.connectionLimit = 10;

var config = {};
config.db = db;

config.httpActive = true;
config.httpPort = 3000;

config.httpsActive = false;
config.httpsPort = 3443;
config.httpsCert = './bin/cert.pem';
config.httpsPrivateKey = './bin/key.pem';

module.exports = config;
