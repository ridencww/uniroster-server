var db = require('../lib/database.js');
var express = require('express');
var utils = require('../lib/onerosterUtils.js');

var router = express.Router();

var uuidv4 = require('uuid/v4');

/* Display available data sets */
router.get('/', function(req, res, next) {
  db.pool.getConnection(function(err, connection) {
    connection.query('SELECT * FROM account ORDER BY description', function(err, rows) {
      connection.release();
      if (err) {
        utils.reportServerError(res);
        return;
      }
      res.render('index', {title: 'Roster Server Datasets', data: rows});
    });
  });
});

/* Assign a new ClassLink OAuth token and store in db */
router.get('/newToken', function(req, res, next) {
  db.pool.getConnection(function(err, connection) {
    var token = uuidv4();
    connection.query('UPDATE account SET oauth_proxy = ? WHERE client_id = ?', [token, req.query.id], function(err, rows) {
      connection.release();
      if (err) {
        utils.reportServerError(res);
        return;
      }

      res.redirect("/");
    });
  });
});

/* Clear the ClassLink OAuth token in the db */
router.get('/clearToken', function(req, res, next) {
  db.pool.getConnection(function(err, connection) {
    connection.query('UPDATE account SET oauth_proxy = null WHERE client_id = ?', [req.query.id], function(err, rows) {
      connection.release();
      if (err) {
        utils.reportServerError(res);
        return;
      }

      res.redirect("/");
    });
  });
});


/* Request an OAuth bearer token */
router.post('/token', function(req, res, next) {

  var authStr = req.get('authorization');
  if (authStr) {
    if (authStr.toLowerCase().indexOf("basic") > -1) {
      var decoded = new Buffer(authStr.replace('Basic ', ''), 'base64').toString('ascii');
      var creds = decoded.split(':');

      db.pool.getConnection(function (err, connection) {
        connection.query('SELECT * FROM account WHERE client_id = ? AND client_password = ?', [creds[0], creds[1]], function (err, rows) {
          connection.release();

          if (err) {
            utils.reportServerError(res);
            return;
          }

          if (rows.length < 1) {
            utils.reportNotAuthorized(res);
            return;
          }

          var token = uuidv4();

          db.pool.getConnection(function (err, connection) {
            connection.query('UPDATE account SET bearer_token = ?, expires = NOW() + INTERVAL 1 HOUR WHERE client_id = ?', [token, creds[0]], function (err, rows) {
              connection.release();
              if (err) {
                utils.reportServerError(res);
                return;
              }

              var data = {};
              data['access_token'] = token;
              data['token_type'] = 'bearer';
              data['expires_in'] = 3600;

              res.setHeader('Content-Type', 'application/json');
              res.send(JSON.stringify(data));
            });
          });

        });
      });
    } else {
      utils.reportNotAuthorized(res);
    }
  } else {
    utils.reportNotAuthorized(res);
  }
});


module.exports = router;
