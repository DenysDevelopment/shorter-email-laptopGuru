import { auth } from '@/lib/auth';
import { hasPermission } from '@laptopguru-crm/shared';
import type { Permission } from '@laptopguru-crm/shared';
import { NextResponse } from 'next/server';
import type { Session } from 'next-auth';

type AuthResult =
  | { session: Session; error?: never }
  | { session?: never; error: NextResponse };

/**
 * Check auth + permissions for API routes.
 * Returns session on success, or a JSON error response.
 */
export async function authorize(...required: Permission[]): Promise<AuthResult> {
  const session = await auth();
  if (!session?.user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  if (
    required.length > 0 &&
    !hasPermission(session.user.role, session.user.permissions, required)
  ) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  return { session };
}
