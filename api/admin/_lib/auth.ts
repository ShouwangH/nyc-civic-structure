// ABOUTME: Authentication utilities for Bearer token verification
// ABOUTME: Simple password-based auth for internal tool (2 editors)

export interface AuthResult {
  authenticated: boolean;
  error?: string;
}

/**
 * Verifies Bearer token from Authorization header
 * Compares against EDIT_PASSWORD environment variable
 */
export function verifyAuth(authHeader: string | null | undefined): AuthResult {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { authenticated: false, error: 'Missing or invalid Authorization header' };
  }

  const token = authHeader.substring(7); // Remove "Bearer "
  const validPassword = process.env.EDIT_PASSWORD;

  if (!validPassword) {
    console.error('EDIT_PASSWORD environment variable not set');
    return { authenticated: false, error: 'Server configuration error' };
  }

  if (token !== validPassword) {
    return { authenticated: false, error: 'Invalid password' };
  }

  return { authenticated: true };
}
