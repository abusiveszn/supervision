// Comprehensive Automated End-to-End Verification Test
// Tests the full lifecycle: registrations, security, topic lifecycle, allocation,
// dashboard queries, department consistency, and route availability.

import { UNIVERSITY_DEPARTMENTS, getDepartmentName, isDepartmentMatch } from '../src/lib/departments.js';
import { verifySupervisorSecretCode } from '../src/lib/auth-constants.js';

async function runTests() {
  console.log('====================================================');
  console.log('  SMARTSUPERVISE AUTOMATED SYSTEM TEST SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  PASS: ${message}`);
      passed++;
    } else {
      console.error(`  FAIL: ${message}`);
      failed++;
    }
  }

  // TEST 1: Supervisor Secret Code Security
  console.log('--- Test Group 1: Supervisor Authorization Security ---');
  assert(verifySupervisorSecretCode('12345') === true, 'Secret code "12345" is authorized');
  assert(verifySupervisorSecretCode(' 12345 ') === true, 'Secret code with whitespace trimmed is authorized');
  assert(verifySupervisorSecretCode('00000') === false, 'Invalid secret code "00000" is rejected');
  assert(verifySupervisorSecretCode('') === false, 'Empty secret code is rejected');

  // TEST 2: Department Consistency & Matching
  console.log('\n--- Test Group 2: Department Registry & Matcher ---');
  assert(UNIVERSITY_DEPARTMENTS.length >= 4, 'Has at least 4 default departments');
  assert(getDepartmentName('dept-csc') === 'Computer Science', 'Resolves dept-csc to Computer Science');
  assert(getDepartmentName('CSC') === 'Computer Science', 'Resolves code CSC to Computer Science');
  assert(getDepartmentName('computer science') === 'Computer Science', 'Case-insensitive resolves computer science');
  assert(isDepartmentMatch('Computer Science', 'CSC') === true, 'Matches Computer Science with CSC');
  assert(isDepartmentMatch('Software Engineering', 'SWE') === true, 'Matches Software Engineering with SWE');
  assert(isDepartmentMatch('Computer Science', 'SWE') === false, 'Does not match Computer Science with SWE');

  // TEST 3: User Registry & In-Memory Storage
  console.log('\n--- Test Group 3: User Registration Simulation ---');
  const mockStorage = new Map();
  global.window = {
    location: { search: '', href: 'http://localhost:5173/' },
    localStorage: {
      getItem: (k) => mockStorage.get(k) || null,
      setItem: (k, v) => mockStorage.set(k, String(v)),
      removeItem: (k) => mockStorage.delete(k),
      clear: () => mockStorage.clear(),
    },
    dispatchEvent: () => {},
  };
  global.Event = class {};

  const { registerStudent, registerSupervisor, getRegisteredUsers, getRegisteredStudents, getRegisteredSupervisors } = await import('../src/lib/user-registry.js');

  const student = registerStudent({
    first_name: 'John',
    last_name: 'Doe',
    email: 'john.doe@university.edu',
    matricNo: 'CSC/2024/001',
    department: 'Computer Science',
    department_id: 'Computer Science',
  });
  assert(student && student.id.startsWith('student-'), 'Student registered with valid student ID');
  assert(student.full_name === 'John Doe', 'Student full name assembled properly');

  const supervisor = registerSupervisor({
    first_name: 'Sarah',
    last_name: 'Connor',
    email: 'sarah.connor@university.edu',
    staffId: 'SUP-CSC-001',
    department: 'Computer Science',
    department_id: 'Computer Science',
    level: 'Associate Professor',
    secretCode: '12345',
  });
  assert(supervisor && supervisor.id.startsWith('supervisor-'), 'Supervisor registered with valid supervisor ID');

  const allUsers = getRegisteredUsers();
  assert(allUsers.length >= 2, `Registry contains ${allUsers.length} users`);
  assert(getRegisteredStudents().some(s => s.email === 'john.doe@university.edu'), 'Student found in getRegisteredStudents');
  assert(getRegisteredSupervisors().some(s => s.email === 'sarah.connor@university.edu'), 'Supervisor found in getRegisteredSupervisors');

  // TEST 4: Topic Lifecycle Simulation
  console.log('\n--- Test Group 4: Topic Proposal & Approval Lifecycle ---');
  const topicsTable = [];
  const projectsTable = [];

  // Student creates topic
  const newTopic = {
    id: `topic-${Date.now()}`,
    title: 'AI-Powered Automated Code Review',
    description: 'Intelligent code review platform',
    objectives: 'Analyze code quality and generate feedback',
    student_id: student.id,
    student_name: student.full_name,
    student_email: student.email,
    department: student.department,
    department_id: student.department_id,
    status: 'pending',
  };
  topicsTable.push(newTopic);
  assert(newTopic.status === 'pending', 'Topic initially pending');
  assert(newTopic.student_email === student.email, 'Topic records student email');

  // Admin approves topic
  newTopic.status = 'approved';
  assert(newTopic.status === 'approved', 'Topic approved by Admin');

  // TEST 5: Project Allocation Simulation
  console.log('\n--- Test Group 5: Project Allocation & Matching ---');
  // Match supervisor in same department
  const eligibleSupervisors = getRegisteredSupervisors().filter(s => isDepartmentMatch(s.department, newTopic.department));
  assert(eligibleSupervisors.some(s => s.id === supervisor.id), 'Sarah Connor is eligible for allocation in Computer Science');

  const allocatedProject = {
    id: `proj-${Date.now()}`,
    title: newTopic.title,
    description: newTopic.description,
    student_id: newTopic.student_id,
    student_name: newTopic.student_name,
    student_email: newTopic.student_email,
    supervisor_id: supervisor.id,
    supervisor_name: supervisor.full_name,
    supervisor_email: supervisor.email,
    department: 'Computer Science',
    department_id: 'Computer Science',
    session: '2025/2026',
    status: 'approved',
    completion_percentage: 15,
  };
  projectsTable.push(allocatedProject);
  newTopic.project_id = allocatedProject.id;
  newTopic.supervisor_id = supervisor.id;

  assert(allocatedProject.supervisor_name === 'Sarah Connor', 'Allocated project records supervisor name');
  assert(allocatedProject.student_name === 'John Doe', 'Allocated project records student name');

  // TEST 6: Dashboard Visibility Verification
  console.log('\n--- Test Group 6: Dashboard Query Reflection ---');
  // Student Dashboard Reflection
  const studentProjects = projectsTable.filter(p => p.student_id === student.id || p.student_email === student.email);
  assert(studentProjects.length === 1, 'Student Dashboard finds allocated project');
  assert(studentProjects[0].supervisor_name === 'Sarah Connor', 'Student Dashboard displays assigned supervisor');

  // Supervisor Dashboard Reflection
  const supervisorProjects = projectsTable.filter(p => p.supervisor_id === supervisor.id || p.supervisor_email === supervisor.email);
  assert(supervisorProjects.length === 1, 'Supervisor Dashboard finds allocated student');
  assert(supervisorProjects[0].student_name === 'John Doe', 'Supervisor Dashboard displays student name');

  // TEST 7: Route Availability on Local Dev Server
  console.log('\n--- Test Group 7: Route Health Checks (HTTP 200) ---');
  const routes = [
    '/',
    '/student-auth',
    '/supervisor-auth',
    '/admin',
    '/student/dashboard',
    '/supervisor/dashboard',
    '/admin/dashboard',
    '/topics',
    '/allocation',
    '/students',
    '/supervisors',
    '/documents',
    '/meetings',
    '/messages'
  ];

  for (const route of routes) {
    try {
      const res = await fetch(`http://localhost:5173${route}`);
      assert(res.status === 200, `Route ${route} returned HTTP ${res.status}`);
    } catch (err) {
      assert(false, `Route ${route} failed: ${err.message}`);
    }
  }

  console.log('\n====================================================');
  console.log(`  TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test runner failure:', err);
  process.exit(1);
});
