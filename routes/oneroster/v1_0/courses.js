const db = require('../../../utils/database');
const router = require('express').Router();
const table = 'courses';

function buildCourse(row, hrefBase, metaFields) {
    const course = {
        sourcedId: row.sourcedId,
        status: row.status ? row.status : "active",
        dateLastModified: row.dateLastModified,
        courseCode: row.courseCode,
        grade: row.grade,
        title: row.title
    };
  
    if (metaFields.length > 0) {
        course.metadata = {};
        metaFields.forEach(function(field) {
            course.metadata[field.jsonColumn] = row[field.dbColumn];
        });
    }

    if (row.schoolYearId) {
        course.schoolYear = {
            href: hrefBase + '/aademicSessions/' + row.schoolYearId,
            sourcedId: row.schoolYearId,
            type: 'academicSession'
        };
    }

    if (row.subjects) {
        course.subjects = [];
        row.subjects.toString().split(",").forEach(function(subject) {
            course.subjects.push(subject);
        });
    }

    if (row.orgSourcedId) {
        course.school = {
            href: hrefBase + '/orgs/' + row.orgSourcedId,
            sourcedId: row.orgSourcedId,
            type: 'org'
        };
    }

    return course;
};

function queryCourse(req, res, next) {
    db.getData(req, res, {
        table: table,
        queryValues: [req.params.id],
        additionalWhereStmts: 'sourcedId = ?'
    }).then((data) => {
        if (data.results.length === 0) {
            utils.reportNotFound(res, 'Course not found');
        } else {
            res.json({
                course: buildCourse(data.results[0], data.hrefBase, data.fields.metaFields)
            });
        }
    });
};

function queryCourses(req, res, next) {
    db.getData(req, res, {
        table: table,
        queryValues: [req.params.id]
    }).then((data) => {
        if (data) {
            const courses = [];
            data.results.forEach(function(row) {
                courses.push(buildCourse(row, data.hrefBase, data.fields.metaFields));
            });
            res.json({courses: courses});
        }
    });
};

function queryCoursesForSchool(req, res, next) {
    db.getData(req, res, {
        table: table,
        queryValues: [req.params.id],
        additionalWhereStmts: 'orgSourcedId = ?'
    }).then((data) => {
        if (data) {
            const courses = [];
            data.results.forEach(function(row) {
                courses.push(buildCourse(row, data.hrefBase, data.fields.metaFields));
            });
            res.json({courses: courses});
        }
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