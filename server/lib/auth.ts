// ABOUTME: Authentication helpers for API routes
// ABOUTME: Simple bearer token authentication using EDIT_PASSWORD

/**
 * Verify bearer token authentication
 */
export function verifyAuth(
  authHeader: string | null
): { authenticated: boolean; error?: string } {
  if (!authHeader) {
    return { authenticated: false, error: 'No authorization header provided' };
  }

  const [scheme, token] = authHeader.split(' ');

  if (scheme !== 'Bearer') {
    return { authenticated: false, error: 'Invalid authentication scheme' };
  }

  const expectedPassword = process.env.EDIT_PASSWORD;
  if (!expectedPassword) {
    return { authenticated: false, error: 'Server authentication not configured' };
  }

  if (token !== expectedPassword) {
    return { authenticated: false, error: 'Invalid credentials' };
  }

  return { authenticated: true };
}
