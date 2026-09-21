import { useEffect } from 'react';
import { getCourseUnits } from '../data/coursesData';
import { isEnrolled } from '../services/storage';

export default function CourseDetailModal({ course, user, onClose, onEnroll }) {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  if (!course) return null;

  const enrolled = user ? isEnrolled(user.email, course.id) : false;
  const units = getCourseUnits(course);
  const totalQuizzes = units.reduce((acc, u) => acc + (u.quiz ? 1 : 0), 0);

  const skillsList = typeof course.skills === 'string'
    ? course.skills.split(',').map(s => s.trim()).filter(Boolean)
    : (Array.isArray(course.skills) ? course.skills : ['Core Fundamentals', 'Practical Applications']);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box modal-wide course-detail-modal" onClick={e => e.stopPropagation()}>
        <div className="course-detail-header" style={{ background: course.color || 'var(--taupe)' }}>
          <button className="modal-close modal-close-white" onClick={onClose} aria-label="Close">✕</button>
          <div className="course-detail-badges">
            <span className="detail-domain-badge">{course.domain || course.category || 'General'}</span>
            <span className="detail-level-badge">{course.level || 'All Levels'}</span>
          </div>
          <h2 className="course-detail-title">{course.title || course.name}</h2>
          <p className="course-detail-instructor">Instructor: {course.instructor || 'Dr. Sarah Jenkins'}</p>
        </div>

        <div className="modal-body course-detail-body">
          <div className="detail-quick-stats">
            <div className="quick-stat-box">
              <span className="quick-stat-icon">⏱</span>
              <div>
                <span className="quick-stat-label">Duration</span>
                <span className="quick-stat-val">{course.duration || '12 Weeks'}</span>
              </div>
            </div>
            <div className="quick-stat-box">
              <span className="quick-stat-icon">📚</span>
              <div>
                <span className="quick-stat-label">Units</span>
                <span className="quick-stat-val">{units.length} Learning Units</span>
              </div>
            </div>
            <div className="quick-stat-box">
              <span className="quick-stat-icon">✍️</span>
              <div>
                <span className="quick-stat-label">Quizzes</span>
                <span className="quick-stat-val">{totalQuizzes} Assessment Quizzes</span>
              </div>
            </div>
            <div className="quick-stat-box">
              <span className="quick-stat-icon">🏷️</span>
              <div>
                <span className="quick-stat-label">Course Code</span>
                <span className="quick-stat-val">{course.code || course.id}</span>
              </div>
            </div>
          </div>

          <div className="detail-section">
            <h4 className="detail-section-title">Course Overview</h4>
            <p className="detail-description">{course.description}</p>
          </div>

          {skillsList.length > 0 && (
            <div className="detail-section">
              <h4 className="detail-section-title">Skills You Will Learn</h4>
              <div className="skills-tags-wrap">
                {skillsList.map((skill, i) => (
                  <span key={i} className="skill-tag">✓ {skill}</span>
                ))}
              </div>
            </div>
          )}

          <div className="detail-section">
            <h4 className="detail-section-title">Course Structure & Curriculum ({units.length} Units)</h4>
            <div className="units-preview-list">
              {units.map((unit, idx) => (
                <div key={unit.id || idx} className="unit-preview-card">
                  <div className="unit-preview-number">{idx + 1}</div>
                  <div className="unit-preview-info">
                    <h5 className="unit-preview-title">{unit.title}</h5>
                    <p className="unit-preview-desc">{unit.overview}</p>
                  </div>
                  <span className="unit-quiz-badge">5-Q Quiz</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="modal-footer detail-modal-footer">
          <button className="btn-secondary" onClick={onClose}>Close</button>
          {enrolled ? (
            <span className="enrolled-status-tag">✓ Already Enrolled</span>
          ) : (
            <button className="btn-action btn-lg" onClick={() => onEnroll(course.id)}>
              Enroll Now
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
