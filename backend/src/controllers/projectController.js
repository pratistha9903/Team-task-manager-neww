const { PrismaClient } = require('@prisma/client');
const { validationResult } = require('express-validator');

const prisma = new PrismaClient();

const getProjectRole = async (projectId, userId) => {
  const member = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });
  return member ? member.role : null;
};

const isProjectAdmin = async (projectId, userId) => {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (project?.ownerId === userId) return true;
  const role = await getProjectRole(projectId, userId);
  return role === 'ADMIN';
};

// GET /api/projects — list projects the user is a member of
const listProjects = async (req, res) => {
  try {
    const memberships = await prisma.projectMember.findMany({
      where: { userId: req.user.id },
      include: {
        project: {
          include: {
            owner: { select: { id: true, name: true, email: true } },
            _count: { select: { members: true, tasks: true } },
          },
        },
      },
    });

    const ownedProjects = await prisma.project.findMany({
      where: { ownerId: req.user.id },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        _count: { select: { members: true, tasks: true } },
      },
    });

    const memberProjects = memberships.map((m) => ({
      ...m.project,
      myRole: m.role,
    }));

    const allProjects = [
      ...ownedProjects.map((p) => ({ ...p, myRole: 'ADMIN' })),
      ...memberProjects.filter((p) => !ownedProjects.find((op) => op.id === p.id)),
    ];

    res.json(allProjects);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/projects — create a project (any authenticated user)
const createProject = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { name, description } = req.body;
  try {
    const project = await prisma.project.create({
      data: {
        name,
        description,
        ownerId: req.user.id,
        members: {
          create: { userId: req.user.id, role: 'ADMIN' },
        },
      },
      include: { owner: { select: { id: true, name: true, email: true } } },
    });
    res.status(201).json(project);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/projects/:id — get project detail
const getProject = async (req, res) => {
  const projectId = parseInt(req.params.id);
  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        members: {
          include: { user: { select: { id: true, name: true, email: true, role: true } } },
        },
        tasks: {
          include: {
            assignee: { select: { id: true, name: true, email: true } },
            creator: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!project) return res.status(404).json({ message: 'Project not found' });

    const isMember = project.members.some((m) => m.userId === req.user.id);
    if (!isMember && project.ownerId !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const myRole = project.ownerId === req.user.id
      ? 'ADMIN'
      : project.members.find((m) => m.userId === req.user.id)?.role;

    res.json({ ...project, myRole });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/projects/:id — update project (project admin only)
const updateProject = async (req, res) => {
  const projectId = parseInt(req.params.id);
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const admin = await isProjectAdmin(projectId, req.user.id);
    if (!admin) return res.status(403).json({ message: 'Project admin access required' });

    const { name, description } = req.body;
    const project = await prisma.project.update({
      where: { id: projectId },
      data: { name, description },
    });
    res.json(project);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/projects/:id — delete project (owner only)
const deleteProject = async (req, res) => {
  const projectId = parseInt(req.params.id);
  try {
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) return res.status(404).json({ message: 'Project not found' });
    if (project.ownerId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Only the owner can delete this project' });
    }
    await prisma.project.delete({ where: { id: projectId } });
    res.json({ message: 'Project deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/projects/:id/members — add member (project admin)
const addMember = async (req, res) => {
  const projectId = parseInt(req.params.id);
  const { userId, role } = req.body;
  try {
    const admin = await isProjectAdmin(projectId, req.user.id);
    if (!admin) return res.status(403).json({ message: 'Project admin access required' });

    const existing = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
    });
    if (existing) return res.status(409).json({ message: 'User is already a member' });

    const member = await prisma.projectMember.create({
      data: { projectId, userId, role: role === 'ADMIN' ? 'ADMIN' : 'MEMBER' },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    res.status(201).json(member);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/projects/:id/members/:userId — remove member (project admin)
const removeMember = async (req, res) => {
  const projectId = parseInt(req.params.id);
  const userId = parseInt(req.params.userId);
  try {
    const admin = await isProjectAdmin(projectId, req.user.id);
    if (!admin) return res.status(403).json({ message: 'Project admin access required' });

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (project.ownerId === userId) {
      return res.status(400).json({ message: 'Cannot remove the project owner' });
    }

    await prisma.projectMember.delete({
      where: { projectId_userId: { projectId, userId } },
    });
    res.json({ message: 'Member removed' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  listProjects,
  createProject,
  getProject,
  updateProject,
  deleteProject,
  addMember,
  removeMember,
};
