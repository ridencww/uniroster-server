var app = require('../../../uniroster-server.js');
var db = require('../../../lib/database.js');
var express = require('express');
var utils = require('../../../lib/onerosterUtils.js');

var router = express.Router();

var buildClass = function(row, hrefBase, metaFields) {
  var clazz = {};
  clazz.sourcedId = row.sourcedId;
  clazz.status = row.status ? row.status : "active";
  clazz.dateLastModified = row.dateLastModified;

  var metadata = {};
  metaFields.forEach(function(field) {
    metadata[field.jsonColumn] = row[field.dbColumn];
  });
  if (metaFields.length > 0) {
    clazz.metadata = metadata;
  }

  clazz.title = row.title;
  clazz.classCode = row.classCode;
  clazz.classType = row.classType;
  clazz.location = row.location;

  if (hrefBase.indexOf("ims/oneroster") !== -1) {
    clazz.grades = row.grade;
  } else {
    clazz.grade = row.grade;
  }

  if (row.subjects) {
    var subjects = [];
    var fields = row.subjects.toString().split(",");
    fields.forEach(function(subject) {
      subjects.push(subject);
    });
    clazz.subjects = subjects;
  }

  if (row.courseSourcedId) {
    var course = {};
    course.href = hrefBase + '/courses/' + row.courseSourcedId;
    course.sourcedId = row.courseSourcedId;
    course.type = 'course';
    clazz.course = course;
  }

  if (row.schoolSourcedId) {
    var school = {};
    school.href = hrefBase + '/orgs/' + row.schoolSourcedId;
    school.sourcedId = row.schoolSourcedId;
    school.type = 'org';
    clazz.school = school;
  }

  if (row.termSourcedId) {
    var terms = [];
    var fields = row.termSourcedId.toString().split(",");
    fields.forEach(function(sid) {
      var term = {};
      term.href = hrefBase + '/academicSession/' + sid;
      term.sourcedId = sid;
      term.type = 'academicSession';
      terms.push(term);
    });
    clazz.terms = terms;
  }

  return clazz;
};

var queryClass = function(req, res, next) {
  db.setup(req, res, function(connection, hrefBase, type) {
    db.tableFields(connection, 'classes', function(fields) {
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

      var sql = select + 'FROM classes ';
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
          wrapper.class = buildClass(rows[0], hrefBase, fields.metaFields);
          res.json(wrapper);
        }
      });
    });
  });
};

var queryClasses = function(req, res, next) {
  db.setup(req, res, function(connection, hrefBase, type) {
    db.tableFields(connection, 'classes', function(fields) {
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

      var sql = select + 'FROM classes ';
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
        wrapper.classes = [];
        rows.forEach(function(row) {
          wrapper.classes.push(buildClass(row, hrefBase, fields.metaFields));
        });
        res.json(wrapper);
      });
    });
  });
};

var queryClassesFromAnchor = function(req, res, next, anchorTableField) {
  db.setup(req, res, function(connection, hrefBase) {
    db.tableFields(connection, 'classes', function(fields) {
      var select = utils.buildSelectStmt(req, res, fields);
      if (select === null) {
        connection.release();
        return;
      }

      var where = utils.buildWhereStmt(req, res, fields, '', anchorTableField + ' = ?');
      if (where === null) {
        connection.release();
        return;
      }

      var orderBy = utils.buildOrderByStmt(req, res, fields);
      if (orderBy === null) {
        connection.release();
        return;
      }

      var sql = select + 'FROM classes ';
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
        wrapper.classes = [];
        rows.forEach(function(row) {
          wrapper.classes.push(buildClass(row, hrefBase, fields.metaFields));
        });
        res.json(wrapper);
      });
    });
  });
};

var queryClassesFromUser = function(req, res, next, userType) {
  db.setup(req, res, function(connection, hrefBase, type) {
    db.tableFields(connection, 'classes', function(fields) {
      var select = utils.buildSelectStmt(req, res, fields, 'c');
      if (select === null) {
        connection.release();
        return;
      }

      var userQualifier = '';
      if (userType) {
        if (userType == 'student') {
          userQualifier = " AND e.role = 'student' ";
        } else if (userType == 'teacher') {
          userQualifier = " AND e.role = 'teacher' and e.primary = 'True' ";
        }
      }

      var where = utils.buildWhereStmt(req, res, fields, 'c', ' u.sourcedId = ? ' + userQualifier);
      if (where === null) {
        connection.release();
        return;
      }

      var orderBy = utils.buildOrderByStmt(req, res, fields);
      if (orderBy === null) {
        connection.release();
        return;
      }

      var sql = select + 'FROM users u ';
      sql += 'JOIN enrollments e ON e.userSourcedId = u.sourcedId ';
      sql += 'JOIN classes c ON c.sourcedId = e.classSourcedId ';
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
        wrapper.classes = [];
        rows.forEach(function(row) {
          wrapper.classes.push(buildClass(row, hrefBase, fields.metaFields));
        });
        res.json(wrapper);
      });
    });
  });
};

router.get('/classes', function(req, res, next) {
  queryClasses(req, res, next);
});

router.get('/classes/:id', function(req, res, next) {
  queryClass(req, res, next);
});

router.get('/academicSessions/:id/classes', function(req, res, next) {
  queryClassesFromAnchor(req, res, next, 'termSourcedId');
});

router.get('/courses/:id/classes', function(req, res, next) {
  queryClassesFromAnchor(req, res, next, 'courseSourcedId');
});

router.get('/schools/:id/classes', function(req, res, next) {
  queryClassesFromAnchor(req, res, next, 'schoolSourcedId');
});

router.get('/students/:id/classes', function(req, res, next) {
  queryClassesFromUser(req, res, next, 'student');
});

router.get('/teachers/:id/classes', function(req, res, next) {
  queryClassesFromUser(req, res, next, 'teacher');
});

router.get('/users/:id/classes', function(req, res, next) {
  queryClassesFromUser(req, res, next);
});

module.exports = router;
