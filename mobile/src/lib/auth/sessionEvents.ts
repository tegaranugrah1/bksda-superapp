export type SecurityRequirement = 'must_change_password' | 'must_setup_2fa';
type SessionEvent = { type: 'expired' } | { type: 'blocked'; reason: SecurityRequirement };
const listeners = new Set<(event: SessionEvent) => void>();

export function subscribeSessionEvents(listener: (event: SessionEvent) => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function notifySession(event: SessionEvent) {
  for (const listener of listeners) listener(event);
}
