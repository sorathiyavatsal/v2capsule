import { Hono } from 'hono';
import { db } from '../../db';
import { users } from '../../db/schema';
import { comparePassword, generateToken } from '../../services/auth';
import { eq } from 'drizzle-orm';

const login = new Hono();

login.post('/login', async (c) => {
    const { email, password } = await c.req.json();

    if (!email || !password) {
        return c.json({ error: 'Email and password are required' }, 400);
    }

    const [user] = await db.select().from(users).where(eq(users.email, email));

    if (!user || !(await comparePassword(password, user.password))) {
        return c.json({ error: 'Invalid credentials' }, 401);
    }

    const token = generateToken({ id: user.id, email: user.email, role: user.role });

    return c.json({ token, user: { id: user.id, email: user.email, role: user.role } });
});

export default login;
