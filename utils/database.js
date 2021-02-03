const crypto = require('crypto');
const mysql = require('promise-mysql');

const config = require('../config');
const tokenizer = require('./tokenizer');
const utils = require('./utils');

const poolPromise = mysql.createPool({
    connectionLimit: config.db.connectionLimit,
    host: config.db.host,
    user: config.db.user,
    password: config.db.password
});

let pool;
poolPromise.then((p) => {
    pool = p;
})

const getData = function(req, res, sqlParams) {
    const datasetSql = "SELECT dataset FROM clients where client_id = (SELECT client_id FROM tokens WHERE access_token = ?)";
    const shaToken = crypto.createHash("sha256").update(req.headers.authorization.split(' ')[1]).digest("hex");
    let dataset, fields;

    return queryDatabase(config.auth.database, datasetSql, [shaToken]).then((results) => {
        dataset = results[0].dataset;
        return tableFields(sqlParams.table);
    }).then((results) => {
        fields = results;

        const select = buildSelectStmt(req, res, fields, sqlParams);
        if (select === null) return null;

        let from;
        if (sqlParams.fromStmt) {
            if (typeof sqlParams.fromStmt === "function") {
                from = sqlParams.fromStmt(select, fields);
            } else {
                from = sqlParams.fromStmt;
            }
        } else {
            from = `FROM ${sqlParams.table}`;
        }

        const where = buildWhereStmt(req, res, fields, sqlParams);
        if (where === null) return null;

        const orderBy = buildOrderByStmt(req, res, fields);
        if (orderBy === null) return null;

        const limit = buildLimitStmt(req, res, sqlParams);
        if (limit === null) return null;

        const sql = `${select} ${from} ${where} ${orderBy} ${limit}`;
        return queryDatabase(dataset, sql, sqlParams.queryValues);
    }).then((results) => {
        return {
            fields: fields,
            hrefBase: utils.getHrefBase(req),
            results: results
        }
    }).catch((err) => {
        utils.reportServerError(res, err);
        return null;
    });
}

const queryDatabase = function(database, sql, values) {
    let connection;
    return poolPromise.then((p) => {
        return p.getConnection();
    }).then((conn) => {
        connection = conn;
        conn.changeUser({database: database});
        console.log(sql);
        return conn.query(sql, values);
    }).then((results) => {
        connection.release();
        return results;
    });
}

const tableFields = function(table) {
    const sql = "SELECT column_name FROM information_schema.columns WHERE table_name = ?"
    return poolPromise.then((p) => {
        return p.query(sql, [table]);
    }).then((results) => {
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

const buildLimitStmt = function(req, res, sqlParams) {
    let limit = 'LIMIT ', offset = 'OFFSET ';

    if (sqlParams.limit) {
        limit += sqlParams.limit;
    } else if (req.query.limit) {
        if (isNaN(Number(req.query.limit))) {
            utils.reportBadRequest(res, `'req.query.limit' is not a valid limit`);
            return null;
        }
        limit += Number(req.query.limit);
    } else {
        // IMS Specification: Default limit MUST be 100
        limit += '100';
    }

    if (sqlParams.offset) {
        offset += sqlParams.offset;
    } else if (req.query.offset) {
        if (isNaN(Number(req.query.offset))) {
            utils.reportBadRequest(res, `'req.query.offset' is not a valid offset`);
            return null;
        }
        offset += Number(req.query.offset);
    } else {
        offset = "";
    }
  
    return ` ${limit} ${offset}`;
};

const buildOrderByStmt = function(req, res, tableFields) {
    if (req.query.sort) {
        if (tableFields && tableFields.all.indexOf(req.query.sort) == -1) {
            utils.reportBadRequest(res, "'" + req.query.sort + "' is not a valid field.");
            return null;
        }

        regex = new RegExp(/^(asc|desc)$/i);
        if (req.query.orderBy && !regex.test(req.query.orderBy)) {
            utils.reportBadRequest(res, "'" + req.query.orderBy + "' is not a valid orderBy value.");
            return null;
        }

        const orderBy = req.query.orderBy ? req.query.orderBy : 'ASC';
        return `ORDER BY ${req.query.sort} ${orderBy} `;
    } else {
        return ''
    }
};
  
const buildSelectStmt = function(req, res, tableFields, sqlParams) {
    const alias = sqlParams.selectPrefix ? `${sqlParams.selectPrefix}.` : "";
    let select = sqlParams.distinct ? 'SELECT DISTINCT ' : 'SELECT ';

    if (req.query.fields) {
        // Store fields that act as placeholders (e.g., demographics for u.userSourcedId)
        if (tableFields) {
            tableFields.all.push(allowButIgnoreThese);
        }
    
        let addedField = false;
        const badFields = [];
        req.query.fields.toString().split(",").forEach(function(field) {
            // Store away the list of fields requested for future reference
            if (tableFields) {
                tableFields.requested.push(field);
            }
      
            // If validFields supplied, field must be in list
            if (tableFields && tableFields.all.indexOf(field) == -1) {
                utils.reportBadRequest(res, `'${field}' is not a valid field.`);
                badFields.push(field);
                return;
            }
      
            // Don't add ignored fields to select list
            if (sqlParams.allowButIgnoreThese && sqlParams.allowButIgnoreThese.indexOf(field) != -1) {
                return;
            }
      
            if (select.length > 0) select += ",";
            select += pool.escapeId(`${alias}${field.replace('.', '#')}`);
        });

        if (badFields.length > 0) {
            const message = badFields.length === 1 ? `'${badFields[0]}' is not a valid field` : `${badFields.join(', ')} are not valid fields`;
            utils.reportBadRequest(res, message);
            return null;
        }
    
        // Fixup for allowButIgnore fields to insure one field is in the select list
        if (select.length === 0) select = `${alias}sourcedId`;
    
        return `${selectPrefix} ${select} `;
    } else {
        return `${select} ${alias}* `;
    }
};
  
var buildWhereStmt = function(req, res, tableFields, sqlParams) {
    let where = '';
  
    const alias = sqlParams.wherePrefix ? `${sqlParams.wherePrefix}.` : '';
  
    if (req.query.filter) {
        tokenizer.initOneRosterV1();
        const tokens = tokenizer.tokenize(req.query.filter);
    
        let i = 0;
        let state = 0;
        let token = tokens[i++];
        let haveContains = 0;
    
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
        if (sqlParams.additionalWhereStmts) {
            if (where.length > 0) {
                where += ' AND ';
            }
            where += sqlParams.additionalWhereStmts;
        }
        if (where.length > 0) {
            where = `WHERE ${where}`;
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