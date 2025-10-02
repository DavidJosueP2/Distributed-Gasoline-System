export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'BLOCKED';

export function ensureUserStatus(value?: string | null): UserStatus {
  const normalized = (value ?? 'ACTIVE').toUpperCase();
  if (['ACTIVE', 'INACTIVE', 'BLOCKED'].includes(normalized)) {
    return normalized as UserStatus;
  }
  return 'ACTIVE';
}
