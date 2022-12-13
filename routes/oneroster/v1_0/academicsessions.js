const db = require('../../../utils/database');
const router = require('express').Router();
const academicSessionsService = require('../../../services/academicSessionsService');

function queryAcademicSession(req, res, next, type) {

    try {
        let responsePayload = academicSessionsService.queryAcademicSession(req,res);
        res.json(responsePayload);
    } catch (e){
        utils.reportNotFound(res,e.message);
    }
}

function queryAcademicSessions(req, res, next, type) {
    try {
        let responsePayload = academicSessionsService.queryAcademicSessions(req, res, type);
        res.json(responsePayload);
    } catch (e){
        utils.reportNotFound(res,e.message);
    }
}

function queryAcademicSessionsForSchool(req, res, next, type) {

    try{
        let academicSessionsPayload = academicSessionsService.queryAcademicSessionsForSchool(req, res, next, type);
        res.json(academicSessionsPayload);
    } catch (e) {
        utils.reportNotFound(res,e.message);
    }

}

router.get('/academicSessions', function(req, res, next) {
    queryAcademicSessions(req, res, next);
});

router.get('/terms', function(req, res, next) {
    queryAcademicSessions(req, res, next, "term");
});

router.get('/academicSessions/:id', function(req, res, next) {
    queryAcademicSession(req, res, next);
});

router.get('/terms/:id', function(req, res, next) {
    queryAcademicSession(req, res, next, "term");
});

router.get('/schools/:id/academicSessions', function(req, res, next) {
    queryAcademicSessionsForSchool(req, res, next);
});

router.get('/schools/:id/terms', function(req, res, next) {
    queryAcademicSessionsForSchool(req, res, next, "term");
});

module.exports = router;