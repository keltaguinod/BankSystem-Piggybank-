import { query } from "./db";

/**
 * Record a login attempt.
 *
 * status:
 * SUCCESS
 * FAILED
 * LOCKED
 */
export async function logLogin({
  userId = null,
  status,
  ipAddress = null,
  userAgent = null,
}) {
  try {
    await query(
      `INSERT INTO login_history
         (user_id, login_time, ip_address, user_agent, status)
       VALUES ($1, NOW(), $2, $3, $4)`,
      [userId, ipAddress, userAgent, status]
    );
  } catch (err) {
    // Login history is supplementary. A missing/outdated history table must
    // never prevent a valid user from signing in.
    console.error(
      'Could not record login history:',
      err instanceof Error ? err.message : 'unknown error'
    );
  }
}
