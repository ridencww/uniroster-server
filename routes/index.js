var db = require('../lib/database.js');
var express = require('express');
var utils = require('../lib/onerosterUtils.js');

var router = express.Router();

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

module.exports = router;
