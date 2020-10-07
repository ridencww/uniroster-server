const router = require('express').Router();
router.use('/v1', require('./v1_0/orgs'));
router.use('/v1', require('./v1_0/academicsessions'));
router.use('/v1', require('./v1_0/classes'));
router.use('/v1', require('./v1_0/users'));
module.exports = router;