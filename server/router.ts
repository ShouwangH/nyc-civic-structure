// ABOUTME: Lightweight routing system for API routes
// ABOUTME: Handles routing requests to appropriate API handlers (works in dev and production)

import type { Connect } from 'vite';
import type { IncomingMessage, ServerResponse } from 'http';

type Handler = (req: Request) => Promise<Response>;

const routes: Map<string, Map<string, Handler>> = new Map();

/**
 * Register an API route handler
 */
export function registerRoute(method: string, path: string, handler: Handler) {
  if (!routes.has(path)) {
    routes.set(path, new Map());
  }
  routes.get(path)!.set(method.toUpperCase(), handler);
}

/**
 * Create the router middleware for handling API routes
 * Compatible with both Vite dev server and production Node.js server
 */
export function createApiMiddleware(): Connect.NextHandleFunction {
  return async (req: IncomingMessage, res: ServerResponse, next: Connect.NextFunction) => {
    // Only handle /api routes
    if (!req.url?.startsWith('/api')) {
      return next();
    }

    const method = req.method?.toUpperCase() || 'GET';
    const url = new URL(req.url, `http://${req.headers.host}`);

    // Extract path without query string
    const path = url.pathname;

    // Try to match route (exact match first, then pattern match for [id] routes)
    let handler: Handler | undefined;
    const routeMap = routes.get(path);

    if (routeMap) {
      handler = routeMap.get(method);
    } else {
      // Try pattern matching for dynamic routes like /api/nodes/[id]
      for (const [routePath, routeHandlers] of routes.entries()) {
        if (matchDynamicRoute(path, routePath)) {
          handler = routeHandlers.get(method);
          break;
        }
      }
    }

    if (!handler) {
      return next();
    }

    try {
      // Read body for POST/PUT requests
      let body: string | undefined;
      if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
        body = await new Promise<string>((resolve, reject) => {
          let data = '';
          req.on('data', chunk => { data += chunk; });
          req.on('end', () => resolve(data));
          req.on('error', reject);
        });
      }

      // Convert Node.js request to Web API Request
      const headers = new Headers();
      Object.entries(req.headers).forEach(([key, value]) => {
        if (value) {
          headers.set(key, Array.isArray(value) ? value[0] : value);
        }
      });

      const webRequest = new Request(url.toString(), {
        method,
        headers,
        body: body || undefined,
      });

      // Call handler
      const response = await handler(webRequest);

      // Convert Web API Response to Node.js response
      res.statusCode = response.status;
      response.headers.forEach((value, key) => {
        res.setHeader(key, value);
      });

      const responseBody = await response.text();
      res.end(responseBody);
    } catch (error) {
      console.error('API error:', error);
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }));
    }
  };
}

/**
 * Match dynamic route patterns like /api/nodes/[id]
 */
function matchDynamicRoute(path: string, pattern: string): boolean {
  const pathParts = path.split('/').filter(Boolean);
  const patternParts = pattern.split('/').filter(Boolean);

  if (pathParts.length !== patternParts.length) {
    return false;
  }

  return patternParts.every((part, i) => {
    return part.startsWith('[') && part.endsWith(']') || part === pathParts[i];
  });
}
