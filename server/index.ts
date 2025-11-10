// ABOUTME: Server entry point - imports all API routes
// ABOUTME: Ensures all route handlers are registered

import './routes/overlays';
import './routes/data';
import './routes/housing-data';
import './routes/capital-budget';

export { createApiMiddleware } from './api-middleware';
