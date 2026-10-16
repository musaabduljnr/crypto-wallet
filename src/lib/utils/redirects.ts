/**
 * Open-Redirect Sanitizer.
 * Validates and sanitizes returnUrl parameters to prevent attackers from
 * tricking users into navigating to external malicious domains post-authentication.
 */

export function sanitizeReturnUrl(returnUrl?: string | null, fallback: string = '/dashboard'): string {
  if (!returnUrl) return fallback;

  // Trim whitespace
  const trimmed = returnUrl.trim();

  // Must begin with a single forward slash (relative internal route)
  // Must NOT begin with // (protocol-relative external redirect)
  // Must NOT contain backslashes \ which some browsers treat as slashes
  if (
    trimmed.startsWith('/') &&
    !trimmed.startsWith('//') &&
    !trimmed.includes('\\') &&
    !trimmed.includes(':') // Prevents javascript: or data: schemes
  ) {
    return trimmed;
  }

  return fallback;
}
