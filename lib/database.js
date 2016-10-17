var config = require('../config');
var oauth = require('./oauth');
var utils = require('./onerosterUtils');

var pool = require('mysql').createPool({
  connectionLimit: config.db.connectionLimit,
  host: config.db.host,
  user: config.db.user,
  password: config.db.password,
  database: config.db.database
});

var changeDatabase = function(connection, dataset, callback) {
  connection.changeUser({database: dataset}, function(err) {
    callback(err);
  });
};

var setup = function(req, res, callback) {
  // Initialize variable that can be used to produce OneRoster references
  var hrefBase = req.protocol + "://" + req.headers.host + req.baseUrl;

  var auth = oauth.parseAuthenticationHeader(req);

  var dataset = auth['oauth_consumer_key'];

  pool.getConnection(function(err, connection) {
    if (err) {
      utils.reportServerError(res, err);
      return;
    }

    // Lookup client_id in database to determine which dataset (database) to use
    connection.query('SELECT * FROM account WHERE client_id = ?', [dataset], function(err, rows) {
      if (err) {
        connection.release();
        utils.reportServerError(res, err);
        return;
      }

      // client_id not found -- not authorized
      if (rows.length != 1) {
        connection.release();
        utils.reportNotAuthorized(res);
        return;
      }

      if (!oauth.validateSignature(req, rows[0].client_password)) {
        connection.release();
        utils.reportNotAuthorized(res);
        return;
      }

      // Copy the database name from the result set
      dataset = rows[0].dataset;

      // Switch from uniroster database to database containing customer data
      changeDatabase(connection, dataset, function(err) {
        if (err) {
          connection.release();
          utils.reportServerError(res, err);
          return;
        }
        callback(connection, hrefBase);
      });
    });
  });
};

var tableFields = function(connection, table, callback) {
  var sql = "SELECT column_name FROM information_schema.columns WHERE table_name='" + table + "'";
  connection.query(sql, function(err, rows) {
    var fields = {};

    if (err) {
      console.error(err);
    } else {
      var all = [];
      var metaFields = [];
      var requested = [];
      rows.forEach(function(row) {
        all.push(row.column_name.replace("#", "."));
        if (row.column_name.indexOf("metadata#") != -1) {
          var column = {};
          column.dbColumn = row.column_name;
          column.jsonColumn = row.column_name.substring(9);
          metaFields.push(column);
        }
      });
      fields.all = all;
      fields.metaFields = metaFields;
      fields.requested = requested;
    }

    callback(fields);
  });
};

module.exports.pool = pool;
module.exports.changeDatabase = changeDatabase;
module.exports.setup = setup;
module.exports.tableFields = tableFields;
