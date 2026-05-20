const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { listUsers, searchUsers } = require('../controllers/userController');

router.use(authenticate);

router.get('/', listUsers);
router.get('/search', searchUsers);

module.exports = router;
