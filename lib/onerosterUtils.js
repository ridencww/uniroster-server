var db = require('./database');
var tokenizer = require('./tokenizer');
var url = require('url');

var buildLimitStmt = function(req) {
  var limit = isNaN(Number(req.query.limit)) ? '' : 'LIMIT ' + Number(req.query.limit);
  var offset = isNaN(Number(req.query.offset)) ? '' : 'OFFSET ' + Number(req.query.offset);

  // Failsafe to avoid clobbering server
  if (limit === '') limit = 'LIMIT 1000';

  return ' ' + limit + ' ' + offset;
};

var buildOrderByStmt = function(req, res, tableFields) {
  if (req.query.sort && tableFields && tableFields.all.indexOf(req.query.sort) == -1) {
    reportBadRequest(res, "'" + req.query.sort + "' is not a valid field.");
    return null;
  }

  regex = new RegExp(/^(asc|desc)$/i);
  if (req.query.orderBy && !regex.test(req.query.orderBy)) {
    reportBadRequest(res, "'" + req.query.orderBy + "' is not a valid orderBy value.");
    return null;
  }

  var orderBy = req.query.orderBy ? req.query.orderBy : 'ASC';
  return req.query.sort ? 'ORDER BY ' + req.query.sort + ' ' + orderBy + ' ' : '';
};

var buildSelectStmt = function(req, res, tableFields, prefix, allowButIgnoreThese) {
  var alias = prefix ? prefix + '.' : '';
  if (req.query.fields) {
    // Store fields that act as placeholders (e.g., demographics for u.userSourcedId)
    if (tableFields) {
      tableFields.all.push(allowButIgnoreThese);
    }

    var select = '';
    var fields = req.query.fields.toString().split(",");
    for (var i = 0; i < fields.length; i++) {
      var field = fields[i];

      // Store away the list of fields requested for future reference
      if (tableFields) {
        tableFields.requested.push(field);
      }

      // If validFields supplied, field must be in list
      if (tableFields && tableFields.all.indexOf(field) == -1) {
        reportBadRequest(res, "'" + field + "' is not a valid field.");
        return null;
      }

      // Don't all ignored fields to select list
      if (allowButIgnoreThese && allowButIgnoreThese.indexOf(field) != -1) {
        continue;
      }

      if (select.length > 0) select += ",";
      select += alias + '`' + field.replace('.', '#') + '`';
    }

    // Fixup for allowButIgnore fields to insure one field is in the select list
    if (select.length === 0) select = alias + 'sourcedId';

    return 'SELECT ' + select + ' ';
  } else {
    return 'SELECT ' + alias + '* ';
  }
};

var buildWhereStmt = function(req, res, tableFields, prefix, additionalStmts) {
  var where = '';

  var alias = prefix ? prefix + '.' : '';

  if (req.query.filter) {
    tokenizer.initOneRosterV1();
    var tokens = tokenizer.tokenize(req.query.filter);

    var i = 0;
    var state = 0;
    var token = tokens[i++];
    var haveContains = 0;

    while (token.type !== 'end') {
      if (token.type != 'whitespace') {
        switch (state) {
          case 0:
            if (token.type != 'field' || tableFields.all.indexOf(token.value) == -1) {
              reportBadRequest(res, "Expected a valid field identifier, but got  '" + token.value + "'");
              where = null;
              state = 4;
            } else {
              where += ' ' + alias + db.pool.escapeId(token.value);
              state = 1;
            }
            break;

          case 1:
            if (token.type != 'operator') {
              reportBadRequest(res, "Expected a valid predicate, but got  '" + token.value + "'");
              where = null;
              state = 4;
            } else {
              if (token.value === 'contains') {
                haveContains = 1;
                token.value = 'LIKE';
              }
              where += ' ' + token.value;
              state = 2;
            }
            break;

          case 2:
            if (token.type === 'field') {
              reportBadRequest(res, "Value must be surrounded by single quotes (e.g., '" + token.value + "')");
              where = null;
              state = 4;
            } else if (token.type != 'value') {
              reportBadRequest(res, "Expected a value, but got '" + token.value + "'");
              where = null;
              state = 4;
            } else {
              var value = token.value.replace(/^'|'$/g, "");
              if (haveContains == 1) {
                haveContains = 0;
                value = '%' + value + '%';
              }
              where += " " + db.pool.escape(value);
              state = 3;
            }
            break;

          case 3:
            if (token.type == 'boolean') {
              where += ' ' + token.value;
            }
            state = 0;
            break;

          case 4:
            break;
        }
      }
      token = tokens[i++];
    }
  }

  if (where !== null) {
    if (additionalStmts) {
      if (where.length > 0) {
        where += ' AND ';
      }
      where += additionalStmts;
    }
    if (where.length > 0) {
      where = 'WHERE ' + where;
    }
  }

  return where;
};

var reportBadRequest = function(res, err) {
  var wrapper = {};
  wrapper.errors = {};
  wrapper.errors.codeMajor = 'FAILURE';
  wrapper.errors.severity = 'ERROR';
  wrapper.errors.codeMinor = 'INVALID DATA';
  wrapper.errors.description = 'Bad request ‐ the request was invalid and cannot be served.';
  if (err) wrapper.errors.description += ' ' + err;
  res.statusCode = 400;
  res.json(wrapper);
};

var reportNotAuthorized = function(res) {
  var wrapper = {};
  wrapper.errors = {};
  wrapper.errors.codeMajor = 'FAILURE';
  wrapper.errors.severity = 'ERROR';
  wrapper.errors.codeMinor = 'UNAUTHORIZED';
  wrapper.errors.description = 'Unauthorized - the request requires authorization.';

  res.statusCode = 401;
  res.json(wrapper);
};

var reportNotFound = function(res) {
  var wrapper = {};
  wrapper.errors = {};
  wrapper.errors.codeMajor = 'FAILURE';
  wrapper.errors.severity = 'ERROR';
  wrapper.errors.codeMinor = 'UNKNOWN OBJECT';
  wrapper.errors.description = 'Not Found – there is no resource behind the URI.';

  res.statusCode = 404;
  res.json(wrapper);
};

var reportServerError = function(res, err) {
  console.trace(err);
  var wrapper = {};
  wrapper.errors = {};
  wrapper.errors.codeMajor = 'FAILURE';
  wrapper.errors.severity = 'ERROR';
  wrapper.errors.codeMinor = 'UNKNOWN OBJECT';
  wrapper.errors.description = 'Internal server error.';
  res.statusCode = err ? err.status | 500 : 500;
  res.json(wrapper);
};

module.exports.buildLimitStmt = buildLimitStmt;
module.exports.buildOrderByStmt = buildOrderByStmt;
module.exports.buildSelectStmt = buildSelectStmt;
module.exports.buildWhereStmt = buildWhereStmt;
module.exports.reportBadRequest = reportBadRequest;
module.exports.reportNotAuthorized = reportNotAuthorized;
module.exports.reportNotFound = reportNotFound;
module.exports.reportServerError = reportServerError;
