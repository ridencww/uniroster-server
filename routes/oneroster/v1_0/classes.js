const db = require('../../../utils/database');
const router = require('express').Router();
const table = 'classes';

function buildClass(row, hrefBase, metaFields) {
    const clazz = {
        sourcedId: row.sourcedId,
        status: row.status || "active",
        dateLastModified: row.dateLastModified,
        title: row.title,
        classCode: row.classCode,
        classType: row.classType,
        location: row.location,
        grade: row.grade
    };
  
    if (metaFields.length > 0) {
        clazz.metadata = {};
        metaFields.forEach(function(field) {
            clazz.metadata[field.jsonColumn] = row[field.dbColumn];
        });
    }
  
    if (row.subjects) {
        clazz.subjects = [];
        row.subjects.toString().split(",").forEach(function(subject) {
            clazz.subjects.push(subject);
        });
    }
  
    if (row.courseSourcedId) {
        clazz.course = {
            href: `${hrefBase}/courses/${row.courseSourcedId}`,
            sourcedId: row.courseSourcedId,
            type: 'course'
        };
    }
  
    if (row.schoolSourcedId) {
        clazz.school = {
            href: `${hrefBase}/orgs/${row.schoolSourcedId}`,
            sourcedId: row.schoolSourcedId,
            type: 'org'
        };
    }
  
    if (row.termsSourcedId) {
        clazz.terms = [];
        row.termsSourcedId.toString().split(",").forEach(function(sid) {
            clazz.terms.push({
                href: `${hrefBase}/academicSession/${sid}`,
                sourcedId: sid,
                type: 'academicSession'
            });
        });
    }

    return clazz;
};

function queryClass (req, res, next) {
    db.getData(req, res, {
        table: table,
        queryValues: [req.params.id],
        additionalWhereStmts: 'sourcedId = ?'
    }).then((data) => {
        if (data.results.length === 0) {
            utils.reportNotFound(res, 'Class not found');
        } else {
            res.json({
                class: buildClass(data.results[0], data.hrefBase, data.fields.metaFields)
            });
        }
    });
};

function queryClasses(req, res, next) {
    db.getData(req, res, {
        table: table
    }).then((data) => {
        if (data) {
            const classes = [];
            data.results.forEach(function(row) {
                classes.push(buildClass(row, data.hrefBase, data.fields.metaFields));
            });
            res.json({classes: classes});
        }
    });
};

function queryClassesFromAnchor(req, res, next, anchorTableField) {
    db.getData(req, res, {
        table: table,
        queryValues: [req.params.id],
        additionalWhereStmts: `${anchorTableField} = ?`
    }).then((data) => {
        if (data) {
            const classes = [];
            data.results.forEach(function(row) {
                classes.push(buildClass(row, data.hrefBase, data.fields.metaFields));
            });
            res.json({classes: classes});
        }
    });
};

function queryClassesFromUser(req, res, next, userType) {
    let userQualifier = "";
    if (userType) {
        if (userType == 'student') {
            userQualifier = " AND e.role = 'student' ";
        } else if (userType == 'teacher') {
            userQualifier = " AND e.role = 'teacher' and e.primary = 'True' ";
        }
    }
    db.getData(req, res, {
        table: table,
        queryValues: [req.params.id],
        selectPrefix: 'c',
        fromStmt: "FROM users u JOIN enrollments e ON e.userSourcedId = u.sourcedId JOIN classes c ON c.sourcedId = e.classSourcedId ",
        wherePrefix: 'c',
        additionalWhereStmts: `u.sourcedId = ? ${userQualifier}`
    }).then((data) => {
        if (data) {
            const classes = [];
            data.results.forEach(function(row) {
                classes.push(buildClass(row, data.hrefBase, data.fields.metaFields));
            });
            res.json({classes: classes});
        }
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