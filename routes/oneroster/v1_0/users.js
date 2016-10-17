var app = require('../../../uniroster-server.js');
var db = require('../../../lib/database.js');
var express = require('express');
var utils = require('../../../lib/onerosterUtils.js');

var router = express.Router();

var buildUser = function(row, hrefBase, metaFields) {
  var user = {};
  user.sourcedId = row.sourcedId;
  user.status = row.status ? row.status : "active";
  user.dateLastModified = row.dateLastModified;

  var metadata;
  metaFields.forEach(function(field) {
    if (typeof row[field.dbColumn] !== 'undefined') {
      if (typeof metadata === 'undefined') {
        metadata = {};
      }
      metadata[field.jsonColumn] = row[field.dbColumn];
    }
  });
  user.metadata = metadata;

  user.username = row.username;
  user.userId = row.userId;
  user.givenName = row.givenName;
  user.familyName = row.familyName;
  user.role = row.role;
  user.identifier = row.identifier;
  user.email = row.email;
  user.sms = row.sms;
  user.phone = row.phone;

  // Parents/guardians -- not used at present
  //user.agents = null;

  if (row.demographics) {
    var demographics = {};
    demographics.href = hrefBase + '/demographics/' + row.demographics;
    demographics.sourcedId = row.demographics;
    demographics.type = 'demographics';
    user.demographics = demographics;
  }

  if (row.orgSourcedIds) {
    var orgs = [];
    var fields = row.orgSourcedIds.toString().split(",");
    fields.forEach(function(sid) {
      sid = sid.trim();
      var o = {};
      o.href = hrefBase + '/orgs/' + sid;
      o.sourcedId = sid;
      o.type = 'org';
      orgs.push(o);
    });
    user.orgs = orgs;
  }

  return user;
};

var queryUser = function(req, res, next, role) {
  db.setup(req, res, function(connection, hrefBase) {
    db.tableFields(connection, 'users', function(fields) {
      var select = utils.buildSelectStmt(req, res, fields, 'u', "demographics");
      if (select === null) {
        connection.release();
        return;
      }

      var where = utils.buildWhereStmt(req, res, fields, 'u', 'sourcedId = ? ' + (role ? ' AND role = ?' : ''));
      if (where === null) {
        connection.release();
        return;
      }

      var orderBy = utils.buildOrderByStmt(req, res, fields);
      if (orderBy === null) {
        connection.release();
        return;
      }

      var sql;
      if (select.indexOf('*') != -1 || fields.requested.indexOf('demographics') != -1) {
        sql = select + ',d.`userSourcedId` AS demographics FROM users u ';
        sql += 'LEFT JOIN demographics d ON u.sourcedId = d.userSourcedId ';
      } else {
        sql = select + 'FROM users u ';
      }

      sql += where;
      sql += orderBy;
      sql += ' LIMIT 1';

      connection.query(sql, [req.params.id, role], function(err, rows) {
        connection.release();

        if (err) {
          utils.reportServerError(res, err);
          return;
        }

        if (rows.length == 0) {
          utils.reportNotFound(res);
        } else {
          var wrapper = {};
          wrapper.user = buildUser(rows[0], hrefBase, fields.metaFields);
          res.json(wrapper);
        }
      });
    });
  });
};

var queryUsers = function(req, res, next, role) {
  db.setup(req, res, function(connection, hrefBase) {
    db.tableFields(connection, 'users', function(fields) {
      var select = utils.buildSelectStmt(req, res, fields, 'u', "demographics");
      if (select === null) {
        connection.release();
        return;
      }

      var where = utils.buildWhereStmt(req, res, fields, 'u', role ? 'role = ?' : '');
      if (where === null) {
        connection.release();
        return;
      }

      var orderBy = utils.buildOrderByStmt(req, res, fields);
      if (orderBy === null) {
        connection.release();
        return;
      }

      var sql;
      if (select.indexOf('*') != -1 || fields.requested.indexOf('demographics') != -1) {
        sql = select + ',d.`userSourcedId` AS demographics FROM users u ';
        sql += 'LEFT JOIN demographics d ON u.sourcedId = d.userSourcedId ';
      } else {
        sql = select + 'FROM users u ';
      }

      sql += where;
      sql += orderBy;
      sql += utils.buildLimitStmt(req);

      connection.query(sql, [role], function(err, rows) {
        connection.release();

        if (err) {
          utils.reportServerError(res, err);
          return;
        }

        var wrapper = {};
        wrapper.users = [];
        rows.forEach(function(row) {
          wrapper.users.push(buildUser(row, hrefBase, fields.metaFields));
        });
        res.json(wrapper);
      });
    });
  });
};

var queryUsersByClass = function(req, res, next, role) {
  db.setup(req, res, function(connection, hrefBase) {
    db.tableFields(connection, 'users', function(fields) {
      var select = utils.buildSelectStmt(req, res, fields, 'u', "demographics");
      if (select === null) {
        connection.release();
        return;
      }

      var userQualifier = '';
      if (role) {
        if (role == 'student') {
          userQualifier = "AND e.role = 'student' ";
        } else if (role == 'teacher') {
          userQualifier = "AND e.role = 'teacher' and e.primary = 'True' ";
        }
      }

      var where = utils.buildWhereStmt(req, res, fields, 'u', 'c.sourcedId = ? ' + userQualifier);
      if (where === null) {
        connection.release();
        return;
      }

      var orderBy = utils.buildOrderByStmt(req, res, fields);
      if (orderBy === null) {
        connection.release();
        return;
      }

      var sql;
      if (select.indexOf('*') != -1 || fields.requested.indexOf('demographics') != -1) {
        sql = select + ',d.`userSourcedId` AS demographics FROM users u ';
        sql += 'LEFT JOIN demographics d ON u.sourcedId = d.userSourcedId ';
        sql += 'JOIN enrollments e ON e.userSourcedId = u.sourcedId ';
        sql += 'JOIN classes c ON c.sourcedId = e.classSourcedId ';
      } else {
        sql = select + 'FROM users u ';
        sql += 'JOIN enrollments e ON e.userSourcedId = u.sourcedId ';
        sql += 'JOIN classes c ON c.sourcedId = e.classSourcedId ';
      }

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
        wrapper.users = [];
        rows.forEach(function(row) {
          wrapper.users.push(buildUser(row, hrefBase, fields.metaFields));
        });
        res.json(wrapper);
      });
    });
  });
};

var queryUsersBySchool = function(req, res, next, role) {
  db.setup(req, res, function(connection, hrefBase) {
    db.tableFields(connection, 'users', function(fields) {
      var select = utils.buildSelectStmt(req, res, fields, 'u', "demographics");
      if (select === null) {
        connection.release();
        return;
      }

      var userQualifier = '';
      if (role) {
        if (role == 'student') {
          userQualifier = "AND u.role = 'student' ";
        } else if (role == 'teacher') {
          userQualifier = "AND u.role = 'teacher' ";
        }
      }

      var where = utils.buildWhereStmt(req, res, fields, 'u', 'u.orgSourcedIds LIKE ? ' + userQualifier);
      if (where === null) {
        connection.release();
        return;
      }

      var orderBy = utils.buildOrderByStmt(req, res, fields);
      if (orderBy === null) {
        connection.release();
        return;
      }

      var sql;
      if (select.indexOf('*') != -1 || fields.requested.indexOf('demographics') != -1) {
        sql = select + ',d.`userSourcedId` AS demographics FROM users u ';
        sql += 'LEFT JOIN demographics d ON u.sourcedId = d.userSourcedId ';
      } else {
        sql = select + 'FROM users u ';
      }

      sql += where;
      sql += orderBy;
      sql += utils.buildLimitStmt(req);

      connection.query(sql, ['%' + req.params.id + '%'], function(err, rows) {
        connection.release();

        if (err) {
          utils.reportServerError(res, err);
          return;
        }

        var wrapper = {};
        wrapper.users = [];
        rows.forEach(function(row) {
          wrapper.users.push(buildUser(row, hrefBase, fields.metaFields));
        });
        res.json(wrapper);
      });
    });
  });
};

router.get('/students', function(req, res, next) {
  queryUsers(req, res, next, "student");
});

router.get('/students/:id', function(req, res, next) {
  queryUser(req, res, next, "student");
});

router.get('/teachers', function(req, res, next) {
  queryUsers(req, res, next, "teacher");
});

router.get('/teachers/:id', function(req, res, next) {
  queryUser(req, res, next, "teacher");
});

router.get('/users', function(req, res, next) {
  queryUsers(req, res, next);
});

router.get('/users/:id', function(req, res, next) {
  queryUser(req, res, next);
});

router.get('/classes/:id/students', function(req, res, next) {
  queryUsersByClass(req, res, next, "student");
});

router.get('/classes/:id/teachers', function(req, res, next) {
  queryUsersByClass(req, res, next, "teacher");
});

router.get('/schools/:id/students', function(req, res, next) {
  queryUsersBySchool(req, res, next, "student");
});

router.get('/schools/:id/teachers', function(req, res, next) {
  queryUsersBySchool(req, res, next, "teacher");
});

module.exports = router;
