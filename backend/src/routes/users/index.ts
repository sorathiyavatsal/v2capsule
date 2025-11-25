import { Hono } from 'hono';
import { db } from '../../db';
import { users } from '../../db/schema';
import { hashPassword } from '../../services/auth';
import { authMiddleware } from '../../middlewares/auth';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

type Variables = {
    user: {
        id: number;
        email: string;
        role: string;
    };
};

const userRoutes = new Hono<{ Variables: Variables }>();

userRoutes.use('*', authMiddleware);

// List users (Super Admin only)
userRoutes.get('/', async (c) => {
    const currentUser = c.get('user');
    if (currentUser.role !== 'superadmin') {
        return c.json({ error: 'Forbidden' }, 403);
    }

    const allUsers = await db.select({
        id: users.id,
        email: users.email,
        role: users.role,
        accessKey: users.accessKey,
        createdAt: users.createdAt,
    }).from(users);

    return c.json(allUsers);
});

// Create user (Super Admin only)
userRoutes.post('/', async (c) => {
    const currentUser = c.get('user');
    if (currentUser.role !== 'superadmin') {
        return c.json({ error: 'Forbidden' }, 403);
    }

    const { email, password, role } = await c.req.json();
    if (!email || !password) {
        return c.json({ error: 'Email and password required' }, 400);
    }

    const hashedPassword = await hashPassword(password);
    const accessKey = uuidv4();
    const secretKey = uuidv4();

    const [newUser] = await db.insert(users).values({
        email,
        password: hashedPassword,
        role: role || 'user',
        accessKey,
        secretKey,
    }).returning();

    return c.json({
        id: newUser.id,
        email: newUser.email,
        role: newUser.role,
        accessKey: newUser.accessKey,
    });
});

// Delete user (Super Admin only)
userRoutes.delete('/:id', async (c) => {
    const currentUser = c.get('user');
    if (currentUser.role !== 'superadmin') {
        return c.json({ error: 'Forbidden' }, 403);
    }

    const id = Number(c.req.param('id'));
    await db.delete(users).where(eq(users.id, id));

    return c.json({ message: 'User deleted' });
});

export default userRoutes;
