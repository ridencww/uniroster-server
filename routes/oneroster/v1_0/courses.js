var app = require('../../../uniroster-server.js');
var db = require('../../../lib/database.js');
var express = require('express');
var utils = require('../../../lib/onerosterUtils.js');

var router = express.Router();

var buildCourse = function(row, hrefBase, metaFields) {
  var course = {};
  course.sourcedId = row.sourcedId;
  course.status = row.status ? row.status : "active";
  course.dateLastModified = row.dateLastModified;

  var metadata = {};
  metaFields.forEach(function(field) {
    metadata[field.jsonColumn] = row[field.dbColumn];
  });
  if (metaFields.length > 0) {
    course.metadata = metadata;
  }

  course.title = row.title;

  if (row.schoolYearId) {
    var schoolYear = {};
    schoolYear.href = hrefBase + '/aademicSessions/' + row.schoolYearId;
    schoolYear.sourcedId = row.schoolYearId;
    schoolYear.type = 'academicSession';
    course.schoolYear = schoolYear;
  }

  course.courseCode = row.courseCode;
  course.grade = row.grade;

  if (row.subjects) {
    var subjects = [];
    var fields = row.subjects.toString().split(",");
    fields.forEach(function(subject) {
      subjects.push(subject);
    });
    course.subjects = subjects;
  }

  if (row.orgSourcedId) {
    var school = {};
    school.href = hrefBase + '/orgs/' + row.orgSourcedId;
    school.sourcedId = row.orgSourcedId;
    school.type = 'org';
    course.org = school;
  }

  return course;
};

var queryCourse = function(req, res, next) {
  db.setup(req, res, function(connection, hrefBase, type) {
    db.tableFields(connection, 'courses', function(fields) {
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

      var sql = select + 'FROM courses ';
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
          wrapper.course = buildCourse(rows[0], hrefBase, fields.metaFields);
          res.json(wrapper);
        }
      });
    });
  });
};

var queryCourses = function(req, res, next) {
  db.setup(req, res, function(connection, hrefBase, type) {
    db.tableFields(connection, 'courses', function(fields) {
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

      var sql = select + 'FROM courses ';
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
        wrapper.courses = [];
        rows.forEach(function(row) {
          wrapper.courses.push(buildCourse(row, hrefBase, fields.metaFields));
        });
        res.json(wrapper);
      });
    });
  });
};

var queryCoursesForSchool = function(req, res, next) {
  db.setup(req, res, function(connection, hrefBase, type) {
    db.tableFields(connection, 'courses', function(fields) {
      var select = utils.buildSelectStmt(req, res, fields);
      if (select === null) {
        connection.release();
        return;
      }

      var where = utils.buildWhereStmt(req, res, fields, '', 'orgSourcedId = ?');
      if (where === null) {
        connection.release();
        return;
      }

      var orderBy = utils.buildOrderByStmt(req, res, fields);
      if (orderBy === null) {
        connection.release();
        return;
      }

      var sql = select + 'FROM courses ';
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
        wrapper.courses = [];
        rows.forEach(function(row) {
          wrapper.courses.push(buildCourse(row, hrefBase, fields.metaFields));
        });
        res.json(wrapper);
      });
    });
  });
};

router.get('/courses', function(req, res, next) {
  queryCourses(req, res, next);
});

router.get('/courses/:id', function(req, res, next) {
  queryCourse(req, res, next);
});

router.get('/schools/:id/courses', function(req, res, next) {
  queryCoursesForSchool(req, res, next);
});

module.exports = router;
