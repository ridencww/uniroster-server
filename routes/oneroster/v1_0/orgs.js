const db = require('../../../utils/database');
const router = require('express').Router();
const table = 'orgs';

function buildOrg(row, hrefBase, metaFields) {
    const org = {
        sourcedId: row.sourcedId,
        status: row.status ? row.status : "active",
        dateLastModified: row.dateLastModified,
        name: row.name,
        type: row.type,
        identifier: row.identifier
    };
  
    if (metaFields.length > 0) {
        const metadata = {};
        metaFields.forEach(function(field) {
            metadata[field.jsonColumn] = row[field.dbColumn];
        });
        org.metadata = metadata;
    }
  
    if (row.parentSourcedId) {
        org.parent = {
            href: `${hrefBase}/orgs/${row.parentSourcedId}`,
            sourcedId: row.parentSourcedId,
            type: 'org'
        }
    }
  
    if (row.childSourcedIds) {
        org.children = [];
        row.childSourcedIds.toString().split(",").forEach(function(sid) {
            org.children.push({
                href: `${hrefBase}/orgs/${sid}`,
                sourcedId: sid,
                type: 'org'
            });
        });
    }
  
    return org;
};

function queryOrg(req, res, next, type) {
    db.getData(req, res, {
        table: table,
        queryValues: [req.params.id, type],
        additionalWhereStmts: `sourcedId = ?${type ? ' AND type = ?' : ''}`
    }).then((data) => {
        if (data) {
            res.json({
                orgs: buildOrg(data.results[0], data.hrefBase, data.fields.metaFields)
            });
        }
    });
};

function queryOrgs(req, res, next, type) {
    db.getData(req, res, {
        table: table,
        queryValues: [type],
        additionalWhereStmts: type ? 'type = ?' : ''
    }).then((data) => {
        if (data) {
            const orgs = [];
            data.results.forEach(function(row) {
                orgs.push(buildOrg(row, data.hrefBase, data.fields.metaFields));
            })
            res.json({orgs: orgs});
        }
    });
};

router.get('/orgs', function(req, res, next) {
    queryOrgs(req, res, next);
});
  
  router.get('/schools', function(req, res, next) {
    queryOrgs(req, res, next, "school");
});
  
router.get('/orgs/:id', function(req, res, next) {
    queryOrg(req, res, next);
});

router.get('/schools/:id', function(req, res, next) {
    queryOrg(req, res, next, "school");
});

module.exports = router;