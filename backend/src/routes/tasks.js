const router = require('express').Router();
const { body } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const {
  listTasks,
  getDashboard,
  createTask,
  getTask,
  updateTask,
  deleteTask,
} = require('../controllers/taskController');

const taskValidation = [
  body('title').trim().notEmpty().withMessage('Task title is required'),
  body('projectId').isInt().withMessage('Valid project ID is required'),
];

router.use(authenticate);

router.get('/dashboard', getDashboard);
router.get('/', listTasks);
router.post('/', taskValidation, createTask);
router.get('/:id', getTask);
router.put('/:id', [body('title').optional().trim().notEmpty()], updateTask);
router.delete('/:id', deleteTask);

module.exports = router;
