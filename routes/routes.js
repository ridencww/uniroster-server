const router = require('express').Router();
router.use('/', require('./oneroster/routes'));
module.exports = router;