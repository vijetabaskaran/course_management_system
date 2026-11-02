import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { getProgressColor } from '../services/storage';

/**
 * Single Course Progress Card with Inline Lesson Update Form.
 */
function CourseProgressCard({ item, onUpdate, onToast }) {
  const course = item.course || {
    id: item.courseId,
    title: item.courseId,
    name: item.courseId,
    domain: 'General',
  };

  const isCompleted = item.progressPercentage === 100;
  const totalLessons = item.totalLessons || 10;

  // Form state
  const [completedInput, setCompletedInput] = useState(item.completedLessons ?? 0);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Keep input in sync with external updates
  useEffect(() => {
    setCompletedInput(item.completedLessons ?? 0);
  }, [item.completedLessons]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    const val = Number(completedInput);

    if (isNaN(val) || !Number.isInteger(val)) {
      setFormError('Please enter a whole integer number of lessons.');
      return;
    }
    if (val < 0) {
      setFormError('Completed lessons cannot be negative.');
      return;
    }
    if (val > totalLessons) {
      setFormError(`Completed lessons cannot exceed total lessons (${totalLessons}).`);
      return;
    }

    setSaving(true);
    try {
      // Send PUT /progress as specified in Task 13 requirements
      const res = await api.put('/progress', {
        courseId: item.courseId,
        completedLessons: val,
        totalLessons,
      });

      const updated = res.data?.progress || {
        ...item,
        completedLessons: val,
        totalLessons,
        progressPercentage: Math.round((val / totalLessons) * 100),
      };

      onUpdate(item.courseId, updated);
      setFormSuccess('Progress saved!');
      if (onToast) {
        if (updated.progressPercentage === 100) {
          onToast(`🎉 Congratulations! You have completed "${course.title || course.name}"!`);
        } else {
          onToast(`Updated progress for "${course.title || course.name}": ${updated.progressPercentage}%`);
        }
      }
      setTimeout(() => setFormSuccess(''), 3000);
    } catch (err) {
      const errMsg = err.response?.data?.message || err.response?.data?.error || 'Failed to update progress.';
      setFormError(errMsg);
      if (onToast) onToast(errMsg);
    } finally {
      setSaving(false);
    }
  };

  const pct = item.progressPercentage || 0;
  const statusLabel = isCompleted ? 'Completed' : pct > 0 ? 'In Progress' : 'Not Started';

  return (
    <div className="course-card my-course-card progress-course-card" id={`progress-card-${item.courseId}`}>
      {/* Banner */}
      <div
        className="course-card-banner"
        style={{
          background: course.color || 'var(--taupe)',
          position: 'relative',
        }}
      >
        <span className="course-card-domain-badge">{course.domain || course.category || 'Course'}</span>
        <span
          className="status-pill"
          id={`status-badge-${item.courseId}`}
          style={{
            position: 'absolute',
            right: '12px',
            top: '12px',
            background: isCompleted ? '#10b981' : 'rgba(255,255,255,0.95)',
            color: isCompleted ? '#fff' : '#854d0e',
            border: isCompleted ? 'none' : '1px solid #fef08a',
            fontSize: '0.75rem',
            fontWeight: 700,
            padding: '3px 10px',
            borderRadius: '12px',
          }}
        >
          {statusLabel}
        </span>
      </div>

      <div className="course-card-body" style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
        <span className="course-card-code">{course.code || item.courseId}</span>
        <h4 className="course-card-name" style={{ marginBottom: '0.35rem' }}>
          {course.title || course.name || item.courseId}
        </h4>
        {course.instructor && (
          <p className="course-card-instructor" style={{ marginBottom: '0.75rem' }}>
            Instructor: {course.instructor}
          </p>
        )}

        {/* Progress Metrics */}
        <div className="my-course-units-meta" style={{ marginTop: 'auto', marginBottom: '0.5rem' }}>
          <span className="units-count-text">
            <strong>{item.completedLessons}</strong> / <strong>{totalLessons}</strong> Lessons Completed
          </span>
          <span className="current-unit-tag" style={{ fontWeight: 700 }}>
            {pct}%
          </span>
        </div>

        {/* Progress Bar */}
        <div className="course-card-progress" style={{ marginBottom: '1rem' }}>
          <div
            className="cprogress-bar"
            style={{
              flex: 1,
              height: 10,
              background: '#e2e8f0',
              borderRadius: 5,
              overflow: 'hidden',
            }}
          >
            <div
              className="cprogress-fill"
              style={{
                width: `${pct}%`,
                background: getProgressColor(pct),
                height: '100%',
                transition: 'width 0.4s ease, background 0.4s ease',
              }}
            />
          </div>
          <span className="progress-pct-label" style={{ fontWeight: 700, minWidth: 42, textAlign: 'right' }}>
            {pct}%
          </span>
        </div>

        {/* Progress Update Form — Only shown when NOT completed */}
        {!isCompleted ? (
          <form
            onSubmit={handleSubmit}
            className="progress-update-form"
            id={`form-${item.courseId}`}
            style={{
              background: 'var(--bg-input, #f8fafc)',
              border: '1px solid var(--border, #e2e8f0)',
              borderRadius: '8px',
              padding: '0.75rem',
              marginTop: '0.5rem',
            }}
          >
            <label
              htmlFor={`lessons-input-${item.courseId}`}
              style={{
                display: 'block',
                fontSize: '0.8rem',
                fontWeight: 600,
                color: 'var(--text-secondary, #475569)',
                marginBottom: '0.4rem',
              }}
            >
              Update Completed Lessons (0 – {totalLessons}):
            </label>

            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input
                id={`lessons-input-${item.courseId}`}
                type="number"
                min="0"
                max={totalLessons}
                step="1"
                required
                value={completedInput}
                onChange={(e) => setCompletedInput(e.target.value)}
                disabled={saving}
                style={{
                  width: '90px',
                  padding: '6px 10px',
                  fontSize: '0.9rem',
                  borderRadius: '6px',
                  border: '1px solid var(--border, #cbd5e1)',
                  background: '#fff',
                  textAlign: 'center',
                }}
              />
              <button
                type="submit"
                className="btn-action btn-sm"
                disabled={saving}
                id={`update-btn-${item.courseId}`}
                style={{ flex: 1, whiteSpace: 'nowrap' }}
              >
                {saving ? 'Updating…' : 'Update Progress'}
              </button>
            </div>

            {formError && (
              <p
                style={{
                  color: '#dc2626',
                  fontSize: '0.78rem',
                  marginTop: '0.4rem',
                  marginBottom: 0,
                }}
              >
                ⚠️ {formError}
              </p>
            )}
            {formSuccess && (
              <p
                style={{
                  color: '#16a34a',
                  fontSize: '0.78rem',
                  marginTop: '0.4rem',
                  marginBottom: 0,
                }}
              >
                ✓ {formSuccess}
              </p>
            )}
          </form>
        ) : (
          <div
            style={{
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '8px',
              padding: '0.75rem',
              textAlign: 'center',
              color: '#15803d',
              fontSize: '0.85rem',
              fontWeight: 600,
              marginTop: '0.5rem',
            }}
          >
            🏆 100% Completed! Course curriculum finished.
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * MyLearningProgress Component (Task 13).
 * Fetches and displays student's learning progress, summary cards, and update controls.
 */
export default function MyLearningProgress({ onBrowse, onToast }) {
  const [progressList, setProgressList] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);

  // Fetch progress from backend
  const fetchProgress = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      // Calls GET /progress/my-progress (also alias for /api/v1/progress/my-progress)
      const res = await api.get('/progress/my-progress');
      const list = res.data?.progress || [];
      setProgressList(list);
    } catch (err) {
      console.error('Failed to load learning progress:', err);
      setError(err.response?.data?.message || 'Unable to load your learning progress. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  // Handle local state update after saving
  const handleRecordUpdate = (courseId, updatedRecord) => {
    setProgressList((prev) =>
      prev.map((item) => (item.courseId === courseId ? { ...item, ...updatedRecord } : item))
    );
  };

  // ── Summary Cards Calculations (Section 10) ───────────────────
  // 1. Total Courses: Count the courses represented by the progress records
  const totalCoursesCount = progressList.length;

  // 2. Completed Courses: Count records where progressPercentage equals 100
  const completedCoursesCount = progressList.filter((p) => p.progressPercentage === 100).length;
  const inProgressCount = progressList.filter(
    (p) => p.progressPercentage > 0 && p.progressPercentage < 100
  ).length;

  // 3. Average Progress: Arithmetic mean of progress percentages, rounded to nearest integer
  const averageProgressPct =
    totalCoursesCount > 0
      ? Math.round(
          progressList.reduce((acc, curr) => acc + (curr.progressPercentage || 0), 0) / totalCoursesCount
        )
      : 0;

  return (
    <div className="learning-progress-container" id="my-learning-progress-view">
      {/* Section Header */}
      <div className="section-header">
        <div>
          <h2 className="section-title">My Learning Progress</h2>
          <p className="section-subtitle">
            Track your lesson completion, monitor overall progress, and automatically complete courses.
          </p>
        </div>
        {onBrowse && (
          <button className="btn-action" onClick={onBrowse}>
            + Browse More Courses
          </button>
        )}
      </div>

      {/* Summary Cards Grid (Section 10) */}
      <div
        className="stats-grid"
        id="progress-summary-cards"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        {/* Card 1: Total Courses */}
        <div
          className="stat-card"
          id="summary-card-total-courses"
          style={{
            background: 'var(--bg-card, #fff)',
            border: '1px solid var(--border, #e2e8f0)',
            borderRadius: '12px',
            padding: '1.25rem',
            textAlign: 'center',
            boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ fontSize: '2rem', marginBottom: '0.4rem' }}>📚</div>
          <div
            className="stat-card-num"
            id="summary-total-courses-val"
            style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)' }}
          >
            {totalCoursesCount}
          </div>
          <div
            className="stat-card-label"
            style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}
          >
            Total Courses
          </div>
        </div>

        {/* Card: In Progress */}
        <div
          className="stat-card"
          id="summary-card-in-progress-courses"
          style={{
            background: 'var(--bg-card, #fff)',
            border: '1px solid var(--border, #e2e8f0)',
            borderRadius: '12px',
            padding: '1.25rem',
            textAlign: 'center',
            boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ fontSize: '2rem', marginBottom: '0.4rem' }}>⏳</div>
          <div
            className="stat-card-num"
            id="summary-in-progress-courses-val"
            style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f59e0b' }}
          >
            {inProgressCount}
          </div>
          <div
            className="stat-card-label"
            style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}
          >
            In Progress
          </div>
        </div>

        {/* Card 2: Completed Courses */}
        <div
          className="stat-card"
          id="summary-card-completed-courses"
          style={{
            background: 'var(--bg-card, #fff)',
            border: '1px solid var(--border, #e2e8f0)',
            borderRadius: '12px',
            padding: '1.25rem',
            textAlign: 'center',
            boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ fontSize: '2rem', marginBottom: '0.4rem' }}>🏆</div>
          <div
            className="stat-card-num"
            id="summary-completed-courses-val"
            style={{ fontSize: '1.8rem', fontWeight: 800, color: '#16a34a' }}
          >
            {completedCoursesCount}
          </div>
          <div
            className="stat-card-label"
            style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}
          >
            Completed Courses
          </div>
        </div>

        {/* Card 3: Average Progress */}
        <div
          className="stat-card"
          id="summary-card-average-progress"
          style={{
            background: 'var(--bg-card, #fff)',
            border: '1px solid var(--border, #e2e8f0)',
            borderRadius: '12px',
            padding: '1.25rem',
            textAlign: 'center',
            boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ fontSize: '2rem', marginBottom: '0.4rem' }}>⚡</div>
          <div
            className="stat-card-num"
            id="summary-average-progress-val"
            style={{ fontSize: '1.8rem', fontWeight: 800, color: getProgressColor(averageProgressPct) }}
          >
            {averageProgressPct}%
          </div>
          <div
            className="stat-card-label"
            style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}
          >
            Average Progress
          </div>
        </div>
      </div>

      {/* Note documenting behavior as required by Section 10 */}
      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.5rem', textAlign: 'center' }}>
        ℹ️ Summary metrics reflect enrolled courses that currently have recorded learning progress.
      </p>

      {/* Loading state */}
      {loading && (
        <div className="table-card" style={{ padding: '3.5rem', textAlign: 'center' }}>
          <div
            className="spinner"
            style={{
              margin: '0 auto 1rem',
              width: 36,
              height: 36,
              border: '3px solid var(--border)',
              borderTopColor: 'var(--taupe)',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }}
          />
          <p style={{ color: 'var(--text-muted)' }}>Loading learning progress data…</p>
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <div className="auth-alert error" style={{ margin: '1rem 0' }}>
          <span>⚠️ {error}</span>
          <button className="btn-secondary btn-sm" onClick={fetchProgress} style={{ marginLeft: '1rem' }}>
            Retry
          </button>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && progressList.length === 0 && (
        <div className="empty-state" id="empty-progress-state">
          <span style={{ fontSize: '3.5rem' }}>📈</span>
          <h3>No learning progress recorded yet</h3>
          <p>
            You have not recorded any lesson progress for your courses yet. Start learning your enrolled courses
            or update your progress to view real-time metrics!
          </p>
          {onBrowse && (
            <button className="btn-action btn-sm" onClick={onBrowse} style={{ marginTop: '1rem' }}>
              Browse Catalog →
            </button>
          )}
        </div>
      )}

      {/* Progress Cards Grid */}
      {!loading && !error && progressList.length > 0 && (
        <div className="courses-grid" id="progress-courses-grid">
          {progressList.map((item) => (
            <CourseProgressCard
              key={item.id || item.courseId}
              item={item}
              onUpdate={handleRecordUpdate}
              onToast={onToast}
            />
          ))}
        </div>
      )}
    </div>
  );
}
