"use strict";

const db = require("../utils/database");

async function queryAcademicSession(req, res){

    let responseJSON = {};

    await db.getData(req, res, {
        table: table,
        queryValues: [req.params.id, type],
        additionalWhereStmts: `sourcedId = ?${type ? ' AND type = ?' : ''}`
    }).then((data) => {
        if (data.results.length === 0) {
            // utils.reportNotFound(res, 'Academic session not found');
            throw 'Academic session not found';
        } else {
            responseJSON = {
                academicSession: buildAcademicSession(data.results[0], data.hrefBase, data.fields.metaFields)
            };
        }
    });

    return responseJSON;
}

async function queryAcademicSessions(req,res, type) {

    let responseJSON = {};
    await db.getData(req, res, {
        table: table,
        queryValues: [type],
        additionalWhereStmts: type ? 'type = ?' : ''
    }).then((data) => {
        if (data) {
            const academicSessions = [];
            data.results.forEach(function(row) {
                academicSessions.push(buildAcademicSession(row, data.hrefBase, data.fields.metaFields));
            });
            responseJSON = {
                academicSessions: academicSessions
            };
        }
    });

    return responseJSON;
};

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

module.exports = {
    queryAcademicSession:queryAcademicSession,
    queryAcademicSessions:queryAcademicSessions
};

