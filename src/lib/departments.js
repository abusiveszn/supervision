// Standard University Departments for SmartSupervise
// Ensures consistent naming and IDs across student registration,
// supervisor registration, topic submissions, and project allocation.

export const UNIVERSITY_DEPARTMENTS = [
  {
    id: 'dept-csc',
    code: 'CSC',
    name: 'Computer Science',
    faculty: 'Science & Technology',
    description: 'Computing, Algorithms, Data Science and Software Systems',
  },
  {
    id: 'dept-swe',
    code: 'SWE',
    name: 'Software Engineering',
    faculty: 'Science & Technology',
    description: 'Software Architecture, Design, Testing and Cloud Systems',
  },
  {
    id: 'dept-it',
    code: 'IT',
    name: 'Information Technology',
    faculty: 'Science & Technology',
    description: 'Network Infrastructure, Systems Administration and Cloud',
  },
  {
    id: 'dept-cyb',
    code: 'CYB',
    name: 'Cybersecurity',
    faculty: 'Science & Technology',
    description: 'Information Assurance, Cryptography and Network Defense',
  },
];

export function getDepartmentName(deptIdOrName) {
  if (!deptIdOrName) return 'General';
  const query = String(deptIdOrName).trim().toLowerCase();
  
  const match = UNIVERSITY_DEPARTMENTS.find(
    (d) => d.id.toLowerCase() === query ||
           d.code.toLowerCase() === query ||
           d.name.toLowerCase() === query ||
           query.includes(d.name.toLowerCase()) ||
           d.name.toLowerCase().includes(query)
  );

  return match ? match.name : deptIdOrName;
}

export function isDepartmentMatch(deptA, deptB) {
  if (!deptA || !deptB) return false;
  const a = getDepartmentName(deptA).toLowerCase();
  const b = getDepartmentName(deptB).toLowerCase();
  return a === b || a.includes(b) || b.includes(a);
}
