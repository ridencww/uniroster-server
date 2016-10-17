var app = require('../../../uniroster-server.js');
var db = require('../../../lib/database.js');
var express = require('express');
var utils = require('../../../lib/onerosterUtils.js');

var router = express.Router();

var buildAcademicSession = function(row, hrefBase, metaFields) {
  var academicSession = {};
  academicSession.sourcedId = row.sourcedId;
  academicSession.status = row.status ? row.status : "active";
  academicSession.dateLastModified = row.dateLastModified;

  var metadata = {};
  metaFields.forEach(function(field) {
    metadata[field.jsonColumn] = row[field.dbColumn];
  });
  if (metaFields.length > 0) {
    academicSession.metadata = metadata;
  }

  academicSession.title = row.title;
  academicSession.startDate = row.startDate;
  academicSession.endDate = row.endDate;
  academicSession.type = row.type;

  if (row.parentSourcedId) {
    var parent = {};
    parent.href = hrefBase + '/academicSessions/' + row.parentSourcedId;
    parent.sourcedId = row.parentSourcedId;
    parent.type = 'academicSession';
    academicSession.parent = parent;
  }

  if (row.childSourcedIds) {
    var children = [];
    var fields = row.childSourcedIds.toString().split(",");
    fields.forEach(function(sid) {
      var child = {};
      child.href = hrefBase + '/academicSessions/' + sid;
      child.sourcedId = sid;
      child.type = 'academicSession';
      children.push(child);
    });
    academicSession.children = children;
  }

  return academicSession;
};

var queryAcademicSession = function(req, res, next, type) {
  db.setup(req, res, function(connection, hrefBase, type) {
    db.tableFields(connection, 'academicSessions', function(fields) {
      var select = utils.buildSelectStmt(req, res, fields);
      if (select === null) {
        connection.release();
        return;
      }

      var where = utils.buildWhereStmt(req, res, fields, '', 'sourcedId = ? ' + (type ? 'type = ?' : ''));
      if (where === null) {
        connection.release();
        return;
      }

      var orderBy = utils.buildOrderByStmt(req, res, fields);
      if (orderBy === null) {
        connection.release();
        return;
      }

      var sql = select + 'FROM academicSessions ';
      sql += where;
      sql += orderBy;
      sql += utils.buildLimitStmt(req);

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
          wrapper.academicSession = buildAcademicSession(rows[0], hrefBase, fields.metaFields);
          res.json(wrapper);
        }
      });
    });
  });
};

var queryAcademicSessions = function(req, res, next, type) {
  db.setup(req, res, function(connection, hrefBase, type) {
    db.tableFields(connection, 'academicSessions', function(fields) {
      var select = utils.buildSelectStmt(req, res, fields);
      if (select === null) {
        connection.release();
        return;
      }

      var where = utils.buildWhereStmt(req, res, fields, '', type ? 'type = ?' : '');
      if (where === null) {
        connection.release();
        return;
      }

      var orderBy = utils.buildOrderByStmt(req, res, fields);
      if (orderBy === null) {
        connection.release();
        return;
      }

      var sql = select + 'FROM academicSessions ';
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
        wrapper.academicSessions = [];
        rows.forEach(function(row) {
          wrapper.academicSessions.push(buildAcademicSession(row, hrefBase, fields.metaFields));
        });
        res.json(wrapper);
      });
    });
  });
};

var queryAcademicSessionsForSchool = function(req, res, next, type) {
  db.setup(req, res, function(connection, hrefBase, type) {
    db.tableFields(connection, 'academicSessions', function(fields) {
      var select = utils.buildSelectStmt(req, res, fields, 'a');
      if (select === null) {
        connection.release();
        return;
      }

      var where = utils.buildWhereStmt(req, res, fields, 'a', 'c.termSourcedId = a.sourcedId AND c.schoolSourcedId = ?');
      if (where === null) {
        connection.release();
        return;
      }

      var orderBy = utils.buildOrderByStmt(req, res, fields);
      if (orderBy === null) {
        connection.release();
        return;
      }

      select = select.replace('SELECT ', 'SELECT DISTINCT ');

      var sql = select + 'FROM academicSessions a, classes c ';
      sql += where;
      sql += orderBy;
      sql += utils.buildLimitStmt(req);

      connection.query(sql, [req.params.id], function(err, rows) {
        connection.release();

        if (err) {
          utils.reportServerError(res, err);
          return;
        }

        var wrapper = {};
        wrapper.academicSessions = [];
        rows.forEach(function(row) {
          wrapper.academicSessions.push(buildAcademicSession(row, hrefBase, fields.metaFields));
        });
        res.json(wrapper);
      });
    });
  });
};

router.get('/academicSessions', function(req, res, next) {
  queryAcademicSessions(req, res, next);
});

router.get('/terms', function(req, res, next) {
  queryAcademicSessions(req, res, next, "term");
});

router.get('/academicSessions/:id', function(req, res, next) {
  queryAcademicSession(req, res, next);
});

router.get('/terms/:id', function(req, res, next) {
  queryAcademicSession(req, res, next, "term");
});

router.get('/schools/:id/academicSessions', function(req, res, next) {
  queryAcademicSessionsForSchool(req, res, next);
});

module.exports = router;
