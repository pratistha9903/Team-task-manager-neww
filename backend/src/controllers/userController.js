const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// GET /api/users — list all users (for member assignment, admins only)
const listUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, createdAt: true },
      orderBy: { name: 'asc' },
    });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/users/search?q=email_or_name
const searchUsers = async (req, res) => {
  const { q } = req.query;
  if (!q) return res.json([]);
  try {
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { name: { contains: q } },
          { email: { contains: q } },
        ],
      },
      select: { id: true, name: true, email: true, role: true },
      take: 10,
    });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { listUsers, searchUsers };
