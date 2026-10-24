import { query } from '@/lib/db';

export async function writeAudit({
  actorUserId = null, action, targetType = null, targetId = null,
  outcome = 'success', ip = null, userAgent = null, metadata = {}, db = null,
}) {
  const run = db ? db.query.bind(db) : query;
  await run(
    `INSERT INTO audit_logs
       (actor_user_id, action, target_type, target_id, outcome, ip_address, user_agent, metadata)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb)`,
    [actorUserId, action, targetType, targetId ? String(targetId) : null,
      outcome, ip, userAgent, JSON.stringify(metadata)]
  );
}
