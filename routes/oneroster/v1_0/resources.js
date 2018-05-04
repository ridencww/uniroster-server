var app = require('../../../uniroster-server.js');
var db = require('../../../lib/database.js');
var express = require('express');
var utils = require('../../../lib/onerosterUtils.js');

var uuidv4 = require('uuid/v4');

var router = express.Router();

var buildResource = function(row, hrefBase, metaFields) {
  var id = uuidv4();

  var resource = {};
  resource.sourcedId = uuidv4();
  resource.status = "active";
  resource.dateLastModified = "2018-04-12T00:00:00.000Z";
  resource.title = "My " + id + " Workbook";
  resource.roles = "student";
  resource.importance = "primary";
  resource.vendorResourceId = id;
  resource.vendorId = "FSS";
  resource.applicationId = "Destiny Plus";

  return resource;
};

var queryResource = function(req, res, next) {
  var wrapper = {};
  wrapper.resource = buildResource(null, null, null);
  res.json(wrapper);
};

var queryResources = function(req, res, next, type) {
  var wrapper = {};
  wrapper.resources = [];

  var i;
  for (i = 0; i < 5; i++) {
    wrapper.resources.push(buildResource(null, null, null));
  }

  res.json(wrapper);
};

router.get('/resources', function(req, res, next) {
  queryResources(req, res, next);
});

router.get('/resources/:id', function(req, res, next) {
  queryResource(req, res, next);
});

module.exports = router;
