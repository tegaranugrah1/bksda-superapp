import { useEffect, useRef } from 'react';
import { useOptionalAuth } from '@/features/auth/AuthProvider';
import { hasModule, isAdmin, isSuperAdmin } from '@/lib/permissions';
import { getTokenId, subscribeReverbChannel } from '@/lib/reverb';
import { User } from '@/types/auth';

export type ReverbTarget =
  | 'user'
  | 'admin:surat_tugas'
  | 'admin:kepegawaian'
  | 'admin:bmn';

function canAccessAdminChannel(
  user: User | null,
  mod: 'surat_tugas' | 'kepegawaian' | 'bmn'
): boolean {
  if (!user) return false;
  if (isSuperAdmin(user)) return true;

  const hasAccess =
    hasModule(user, mod) || (mod === 'surat_tugas' && hasModule(user, 'kepegawaian'));
  if (!hasAccess) return false;

  const moduleRoles = (user as User & { module_roles?: Record<string, string> }).module_roles;
  const modRole =
    moduleRoles?.[mod] ??
    (mod === 'surat_tugas' ? moduleRoles?.kepegawaian ?? moduleRoles?.['surat-tugas'] : undefined);
  const effectiveAdmin = modRole ? modRole === 'admin' : isAdmin(user);
  if (!effectiveAdmin) return false;

  if (Array.isArray(user.permissions) && user.permissions.length > 0) {
    return user.permissions.includes(`${mod}.view`);
  }
  return true;
}

export function useReverbRefresh(
  targets: ReverbTarget[],
  onRefresh: () => void,
  enabled = true
): void {
  const auth = useOptionalAuth();
  const user = auth?.user ?? null;
  const token = auth?.token ?? null;
  const onRefreshRef = useRef(onRefresh);

  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  const targetKey = targets.join('|');

  useEffect(() => {
    if (!enabled || !user?.id || !token) return;
    const tokenId = getTokenId(token);
    if (!tokenId) return;

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const triggerRefresh = () => {
      if (debounceTimer) return;
      debounceTimer = setTimeout(() => {
        debounceTimer = null;
        onRefreshRef.current();
      }, 150);
    };

    const unsubscribers: (() => void)[] = [];
    for (const target of targetKey.split('|') as ReverbTarget[]) {
      if (target === 'user') {
        unsubscribers.push(
          subscribeReverbChannel(
            token,
            `private-App.Models.User.${user.id}.${tokenId}`,
            'notification.created',
            triggerRefresh,
            triggerRefresh
          )
        );
      } else if (target.startsWith('admin:')) {
        const mod = target.slice(6) as 'surat_tugas' | 'kepegawaian' | 'bmn';
        if (canAccessAdminChannel(user, mod)) {
          unsubscribers.push(
            subscribeReverbChannel(
              token,
              `private-admin.inbox.${mod}.${tokenId}`,
              'inbox.changed',
              triggerRefresh,
              triggerRefresh
            )
          );
        }
      }
    }

    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      for (const unsub of unsubscribers) {
        unsub();
      }
    };
  }, [enabled, targetKey, token, user]);
}
