const db = require('../../../utils/database');
const router = require('express').Router();
const table = 'orgs';
const utils = require('../../../utils/utils');

function buildOrg(row, hrefBase, metaFields) {
    const org = {};
    org.sourcedId = row.sourcedId;
    org.status = row.status ? row.status : "active";
    org.dateLastModified = row.dateLastModified;
  
    const metadata = {};
    metaFields.forEach(function(field) {
        metadata[field.jsonColumn] = row[field.dbColumn];
    });
    if (metaFields.length > 0) {
        org.metadata = metadata;
    }
  
    org.name = row.name;
    org.type = row.type;
    org.identifier = row.identifier;
  
    if (row.parentSourcedId) {
        const parent = {};
        parent.href = hrefBase + '/orgs/' + row.parentSourcedId;
        parent.sourcedId = row.parentSourcedId;
        parent.type = 'org';
        org.parent = parent;
    }
  
    if (row.childSourcedIds) {
        const children = [];
        const fields = row.childSourcedIds.toString().split(",");
        fields.forEach(function(sid) {
            const child = {};
            child.href = hrefBase + '/orgs/' + sid;
            child.sourcedId = sid;
            child.type = 'org';
            children.push(child);
        });
        org.children = children;
    }
  
    return org;
};

function queryOrg(req, res, next, type) {
    db.getData(req, res, table, [req.params.id, type], 'sourcedId = ? ' + (type ? ' AND type = ?' : '')).then((data) => {
        const hrefBase = utils.getHrefBase(req);
        const wrapper = {
            orgs: buildOrg(data.results[0], hrefBase, data.fields.metaFields)
        };
        res.json(wrapper);
    });
};

function queryOrgs(req, res, next, type) {
    db.getData(req, res, table, [type], type ? ' type = ?' : '').then((data) => {
        const hrefBase = utils.getHrefBase(req);
        const wrapper = {};
        wrapper.orgs = [];
        data.results.forEach(function(row) {
            wrapper.orgs.push(buildOrg(row, hrefBase, data.fields.metaFields));
        })
        res.json(wrapper);
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