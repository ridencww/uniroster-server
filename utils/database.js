const crypto = require('crypto');
const mysql = require('promise-mysql');

const config = require('../config');
const tokenizer = require('./tokenizer');
const utils = require('./utils');

let pool;
mysql.createPool({
    connectionLimit: config.db.connectionLimit,
    host: config.db.host,
    user: config.db.user,
    password: config.db.password
}).then((p) => {pool = p;});

const getData = function(req, res, table, queryValues, distinct, fromStmt, wherePrefix, additionalWhereStmts) {
    const datasetSql = "SELECT dataset FROM clients where client_id = (SELECT client_id FROM tokens WHERE access_token = ?)";
    const shaToken = crypto.createHash("sha256").update(req.headers.authorization.split(' ')[1]).digest("hex");
    let dataset, fields;

    return queryDatabase(config.db.authDatabase, datasetSql, [shaToken]).then((results) => {
        dataset = results[0].dataset;
        return tableFields(table);
    }).then((results) => {
        fields = results;
        const select = buildSelectStmt(req, res, fields, distinct);
        const from = fromStmt || `FROM ${table}`;
        const where = buildWhereStmt(req, res, fields, wherePrefix, additionalWhereStmts);
        const orderBy = buildOrderByStmt(req, res, fields);
        const sql = `${select} ${from} ${where} ${orderBy} ${buildLimitStmt(req)}`;
        return queryDatabase(dataset, sql, queryValues);
    }).then((results) => {
        return {
            fields: fields,
            hrefBase: utils.getHrefBase(req),
            results: results
        }
    });
};

const queryDatabase = function(database, sql, values) {
    let connection;
    return pool.getConnection().then((conn) => {
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
    return pool.query(sql, [table]).then((results) => {
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
  
    // IMS Specification: Default limit MUST be 100
    if (limit === '') limit = 'LIMIT 100';
  
    return ' ' + limit + ' ' + offset;
};

const buildOrderByStmt = function(req, res, tableFields) {
    if (req.query.sort && tableFields && tableFields.all.indexOf(req.query.sort) == -1) {
        utils.reportBadRequest(res, "'" + req.query.sort + "' is not a valid field.");
        return null;
    }
  
    regex = new RegExp(/^(asc|desc)$/i);
    if (req.query.orderBy && !regex.test(req.query.orderBy)) {
        utils.reportBadRequest(res, "'" + req.query.orderBy + "' is not a valid orderBy value.");
        return null;
    }
  
    var orderBy = req.query.orderBy ? req.query.orderBy : 'ASC';
    return req.query.sort ? 'ORDER BY ' + req.query.sort + ' ' + orderBy + ' ' : '';
};
  
const buildSelectStmt = function(req, res, tableFields, distinct, prefix, allowButIgnoreThese) {
    const alias = prefix ? prefix + '.' : '';
    const selectPrefix = distinct ? 'SELECT DISTINCT' : 'SELECT';

    if (req.query.fields) {
        // Store fields that act as placeholders (e.g., demographics for u.userSourcedId)
        if (tableFields) {
            tableFields.all.push(allowButIgnoreThese);
        }
    
        let select = '';
        req.query.fields.toString().split(",").forEach(function(field) {
            // Store away the list of fields requested for future reference
            if (tableFields) {
                tableFields.requested.push(field);
            }
      
            // If validFields supplied, field must be in list
            if (tableFields && tableFields.all.indexOf(field) == -1) {
                utils.reportBadRequest(res, `'${field}' is not a valid field.`);
                return null;
            }
      
            // Don't add ignored fields to select list
            if (allowButIgnoreThese && allowButIgnoreThese.indexOf(field) != -1) {
                continue;
            }
      
            if (select.length > 0) select += ",";
            select += `${alias}\`${field.replace('.', '#')}\``
        });
    
        // Fixup for allowButIgnore fields to insure one field is in the select list
        if (select.length === 0) select = alias + 'sourcedId';
    
        return `${selectPrefix} ${select} `;
    } else {
        return `${selectPrefix} ${alias}* `;
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
                utils.reportBadRequest(res, "Expected a valid field identifier, but got  '" + token.value + "'");
                where = null;
                state = 4;
              } else {
                where += ' ' + alias + pool.escapeId(token.value);
                state = 1;
              }
              break;
  
            case 1:
              if (token.type != 'operator') {
                utils.reportBadRequest(res, "Expected a valid predicate, but got  '" + token.value + "'");
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
                utils.reportBadRequest(res, "Value must be surrounded by single quotes (e.g., '" + token.value + "')");
                where = null;
                state = 4;
              } else if (token.type != 'value') {
                utils.reportBadRequest(res, "Expected a value, but got '" + token.value + "'");
                where = null;
                state = 4;
              } else {
                var value = token.value.replace(/^'|'$/g, "");
                if (haveContains == 1) {
                  haveContains = 0;
                  value = '%' + value + '%';
                }
                where += " " + pool.escape(value);
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
    pool: pool,
    queryDatabase: queryDatabase,
    tableFields: tableFields,
};