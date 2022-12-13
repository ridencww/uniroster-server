const db = require('../../../utils/database');
const router = require('express').Router();
const table = 'academicsessions';
const academicSessionsService = require('../../../services/academicSessionsService');

function buildAcademicSession(row, hrefBase, metaFields) {
    const academicSession = {
        sourcedId: row.sourcedId,
        status: row.status ? row.status : "active",
        dateLastModified: row.dateLastModified,
        title: row.title,
        startDate: row.startDate,
        endDate: row.endDate,
        type: row.type
    };
  
    if (metaFields.length > 0) {
        academicSession.metadata = {};
        metaFields.forEach(function(field) {
            academicSession.metadata[field.jsonColumn] = row[field.dbColumn];
        });
    }
  
    if (row.parentSourcedId) {
        academicSession.parent = {
            href: `${hrefBase}/academicSessions/${row.parentSourcedId}`,
            sourcedId: row.parentSourcedId,
            type: 'academicSession'
        };
    }
  
    if (row.childSourcedIds) {
        academicSession.children = [];
        row.childSourcedIds.toString().split(",").forEach(function(sid) {
            academicSession.children.push({
                href: `${hrefBase}/academicSessions/${sid}`,
                sourcedId: sid,
                type: 'academicSession'
            });
        });
    }
  
    return academicSession;
};

function queryAcademicSession(req, res, next, type) {
    // db.getData(req, res, {
    //     table: table,
    //     queryValues: [req.params.id, type],
    //     additionalWhereStmts: `sourcedId = ?${type ? ' AND type = ?' : ''}`
    // }).then((data) => {
    //     if (data.results.length === 0) {
    //         utils.reportNotFound(res, 'Academic session not found');
    //     } else {
    //         res.json({
    //             academicSession: buildAcademicSession(data.results[0], data.hrefBase, data.fields.metaFields)
    //         });
    //     }
    // });

    try {
        let responsePayload = academicSessionsService.queryAcademicSession(req,res);
        res.json(responsePayload);
    } catch (e){
        utils.reportNotFound(res,e.message);
    }
}

function queryAcademicSessions(req, res, next, type) {
    try {
        let responsePayload = academicSessionsService.queryAcademicSessions(req, res, type);
        res.json(responsePayload);
    } catch (e){
        utils.reportNotFound(res,e.message);
    }
}

function queryAcademicSessionsForSchool(req, res, next, type) {
    // db.getData(req, res, {
    //     table: table,
    //     queryValues: [req.params.id, type],
    //     distinct: true,
    //     fromStmt: 'FROM academicsessions a, classes c ',
    //     wherePrefix: 'a',
    //     additionalWhereStmts: `c.termSourcedId = a.sourcedId AND c.schoolSourcedId = ?${type ? ' AND type = ?' : ''}`
    // }).then((data) => {
    //     if (data) {
    //         const academicSessions = [];
    //         data.results.forEach(function(row) {
    //         academicSessions.push(buildAcademicSession(row, data.hrefBase, data.fields.metaFields));
    //         });
    //         res.json({academicSessions: academicSessions});
    //     }
    // });

    try{
        let academicSessionsPayload = academicSessionsService.queryAcademicSessionsForSchool(req, res, next, type);
        res.json(academicSessionsPayload);
    } catch (e) {
        utils.reportNotFound(res,e.message);
    }

}

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

router.get('/schools/:id/terms', function(req, res, next) {
    queryAcademicSessionsForSchool(req, res, next, "term");
});

module.exports = router;