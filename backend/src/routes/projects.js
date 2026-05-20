const router = require('express').Router();
const { body } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const {
  listProjects,
  createProject,
  getProject,
  updateProject,
  deleteProject,
  addMember,
  removeMember,
} = require('../controllers/projectController');

const projectValidation = [
  body('name').trim().notEmpty().withMessage('Project name is required'),
];

router.use(authenticate);

router.get('/', listProjects);
router.post('/', projectValidation, createProject);
router.get('/:id', getProject);
router.put('/:id', projectValidation, updateProject);
router.delete('/:id', deleteProject);
router.post('/:id/members', addMember);
router.delete('/:id/members/:userId', removeMember);

module.exports = router;
