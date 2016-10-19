var app = require('../../../uniroster-server.js');
var db = require('../../../lib/database.js');
var express = require('express');
var utils = require('../../../lib/onerosterUtils.js');

var router = express.Router();

var buildEnrollment = function(row, hrefBase, metaFields) {
  var enrollment = {};
  enrollment.sourcedId = row.sourcedId;
  enrollment.status = row.status ? row.status : "active";
  enrollment.dateLastModified = row.dateLastModified;

  var metadata = {};
  metaFields.forEach(function(field) {
    metadata[field.jsonColumn] = row[field.dbColumn];
  });
  if (metaFields.length > 0) {
    enrollment.metadata = metadata;
  }

  if (row.userSourcedId){
    var user = {};
    user.href = hrefBase + '/users/' + row.userSourcedId;
    user.sourcedId = row.userSourcedId;
    user.type = 'user';
    enrollment.user = user;
  }

  if (row.classSourcedId){
    var clazz = {};
    clazz.href = hrefBase + '/classes/' + row.classSourcedId;
    clazz.sourcedId = row.classSourcedId;
    clazz.type = 'class';
    enrollment.class = clazz;
  }

  if (row.schoolSourcedId){
    var org = {};
    org.href = hrefBase + '/orgs/' + row.schoolSourcedId;
    org.sourcedId = row.schoolSourcedId;
    org.type = 'org';
    enrollment.school = org;
  }

  enrollment.role = row.role;

  if (enrollment.primary) {
    enrollment.primary = row.primary.toLowerCase();
  }

  return enrollment;
};

var queryEnrollment = function(req, res, next) {
  db.setup(req, res, function(connection, hrefBase, type) {
    db.tableFields(connection, 'enrollments', function(fields) {
      var select = utils.buildSelectStmt(req, res, fields);
      if (select === null) {
        connection.release();
        return;
      }

      var where = utils.buildWhereStmt(req, res, fields, '', 'sourcedId = ?');
      if (where === null) {
        connection.release();
        return;
      }

      var orderBy = utils.buildOrderByStmt(req, res, fields);
      if (orderBy === null) {
        connection.release();
        return;
      }

      var sql = select + 'FROM enrollments ';
      sql += where;
      sql += orderBy;
      sql += utils.buildLimitStmt(req);

      connection.query(sql, [req.params.id], function(err, rows) {
        connection.release();

        if (err) {
          utils.reportServerError(res, err);
          return;
        }

        if (rows.length == 0) {
          utils.reportNotFound(res);
        } else {
          var wrapper = {};
          wrapper.enrollment = buildEnrollment(rows[0], hrefBase, fields.metaFields);
          res.json(wrapper);
        }
      });
    });
  });
};

var queryEnrollments = function(req, res, next, type) {
  db.setup(req, res, function(connection, hrefBase, type) {
    db.tableFields(connection, 'enrollments', function(fields) {
      var select = utils.buildSelectStmt(req, res, fields);
      if (select === null) {
        connection.release();
        return;
      }

      var where = utils.buildWhereStmt(req, res, fields);
      if (where === null) {
        connection.release();
        return;
      }

      var orderBy = utils.buildOrderByStmt(req, res, fields);
      if (orderBy === null) {
        connection.release();
        return;
      }

      var sql = select + 'FROM enrollments ';
      sql += where;
      sql += orderBy;
      sql += utils.buildLimitStmt(req);

      connection.query(sql, function(err, rows) {
        connection.release();

        if (err) {
          utils.reportServerError(res, err);
          return;
        }

        var wrapper = {};
        wrapper.enrollments = [];
        rows.forEach(function(row) {
          wrapper.enrollments.push(buildEnrollment(row, hrefBase, fields.metaFields));
        });
        res.json(wrapper);
      });
    });
  });
};

var queryEnrollmentsBySchool = function(req, res, next, type) {
  db.setup(req, res, function(connection, hrefBase, type) {
    db.tableFields(connection, 'enrollments', function(fields) {
      var select = utils.buildSelectStmt(req, res, fields);
      if (select === null) {
        connection.release();
        return;
      }

      var whereStr = 'schoolSourcedId = ? ';
      if (req.params.cid) {
        whereStr += 'AND classSourcedId = ? ';
      }

      var where = utils.buildWhereStmt(req, res, fields, '', whereStr);
      if (where === null) {
        connection.release();
        return;
      }

      var orderBy = utils.buildOrderByStmt(req, res, fields);
      if (orderBy === null) {
        connection.release();
        return;
      }

      var sql = select + 'FROM enrollments ';
      sql += where;
      sql += orderBy;
      sql += utils.buildLimitStmt(req);

      connection.query(sql, [req.params.sid, req.params.cid], function(err, rows) {
        connection.release();

        if (err) {
          utils.reportServerError(res, err);
          return;
        }

        var wrapper = {};
        wrapper.enrollments = [];
        rows.forEach(function(row) {
          wrapper.enrollments.push(buildEnrollment(row, hrefBase, fields.metaFields));
        });
        res.json(wrapper);
      });
    });
  });
};

router.get('/enrollments', function(req, res, next) {
  queryEnrollments(req, res, next);
});

router.get('/enrollments/:id', function(req, res, next) {
  queryEnrollment(req, res, next);
});

router.get('/schools/:sid/enrollments', function(req, res, next) {
  queryEnrollmentsBySchool(req, res, next);
});

router.get('/schools/:sid/classes/:cid/enrollments', function(req, res, next) {
  queryEnrollmentsBySchool(req, res, next);
});

module.exports = router;
