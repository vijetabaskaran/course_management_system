import { useState, useCallback, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCourses } from '../context/CourseContext';
import Sidebar from '../components/Sidebar';
import StatCard from '../components/StatCard';
import Toast from '../components/Toast';
import DomainSelector from '../components/DomainSelector';
import CourseDetailModal from '../components/CourseDetailModal';
import CourseLearningView from '../components/CourseLearningView';
import CertificateModal from '../components/CertificateModal';
import MyCourses from '../components/MyCourses';
import MyLearningProgress from '../components/MyLearningProgress';
import Chat from '../components/Chat';
import {
  getInitials, generateStudentId, formatCurrentDate,
  getGreeting, getProgressColor,
} from '../services/storage';
import '../styles/dashboard.css';

const enrollmentProgress = (e) => (typeof e.progressPercentage === 'number' ? e.progressPercentage : 0);

function courseUnitCount(course, enrollment) {
  if (course?.modules?.length) return course.modules.length;
  return enrollment?.totalUnits || 1;
}

const STUDENT_SECTIONS = [
  {
    key: 'overview', label: 'Overview',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
  },
  {
    key: 'browse', label: 'Browse Courses',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  },
  {
    key: 'courses', label: 'My Courses',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>,
  },
  {
    key: 'progress', label: 'Learning Progress',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20v-6M6 20V10M18 20V4"/></svg>,
  },
  {
    key: 'chat', label: 'Chat',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  },
  {
    key: 'profile', label: 'My Profile',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  },
];

/* ── Overview Section ────────────────────────────── */
function OverviewSection({ user, allCourses, enrollments, onBrowse, onStartLearning, onViewCertificate }) {
  const getTime = (d) => (d ? new Date(d).getTime() : 0);
  const recentEnrolled = enrollments.slice().sort((a, b) => getTime(b.enrolledAt) - getTime(a.enrolledAt)).slice(0, 5);
  const progValues = enrollments.map(enrollmentProgress);
  const overall = progValues.length ? Math.round(progValues.reduce((s, p) => s + p, 0) / progValues.length) : 0;
  const completedCourses = progValues.filter(p => p === 100).length;

  return (
    <>
      <div className="section-header">
        <div>
          <h2 id="welcome-heading" className="section-title">{getGreeting(user.fullname.split(' ')[0])}</h2>
          <p className="section-subtitle">{formatCurrentDate()}</p>
        </div>
        <button className="btn-action" onClick={onBrowse}>Browse Courses</button>
      </div>

      <div className="stats-grid">
        <StatCard
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>}
          number={enrollments.length}
          label="ENROLLED COURSES"
          badge={`${completedCourses} Completed`}
        />
        <StatCard
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>}
          number={`${overall}%`}
          label="OVERALL PROGRESS"
          badge="Auto Avg."
        />
        <StatCard
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>}
          number={(user.department || 'N/A').split(' ')[0]}
          label="DEPARTMENT"
          badge="Your Dept."
        />
        <StatCard
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>}
          number={allCourses.length}
          label="AVAILABLE COURSES"
          badge="Explore"
        />
      </div>

      <div className="content-grid">
        {/* Recently Enrolled Widget */}
        <div className="content-card dashboard-widget-card">
          <div className="widget-header">
            <h3 className="card-title">Recently Enrolled</h3>
            {enrollments.length > 0 && (
              <span className="widget-badge">
                {enrollments.length - completedCourses} Active{completedCourses > 0 ? ` · ${completedCourses} Completed` : ''}
              </span>
            )}
          </div>

          {recentEnrolled.length === 0 ? (
            <div className="dashboard-empty-widget">
              <span className="empty-widget-icon">🎓</span>
              <h4>No courses enrolled yet</h4>
              <p>Explore courses across various domains to start your learning journey.</p>
              <button className="btn-action btn-sm" onClick={onBrowse}>
                Browse Courses →
              </button>
            </div>
          ) : (
            <div className="course-list">
              {recentEnrolled.map(e => {
                const course = allCourses.find(c => c.id === e.courseId);
                if (!course) return null;
                const prog = enrollmentProgress(e);
                const totalUnits = courseUnitCount(course, e);
                const completedCount = Math.min(e.completedUnits || 0, totalUnits);

                return (
                  <div key={e.id} className="dashboard-course-item">
                    <div className="course-color" style={{ background: course.color || 'var(--taupe)' }}/>
                    <div className="course-info">
                      <span className="course-name">{course.title || course.name}</span>
                      <span className="course-code-domain">
                        {course.domain || course.category} · {prog === 100 ? `All ${totalUnits} units completed` : `Unit ${Math.min(completedCount + 1, totalUnits)} of ${totalUnits}`}
                      </span>
                    </div>
                    <div className="course-item-right">
                      <span className="progress-badge" style={{ background: `${getProgressColor(prog)}20`, color: getProgressColor(prog) }}>
                        {prog}%
                      </span>
                      {prog === 100 ? (
                        <button className="btn-sm btn-gold" onClick={() => onViewCertificate(course)}>
                          🏆
                        </button>
                      ) : (
                        <button className="btn-sm btn-action" onClick={() => onStartLearning(course)}>
                          Continue →
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Learning Progress Widget */}
        <div className="content-card dashboard-widget-card">
          <div className="widget-header">
            <h3 className="card-title">Learning Progress</h3>
            {enrollments.length > 0 && (
              <span className="widget-badge">{overall}% Overall</span>
            )}
          </div>

          {enrollments.length === 0 ? (
            <div className="dashboard-empty-widget">
              <span className="empty-widget-icon">📈</span>
              <h4>No learning progress yet</h4>
              <p>Enroll in a course and complete your first unit to track automatic progress here.</p>
            </div>
          ) : (
            <>
              <div className="overall-progress-wrap">
                <div className="overall-progress-header">
                  <span>Overall Learning Completion</span>
                  <strong>{overall}%</strong>
                </div>
                <div className="cprogress-bar" style={{ height: 10 }}>
                  <div className="cprogress-fill" style={{ width: `${overall}%`, background: getProgressColor(overall) }}/>
                </div>
              </div>

              <div className="progress-course-list">
                {enrollments.map(e => {
                  const course = allCourses.find(c => c.id === e.courseId);
                  if (!course) return null;
                  const prog = enrollmentProgress(e);
                  const totalUnits = courseUnitCount(course, e);
                  const completedCount = prog === 100 ? totalUnits : Math.min(e.completedUnits || 0, totalUnits);

                  return (
                    <div key={e.id} className="progress-course-item">
                      <div className="progress-course-label">
                        <span className="progress-dot" style={{ background: getProgressColor(prog) }}/>
                        <div className="progress-title-meta">
                          <span className="progress-course-title">{course.title || course.name}</span>
                          <span className="progress-unit-indicator">{completedCount}/{totalUnits} Units Completed</span>
                        </div>
                      </div>
                      <div className="progress-course-bar-wrap">
                        <div className="cprogress-bar" style={{ flex: 1, height: 6 }}>
                          <div className="cprogress-fill" style={{ width: `${prog}%`, background: getProgressColor(prog) }}/>
                        </div>
                        <span className="progress-pct">{prog}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

/* ── Browse Courses Section ──────────────────────── */
function BrowseSection({ user, allCourses, enrollments, onEnrolled, onStartLearning, onInspectCourse, toast }) {
  const { enrollStudent, isEnrolled } = useCourses();
  const [selectedDomain, setSelectedDomain] = useState(null);
  const [search, setSearch] = useState('');
  const [enrolling, setEnrolling] = useState(null);

  const courses = allCourses.filter(c => {
    const courseDomain = (c.domain || c.category || '').toLowerCase();
    if (selectedDomain && courseDomain !== selectedDomain.toLowerCase()) {
      return false;
    }
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (c.title || c.name || '').toLowerCase().includes(q) ||
      (c.code || '').toLowerCase().includes(q) ||
      (c.domain || c.category || '').toLowerCase().includes(q) ||
      (c.instructor || '').toLowerCase().includes(q)
    );
  });

  const handleEnroll = async (courseId) => {
    const course = allCourses.find(c => c.id === courseId);
    if (!course) return;
    setEnrolling(courseId);
    try {
      const res = await enrollStudent(user.email, courseId);
      onEnrolled();
      const msg = res?.message || `Successfully enrolled in "${course.title || course.name}"!`;
      toast(msg);
    } catch (err) {
      console.error('Enrollment failed:', err);
      const errMsg = err.response?.data?.message || 'Failed to enroll. Please try again.';
      toast(errMsg);
    } finally {
      setEnrolling(null);
    }
  };

  return (
    <>
      <div className="section-header">
        <div>
          <h2 className="section-title">Browse Courses</h2>
          <p className="section-subtitle">Select a domain, inspect curriculum, and enroll to start learning.</p>
        </div>
      </div>

      {/* 1. Domain Selector */}
      <DomainSelector
        selectedDomain={selectedDomain}
        onSelectDomain={setSelectedDomain}
        allCourses={allCourses}
      />

      {/* 2. Course Search & Filter Bar */}
      <div className="table-card domain-search-toolbar">
        <div className="table-toolbar">
          <input
            className="table-search"
            type="search"
            placeholder={selectedDomain ? `Search within ${selectedDomain}...` : "Search all courses by name, code, domain, instructor..."}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {selectedDomain && (
            <span className="active-domain-filter-badge">
              Domain: <strong>{selectedDomain}</strong>
              <button onClick={() => setSelectedDomain(null)}>✕</button>
            </span>
          )}
        </div>
      </div>

      {/* 3. Courses Grid */}
      {courses.length === 0 ? (
        <div className="empty-state">
          <h3>No courses found</h3>
          <p>{selectedDomain ? `No courses currently available in "${selectedDomain}".` : 'Try adjusting your search criteria.'}</p>
          {selectedDomain && (
            <button className="btn-secondary" onClick={() => setSelectedDomain(null)}>
              Clear Domain Filter
            </button>
          )}
        </div>
      ) : (
        <div className="courses-grid">
          {courses.map(course => {
            const enrolled = isEnrolled(user.email, course.id);
            const count = enrollments.filter(e => e.courseId === course.id).length;
            const unitCount = course.modules?.length || 0;

            return (
              <div key={course.id} className="course-card browse-course-card">
                <div className="course-card-banner" style={{ background: course.color || 'var(--taupe)' }}>
                  <span className="course-card-domain-badge">{course.domain || course.category}</span>
                </div>
                <div className="course-card-body">
                  <span className="course-card-code">{course.code || course.id}</span>
                  <h4 className="course-card-name">{course.title || course.name}</h4>
                  {course.instructor && <p className="course-card-instructor">Prof. {course.instructor}</p>}
                  {course.description && <p className="course-description-text">{course.description}</p>}
                  
                  <div className="browse-course-meta">
                    <span className="meta-tag">📚 {unitCount} Units</span>
                    <span className="meta-tag">⏱ {course.duration || '12 Weeks'}</span>
                    <span className="meta-tag">👥 {count} Enrolled</span>
                  </div>

                  <div className="course-card-footer">
                    <button className="btn-secondary btn-sm" onClick={() => onInspectCourse(course)}>
                      Learn More
                    </button>
                    {enrolled ? (
                      <button className="btn-action btn-sm" onClick={() => onStartLearning(course)}>
                        Start Learning →
                      </button>
                    ) : (
                      <button className="btn-enroll btn-sm" onClick={() => handleEnroll(course.id)} disabled={enrolling === course.id}>
                        {enrolling === course.id ? 'Enrolling…' : 'Enroll Now'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

/* ── Profile Section ─────────────────────────────── */
function ProfileSection({ user, enrollments }) {
  const myEnrollments = enrollments;
  const progValues = myEnrollments.map(enrollmentProgress);
  const completedCount = progValues.filter(p => p === 100).length;
  const overall = progValues.length ? Math.round(progValues.reduce((s, p) => s + p, 0) / progValues.length) : 0;
  const initials = getInitials(user.fullname);
  const studentId = generateStudentId(user.username);
  const joined = user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'N/A';

  return (
    <>
      <div className="section-header">
        <div><h2 className="section-title">My Profile</h2><p className="section-subtitle">Your personal student account information.</p></div>
      </div>
      <div className="profile-card">
        <div className="profile-avatar-large">{initials}</div>
        <div className="profile-info">
          <h3 id="profile-name">{user.fullname}</h3>
          <p id="profile-role-tag" className="profile-role">Student{user.department ? ` — ${user.department}` : ''}</p>
          <p id="profile-email-tag" className="profile-email">{user.email}</p>
        </div>
      </div>
      <div className="profile-details-grid">
        {[
          { label: 'Student ID', value: studentId, id: 'profile-student-id' },
          { label: 'Username', value: user.username, id: 'profile-username' },
          { label: 'Department', value: user.department || 'Not specified', id: 'profile-department' },
          { label: 'Email', value: user.email, id: 'profile-email-detail' },
          { label: 'Enrolled Courses', value: myEnrollments.length, id: 'profile-enrolled-count' },
          { label: 'Completed Courses', value: completedCount, id: 'profile-completed-count' },
          { label: 'Member Since', value: joined, id: 'profile-joined' },
          { label: 'Overall Progress', value: `${overall}%`, id: 'profile-progress' },
        ].map(({ label, value, id }) => (
          <div key={id} className="profile-detail-item">
            <span className="detail-label">{label}</span>
            <span id={id} className="detail-value">{value}</span>
          </div>
        ))}
      </div>
    </>
  );
}

/* ── Main StudentDashboard ───────────────────────── */
export default function StudentDashboard({ initialSection = 'overview' }) {
  const { user, loading: authLoading } = useAuth();
  const {
    courses: allCourses,
    enrollments,
    loading: dataLoading,
    enrollStudent,
    fetchAll,
  } = useCourses();

  const [activeSection, setActiveSection] = useState(initialSection);
  const [selectedCourseForLearning, setSelectedCourseForLearning] = useState(null);
  const [inspectCourseModal, setInspectCourseModal] = useState(null);
  const [certModalCourse, setCertModalCourse] = useState(null);
  const [toastMsg, setToastMsg] = useState('');

  const showToast = useCallback((msg) => setToastMsg(msg), []);
  const clearToast = useCallback(() => setToastMsg(''), []);

  useEffect(() => {
    if (fetchAll) fetchAll();
  }, [fetchAll, activeSection]);

  const handleStartLearning = (course) => {
    setSelectedCourseForLearning(course);
    setActiveSection('learn');
  };

  const handleInspectCourse = (course) => {
    setInspectCourseModal(course);
  };

  const handleViewCertificate = (course) => {
    setCertModalCourse(course);
  };

  const handleEnrollFromModal = async (courseId) => {
    setInspectCourseModal(null);
    try {
      const res = await enrollStudent(user.email, courseId);
      const course = allCourses.find(c => c.id === courseId);
      const msg = res?.message || `Successfully enrolled in "${course?.title || course?.name}"!`;
      showToast(msg);
      if (course) handleStartLearning(course);
    } catch (err) {
      console.error('Enrollment failed:', err);
      const errMsg = err.response?.data?.message || 'Failed to enroll. Please try again.';
      showToast(errMsg);
    }
  };

  if (authLoading || dataLoading) return null;
  if (!user || user.role !== 'student') return <Navigate to="/" replace/>;

  // Student's own enrollments
  const myEnrollments = enrollments.filter(e => e.studentEmail && user?.email && e.studentEmail.toLowerCase().trim() === user.email.toLowerCase().trim());

  // Render course learning view if section is 'learn'
  if (activeSection === 'learn' && selectedCourseForLearning) {
    return (
      <>
        <CourseLearningView
          course={selectedCourseForLearning}
          user={user}
          onBack={() => {
            setSelectedCourseForLearning(null);
            setActiveSection('courses');
          }}
          onCompleteCourse={(c) => {
            showToast(`🎉 Congratulations! You completed "${c.title || c.name}"!`);
            setCertModalCourse(c);
          }}
          onProgressUpdated={() => {
            if (fetchAll) fetchAll();
          }}
          onViewCertificate={(c) => setCertModalCourse(c)}
        />
        {certModalCourse && (
          <CertificateModal
            course={certModalCourse}
            user={user}
            onClose={() => setCertModalCourse(null)}
          />
        )}
      </>
    );
  }

  const breadcrumbLabels = {
    overview: 'Overview', browse: 'Browse Courses', courses: 'My Courses', progress: 'Learning Progress', chat: 'Chat', profile: 'My Profile',
  };

  const renderSection = () => {
    switch (activeSection) {
      case 'overview': 
        return (
          <OverviewSection
            key={activeSection}
            user={user}
            allCourses={allCourses}
            enrollments={myEnrollments}
            onBrowse={() => setActiveSection('browse')}
            onStartLearning={handleStartLearning}
            onViewCertificate={handleViewCertificate}
          />
        );
      case 'browse':   
        return (
          <BrowseSection
            key={activeSection}
            user={user}
            allCourses={allCourses}
            enrollments={enrollments}
            onEnrolled={() => {}}
            onStartLearning={handleStartLearning}
            onInspectCourse={handleInspectCourse}
            toast={showToast}
          />
        );
      case 'courses':  
        return (
          <MyCourses
            key={activeSection}
            onBrowse={() => setActiveSection('browse')}
            onStartLearning={handleStartLearning}
            onViewCertificate={handleViewCertificate}
            onToast={showToast}
          />
        );
      case 'progress':
        return (
          <MyLearningProgress
            key={activeSection}
            onBrowse={() => setActiveSection('browse')}
            onToast={showToast}
          />
        );
      case 'chat':
        return <Chat key="chat" />;
      case 'profile':  
        return <ProfileSection key={activeSection} user={user} enrollments={myEnrollments}/>;
      default:         
        return null;
    }
  };

  return (
    <div className="dashboard-layout student-theme">
      <Sidebar
        sections={STUDENT_SECTIONS}
        activeSection={activeSection}
        onNavigate={(sec) => {
          setSelectedCourseForLearning(null);
          setActiveSection(sec);
        }}
        theme="student-theme"
      />

      <div className="main-content">
        <header className="topbar">
          <div className="topbar-left">
            <span className="breadcrumb">{breadcrumbLabels[activeSection]}</span>
          </div>
          <div className="topbar-right">
            <div className="user-avatar" title={`${user.fullname} (Click to view Profile)`} style={{ cursor: 'pointer' }} onClick={() => setActiveSection('profile')}>{getInitials(user.fullname)}</div>
          </div>
        </header>

        <div className="dashboard-section active">
          {renderSection()}
        </div>
      </div>

      {inspectCourseModal && (
        <CourseDetailModal
          course={inspectCourseModal}
          user={user}
          onClose={() => setInspectCourseModal(null)}
          onEnroll={handleEnrollFromModal}
        />
      )}

      {certModalCourse && (
        <CertificateModal
          course={certModalCourse}
          user={user}
          onClose={() => setCertModalCourse(null)}
        />
      )}

      <Toast message={toastMsg} onHide={clearToast}/>
    </div>
  );
}
