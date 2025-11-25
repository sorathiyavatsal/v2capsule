import { Hono } from 'hono';
import { db } from '../../db';
import { users } from '../../db/schema';
import { hashPassword, generateToken } from '../../services/auth';
import { v4 as uuidv4 } from 'uuid';
import { eq } from 'drizzle-orm';

const signup = new Hono();

signup.post('/signup', async (c) => {
    const { email, password, fullName } = await c.req.json();

    if (!email || !password) {
        return c.json({ error: 'Email and password are required' }, 400);
    }

    // Check if user already exists
    const existingUser = await db.select().from(users).where(eq(users.email, email));
    if (existingUser.length > 0) {
        return c.json({ error: 'User already exists' }, 400);
    }

    // Check if this is the first user (to assign superadmin)
    const allUsers = await db.select().from(users);
    const isFirstUser = allUsers.length === 0;
    const role = isFirstUser ? 'superadmin' : 'user';
    const isVerified = isFirstUser; // First user is auto-verified

    const hashedPassword = await hashPassword(password);
    const accessKey = uuidv4();
    const secretKey = uuidv4();
    const verificationToken = isVerified ? null : uuidv4();

    const [newUser] = await db.insert(users).values({
        email,
        password: hashedPassword,
        fullName,
        role,
        accessKey,
        secretKey,
        isVerified,
        verificationToken,
    }).returning();

    const token = generateToken({ id: newUser.id, email: newUser.email, role: newUser.role });

    return c.json({
        token,
        user: {
            id: newUser.id,
            email: newUser.email,
            role: newUser.role,
            fullName: newUser.fullName,
            isVerified: newUser.isVerified
        }
    });
});

export default signup;
