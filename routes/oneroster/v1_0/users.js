const db = require('../../../utils/database');
const router = require('express').Router();
const table = 'users';

const demographicsFromStmt = function(select, fields) {
    if (select.indexOf('*') != -1 || fields.requested.indexOf('demographics') != -1) {
        return ", d.`userSourcedId` AS demographics FROM users u LEFT JOIN demographics d ON u.sourcedId = d.userSourcedId ";
    } else {
        return "FROM users u ";
    }
};

function buildUser(row, hrefBase, metaFields) {
    var user = {
        sourcedId: row.sourcedId,
        status: row.status ? row.status : "active",
        dateLastModified: row.dateLastModified,
        username: row.username,
        userId: row.userId,
        givenName: row.givenName,
        familyName: row.familyName,
        role: row.role,
        identifier: row.identifier,
        email: row.email,
        sms: row.sms,
        phone: row.phone
    };

  
    if (metaFields.length > 0) {
        user.metadata = {};
        metaFields.forEach(function(field) {
            if (typeof row[field.dbColumn] !== 'undefined') {
                user.metadata[field.jsonColumn] = row[field.dbColumn];
            }
        });
    }

    if (row.demographics) {
        user.demographics = {
            href: `${hrefBase}/demographics/${row.demographics}`,
            sourcedId: row.demographics,
            type: 'demographics'
        };
    }

    if (row.orgSourcedIds) {
        user.orgs = [];
        row.orgSourcedIds.toString().split(",").forEach(function(sid) {
            sid = sid.trim();
            user.orgs.push({
                href: `${hrefBase}/orgs/${sid}`,
                sourcedId: sid,
                type: 'org'
            });
        });
    }

    return user;
};

function queryUser(req, res, next, role) {
    db.getData(req, res, {
        table: table,
        queryValues: [req.params.id, role],
        selectPrefix: 'u',
        fromStmt: demographicsFromStmt,
        wherePrefix: 'u',
        additionalWhereStmts: `sourcedId = ?${role ? ' AND role = ?' : ''}`, 
        allowButIgnoreThese: "demographics"
    }).then((data) => {
        res.json({user: buildUser(data.results[0], data.hrefBase, data.fields.metaFields)})
    });
};

function queryUsers(req, res, next, role) {
    db.getData(req, res, {
        table: table,
        queryValues: [role],
        selectPrefix: 'u',
        fromStmt: demographicsFromStmt,
        wherePrefix: 'u',
        additionalWhereStmts: role ? 'role = ?' : '',
        allowButIgnoreThese: "demographics"
    }).then((data) => {
        const users = [];
        data.results.forEach(function(row) {
            users.push(buildUser(row, data.hrefBase, data.fields.metaFields));
        });
        res.json({users: users})
    });
};

function queryUsersByClass(req, res, next, role) {
    let userQualifier = '';
    if (role) {
        if (role == 'student') {
            userQualifier = "AND e.role = 'student' ";
        } else if (role == 'teacher') {
            userQualifier = "AND e.role = 'teacher' and e.primary = 'True' ";
        }
    }

    const fromStmt = function(select, fields) {
        let sql = '';
        if (select.indexOf('*') != -1 || fields.requested.indexOf('demographics') != -1) {
            sql = ',d.`userSourcedId` AS demographics FROM users u ';
            sql += 'LEFT JOIN demographics d ON u.sourcedId = d.userSourcedId ';
            sql += 'JOIN enrollments e ON e.userSourcedId = u.sourcedId ';
            sql += 'JOIN classes c ON c.sourcedId = e.classSourcedId ';
        } else {
            sql = 'FROM users u ';
            sql += 'JOIN enrollments e ON e.userSourcedId = u.sourcedId ';
            sql += 'JOIN classes c ON c.sourcedId = e.classSourcedId ';
        }
        return sql;
    }

    db.getData(req, res, {
        table: table,
        queryValues: [req.params.id],
        selectPrefix: 'u',
        fromStmt: fromStmt,
        wherePrefix: 'u',
        additionalWhereStmts: `c.sourcedId = ? ${userQualifier}`,
        allowButIgnoreThese: "demographics"
    }).then((data) => {
        const users = [];
        data.results.forEach(function(row) {
            users.push(buildUser(row, data.hrefBase, data.fields.metaFields));
        });
        res.json({users: users});
    });
};

var queryUsersBySchool = function(req, res, next, role) {
    var userQualifier = '';
    if (role) {
        if (role == 'student') {
            userQualifier = "AND u.role = 'student' ";
        } else if (role == 'teacher') {
            userQualifier = "AND u.role = 'teacher' ";
        }
    }
    db.getData(req, res, {
        table: table,
        queryValues: [`%${req.params.id}%`],
        selectPrefix: 'u',
        fromStmt: demographicsFromStmt,
        wherePrefix: 'u',
        additionalWhereStmts: `u.orgSourceIds LIKE ? ${userQualifier}`,
        allowButIgnoreThese: "demographics"
    }).then((data) => {
        const users = [];
        data.results.forEach(function(row) {
            users.push(buildUser(row, data.hrefBase, data.fields.metaFields));
        });
        res.json({users: users});
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