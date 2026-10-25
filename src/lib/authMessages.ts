// Turns raw Supabase/Auth error text into short messages a player can act on.
// Pass context 'code' when the error comes from checking a 6-digit email code.
export function friendlyAuthError(
  error: unknown,
  fallback: string,
  context: 'default' | 'code' = 'default',
): string {
  const raw = error instanceof Error ? error.message : typeof error === 'string' ? error : '';
  const text = raw.toLowerCase();

  if (!raw) return fallback;
  if (text.includes('supabase is not configured')) return raw;
  if (text.includes('failed to fetch') || text.includes('networkerror') || text.includes('network request failed')) {
    return 'Could not reach the server. Check your internet connection and try again.';
  }
  if (text.includes('rate limit') || text.includes('too many') || text.includes('over_email_send_rate_limit')) {
    return 'Too many attempts. Please wait a little while before trying again.';
  }
  if (text.includes('invalid login credentials')) return 'Wrong email or password.';
  if (text.includes('email not confirmed')) {
    return 'Your email is not verified yet. Register again with this email to get a new code.';
  }
  if (text.includes('user already registered') || text.includes('already been registered')) {
    return 'An account with this email already exists. Try signing in instead.';
  }
  if (text.includes('database error saving new user')) {
    return 'Could not save your profile. That nickname may already be taken, so try another one.';
  }
  if (context === 'code' && (text.includes('expired') || text.includes('invalid') || text.includes('token'))) {
    return 'That code is invalid or has expired. Request a new code and try again.';
  }
  if (text.includes('password') && text.includes('weak')) {
    return 'Choose a stronger password with letters, numbers and a symbol.';
  }
  return raw;
}