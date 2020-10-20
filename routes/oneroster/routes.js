const router = require('express').Router();
router.use('/v1', require('./v1_0/orgs'));
router.use('/v1', require('./v1_0/academicsessions'));
router.use('/v1', require('./v1_0/classes'));
router.use('/v1', require('./v1_0/users'));
router.use('/v1', require('./v1_0/enrollments'));
router.use('/v1', require('./v1_0/courses'));
module.exports = router;