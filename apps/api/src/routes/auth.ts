import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../db';
import { generateToken, AuthRequest } from '../middleware/auth';

const router = Router();

router.post('/register', async (req, res) => {
  try {
    const { email, password, role, name } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required.' });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: 'User with this email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userRole = role && ['candidate', 'recruiter'].includes(role) ? role : 'candidate';

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: userRole,
        name: name || email.split('@')[0],
        isGuest: false
      }
    });

    const token = generateToken({ id: user.id, email: user.email, role: user.role as any, isGuest: false });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        isGuest: false,
        name: user.name,
        createdAt: user.createdAt
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required.' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const token = generateToken({ id: user.id, email: user.email, role: user.role as any, isGuest: user.isGuest });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        isGuest: user.isGuest,
        name: user.name,
        createdAt: user.createdAt
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/guest', async (req, res) => {
  try {
    const guestEmail = `guest_${Date.now()}_${Math.floor(Math.random() * 1000)}@guest.resumeiq.app`;
    const passwordHash = await bcrypt.hash('guest_temp_pass', 10);

    const user = await prisma.user.create({
      data: {
        email: guestEmail,
        passwordHash,
        role: 'candidate',
        name: 'Guest Candidate',
        isGuest: true
      }
    });

    const token = generateToken({ id: user.id, email: user.email, role: 'candidate', isGuest: true });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        isGuest: true,
        name: user.name,
        createdAt: user.createdAt
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/me', async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json({
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      isGuest: user.isGuest,
      name: user.name,
      createdAt: user.createdAt
    }
  });
});

export default router;
