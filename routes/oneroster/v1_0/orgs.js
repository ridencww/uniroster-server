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
            sourceId: row.parentSourcedId,
            type: 'org'
        }
    }
  
    if (row.childSourcedIds) {
        const children = [];
        row.childSourcedIds.toString().split(",").forEach(function(sid) {
            children.push({
                href: `${hrefBase}/orgs/${sid}`,
                sourceId: sid,
                type: 'org'
            });
        });
        org.children = children;
    }
  
    return org;
};

function queryOrg(req, res, next, type) {
    db.getData(req, res, table, [req.params.id, type], false, '', '', '', `sourcedId = ?${type ? ' AND type = ?' : ''}`).then((data) => {
        res.json({
            orgs: buildOrg(data.results[0], data.hrefBase, data.fields.metaFields)
        });
    });
};

function queryOrgs(req, res, next, type) {
    db.getData(req, res, table, [type], false, '', '', '', type ? ' type = ?' : '').then((data) => {
        const orgs = [];
        data.results.forEach(function(row) {
            orgs.push(buildOrg(row, data.hrefBase, data.fields.metaFields));
        })
        res.json({
            orgs: orgs
        });
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