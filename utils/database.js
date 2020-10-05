const config = require('../config');
const errors = require('./utils');
const mysql = require('promise-mysql');

const pool = mysql.createPool({
    connectionLimit: config.db.connectionLimit,
    host: config.db.host,
    user: config.db.user,
    password: config.db.password
});

const getData = function(req, res, table, queryValues, additionalWhereStmts) {
    const datasetSql = "SELECT dataset FROM clients where client_id = (SELECT client_id FROM tokens WHERE access_token = ?)";
    const token = req.headers.authorization.split(' ')[1];

    let dataset, fields;

    return queryDatabase(config.db.authDatabase, datasetSql, [token]).then((results) => {
        dataset = results[0].dataset;
        return tableFields(table);
    }).then((results) => {
        fields = results;
        const select = buildSelectStmt(req, res, fields);
        const where = buildWhereStmt(req, res, fields, '', additionalWhereStmts);
        const orderBy = buildOrderByStmt(req, res, fields);
        const sql = `${select} FROM ${table} ${where} ${orderBy} ${buildLimitStmt(req)}`;
        return queryDatabase(dataset, sql, queryValues);
    }).then((results) => {
        return {
            fields: fields,
            results: results
        }
    });
};

const query = function(sql, values) {
    return pool.then((pool) => {
        return pool.query(sql, values);
    })
}

const queryDatabase = function(database, sql, values) {
    let connection;
    return pool.then((pool) => {
        return pool.getConnection();
    }).then((conn) => {
        connection = conn;
        conn.changeUser({database: database});
        return conn.query(sql, values);
    }).then((results) => {
        connection.release();
        return results;
    });
}

const tableFields = function(table) {
    const sql = "SELECT column_name FROM information_schema.columns WHERE table_name = ?"
    return query(sql, [table]).then((results) => {
        const all = [];
        const metaFields = [];
        const requested = [];
        results.forEach(function(row) {
            all.push(row.column_name.replace("#", "."));
            if (row.column_name.indexOf("metadata#") != -1) {
                const column = {};
                column.dbColumn = row.column_name;
                column.jsonColumn = row.column_name.substring(9);
                metaFields.push(column);
            }
        });
        return {
            all: all,
            metaFields: metaFields,
            requested: requested
        }
    })
}

const buildLimitStmt = function(req) {
    var limit = isNaN(Number(req.query.limit)) ? '' : 'LIMIT ' + Number(req.query.limit);
    var offset = isNaN(Number(req.query.offset)) ? '' : 'OFFSET ' + Number(req.query.offset);
  
    // Failsafe to avoid clobbering server
    if (limit === '') limit = 'LIMIT 1000';
  
    return ' ' + limit + ' ' + offset;
};

const buildOrderByStmt = function(req, res, tableFields) {
    if (req.query.sort && tableFields && tableFields.all.indexOf(req.query.sort) == -1) {
      errors.reportBadRequest(res, "'" + req.query.sort + "' is not a valid field.");
      return null;
    }
  
    regex = new RegExp(/^(asc|desc)$/i);
    if (req.query.orderBy && !regex.test(req.query.orderBy)) {
        errors.reportBadRequest(res, "'" + req.query.orderBy + "' is not a valid orderBy value.");
      return null;
    }
  
    var orderBy = req.query.orderBy ? req.query.orderBy : 'ASC';
    return req.query.sort ? 'ORDER BY ' + req.query.sort + ' ' + orderBy + ' ' : '';
};
  
const buildSelectStmt = function(req, res, tableFields, prefix, allowButIgnoreThese) {
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
            errors.reportBadRequest(res, "'" + field + "' is not a valid field.");
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
                errors.reportBadRequest(res, "Expected a valid field identifier, but got  '" + token.value + "'");
                where = null;
                state = 4;
              } else {
                where += ' ' + alias + db.pool.escapeId(token.value);
                state = 1;
              }
              break;
  
            case 1:
              if (token.type != 'operator') {
                errors.reportBadRequest(res, "Expected a valid predicate, but got  '" + token.value + "'");
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
                errors.reportBadRequest(res, "Value must be surrounded by single quotes (e.g., '" + token.value + "')");
                where = null;
                state = 4;
              } else if (token.type != 'value') {
                errors.reportBadRequest(res, "Expected a value, but got '" + token.value + "'");
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

module.exports = {
    buildOrderByStmt: buildOrderByStmt,
    buildLimitStmt: buildLimitStmt,
    buildSelectStmt: buildSelectStmt,
    buildWhereStmt: buildWhereStmt,
    getData: getData,
    query: query,
    queryDatabase: queryDatabase,
    tableFields: tableFields,
};