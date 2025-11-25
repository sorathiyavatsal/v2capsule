import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import signup from './routes/auth/signup';
import login from './routes/auth/login';
import userRoutes from './routes/users';
import volumeRoutes from './routes/volumes';
import s3Routes from './routes/s3';
import presignedRoutes from './routes/presigned';

import bucketRoutes from './routes/buckets';
import policyRoutes from './routes/buckets/policy';
import corsRoutes from './routes/buckets/cors';
import versioningRoutes from './routes/buckets/versioning';
import { startCleanupJob } from './services/cleanup';

const app = new Hono();

app.use('*', logger());
app.use('*', cors());

app.route('/auth', signup);
app.route('/auth', login);
app.route('/users', userRoutes);
app.route('/volumes', volumeRoutes);
app.route('/buckets', bucketRoutes);
app.route('/buckets', policyRoutes);
app.route('/buckets', corsRoutes);
app.route('/buckets', versioningRoutes);
app.route('/presigned-url', presignedRoutes);

// Health check endpoint
app.get('/health', (c) => {
    return c.json({ message: 'V2 Capsule Backend is running', status: 'ok' });
});

// S3 routes MUST be last to handle all remaining routes
app.route('/', s3Routes);

const port = Number(process.env.PORT) || 8787;
console.log(`Server is running on port ${port}`);

// Start cleanup job for abandoned multipart uploads
startCleanupJob(6, 24); // Run every 6 hours, clean uploads older than 24 hours

serve({
    fetch: app.fetch,
    port
});
