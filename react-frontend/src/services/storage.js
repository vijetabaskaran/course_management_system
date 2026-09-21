/**
 * EduPortal — storage.js
 * Data layer: all localStorage read/write operations.
 * Preserves exact key names from original auth.js and extends for unit learning system.
 */

export const SESSION_KEY       = 'eduportal_session';
export const USERS_KEY         = 'eduportal_users';
export const COURSES_KEY       = 'eduportal_courses';
export const ENROLLMENTS_KEY   = 'eduportal_enrollments';
export const PROGRESS_KEY      = 'eduportal_progress';
export const UNIT_PROGRESS_KEY = 'eduportal_unit_progress';

const COURSE_GRADIENT_PALETTES = [
  'linear-gradient(135deg,#A88F70,#8C7358)',
  'linear-gradient(135deg,#8C7358,#6B5D50)',
  'linear-gradient(135deg,#6B5D50,#5C4E43)',
  'linear-gradient(135deg,#D8C3A5,#A88F70)',
  'linear-gradient(135deg,#9C8B7A,#7A6855)',
  'linear-gradient(135deg,#A88F70,#3F352C)',
  'linear-gradient(135deg,#7A6855,#5C4E43)',
  'linear-gradient(135deg,#C4A882,#8C7358)',
];

// ── Password hashing ──────────────────────────────────────────
export function hashPassword(password) {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return btoa(String(hash) + password.length + password.slice(-2));
}

export const DEFAULT_ADMIN = {
  email:    'admin@eduportal.com',
  password: hashPassword('Admin@123'),
  username: 'admin',
  fullname: 'Administrator',
  role:     'admin',
};

export const DEFAULT_STUDENT = {
  email:      'student@eduportal.com',
  password:   hashPassword('Student@123'),
  username:   'johndoe',
  fullname:   'John Doe',
  department: 'Computer Science',
  role:       'student',
  createdAt:  Date.now() - 86400000 * 40,
};

export const DEFAULT_COURSES = [
  {
    id: 'CRS-101',
    title: 'Python Programming Masterclass',
    code: 'CS-PY101',
    domain: 'Python',
    category: 'Computer Science',
    level: 'Beginner',
    instructor: 'Dr. Sarah Jenkins',
    duration: '12 Weeks',
    seats: 45,
    description: 'Complete beginner-to-advanced Python course covering variables, data structures, OOP, file handling, and real-world projects.',
    skills: 'Python Basics, Data Types, Control Flow, Functions, OOP, File Handling, Exception Handling',
    color: 'linear-gradient(135deg, #3776AB, #1E415E)',
    createdAt: Date.now() - 86400000 * 30,
  },
  {
    id: 'CRS-102',
    title: 'Machine Learning & Neural Networks',
    code: 'CS-ML201',
    domain: 'Machine Learning',
    category: 'Data Science',
    level: 'Intermediate',
    instructor: 'Prof. Alex Rivera',
    duration: '16 Weeks',
    seats: 30,
    description: 'Learn predictive modeling, classification algorithms, regression analysis, deep neural networks, and model evaluation.',
    skills: 'Machine Learning, Scikit-Learn, Regression, Classification, Neural Networks, Model Tuning',
    color: 'linear-gradient(135deg, #FF6F61, #C0392B)',
    createdAt: Date.now() - 86400000 * 25,
  },
  {
    id: 'CRS-103',
    title: 'Java Enterprise Application Development',
    code: 'CS-JV301',
    domain: 'Java',
    category: 'Software Engineering',
    level: 'Intermediate',
    instructor: 'Robert Lawson',
    duration: '10 Weeks',
    seats: 40,
    description: 'Master Java object-oriented programming, collection frameworks, multi-threading, Spring Boot basics, and backend API design.',
    skills: 'Java Core, OOP, Collections, Exception Handling, Multi-Threading, API Design',
    color: 'linear-gradient(135deg, #E76F51, #B53718)',
    createdAt: Date.now() - 86400000 * 22,
  },
  {
    id: 'CRS-104',
    title: 'Full-Stack Web Development Bootcamp',
    code: 'CS-WD101',
    domain: 'Web Development',
    category: 'Computer Science',
    level: 'Beginner',
    instructor: 'Elena Rostova',
    duration: '14 Weeks',
    seats: 50,
    description: 'Master full-stack modern web development with HTML5, CSS3, JavaScript ES6+, React, REST APIs, and deployment practices.',
    skills: 'HTML5, CSS3, JavaScript, React, Component State, REST APIs, Responsive Layouts',
    color: 'linear-gradient(135deg, #2A9D8F, #1D6F64)',
    createdAt: Date.now() - 86400000 * 20,
  },
  {
    id: 'CRS-105',
    title: 'Data Science & Predictive Analytics',
    code: 'CS-DS202',
    domain: 'Data Science',
    category: 'Data Science',
    level: 'Intermediate',
    instructor: 'Dr. Michael Vance',
    duration: '12 Weeks',
    seats: 35,
    description: 'Clean, visualize, and analyze complex datasets using Python Pandas, NumPy, Matplotlib, and statistical inference.',
    skills: 'Data Wrangling, Pandas, Data Visualization, Statistical Analysis, Hypothesis Testing',
    color: 'linear-gradient(135deg, #264653, #1A2E38)',
    createdAt: Date.now() - 86400000 * 18,
  },
  {
    id: 'CRS-106',
    title: 'Artificial Intelligence & Logic Systems',
    code: 'CS-AI401',
    domain: 'Artificial Intelligence',
    category: 'Computer Science',
    level: 'Advanced',
    instructor: 'Dr. Aris Thorne',
    duration: '14 Weeks',
    seats: 25,
    description: 'Explore state-space search, heuristic optimization, logic reasoning engines, natural language processing, and modern AI algorithms.',
    skills: 'Search Algorithms, Heuristics, Knowledge Representation, Logic Inference, NLP',
    color: 'linear-gradient(135deg, #8E44AD, #5B2C6F)',
    createdAt: Date.now() - 86400000 * 15,
  },
  {
    id: 'CRS-107',
    title: 'Autonomous Robotics & Kinematics',
    code: 'CS-ROB101',
    domain: 'Robotics',
    category: 'Engineering',
    level: 'Intermediate',
    instructor: 'Prof. Marcus Vance',
    duration: '12 Weeks',
    seats: 20,
    description: 'Learn robotic kinematics, sensor integration, microcontroller programming, actuator feedback control, and autonomous navigation.',
    skills: 'Robot Kinematics, Sensor Fusion, Microcontrollers, Actuator Control, ROS Basics',
    color: 'linear-gradient(135deg, #D4AC0D, #9A7D0A)',
    createdAt: Date.now() - 86400000 * 12,
  },
  {
    id: 'CRS-108',
    title: 'Cloud Computing & AWS Architecture',
    code: 'CS-CLD301',
    domain: 'Cloud Computing',
    category: 'Infrastructure',
    level: 'Advanced',
    instructor: 'David K. Chen',
    duration: '14 Weeks',
    seats: 35,
    description: 'Architect scalable cloud infrastructure using AWS EC2, S3, Docker containers, Kubernetes orchestrations, and CI/CD pipelines.',
    skills: 'AWS Cloud, Docker Containers, Kubernetes, CI/CD Pipelines, Infrastructure as Code',
    color: 'linear-gradient(135deg, #00B4D8, #0077B6)',
    createdAt: Date.now() - 86400000 * 10,
  },
  {
    id: 'CRS-109',
    title: 'Cybersecurity & Network Defense',
    code: 'CS-SEC201',
    domain: 'Cybersecurity',
    category: 'Information Security',
    level: 'Beginner',
    instructor: 'Sandra Bullock',
    duration: '10 Weeks',
    seats: 40,
    description: 'Understand network security protocols, ethical hacking techniques, cryptography principles, threat vectors, and defense strategies.',
    skills: 'Network Defense, Ethical Hacking, Cryptography, Packet Analysis, Vulnerability Scanning',
    color: 'linear-gradient(135deg, #E63946, #9B111E)',
    createdAt: Date.now() - 86400000 * 8,
  },
  {
    id: 'CRS-110',
    title: 'Relational Database & SQL Engineering',
    code: 'CS-DB101',
    domain: 'Database',
    category: 'Database Systems',
    level: 'Beginner',
    instructor: 'James Sterling',
    duration: '8 Weeks',
    seats: 45,
    description: 'Master relational database design, complex SQL queries, indexing, normalization, transactions, and performance tuning.',
    skills: 'SQL Queries, Database Schema Normalization, Indexing, Transactions, Query Optimization',
    color: 'linear-gradient(135deg, #457B9D, #1D3557)',
    createdAt: Date.now() - 86400000 * 5,
  }
];

// ── Students ─────────────────────────────────────────────────
export function getStudents() {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (!raw || JSON.parse(raw).length === 0) {
      const initial = [DEFAULT_STUDENT];
      localStorage.setItem(USERS_KEY, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(raw);
  } catch { return [DEFAULT_STUDENT]; }
}

export function saveStudent(student) {
  const students = getStudents();
  students.push(student);
  localStorage.setItem(USERS_KEY, JSON.stringify(students));
}

export function findStudentByEmail(email) {
  return getStudents().find(s => s.email.toLowerCase() === email.toLowerCase()) || null;
}

export function findStudentByUsername(username) {
  return getStudents().find(s => s.username.toLowerCase() === username.toLowerCase()) || null;
}

// ── Courses ───────────────────────────────────────────────────
export function getCourses() {
  try {
    const raw = localStorage.getItem(COURSES_KEY);
    if (!raw || JSON.parse(raw).length === 0) {
      localStorage.setItem(COURSES_KEY, JSON.stringify(DEFAULT_COURSES));
      return DEFAULT_COURSES;
    }
    const parsed = JSON.parse(raw);
    // Ensure all courses have normalized name/title and domain fields
    return parsed.map(c => ({
      ...c,
      name: c.name || c.title,
      title: c.title || c.name,
      domain: c.domain || c.category || 'General',
      code: c.code || `CRS-${c.id}`,
    }));
  } catch { return DEFAULT_COURSES; }
}

export function saveCourses(courses) {
  localStorage.setItem(COURSES_KEY, JSON.stringify(courses));
}

export function upsertCourse(courseData) {
  const courses = getCourses();
  const title = courseData.title || courseData.name;
  const domain = courseData.domain || courseData.category || 'General';

  if (courseData.id) {
    const idx = courses.findIndex(c => c.id === courseData.id);
    if (idx !== -1) {
      courses[idx] = { 
        ...courses[idx], 
        ...courseData, 
        title, 
        name: title, 
        domain, 
        updatedAt: Date.now() 
      };
      saveCourses(courses);
      return courses[idx];
    }
  }

  const newCourse = {
    ...courseData,
    id: 'CRS-' + Date.now(),
    title,
    name: title,
    domain,
    code: courseData.code || 'CS-' + Math.floor(100 + Math.random() * 900),
    color: COURSE_GRADIENT_PALETTES[courses.length % COURSE_GRADIENT_PALETTES.length],
    createdAt: Date.now(),
  };
  courses.push(newCourse);
  saveCourses(courses);
  return newCourse;
}

export function deleteCourse(courseId) {
  saveCourses(getCourses().filter(c => c.id !== courseId));
  saveEnrollments(getEnrollments().filter(e => e.courseId !== courseId));
  saveProgress(getProgress().filter(p => p.courseId !== courseId));
}

export function getCourseById(courseId) {
  return getCourses().find(c => c.id === courseId) || null;
}

// ── Enrollments ───────────────────────────────────────────────
export function getEnrollments() {
  try { return JSON.parse(localStorage.getItem(ENROLLMENTS_KEY)) || []; }
  catch { return []; }
}

export function saveEnrollments(enrollments) {
  localStorage.setItem(ENROLLMENTS_KEY, JSON.stringify(enrollments));
}

export function enrollStudent(studentEmail, courseId) {
  const enrollments = getEnrollments();
  if (enrollments.some(e => e.studentEmail === studentEmail && e.courseId === courseId)) return null;
  const record = { id: 'ENR-' + Date.now(), studentEmail, courseId, enrolledAt: Date.now() };
  enrollments.push(record);
  saveEnrollments(enrollments);
  setProgress(studentEmail, courseId, 0);
  return record;
}

export function getStudentEnrollments(studentEmail) {
  return getEnrollments().filter(e => e.studentEmail === studentEmail);
}

export function getCourseEnrollments(courseId) {
  return getEnrollments().filter(e => e.courseId === courseId);
}

export function isEnrolled(studentEmail, courseId) {
  return getEnrollments().some(e => e.studentEmail === studentEmail && e.courseId === courseId);
}

// ── Progress & Unit Learning ──────────────────────────────────
export function getProgress() {
  try { return JSON.parse(localStorage.getItem(PROGRESS_KEY)) || []; }
  catch { return []; }
}

export function saveProgress(progress) {
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
}

export function setProgress(studentEmail, courseId, percent) {
  const all = getProgress();
  const idx = all.findIndex(p => p.studentEmail === studentEmail && p.courseId === courseId);
  const clamped = Math.max(0, Math.min(100, Math.round(percent)));
  if (idx !== -1) {
    all[idx].percent = clamped;
    all[idx].updatedAt = Date.now();
  } else {
    all.push({ studentEmail, courseId, percent: clamped, updatedAt: Date.now() });
  }
  saveProgress(all);
}

// Unit level progress records
export function getUnitProgressRecords() {
  try { return JSON.parse(localStorage.getItem(UNIT_PROGRESS_KEY)) || {}; }
  catch { return {}; }
}

export function saveUnitProgressRecords(records) {
  localStorage.setItem(UNIT_PROGRESS_KEY, JSON.stringify(records));
}

export function getStudentCourseUnitProgress(studentEmail, courseId) {
  const records = getUnitProgressRecords();
  const key = `${studentEmail}_${courseId}`;
  return records[key] || {
    completedUnits: [],
    quizScores: {},
    completedAt: null,
    certificateId: null
  };
}

export function completeUnitAndQuiz(studentEmail, courseId, unitId, score) {
  const records = getUnitProgressRecords();
  const key = `${studentEmail}_${courseId}`;
  const current = records[key] || { completedUnits: [], quizScores: {}, completedAt: null, certificateId: null };

  const numUnitId = Number(unitId);
  const updatedCompletedUnits = Array.from(new Set([...current.completedUnits, numUnitId])).sort((a,b) => a - b);
  const updatedQuizScores = { ...current.quizScores, [numUnitId]: score };

  const totalUnits = 5;
  const percent = Math.min(100, Math.round((updatedCompletedUnits.length / totalUnits) * 100));

  let completedAt = current.completedAt;
  let certificateId = current.certificateId;

  if (percent === 100 && !certificateId) {
    completedAt = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const course = getCourseById(courseId);
    const domainPrefix = ((course?.domain || 'EP').substring(0, 2)).toUpperCase();
    const randomCode = Math.floor(100000 + Math.random() * 900000);
    certificateId = `EP-${domainPrefix}-${randomCode}`;
  }

  records[key] = {
    ...current,
    completedUnits: updatedCompletedUnits,
    quizScores: updatedQuizScores,
    completedAt,
    certificateId
  };

  saveUnitProgressRecords(records);
  setProgress(studentEmail, courseId, percent);

  return { percent, completedUnits: updatedCompletedUnits, certificateId, completedAt };
}

export function getStudentCourseProgress(studentEmail, courseId) {
  const unitProg = getStudentCourseUnitProgress(studentEmail, courseId);
  if (unitProg && Array.isArray(unitProg.completedUnits)) {
    return Math.min(100, Math.round((unitProg.completedUnits.length / 5) * 100));
  }
  const record = getProgress().find(p => p.studentEmail === studentEmail && p.courseId === courseId);
  return record ? record.percent : 0;
}

export function getStudentOverallProgress(studentEmail) {
  const enrollments = getStudentEnrollments(studentEmail);
  if (!enrollments.length) return 0;
  const total = enrollments.reduce((sum, e) => sum + getStudentCourseProgress(studentEmail, e.courseId), 0);
  return Math.round(total / enrollments.length);
}

export function getCourseAverageProgress(courseId) {
  const enrollments = getCourseEnrollments(courseId);
  if (!enrollments.length) return 0;
  const total = enrollments.reduce((sum, e) => sum + getStudentCourseProgress(e.studentEmail, courseId), 0);
  return Math.round(total / enrollments.length);
}

export function getCertificateData(studentEmail, courseId) {
  const student = findStudentByEmail(studentEmail);
  const course = getCourseById(courseId);
  const unitProg = getStudentCourseUnitProgress(studentEmail, courseId);
  const progress = getStudentCourseProgress(studentEmail, courseId);

  if (!course || progress < 100) return null;

  return {
    studentName: student?.fullname || 'Student',
    courseTitle: course.title || course.name,
    domain: course.domain || course.category || 'General',
    instructor: course.instructor || 'Dr. Sarah Jenkins',
    completionDate: unitProg.completedAt || new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    certificateId: unitProg.certificateId || `EP-${(course.domain || 'EP').slice(0, 2).toUpperCase()}-984210`,
  };
}

// ── Session ───────────────────────────────────────────────────
export function createSession(user, remember = false) {
  const session = {
    user:      { ...user, password: undefined },
    createdAt: Date.now(),
    expiresAt: Date.now() + (remember ? 7 * 24 * 60 * 60 * 1000 : 2 * 60 * 60 * 1000),
    remember,
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function getSession() {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    const session = JSON.parse(raw);
    if (Date.now() > session.expiresAt) { destroySession(); return null; }
    return session;
  } catch { return null; }
}

export function destroySession() {
  localStorage.removeItem(SESSION_KEY);
}

export function authenticateAdmin(email, password) {
  const hashed = hashPassword(password);
  if (email.toLowerCase() === DEFAULT_ADMIN.email.toLowerCase() && hashed === DEFAULT_ADMIN.password) {
    return { email: DEFAULT_ADMIN.email, username: DEFAULT_ADMIN.username, fullname: 'Admin', role: 'admin' };
  }
  return null;
}

export function authenticateStudent(email, password) {
  const student = findStudentByEmail(email);
  if (!student) return null;
  if (student.password !== hashPassword(password)) return null;
  return { email: student.email, username: student.username, fullname: student.fullname, department: student.department || '', role: 'student', createdAt: student.createdAt };
}

// ── Helpers ───────────────────────────────────────────────────
export function getInitials(fullname) {
  return (fullname || '').split(' ').filter(Boolean).slice(0, 2).map(n => n[0].toUpperCase()).join('');
}

export function generateStudentId(username) {
  const idNum = Math.abs((username || '').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)) % 9999;
  return `STU-${String(idNum).padStart(4, '0')}`;
}

export function formatCurrentDate() {
  return new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

export function formatTimeAgo(timestamp) {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

export function getGreeting(name) {
  const hour = new Date().getHours();
  if (hour < 12) return `Good morning, ${name}!`;
  if (hour < 17) return `Good afternoon, ${name}!`;
  return `Good evening, ${name}!`;
}

export function getProgressColor(pct) {
  if (pct >= 100) return '#10b981';
  if (pct >= 40) return '#f59e0b';
  return '#A88F70';
}

export function getProgressLabel(pct) {
  if (pct === 100) return 'Completed';
  if (pct >= 75) return 'Almost There';
  if (pct >= 40) return 'In Progress';
  return 'Just Started';
}
