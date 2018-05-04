var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var express = require('express');
var favicon = require('serve-favicon');
var logger = require('morgan');
var path = require('path');
var utils = require('./lib/onerosterUtils.js');

var routes = require('./routes/index');

var academicSessions_oneroster_1_0 = require('./routes/oneroster/v1_0/academicsessions');
var classes_oneroster_1_0 = require('./routes/oneroster/v1_0/classes');
var courses_oneroster_1_0 = require('./routes/oneroster/v1_0/courses');
var demographics_oneroster_1_0 = require('./routes/oneroster/v1_0/demographics');
var enrollments_oneroster_1_0 = require('./routes/oneroster/v1_0/enrollments');
var orgs_oneroster_1_0 = require('./routes/oneroster/v1_0/orgs');
var users_oneroster_1_0 = require('./routes/oneroster/v1_0/users');
var resources_oneroster_1_0 = require('./routes/oneroster/v1_0/resources');
var lineitems_oneroster_1_0 = require('./routes/oneroster/v1_0/lineitems');
var categories_oneroster_1_0 = require('./routes/oneroster/v1_0/categories');
var results_oneroster_1_0 = require('./routes/oneroster/v1_0/results');

var app = express();

app.set('json spaces', 2);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(logger('dev'));

// Bind the routes to handlers
app.use('/', routes);
app.use('/learningdata/v1', academicSessions_oneroster_1_0);
app.use('/learningdata/v1', classes_oneroster_1_0);
app.use('/learningdata/v1', courses_oneroster_1_0);
app.use('/learningdata/v1', demographics_oneroster_1_0);
app.use('/learningdata/v1', enrollments_oneroster_1_0);
app.use('/learningdata/v1', orgs_oneroster_1_0);
app.use('/learningdata/v1', users_oneroster_1_0);
app.use('/learningdata/v1', resources_oneroster_1_0);
app.use('/learningdata/v1', lineitems_oneroster_1_0);
app.use('/learningdata/v1', categories_oneroster_1_0);
app.use('/learningdata/v1', results_oneroster_1_0);

app.use('/ims/oneroster/v1p1', academicSessions_oneroster_1_0);
app.use('/ims/oneroster/v1p1', classes_oneroster_1_0);
app.use('/ims/oneroster/v1p1', courses_oneroster_1_0);
app.use('/ims/oneroster/v1p1', demographics_oneroster_1_0);
app.use('/ims/oneroster/v1p1', enrollments_oneroster_1_0);
app.use('/ims/oneroster/v1p1', orgs_oneroster_1_0);
app.use('/ims/oneroster/v1p1', users_oneroster_1_0);
app.use('/ims/oneroster/v1p1', resources_oneroster_1_0);
app.use('/ims/oneroster/v1p1', lineitems_oneroster_1_0);
app.use('/ims/oneroster/v1p1', categories_oneroster_1_0);
app.use('/ims/oneroster/v1p1', results_oneroster_1_0);

// Catch 404 and return a REST style response
app.use(function(req, res, next) {
  utils.reportNotFound(res);
});

// Catch server errors (specifics will be in the log)
app.use(function(err, req, res, next) {
  utils.reportServerError(res, err);
});

module.exports = app;
