var chance = require("chance");
var format = require('date-format');
var config = require('../config');
var utils = require('../lib/onerosterUtils');

var random = new chance();

var pool = require('mysql').createPool({
  connectionLimit: config.db.connectionLimit,
  host: config.db.host,
  user: config.db.user,
  password: config.db.password,
  database: 'sample_or10'
});

console.time("load");

var schools = [
  {"sourcedId": random.guid(), "name": "Techtown ISD", "identifier": "999000"},
  {"sourcedId": random.guid(), "name": "Ada Lovelace Academy", "identifier": "999001"},
  {"sourcedId": random.guid(), "name": "Grace Hopper High School", "identifier": "999002"},
  {"sourcedId": random.guid(), "name": "Marie Curie JHS", "identifier": "999003"}
];

var users = [
  {"sourcedId": random.guid(), "schools": (schools[1].sourcedId + "," + schools[2].sourcedId), "role":"teacher",
   "givenName": random.first({gender:"female"}), "familyName": random.last()
  },
  {"sourcedId": random.guid(), "schools": schools[1].sourcedId, "role":"student",
    "givenName": random.first({gender:"female"}), "familyName": random.last()
  },
  {"sourcedId": random.guid(), "schools": schools[1].sourcedId, "role":"student",
    "givenName": random.first({gender:"male"}), "familyName": random.last()
  },
  {"sourcedId": random.guid(), "schools": schools[1].sourcedId, "role":"student",
    "givenName": random.first({gender:"female"}), "familyName": random.last()
  },
  {"sourcedId": random.guid(), "schools": schools[1].sourcedId, "role":"student",
    "givenName": random.first({gender:"male"}), "familyName": random.last()
  },
  {"sourcedId": random.guid(), "schools": schools[1].sourcedId, "role":"student",
    "givenName": random.first({gender:"female"}), "familyName": random.last()
  }
];

var demographics = [
  {"sourcedId": users[1].sourcedId, "sex": "female", "birthdate": format('yyyy-MM-dd', random.birthday({type: 'teen'}))},
  {"sourcedId": users[2].sourcedId, "sex": "male", "birthdate": format('yyyy-MM-dd', random.birthday({type: 'teen'}))},
  {"sourcedId": users[3].sourcedId, "sex": "female", "birthdate": format('yyyy-MM-dd', random.birthday({type: 'teen'}))},
  {"sourcedId": users[4].sourcedId, "sex": "male", "birthdate": format('yyyy-MM-dd', random.birthday({type: 'teen'}))},
  {"sourcedId": users[5].sourcedId, "sex": "female", "birthdate": format('yyyy-MM-dd', random.birthday({type: 'teen'}))}
];

var sessions = [
  {"sourcedId": random.guid(), "title": "2016-17", "type": "schoolYear", "startDate": "2016-08-15", "endDate": "2017-06-02"},
  {"sourcedId": random.guid(), "title": "Fall 2016-17", "type": "semester", "startDate": "2016-08-15", "endDate": "2016-12-16"},
  {"sourcedId": random.guid(), "title": "Spring 2016-17", "type": "semester", "startDate": "2017-01-02", "endDate": "2017-06-02"},
];

var courses = [
  {"sourcedId": random.guid()}
];

var classes = [
  {"sourcedId": random.guid()}
];

var enrollments = [
  {"sourcedId": random.guid()}
];

function loadComplete(connection) {
  connection.release();
  process.stdout.write('\n');
  console.timeEnd('load');
  process.exit();
}

// Enrollments
function loadEnrollments(connection) {
  loadComplete(connection);
}

// Classes
function loadClasses(connection) {
  loadEnrollments(connection);
}

// Courses
function loadCourses(connection) {
  loadClasses(connection);
}

// AcademicSessions
function loadAcademicSessions(connection) {
  var sql = "INSERT INTO academicsessions (sourcedId,status,dateLastModified,title,type,startDate,endDate,parentSourcedId) VALUES ";

  for (var i = 0; i < sessions.length; i++) {
    sql += '(';
    sql += "'" + sessions[i].sourcedId + "',";
    sql += "'active',";
    sql += "'2016-09-24',";
    sql += "'" + sessions[i].title + "',";
    sql += "'" + sessions[i].type + "',";
    sql += "'" + sessions[i].startDate + "',";
    sql += "'" + sessions[i].endDate + "',";
    sql += (i == 0) ? "null" : "'" + sessions[0].sourcedId + "'";
    sql += ')';
    if (i != sessions.length - 1) {
      sql += ',';
    }
  }

  connection.query(sql, function(err, res) {
    if (err) {
      connection.release();
      console.log(sql);
      console.log(err.stack);
      return;
    }
    loadCourses(connection);
  });
}

// Demographics
function loadDemographics(connection) {
  var sql = "INSERT INTO demographics (userSourcedId,status,dateLastModified,sex,birthdate) VALUES ";

  for (var i = 0; i < demographics.length; i++) {
    sql += '(';
    sql += "'" + demographics[i].sourcedId + "',";
    sql += "'active',";
    sql += "'2016-09-24',";
    sql += "'" + demographics[i].sex + "',";
    sql += "'" + demographics[i].birthdate + "'";
    sql += ')';
    if (i != demographics.length - 1) {
      sql += ',';
    }
  }

  connection.query(sql, function(err, res) {
    if (err) {
      connection.release();
      console.log(sql);
      console.log(err.stack);
      return;
    }
    loadAcademicSessions(connection);
  });
}

// Users
function loadUsers(connection) {
  var sql = "INSERT INTO users (sourcedId,status,dateLastModified,orgSourcedIds,role,username,userid,givenName," +
    "familyName,identifier,email,sms,phone,agents) VALUES ";

  for (var i = 0; i < users.length; i++) {
    var identifier = random.integer({min: 1000000, max: 9999999})
    var username = users[i].givenName[0] + users[i].familyName[0] + random.integer({min:10000, max:99999});
    var userId = username;
    var email = userId + '@techtownisd.org';

    sql += '(';
    sql += "'" + users[i].sourcedId + "',";
    sql += "'active',";
    sql += "'2016-09-24',";
    sql += "'" + users[i].schools + "',";
    sql += "'" + users[i].role + "',";
    sql += "'" + username + "',";
    sql += "'" + userId + "',";
    sql += "'" + users[i].givenName + "',";
    sql += "'" + users[i].familyName + "',";
    sql += "'" + identifier + "',";
    sql += "'" + email + "',";
    sql += "null,"; // sms
    sql += "null,"; // phone
    sql += "null"; // agents
    sql += ')';
    if (i != users.length - 1) {
      sql += ',';
    }
  }

  connection.query(sql, function(err, res) {
    if (err) {
      connection.release();
      console.log(sql);
      console.log(err.stack);
      return;
    }
    loadDemographics(connection);
  });
}

// Orgs
function loadOrgs(connection) {
  var sql = "INSERT INTO orgs (sourcedId,status,dateLastModified,name,type,identifier,`metadata#classification`," +
    "`metadata#gender`,`metadata#boarding`,parentSourcedId) VALUES ";

  for (var i = 0; i < schools.length; i++) {
    sql += '(';
    sql += "'" + schools[i].sourcedId + "',";
    sql += "'active',";
    sql += "'2016-09-24',";
    sql += "'" + schools[i].name + "',";
    sql += (i == 0) ? "'local'," : "'school',";
    sql += "'" + schools[i].identifier + "',";
    sql += "'public',";
    sql += "'mixed',";
    sql += "'False',";
    sql += (i == 0) ? "null" : "'" + schools[0].sourcedId + "'";
    sql += ')';
    if (i != schools.length - 1) {
      sql += ',';
    }
  }

  connection.query(sql, function(err, res) {
    if (err) {
      connection.release();
      console.log(sql);
      console.log(err.stack);
      return;
    }
    loadUsers(connection);
  });
}

pool.getConnection(function(err, connection) {
  if (err) {
    connection.release();
    console.log(err.stack);
    return;
  }
  loadOrgs(connection);
});
