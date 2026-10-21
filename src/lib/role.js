import { isAdminEmail } from './auth-constants.js';

// Normalizes the user's role for dashboard routing and UI gating.
// The platform assigns the default 'user' role on self-registration and the
// built-in `role` field cannot be changed via updateMe, so we tag the portal
// the user registered through (custom `portal` field) and use it here.
// - admin (set via invite, configured credentials, or admin portal) wins
// - supervisor: explicit role OR registered via the Supervisor Portal
// - everything else (including 'user' / undefined) is treated as student
export function getRole(user) {
  if (!user) return 'student';
  const raw = user?.role;
  const portal = user?.portal;

  // Student accounts (registration via student portal or explicit student role)
  if (portal === 'student' || raw === 'student') return 'student';

  // Supervisor accounts (registration via supervisor portal or explicit supervisor role)
  if (portal === 'supervisor' || raw === 'supervisor') return 'supervisor';

  // Admin accounts
  if (raw === 'admin' || portal === 'admin' || isAdminEmail(user?.email)) return 'admin';

  return 'student';
}
