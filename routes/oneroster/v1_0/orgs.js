var app = require('../../../uniroster-server.js');
var db = require('../../../lib/database.js');
var express = require('express');
var utils = require('../../../lib/onerosterUtils.js');

var router = express.Router();

var buildOrg = function(row, hrefBase, metaFields) {
  var org = {};
  org.sourcedId = row.sourcedId;
  org.status = row.status ? row.status : "active";
  org.dateLastModified = row.dateLastModified;

  var metadata = {};
  metaFields.forEach(function(field) {
    metadata[field.jsonColumn] = row[field.dbColumn];
  });
  if (metaFields.length > 0) {
    org.metadata = metadata;
  }

  org.name = row.name;
  org.type = row.type;
  org.identifier = row.identifier;

  if (row.parentSourcedId) {
    var parent = {};
    parent.href = hrefBase + '/orgs/' + row.parentSourcedId;
    parent.sourcedId = row.parentSourcedId;
    parent.type = 'org';
    org.parent = parent;
  }

  if (row.childSourcedIds) {
    var children = [];
    var fields = row.childSourcedIds.toString().split(",");
    fields.forEach(function(sid) {
      var child = {};
      child.href = hrefBase + '/orgs/' + sid;
      child.sourcedId = sid;
      child.type = 'org';
      children.push(child);
    });
    org.children = children;
  }

  return org;
};

var queryOrg = function(req, res, next, type) {
  db.setup(req, res, function(connection, hrefBase) {
    db.tableFields(connection, 'orgs', function(fields) {
      var select = utils.buildSelectStmt(req, res, fields);
      if (select === null) {
        connection.release();
        return;
      }

      var where = utils.buildWhereStmt(req, res, fields, '', 'sourcedId = ? ' + (type ? ' AND type = ?' : ''));
      if (where === null) {
        connection.release();
        return;
      }

      var orderBy = utils.buildOrderByStmt(req, res, fields);
      if (orderBy === null) {
        connection.release();
        return;
      }

      var sql = select + ' FROM orgs ';
      sql += where;
      sql += orderBy;
      sql += ' LIMIT 1';

      connection.query(sql, [req.params.id, type], function(err, rows) {
        connection.release();

        if (err) {
          utils.reportServerError(res, err);
          return;
        }

        if (rows.length == 0) {
          utils.reportNotFound(res);
        } else {
          var wrapper = {};
          wrapper.org = buildOrg(rows[0], hrefBase, fields.metaFields);
          res.json(wrapper);
        }
      });
    });
  });
};

var queryOrgs = function(req, res, next, type) {
  db.setup(req, res, function(connection, hrefBase) {
    db.tableFields(connection, 'orgs', function(fields) {
      var select = utils.buildSelectStmt(req, res, fields);
      if (select === null) {
        connection.release();
        return;
      }

      var where = utils.buildWhereStmt(req, res, fields, '', type ? ' type = ?' : '');
      if (where === null) {
        connection.release();
        return;
      }

      var orderBy = utils.buildOrderByStmt(req, res, fields);
      if (orderBy === null) {
        connection.release();
        return;
      }

      var sql = select + ' FROM orgs ';
      sql += where;
      sql += orderBy;
      sql += utils.buildLimitStmt(req);

      connection.query(sql, [type], function(err, rows) {
        connection.release();

        if (err) {
          utils.reportServerError(res, err);
          return;
        }

        var wrapper = {};
        wrapper.orgs = [];
        rows.forEach(function(row) {
          wrapper.orgs.push(buildOrg(row, hrefBase, fields.metaFields));
        });
        res.json(wrapper);
      });
    });
  });
};

router.get('/orgs', function(req, res, next) {
  queryOrgs(req, res, next);
});

router.get('/schools', function(req, res, next) {
  queryOrgs(req, res, next, "school");
});

router.get('/orgs/:id', function(req, res, next) {
  queryOrg(req, res, next);
});

router.get('/schools/:id', function(req, res, next) {
  queryOrg(req, res, next, "school");
});

module.exports = router;
