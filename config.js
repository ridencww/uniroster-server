function getBool(key, defaultValue) {
    if (defaultValue == undefined) defaultValue = true;
    return process.env[key] ? process.env[key] === "true" : defaultValue;
}

function getInt(key, defaultValue) {
    if (defaultValue == undefined) defaultValue = 0;
    return process.env[key] ? parseInt(process.env[key], 10) : defaultValue;
}

const db = {};
db.host = process.env.DB_HOSTNAME || 'localhost';
db.user = process.env.DB_USERNAME || 'root';
db.password = process.env.DB_PASSWORD || 'password';
db.connectionLimit = getInt("DB_CONNECTION_LIMIT", 10);

const auth = {};
auth.database = process.env.AUTH_DATABASE || 'accounts';
auth.enableClientRegistration = getBool("ENABLE_CLIENT_REGISTRATION");
auth.enableClientRemoval = getBool("ENABLE_CLIENT_REMOVAL");
auth.enableInitialNoAuthRegistration = getBool("ENABLE_INITIAL_NO_AUTH_REGISTRATION", false);
auth.defaultClientId = process.env.DEFAULT_CLIENT_ID || 'default-client';
auth.defaultClientSecret = process.env.DEFAULT_CLIENT_SECRET || 'default-secret';
auth.defaultDataset = process.env.DEFAULT_DATASET || 'sample_or10';

const config = {};
config.db = db;
config.auth = auth;

config.httpActive = getBool("HTTP_ACTIVE");
config.httpPort = getInt("HTTP_PORT", 80);

config.httpsActive = getBool("HTTPS_ACTIVE", false);
config.httpsPort = getInt("HTTPS_PORT", 443);
config.httpsCert = process.env.HTTPS_CERT || './certs/server.cert';
config.httpsPrivateKey = process.env.HTTPS_PRIVATE_KEY || './certs/server.key';

module.exports = config;