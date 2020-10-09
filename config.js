var db = {};
db.host = process.env.DB_HOSTNAME || 'localhost';
db.user = process.env.DB_USERNAME || 'root';
db.password = process.env.DB_PASSWORD || 'password';
db.authDatabase = process.env.AUTH_DATABASE || 'accounts';
db.connectionLimit = process.env.DB_CONNECTION_LIMIT ? parseInt(process.env.DB_CONNECTION_LIMIT, 10) : 10;

var config = {};
config.db = db;

config.httpActive = process.env.HTTP_ACTIVE ? process.env.HTTP_ACTIVE === "true" : true;
config.httpPort = process.env.HTTP_PORT ? parseInt(process.env.HTTP_PORT, 10) : 80;

config.httpsActive = process.env.HTTPS_ACTIVE ? process.env.HTTPS_ACTIVE === "true" : false;
config.httpsPort = process.env.HTTPS_PORT ? parseInt(process.env.HTTPS_PORT, 10) : 443;
config.httpsCert = process.env.HTTPS_CERT || './certs/server.cert';
config.httpsPrivateKey = process.env.HTTPS_PRIVATE_KEY || './certs/server.key';

module.exports = config;