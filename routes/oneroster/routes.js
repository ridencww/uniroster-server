const router = require('express').Router();
router.use('/v1', require('./v1_0/orgs'));
router.use('/v1', require('./v1_0/academicsessions'));
module.exports = router;