var app = require('../../../uniroster-server.js');
var db = require('../../../lib/database.js');
var express = require('express');
var utils = require('../../../lib/onerosterUtils.js');

var uuidv4 = require('uuid/v4');

var router = express.Router();

var buildResult = function(row, hrefBase, metaFields) {
  var result = {};
  result.sourcedId = uuidv4();
  result.status = "active";
  result.dateLastModified = "2018-04-12T00:00:00.000Z";

  var id = uuidv4();
  var li = {};
  li.href = hrefBase + '/lineItems/' + id;
  li.sourcedId = id;
  li.type = 'lineItem';
  result.lineItem = li;

  id = uuidv4();
  var s = {};
  s.href = hrefBase + '/users/' + id;
  s.sourcedId = id;
  s.type = 'user';
  result.student = s;

  result.scoreStatus = 'submitted';
  result.score = 86.0;
  result.scoreDate = "2018-04-12T00:00:00.000Z";
  result.comment = "Good job";

  return result;
};

var queryResult = function(req, res, next) {
  var hrefBase = req.protocol + "://" + req.headers.host + req.baseUrl;

  var wrapper = {};
  wrapper.result = buildResult(null, hrefBase, null);
  res.json(wrapper);
};

var queryResults = function(req, res, next, type) {
  var hrefBase = req.protocol + "://" + req.headers.host + req.baseUrl;

  var wrapper = {};
  wrapper.results = [];

  var i;
  for (i = 0; i < 5; i++) {
    wrapper.results.push(buildResult(null, hrefBase, null));
  }

  res.json(wrapper);
};

router.get('/results', function(req, res, next) {
  queryResults(req, res, next);
});

router.get('/results/:id', function(req, res, next) {
  queryResult(req, res, next);
});

module.exports = router;
