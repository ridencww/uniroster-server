var app = require('../../../uniroster-server.js');
var db = require('../../../lib/database.js');
var express = require('express');
var utils = require('../../../lib/onerosterUtils.js');

var uuidv4 = require('uuid/v4');

var router = express.Router();

var buildLineItem = function(row, hrefBase, metaFields) {
  var lineItem = {};
  lineItem.sourcedId = uuidv4();
  lineItem.status = "active";
  lineItem.dateLastModified = "2018-04-12T00:00:00.000Z";
  lineItem.title = "Line item " + uuidv4();
  lineItem.description = "Another line item";
  lineItem.assignDate = "2018-04-12T00:00:00.000Z";
  lineItem.dueDate = "2018-04-15T00:00:00.000Z";

  var id = uuidv4();
  var clazz = {};
  clazz.href = hrefBase + '/classes/' + id;
  clazz.sourcedId = id;
  clazz.type = 'class';
  lineItem.class = clazz;

  id = uuidv4();
  var cat = {};
  cat.href = hrefBase + '/categories/' + id;
  cat.sourcedId = id;
  cat.type = 'category';
  lineItem.category = cat;

  id = uuidv4();
  var gp = {};
  gp.href = hrefBase + '/categories/' + id;
  gp.sourcedId = id;
  gp.type = 'academicSession';
  lineItem.gradingPeriod = gp;

  lineItem.resultValueMin = 0.0;
  lineItem.resultValueMax = 100.0;
  return lineItem;
};

var queryLineItem = function(req, res, next) {
  var hrefBase = req.protocol + "://" + req.headers.host + req.baseUrl;

  var wrapper = {};
  wrapper.lineItem = buildLineItem(null, hrefBase, null);
  res.json(wrapper);
};

var queryLineItems = function(req, res, next, type) {
  var hrefBase = req.protocol + "://" + req.headers.host + req.baseUrl;

  var wrapper = {};
  wrapper.lineItems = [];

  var i;
  for (i = 0; i < 5; i++) {
    wrapper.lineItems.push(buildLineItem(null, hrefBase, null));
  }

  res.json(wrapper);
};

router.get('/lineItems', function(req, res, next) {
  queryLineItems(req, res, next);
});

router.get('/lineItems/:id', function(req, res, next) {
  queryLineItem(req, res, next);
});

module.exports = router;
