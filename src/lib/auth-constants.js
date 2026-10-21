// Pre-configured administrative accounts and credentials for SmartSupervise

export const ADMIN_ACCOUNTS = [
  {
    id: 'admin-primary-001',
    email: 'admin@smartsupervise.edu',
    password: 'Admin12345!',
    full_name: 'System Administrator',
    first_name: 'System',
    last_name: 'Administrator',
    role: 'admin',
    portal: 'admin',
    staff_id: 'ADM-2026-001',
    department_id: 'Computer Science',
    department: 'Computer Science & Engineering',
    phone: '+1 (555) 019-2834',
  },
];

export const PRIMARY_ADMIN = ADMIN_ACCOUNTS[0];


/**
 * Validates whether email and password match any pre-configured admin account.
 * Returns the matching admin user object (without password) or null.
 */
export function verifyAdminCredentials(email, password) {
  if (!email || !password) return null;
  const normalizedEmail = email.trim().toLowerCase();
  const trimmedPassword = password.trim();

  const match = ADMIN_ACCOUNTS.find(
    (acc) => acc.email.toLowerCase() === normalizedEmail && acc.password === trimmedPassword
  );

  if (!match) return null;

  // Return user object without the raw password
  const { password: _, ...adminUser } = match;
  return adminUser;
}

/**
 * Checks if an email belongs to a pre-configured admin account.
 */
export function isAdminEmail(email) {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return ADMIN_ACCOUNTS.some((acc) => acc.email.toLowerCase() === normalized);
}

export const ADMIN_SESSION_KEY = 'smartsupervise_admin_session';

// Secret Institutional Authorization Code required for supervisor registration
export const SUPERVISOR_SECRET_CODE = '12345';

export function verifySupervisorSecretCode(code) {
  if (!code) return false;
  return code.toString().trim() === SUPERVISOR_SECRET_CODE;
}
