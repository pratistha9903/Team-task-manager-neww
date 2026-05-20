const { PrismaClient } = require('@prisma/client');
const { validationResult } = require('express-validator');

const prisma = new PrismaClient();

const VALID_STATUSES = ['TODO', 'IN_PROGRESS', 'DONE'];
const VALID_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH'];

const isMemberOfProject = async (projectId, userId) => {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) return false;
  if (project.ownerId === userId) return true;
  const member = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });
  return !!member;
};

const isProjectAdmin = async (projectId, userId) => {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (project?.ownerId === userId) return true;
  const member = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });
  return member?.role === 'ADMIN';
};

// GET /api/tasks?projectId=&status=&assigneeId=&priority=
const listTasks = async (req, res) => {
  const { projectId, status, assigneeId, priority } = req.query;
  try {
    const where = {};

    if (projectId) {
      const pid = parseInt(projectId);
      const member = await isMemberOfProject(pid, req.user.id);
      if (!member) return res.status(403).json({ message: 'Access denied' });
      where.projectId = pid;
    } else {
      // Return tasks from all projects the user is a member of
      const memberships = await prisma.projectMember.findMany({
        where: { userId: req.user.id },
        select: { projectId: true },
      });
      const ownedProjects = await prisma.project.findMany({
        where: { ownerId: req.user.id },
        select: { id: true },
      });
      const allProjectIds = [
        ...new Set([...memberships.map((m) => m.projectId), ...ownedProjects.map((p) => p.id)]),
      ];
      where.projectId = { in: allProjectIds };
    }

    if (status && VALID_STATUSES.includes(status)) where.status = status;
    if (assigneeId) where.assigneeId = parseInt(assigneeId);
    if (priority && VALID_PRIORITIES.includes(priority)) where.priority = priority;

    const tasks = await prisma.task.findMany({
      where,
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        creator: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/tasks/dashboard — summary stats for current user
const getDashboard = async (req, res) => {
  try {
    const memberships = await prisma.projectMember.findMany({
      where: { userId: req.user.id },
      select: { projectId: true },
    });
    const ownedProjects = await prisma.project.findMany({
      where: { ownerId: req.user.id },
      select: { id: true },
    });
    const allProjectIds = [
      ...new Set([...memberships.map((m) => m.projectId), ...ownedProjects.map((p) => p.id)]),
    ];

    const now = new Date();

    const [totalTasks, myTasks, todoCount, inProgressCount, doneCount, overdueTasks] =
      await Promise.all([
        prisma.task.count({ where: { projectId: { in: allProjectIds } } }),
        prisma.task.count({
          where: { projectId: { in: allProjectIds }, assigneeId: req.user.id },
        }),
        prisma.task.count({
          where: { projectId: { in: allProjectIds }, status: 'TODO' },
        }),
        prisma.task.count({
          where: { projectId: { in: allProjectIds }, status: 'IN_PROGRESS' },
        }),
        prisma.task.count({
          where: { projectId: { in: allProjectIds }, status: 'DONE' },
        }),
        prisma.task.findMany({
          where: {
            projectId: { in: allProjectIds },
            dueDate: { lt: now },
            status: { not: 'DONE' },
          },
          include: {
            assignee: { select: { id: true, name: true } },
            project: { select: { id: true, name: true } },
          },
          orderBy: { dueDate: 'asc' },
          take: 10,
        }),
      ]);

    const recentTasks = await prisma.task.findMany({
      where: { projectId: { in: allProjectIds } },
      include: {
        assignee: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 5,
    });

    res.json({
      stats: { totalTasks, myTasks, todoCount, inProgressCount, doneCount, overdueCount: overdueTasks.length, totalProjects: allProjectIds.length },
      overdueTasks,
      recentTasks,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/tasks — create task (project member, project admin assigns)
const createTask = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { title, description, status, priority, dueDate, projectId, assigneeId } = req.body;
  try {
    const pid = parseInt(projectId);
    const member = await isMemberOfProject(pid, req.user.id);
    if (!member) return res.status(403).json({ message: 'Access denied' });

    if (assigneeId) {
      const assigneeMember = await isMemberOfProject(pid, parseInt(assigneeId));
      if (!assigneeMember) {
        return res.status(400).json({ message: 'Assignee must be a project member' });
      }
    }

    const task = await prisma.task.create({
      data: {
        title,
        description,
        status: VALID_STATUSES.includes(status) ? status : 'TODO',
        priority: VALID_PRIORITIES.includes(priority) ? priority : 'MEDIUM',
        dueDate: dueDate ? new Date(dueDate) : null,
        projectId: pid,
        assigneeId: assigneeId ? parseInt(assigneeId) : null,
        creatorId: req.user.id,
      },
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        creator: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
      },
    });
    res.status(201).json(task);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/tasks/:id
const getTask = async (req, res) => {
  const taskId = parseInt(req.params.id);
  try {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        creator: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
      },
    });
    if (!task) return res.status(404).json({ message: 'Task not found' });

    const member = await isMemberOfProject(task.projectId, req.user.id);
    if (!member) return res.status(403).json({ message: 'Access denied' });

    res.json(task);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/tasks/:id — update task
const updateTask = async (req, res) => {
  const taskId = parseInt(req.params.id);
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) return res.status(404).json({ message: 'Task not found' });

    const member = await isMemberOfProject(task.projectId, req.user.id);
    if (!member) return res.status(403).json({ message: 'Access denied' });

    const { title, description, status, priority, dueDate, assigneeId } = req.body;

    // Members can update status of their own tasks; admins can update anything
    const admin = await isProjectAdmin(task.projectId, req.user.id);
    if (!admin && task.assigneeId !== req.user.id && task.creatorId !== req.user.id) {
      return res.status(403).json({ message: 'You can only update tasks assigned to or created by you' });
    }

    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (status && VALID_STATUSES.includes(status)) updateData.status = status;
    if (priority && VALID_PRIORITIES.includes(priority)) updateData.priority = priority;
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;
    if (assigneeId !== undefined && admin) {
      updateData.assigneeId = assigneeId ? parseInt(assigneeId) : null;
    }

    const updated = await prisma.task.update({
      where: { id: taskId },
      data: updateData,
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        creator: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
      },
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/tasks/:id — delete task (project admin or task creator)
const deleteTask = async (req, res) => {
  const taskId = parseInt(req.params.id);
  try {
    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) return res.status(404).json({ message: 'Task not found' });

    const admin = await isProjectAdmin(task.projectId, req.user.id);
    if (!admin && task.creatorId !== req.user.id) {
      return res.status(403).json({ message: 'Only admins or the creator can delete tasks' });
    }

    await prisma.task.delete({ where: { id: taskId } });
    res.json({ message: 'Task deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { listTasks, getDashboard, createTask, getTask, updateTask, deleteTask };
