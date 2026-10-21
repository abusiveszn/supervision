// Unified User Registry for SmartSupervise
// Tracks all newly registered students and supervisors in real-time.

import { base44 } from '../api/base44Client.js';
import { appParams } from './app-params.js';

const REGISTRY_STORAGE_KEY = 'smartsupervise_registered_users';

// Pristine empty initial state so only newly registered students and supervisors appear
const INITIAL_SEEDED_USERS = [];

export function getRegisteredUsers() {
  if (typeof window === 'undefined' || !window.localStorage) {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(REGISTRY_STORAGE_KEY);
    if (!raw) {
      window.localStorage.setItem(REGISTRY_STORAGE_KEY, JSON.stringify([]));
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Failed to read user registry:', err);
    return [];
  }
}

export function getRegisteredStudents() {
  const all = getRegisteredUsers();
  return all.filter((u) => u.role === 'student' || u.portal === 'student');
}

export function getRegisteredSupervisors() {
  const all = getRegisteredUsers();
  return all.filter((u) => u.role === 'supervisor' || u.portal === 'supervisor');
}

export function registerStudent(studentData) {
  const all = getRegisteredUsers();
  const email = (studentData.email || '').trim().toLowerCase();
  
  const existingIdx = all.findIndex((u) => u.email?.toLowerCase() === email);
  const fullName = studentData.full_name || `${studentData.first_name || ''} ${studentData.last_name || ''}`.trim() || email.split('@')[0];
  
  const newStudent = {
    id: studentData.id || `student-${Date.now()}`,
    email,
    full_name: fullName,
    first_name: studentData.first_name || fullName.split(' ')[0] || 'Student',
    last_name: studentData.last_name || fullName.split(' ').slice(1).join(' ') || '',
    role: 'student',
    portal: 'student',
    password: studentData.password || undefined,
    registration_number: studentData.registration_number || studentData.matricNo || `STU-${Math.floor(1000 + Math.random() * 9000)}`,
    department_id: studentData.department_id || studentData.department || 'General',
    department: studentData.department || studentData.department_id || 'General',
    created_date: studentData.created_date || new Date().toISOString(),
  };

  let updatedList;
  if (existingIdx >= 0) {
    updatedList = [...all];
    updatedList[existingIdx] = { ...updatedList[existingIdx], ...newStudent, password: studentData.password || updatedList[existingIdx].password };
  } else {
    updatedList = [newStudent, ...all];
  }

  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.setItem(REGISTRY_STORAGE_KEY, JSON.stringify(updatedList));
    try {
      window.dispatchEvent(new Event('smartsupervise_users_updated'));
    } catch { /* ignore */ }
  }

  // Persist to user entity table (localDb and Base44)
  try {
    base44.entities.User.create(newStudent).catch(() => {});
  } catch { /* ignore */ }

  return newStudent;
}

export function registerSupervisor(supervisorData) {
  const all = getRegisteredUsers();
  const email = (supervisorData.email || '').trim().toLowerCase();
  
  const existingIdx = all.findIndex((u) => u.email?.toLowerCase() === email);
  const fullName = supervisorData.full_name || `${supervisorData.first_name || ''} ${supervisorData.last_name || ''}`.trim() || email.split('@')[0];
  
  const newSupervisor = {
    id: supervisorData.id || `supervisor-${Date.now()}`,
    email,
    full_name: fullName,
    first_name: supervisorData.first_name || fullName.split(' ')[0] || 'Supervisor',
    last_name: supervisorData.last_name || fullName.split(' ').slice(1).join(' ') || '',
    role: 'supervisor',
    portal: 'supervisor',
    password: supervisorData.password || undefined,
    staff_id: supervisorData.staff_id || `FAC-${Math.floor(100 + Math.random() * 900)}`,
    department_id: supervisorData.department_id || supervisorData.department || 'General',
    department: supervisorData.department || supervisorData.department_id || 'General',
    level: supervisorData.level || 'Faculty Member',
    created_date: supervisorData.created_date || new Date().toISOString(),
  };

  let updatedList;
  if (existingIdx >= 0) {
    updatedList = [...all];
    updatedList[existingIdx] = { ...updatedList[existingIdx], ...newSupervisor, password: supervisorData.password || updatedList[existingIdx].password };
  } else {
    updatedList = [newSupervisor, ...all];
  }

  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.setItem(REGISTRY_STORAGE_KEY, JSON.stringify(updatedList));
    try {
      window.dispatchEvent(new Event('smartsupervise_users_updated'));
    } catch { /* ignore */ }
  }

  // Persist to user entity table (localDb and Base44)
  try {
    base44.entities.User.create(newSupervisor).catch(() => {});
  } catch { /* ignore */ }

  return newSupervisor;
}

/**
 * Verifies credentials against the registered user store.
 * Returns:
 * - user object: when credentials match
 * - false: when user exists with that email but password does not match
 * - null: when user is not found in the local registry
 */
export function verifyUserCredentials(email, password, expectedRole = null) {
  if (!email || !password) return null;
  const all = getRegisteredUsers();
  const normalizedEmail = email.trim().toLowerCase();
  const trimmedPassword = password.trim();

  const user = all.find(
    (u) => u.email && u.email.trim().toLowerCase() === normalizedEmail
  );

  if (!user) return null;

  // Check role match if requested
  if (expectedRole) {
    const userRole = (user.role || user.portal || '').toLowerCase();
    const targetRole = expectedRole.toLowerCase();
    if (userRole !== targetRole) {
      return null;
    }
  }

  // If user was registered without password (legacy registration), accept and save password
  if (!user.password) {
    updateUserPassword(user.email, trimmedPassword);
    return user;
  }

  // If password matches
  if (user.password === trimmedPassword) {
    return user;
  }

  // Password does not match
  return false;
}

export function updateUserPassword(email, newPassword) {
  if (!email || !newPassword || typeof window === 'undefined' || !window.localStorage) return;
  const all = getRegisteredUsers();
  const normalizedEmail = email.trim().toLowerCase();
  const updatedList = all.map((u) => {
    if (u.email && u.email.trim().toLowerCase() === normalizedEmail) {
      return { ...u, password: newPassword.trim() };
    }
    return u;
  });
  window.localStorage.setItem(REGISTRY_STORAGE_KEY, JSON.stringify(updatedList));
}

export function clearAllSystemData() {
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.setItem(REGISTRY_STORAGE_KEY, JSON.stringify([]));
    window.localStorage.removeItem('smartsupervise_user_session');
    window.localStorage.removeItem('smartsupervise_admin_session');
    window.localStorage.removeItem('base44_access_token');
    window.localStorage.removeItem('token');
    
    // Clear all entity database tables (topics, documents, messages, etc.)
    const keysToRemove = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith('smartsupervise_db_')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => window.localStorage.removeItem(k));
  }
  return [];
}

export function getRegistryStats() {
  const all = getRegisteredUsers();
  const students = all.filter((u) => u.role === 'student' || u.portal === 'student');
  const supervisors = all.filter((u) => u.role === 'supervisor' || u.portal === 'supervisor');
  
  const departments = new Set();
  all.forEach((u) => {
    if (u.department || u.department_id) {
      departments.add(u.department || u.department_id);
    }
  });

  return {
    totalStudents: students.length,
    totalSupervisors: supervisors.length,
    totalDepartments: departments.size,
    recentStudents: students.slice(0, 10),
    recentSupervisors: supervisors.slice(0, 10),
  };
}
