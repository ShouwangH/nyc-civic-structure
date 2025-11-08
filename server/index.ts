// ABOUTME: Server entry point - imports all API routes
// ABOUTME: Ensures all route handlers are registered

import './routes/overlays';
import './routes/data';

export { createApiMiddleware } from './api-middleware';
