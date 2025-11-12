// ABOUTME: Server entry point - imports all API routes
// ABOUTME: Ensures all route handlers are registered

import './routes/overlays.ts';
import './routes/data.ts';
import './routes/housing-data.ts';
import './routes/capital-budget.ts';
import './routes/financial-data.ts';

export { createApiMiddleware } from './router.ts';
