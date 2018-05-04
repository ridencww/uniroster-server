var app = require('../../../uniroster-server.js');
var db = require('../../../lib/database.js');
var express = require('express');
var utils = require('../../../lib/onerosterUtils.js');

var uuidv4 = require('uuid/v4');

var router = express.Router();

var buildCategory = function(row, hrefBase, metaFields) {
  var category = {};
  category.sourcedId = uuidv4();
  category.status = "active";
  category.dateLastModified = "2018-04-12T00:00:00.000Z";
  category.title = "My " + uuidv4() + " Category";
  return category;
};

var queryCategory = function(req, res, next) {
  var wrapper = {};
  wrapper.category = buildCategory(null, null, null);
  res.json(wrapper);
};

var queryCategories = function(req, res, next, type) {
  var wrapper = {};
  wrapper.categories = [];

  var i;
  for (i = 0; i < 5; i++) {
    wrapper.categories.push(buildCategory(null, null, null));
  }

  res.json(wrapper);
};

router.get('/categories', function(req, res, next) {
  queryCategories(req, res, next);
});

router.get('/categories/:id', function(req, res, next) {
  queryCategory(req, res, next);
});

module.exports = router;
