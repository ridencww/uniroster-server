var app = require('../../../uniroster-server.js');
var db = require('../../../lib/database.js');
var express = require('express');
var utils = require('../../../lib/onerosterUtils.js');

var router = express.Router();

var buildDemographics = function(row, hrefBase, metaFields) {
  var demographics = {};
  demographics.sourcedId = row.userSourcedId;
  demographics.status = row.status ? row.status : "active";
  demographics.dateLastModified = row.dateLastModified;

  var metadata = {};
  metaFields.forEach(function(field) {
    metadata[field.jsonColumn] = row[field.dbColumn];
  });
  if (metaFields.length > 0) {
    demographics.metadata = metadata;
  }

  demographics.birthdate = row.birthdate;
  demographics.sex = row.sex;
  demographics.americanIndianOrAlaskaNative = row.americanIndianOrAlaskaNative;
  demographics.asian = row.asian;
  demographics.blackOrAfricanAmerican = row.blackOrAfricanAmerican;
  demographics.nativeHawaiianOrOtherPacificIslander = row.nativeHawaiianOrOtherPacificIslander;
  demographics.white = row.white;
  demographics.demographicRaceTwoOrMoreRaces = row.demographicRaceTwoOrMoreRaces;
  demographics.hispanicOrLatinoEthnicity = row.hispanicOrLatinoEthnicity;
  demographics.countryOfBirthCode = row.countryOfBirthCode;
  demographics.stateOfBirthAbbreviation = row.stateOfBirthAbbreviation;
  demographics.cityOfBirth = row.cityOfBirth;
  demographics.publicSchoolResidenceStatus = row.publicSchoolResidenceStatus;

  return demographics;
};

var queryDemographic = function(req, res, next) {
  db.setup(req, res, function(connection, hrefBase, type) {
    db.tableFields(connection, 'demographics', function(fields) {
      var select = utils.buildSelectStmt(req, res, fields);
      if (select === null) {
        connection.release();
        return;
      }

      var where = utils.buildWhereStmt(req, res, fields, '', 'userSourcedId = ?');
      if (where === null) {
        connection.release();
        return;
      }

      var orderBy = utils.buildOrderByStmt(req, res, fields);
      if (orderBy === null) {
        connection.release();
        return;
      }

      var sql = select + 'FROM demographics ';
      sql += where;
      sql += orderBy;
      sql += utils.buildLimitStmt(req);

      connection.query(sql, [req.params.id], function(err, rows) {
        connection.release();

        if (err) {
          utils.reportServerError(res, err);
          return;
        }

        if (rows.length == 0) {
          utils.reportNotFound(res);
        } else {
          var wrapper = {};
          wrapper.demographics = buildDemographics(rows[0], hrefBase, fields.metaFields);
          res.json(wrapper);
        }
      });
    });
  });
};

var queryDemographics = function(req, res, next) {
  db.setup(req, res, function(connection, hrefBase, type) {
    db.tableFields(connection, 'demographics', function(fields) {
      var select = utils.buildSelectStmt(req, res, fields);
      if (select === null) {
        connection.release();
        return;
      }

      var where = utils.buildWhereStmt(req, res, fields);
      if (where === null) {
        connection.release();
        return;
      }

      var orderBy = utils.buildOrderByStmt(req, res, fields);
      if (orderBy === null) {
        connection.release();
        return;
      }

      var sql = select + 'FROM demographics ';
      sql += where;
      sql += orderBy;
      sql += utils.buildLimitStmt(req);

      connection.query(sql, function(err, rows) {
        connection.release();

        if (err) {
          utils.reportServerError(res, err);
          return;
        }

        var wrapper = {};
        wrapper.demographics = [];
        rows.forEach(function(row) {
          wrapper.demographics.push(buildDemographics(row, hrefBase, fields.metaFields));
        });
        res.json(wrapper);
      });
    });
  });
};

router.get('/demographics', function(req, res, next) {
  queryDemographics(req, res, next);
});

router.get('/demographics/:id', function(req, res, next) {
  queryDemographic(req, res, next);
});

module.exports = router;
