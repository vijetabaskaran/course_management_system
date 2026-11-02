import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useCourses } from '../context/CourseContext';
import { getProgressColor } from '../services/storage';

/**
 * Confirmation modal for course unenrollment.
 */
function UnenrollConfirmModal({ course, onCancel, onConfirm, loading }) {
  if (!course) return null;
  const courseTitle = course.title || course.name || course.id;

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 460 }}>
        <div className="modal-header">
          <div>
            <p className="modal-title" style={{ color: '#ef4444' }}>Confirm Unenrollment</p>
            <p className="modal-subtitle">Permanent action</p>
          </div>
          <button className="modal-close" onClick={onCancel} aria-label="Close modal">✕</button>
        </div>
        <div className="modal-body">
          <p style={{ fontSize: '0.95rem', color: 'var(--text-primary)', marginBottom: '1rem', lineHeight: 1.5 }}>
            Are you sure you want to unenroll from <strong>{courseTitle}</strong>?
          </p>
          <div style={{ background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '8px', padding: '0.75rem', fontSize: '0.85rem', color: '#b91c1c' }}>
            ⚠️ <strong>Notice:</strong> Permanent unenrollment deletes your enrollment record and may affect historical learning progress. The course itself will not be deleted.
          </div>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn-secondary" onClick={onCancel} disabled={loading}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-action danger"
            onClick={onConfirm}
            disabled={loading}
            style={{ background: '#ef4444', borderColor: '#ef4444', color: '#fff' }}
          >
            {loading ? 'Unenrolling…' : 'Confirm Unenroll'}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * MyCourses component (Task 12).
 * Displays all courses enrolled by the authenticated student.
 * Provides unenroll functionality with confirmation.
 */
export default function MyCourses({ onBrowse, onStartLearning, onViewCertificate, onToast }) {
  const { user } = useAuth();
  const { unenrollStudent } = useCourses();

  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [unenrollTarget, setUnenrollTarget] = useState(null);
  const [unenrolling, setUnenrolling]       = useState(false);

  const fetchMyCourses = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/api/v1/enrollments/my-courses');
      const list = res.data?.enrollments || res.data || [];
      setEnrollments(list);
    } catch (err) {
      console.error('Failed to load my-courses:', err);
      setError(err.response?.data?.message || 'Unable to load your enrolled courses. Please check your connection.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMyCourses();
  }, [fetchMyCourses]);

  const handleConfirmUnenroll = async () => {
    if (!unenrollTarget) return;
    const courseId = unenrollTarget.id || unenrollTarget.courseId;
    const courseTitle = unenrollTarget.title || unenrollTarget.name || courseId;

    setUnenrolling(true);
    try {
      await unenrollStudent(user?.email, courseId);
      setEnrollments(prev => prev.filter(e => e.courseId !== courseId && e.id !== courseId));

      if (onToast) onToast(`Successfully unenrolled from "${courseTitle}".`);
      setUnenrollTarget(null);
    } catch (err) {
      console.error('Unenrollment failed:', err);
      const msg = err.response?.data?.message || 'Failed to unenroll from course. Please try again.';
      if (onToast) onToast(msg);
    } finally {
      setUnenrolling(false);
    }
  };

  const formatDate = (val) => {
    if (!val) return null;
    try {
      const d = typeof val === 'number' ? new Date(val) : new Date(val);
      return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return null;
    }
  };

  return (
    <>
      <div className="section-header">
        <div>
          <h2 className="section-title">My Courses</h2>
          <p className="section-subtitle">Manage your enrolled courses, track progress, or unenroll when needed.</p>
        </div>
        {onBrowse && (
          <button className="btn-action" onClick={onBrowse}>
            + Browse More Courses
          </button>
        )}
      </div>

      {/* Loading state */}
      {loading && (
        <div className="table-card" style={{ padding: '3rem', textAlign: 'center' }}>
          <div className="spinner" style={{ margin: '0 auto 1rem', width: 36, height: 36, border: '3px solid var(--border)', borderTopColor: 'var(--taupe)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <p style={{ color: 'var(--text-muted)' }}>Loading your enrolled courses…</p>
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <div className="auth-alert error" style={{ margin: '1rem 0' }}>
          <span>⚠️ {error}</span>
          <button className="btn-secondary btn-sm" onClick={fetchMyCourses} style={{ marginLeft: '1rem' }}>
            Retry
          </button>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && enrollments.length === 0 && (
        <div className="empty-state">
          <span style={{ fontSize: '3rem' }}>🎓</span>
          <h3>No enrolled courses yet</h3>
          <p>You are not currently enrolled in any courses. Explore our catalog and enroll today!</p>
          {onBrowse && (
            <button className="btn-action btn-sm" onClick={onBrowse} style={{ marginTop: '1rem' }}>
              Browse Courses →
            </button>
          )}
        </div>
      )}

      {/* Enrolled Courses Grid */}
      {!loading && !error && enrollments.length > 0 && (
        <div className="courses-grid" id="my-courses-grid">
          {enrollments.map((item) => {
            const course = item.course || {
              id: item.courseId,
              title: item.courseId,
              name: item.courseId,
              domain: 'General',
            };

            const prog = typeof item.progressPercentage === 'number' ? item.progressPercentage : 0;
            const totalUnits = item.totalUnits || course.modules?.length || 1;
            const completedCount = Math.min(item.completedUnits || 0, totalUnits);
            const statusLabel = prog === 100 ? 'completed' : prog > 0 ? 'in progress' : 'not started';
            const formattedDate = formatDate(item.enrolledAt || item.createdAt);

            return (
              <div key={item.id} className="course-card my-course-card" id={`enrolled-${course.id}`}>
                <div className="course-card-banner" style={{ background: course.color || 'var(--taupe)' }}>
                  <span className="course-card-domain-badge">{course.domain || course.category || 'Course'}</span>
                  <span
                    className="status-pill"
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '12px',
                      background: statusLabel === 'completed' ? '#10b981' : 'rgba(255,255,255,0.9)',
                      color: statusLabel === 'completed' ? '#fff' : '#1e293b',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      padding: '2px 8px',
                      borderRadius: '12px',
                    }}
                  >
                    {statusLabel.toUpperCase()}
                  </span>
                </div>

                <div className="course-card-body">
                  <span className="course-card-code">{course.code || course.id}</span>
                  <h4 className="course-card-name">{course.title || course.name}</h4>
                  {course.instructor && (
                    <p className="course-card-instructor">Instructor: {course.instructor}</p>
                  )}

                  {formattedDate && (
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                      🗓️ Enrolled on {formattedDate}
                    </p>
                  )}

                  {/* Progress Indicator */}
                  <div className="my-course-units-meta">
                    <span className="units-count-text">
                      <strong>{completedCount} / {totalUnits}</strong> Units Completed
                    </span>
                    <span className="current-unit-tag">
                      {prog === 100 ? '100% Completed' : `Progress: ${prog}%`}
                    </span>
                  </div>

                  <div className="course-card-progress" style={{ marginBottom: '0.75rem' }}>
                    <div className="cprogress-bar" style={{ flex: 1, height: 8 }}>
                      <div className="cprogress-fill" style={{ width: `${prog}%`, background: getProgressColor(prog) }} />
                    </div>
                    <span className="progress-pct-label">{prog}%</span>
                  </div>

                  {/* Actions Footer */}
                  <div className="course-card-footer my-course-footer" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {onStartLearning && (
                      <button
                        type="button"
                        className="btn-action btn-sm"
                        style={{ flex: 1 }}
                        onClick={() => onStartLearning(course)}
                      >
                        {(completedCount === 0 && prog === 0) ? 'Start Learning →' : 'Continue →'}
                      </button>
                    )}

                    {prog === 100 && onViewCertificate && (
                      <button
                        type="button"
                        className="btn-action btn-gold btn-sm"
                        onClick={() => onViewCertificate(course)}
                      >
                        🏆 View Certificate
                      </button>
                    )}

                    {/* Unenroll Button */}
                    <button
                      type="button"
                      className="btn-secondary btn-sm"
                      style={{ color: '#ef4444', borderColor: '#fca5a5' }}
                      onClick={() => setUnenrollTarget(course)}
                      id={`unenroll-btn-${course.id}`}
                    >
                      Unenroll
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmation Modal */}
      {unenrollTarget && (
        <UnenrollConfirmModal
          course={unenrollTarget}
          onCancel={() => setUnenrollTarget(null)}
          onConfirm={handleConfirmUnenroll}
          loading={unenrolling}
        />
      )}
    </>
  );
}
