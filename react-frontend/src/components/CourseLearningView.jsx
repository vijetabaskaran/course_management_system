import { useState, useEffect, useMemo, useCallback } from 'react';
import api from '../services/api';
import { 
  getStudentCourseUnitProgress, 
  completeUnitAndQuiz, 
  getProgressColor 
} from '../services/storage';

export const QUIZ_PASSING_PERCENTAGE = 70;

const unitLessonCount = (u) => u.lessons?.length || u.sections?.length || 1;

// Mirrors the backend rule: 100% only once every module is done.
function progressForUnits(units, unitIds) {
  const total = units.reduce((sum, u) => sum + unitLessonCount(u), 0) || 1;
  const done = units.every(u => unitIds.includes(u.numId));
  const completedLessons = done
    ? total
    : units.reduce((sum, u) => sum + (unitIds.includes(u.numId) ? unitLessonCount(u) : 0), 0);
  const percent = done ? 100 : Math.min(99, Math.round((completedLessons / total) * 100));
  return { completedLessons, totalLessons: total, percent };
}

export default function CourseLearningView({ 
  course, 
  user, 
  onBack, 
  onCompleteCourse, 
  onViewCertificate,
  onProgressUpdated 
}) {
  const studentEmail = user?.email;

  // 1. Extract and normalize units/modules strictly from course data
  const units = useMemo(() => {
    if (!course) return [];

    // If course has modules in MongoDB
    if (Array.isArray(course.modules) && course.modules.length > 0) {
      return course.modules.map((m, idx) => {
        const modId = m.id || `mod-${idx + 1}`;
        const lessons = Array.isArray(m.lessons) ? m.lessons : [];
        const sections = Array.isArray(m.sections) ? m.sections : [];

        // Determine quiz: module-specific quiz, or if last module fallback to course.quiz if available
        let quiz = Array.isArray(m.quiz) && m.quiz.length > 0 ? m.quiz : [];
        if (quiz.length === 0 && idx === course.modules.length - 1 && Array.isArray(course.quiz) && course.quiz.length > 0) {
          quiz = course.quiz;
        }

        return {
          id: modId,
          numId: idx + 1,
          title: m.title || `Module ${idx + 1}`,
          overview: m.overview || m.description || '',
          lessons,
          sections,
          quiz,
        };
      });
    }

    // If course has explicit units array attached
    if (Array.isArray(course.units) && course.units.length > 0) {
      return course.units.map((u, idx) => ({
        id: u.id || `unit-${idx + 1}`,
        numId: idx + 1,
        title: u.title || `Unit ${idx + 1}`,
        overview: u.overview || u.description || '',
        lessons: Array.isArray(u.lessons) ? u.lessons : [],
        sections: Array.isArray(u.sections) ? u.sections : [],
        quiz: Array.isArray(u.quiz) ? u.quiz : [],
      }));
    }

    // Do NOT silently fallback to another course (e.g. Python)
    return [];
  }, [course]);

  // Progress state (local cache only until the backend record arrives)
  const [completedUnitIds, setCompletedUnitIds] = useState(() => {
    const saved = getStudentCourseUnitProgress(studentEmail, course?.id);
    return (saved?.completedUnits || []).filter(n => n >= 1 && n <= units.length);
  });
  const [currentProgress, setCurrentProgress] = useState(() => {
    const saved = getStudentCourseUnitProgress(studentEmail, course?.id);
    const ids = (saved?.completedUnits || []).filter(n => n >= 1 && n <= units.length);
    return ids.length && units.length ? progressForUnits(units, ids).percent : 0;
  });
  const [activeUnitIndex, setActiveUnitIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [quizResult, setQuizResult] = useState(null); // { score, total, percentage, passed }
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [syncError, setSyncError] = useState('');

  // The backend record is the source of truth for both the bar and unlocked modules
  useEffect(() => {
    if (!course?.id || !studentEmail) return;

    let isMounted = true;
    api.get('/api/v1/progress/my-progress')
      .then(res => {
        if (!isMounted) return;
        const progressList = res.data?.progress || [];
        const record = progressList.find(p => p.courseId === course.id);
        if (!record) return;

        const pct = typeof record.progressPercentage === 'number' ? record.progressPercentage : 0;
        let unitsDone;
        if (pct === 100) {
          unitsDone = units.map(u => u.numId);
        } else if (Array.isArray(record.completedUnitIds)) {
          unitsDone = record.completedUnitIds.map(Number).filter(n => n >= 1 && n <= units.length);
        } else {
          unitsDone = Array.from({ length: Math.min(record.completedUnits || 0, units.length) }, (_, i) => i + 1);
        }

        setCurrentProgress(pct);
        setCompletedUnitIds(unitsDone);
        const firstOpen = units.findIndex(u => !unitsDone.includes(u.numId));
        setActiveUnitIndex(firstOpen === -1 ? 0 : firstOpen);
      })
      .catch(err => {
        console.warn('Could not fetch backend progress in learning view:', err?.message);
      });

    return () => { isMounted = false; };
  }, [course?.id, studentEmail, units]);

  // Determine unlocked units
  const isUnitUnlocked = useCallback((unitNum) => {
    if (unitNum === 1) return true;
    return completedUnitIds.includes(unitNum - 1);
  }, [completedUnitIds]);

  const isUnitCompleted = useCallback((unitNum) => {
    return completedUnitIds.includes(unitNum);
  }, [completedUnitIds]);

  const activeUnit = units[activeUnitIndex] || null;
  const unlocked = activeUnit ? isUnitUnlocked(activeUnit.numId) : false;

  // Handle option click
  const handleOptionSelect = (qIdx, optIdx) => {
    if (quizResult && quizResult.passed) return;
    setAnswers(prev => ({ ...prev, [qIdx]: optIdx }));
  };

  // Submit Quiz & update backend MongoDB progress
  const handleSubmitQuiz = async () => {
    if (!activeUnit?.quiz?.length) return;

    const unanswered = activeUnit.quiz.some((_, idx) => answers[idx] === undefined);
    if (unanswered) {
      alert(`Please answer all ${activeUnit.quiz.length} questions before submitting.`);
      return;
    }

    let score = 0;
    activeUnit.quiz.forEach((q, idx) => {
      if (answers[idx] === q.correctAnswer) {
        score += 1;
      }
    });

    const total = activeUnit.quiz.length;
    const percentage = Math.round((score / total) * 100);
    const passed = percentage >= QUIZ_PASSING_PERCENTAGE;

    setQuizResult({ score, total, percentage, passed });

    if (passed) {
      await persistUnitCompletion(activeUnit.numId, score);
    }
  };

  // Saves a completed module; the bar only moves once the backend confirms.
  const persistUnitCompletion = async (unitNumId, score) => {
    const nextUnits = Array.from(new Set([...completedUnitIds, unitNumId])).sort((a, b) => a - b);
    const { completedLessons, totalLessons, percent } = progressForUnits(units, nextUnits);
    const wasComplete = currentProgress === 100;

    setIsSubmitting(true);
    setSyncError('');
    try {
      const res = await api.put('/api/v1/progress', {
        courseId: course.id,
        completedLessons,
        totalLessons,
        completedUnits: nextUnits.length,
        totalUnits: units.length,
        completedUnitIds: nextUnits.map(String),
      });

      const savedPct = res.data?.progress?.progressPercentage ?? percent;
      setCompletedUnitIds(nextUnits);
      setCurrentProgress(savedPct);
      completeUnitAndQuiz(studentEmail, course.id, unitNumId, score, units.length);

      if (onProgressUpdated) onProgressUpdated(course.id, savedPct, nextUnits.length);
      if (savedPct === 100 && !wasComplete && onCompleteCourse) onCompleteCourse(course);
      return { ok: true, percent: savedPct };
    } catch (err) {
      console.error('Failed to sync progress with backend:', err);
      setSyncError(err.response?.data?.message || 'Could not save your progress. Check your connection and try again.');
      return { ok: false };
    } finally {
      setIsSubmitting(false);
    }
  };

  // Mark module complete when no quiz is present
  const handleCompleteUnitNoQuiz = async () => {
    if (!activeUnit) return;
    const result = await persistUnitCompletion(activeUnit.numId, 100);
    if (result.ok && result.percent < 100 && activeUnitIndex < units.length - 1) {
      // Next module was just unlocked; isUnitUnlocked still sees the pre-save state here
      setActiveUnitIndex(activeUnitIndex + 1);
      setAnswers({});
      setQuizResult(null);
    }
  };

  const handleSelectUnit = (idx) => {
    if (idx < 0 || idx >= units.length) return;
    const targetUnit = units[idx];
    if (!isUnitUnlocked(targetUnit.numId)) return;

    setActiveUnitIndex(idx);
    setAnswers({});
    setQuizResult(null);
    setMobileNavOpen(false);
  };

  const handleNextUnit = () => {
    if (activeUnitIndex < units.length - 1 && isUnitUnlocked(units[activeUnitIndex + 1].numId)) {
      handleSelectUnit(activeUnitIndex + 1);
    }
  };

  // If course has no modules/units, display the required empty state
  if (!units || units.length === 0) {
    return (
      <div className="learning-experience-layout">
        <div className="learning-topbar">
          <div className="learning-topbar-left">
            <button className="btn-back-learning" onClick={onBack}>
              ← Back to Courses
            </button>
            <div className="learning-course-meta">
              <span className="learning-domain-tag">{course.domain || course.category || 'Course'}</span>
              <h3 className="learning-course-title">{course.title || course.name}</h3>
            </div>
          </div>
        </div>

        <div className="empty-state" style={{ padding: '4rem 1.5rem', textAlign: 'center', background: '#fff', borderRadius: '12px', margin: '2rem auto', maxWidth: '640px', border: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: '3.5rem' }}>📖</span>
          <h3 style={{ margin: '1.25rem 0 0.5rem', color: '#1e293b', fontSize: '1.35rem' }}>
            No learning content has been added to this course yet.
          </h3>
          <p style={{ color: '#64748b', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '2rem' }}>
            This course curriculum is currently being prepared by the academic department. Please check back later or browse other active courses.
          </p>
          <button className="btn-action" onClick={onBack}>
            ← Return to My Courses
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="learning-experience-layout">
      {/* Top Header Bar */}
      <div className="learning-topbar">
        <div className="learning-topbar-left">
          <button className="btn-back-learning" onClick={onBack}>
            ← Back to Courses
          </button>
          <div className="learning-course-meta">
            <span className="learning-domain-tag">{course.domain || course.category || 'Course'}</span>
            <h3 className="learning-course-title">{course.title || course.name}</h3>
          </div>
        </div>

        <div className="learning-topbar-right">
          <div className="learning-progress-widget">
            <div className="learning-progress-info">
              <span>Course Progress</span>
              <strong>{currentProgress}%</strong>
            </div>
            <div className="cprogress-bar learning-bar-wrap">
              <div 
                className="cprogress-fill" 
                style={{ width: `${currentProgress}%`, background: getProgressColor(currentProgress) }}
              />
            </div>
          </div>
          {currentProgress === 100 && (
            <button className="btn-view-cert-top" onClick={() => onViewCertificate(course)}>
              🏆 View Certificate
            </button>
          )}
          <button className="mobile-units-toggle" onClick={() => setMobileNavOpen(!mobileNavOpen)}>
            ☰ Modules Menu
          </button>
        </div>
      </div>

      <div className="learning-body-container">
        {/* Left Sidebar: Modules Navigation */}
        <aside className={`learning-sidebar ${mobileNavOpen ? 'mobile-open' : ''}`}>
          <div className="sidebar-unit-header">
            <h4>Course Modules</h4>
            <span className="unit-completed-count">{completedUnitIds.length} / {units.length} Completed</span>
          </div>

          <div className="units-nav-list">
            {units.map((unit, idx) => {
              const unitUnlocked = isUnitUnlocked(unit.numId);
              const unitDone = isUnitCompleted(unit.numId);
              const isActive = activeUnitIndex === idx;

              return (
                <button
                  key={unit.id || idx}
                  className={`unit-nav-btn ${isActive ? 'active' : ''} ${unitDone ? 'completed' : ''} ${!unitUnlocked ? 'locked' : ''}`}
                  onClick={() => handleSelectUnit(idx)}
                  disabled={!unitUnlocked}
                >
                  <div className="unit-nav-icon">
                    {unitDone ? (
                      <span className="icon-done">✓</span>
                    ) : unitUnlocked ? (
                      <span className="icon-num">{idx + 1}</span>
                    ) : (
                      <span className="icon-lock">🔒</span>
                    )}
                  </div>
                  <div className="unit-nav-text">
                    <span className="unit-nav-subtitle">Module {idx + 1}</span>
                    <span className="unit-nav-title">{unit.title.replace(/^Module \d+:?\s*/i, '')}</span>
                  </div>
                  {unitDone && <span className="unit-check-badge">Done</span>}
                  {!unitUnlocked && <span className="unit-lock-badge">Locked</span>}
                </button>
              );
            })}
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="learning-main-content">
          {!unlocked ? (
            <div className="locked-unit-screen">
              <div className="locked-card">
                <span className="locked-big-icon">🔒</span>
                <h3>Module {activeUnitIndex + 1} is Locked</h3>
                <p>Complete the previous module and pass its assessment to unlock this module.</p>
                {activeUnitIndex > 0 && (
                  <button className="btn-action" onClick={() => handleSelectUnit(activeUnitIndex - 1)}>
                    Go to Module {activeUnitIndex} →
                  </button>
                )}
              </div>
            </div>
          ) : activeUnit ? (
            <div className="unit-content-view">
              {/* Module Header Card */}
              <div className="unit-title-card">
                <span className="unit-number-tag">Module {activeUnitIndex + 1} of {units.length}</span>
                <h2 className="unit-display-title">{activeUnit.title}</h2>
                {activeUnit.overview && (
                  <p className="unit-overview-text">{activeUnit.overview}</p>
                )}
              </div>

              {/* Module Lessons or Sections */}
              <div className="unit-sections-container">
                {/* Traditional Sections */}
                {activeUnit.sections?.map((section, idx) => (
                  <div key={idx} className="learning-section-card">
                    <h3 className="section-heading">{section.heading}</h3>
                    {section.text && <p className="section-paragraph">{section.text}</p>}
                    {section.code && (
                      <div className="code-block-wrapper">
                        <div className="code-block-header">Example Implementation</div>
                        <pre className="code-block"><code>{section.code}</code></pre>
                      </div>
                    )}
                  </div>
                ))}

                {/* MongoDB Lessons */}
                {activeUnit.lessons?.map((lesson, idx) => (
                  <div key={lesson.id || idx} className="learning-section-card">
                    <h3 className="section-heading">{lesson.title}</h3>
                    {lesson.description && (
                      <p style={{ fontStyle: 'italic', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                        {lesson.description}
                      </p>
                    )}
                    {lesson.content && (
                      <div className="section-paragraph" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.65 }}>
                        {lesson.content}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Module Quiz Section (if defined) */}
              {activeUnit.quiz && activeUnit.quiz.length > 0 && (
                <div className="unit-quiz-wrapper" id="quiz-section">
                  <div className="quiz-header-card">
                    <div>
                      <h3 className="quiz-title">Module {activeUnitIndex + 1} Assessment Quiz</h3>
                      <p className="quiz-subtitle">Answer all {activeUnit.quiz.length} questions. Passing threshold: {QUIZ_PASSING_PERCENTAGE}%.</p>
                    </div>
                    {isUnitCompleted(activeUnit.numId) && (
                      <span className="unit-passed-banner">✓ Module Assessment Passed</span>
                    )}
                  </div>

                  {/* Question List */}
                  <div className="quiz-questions-list">
                    {activeUnit.quiz.map((q, qIdx) => {
                      const selectedOpt = answers[qIdx];
                      const isGraded = quizResult !== null;

                      return (
                        <div key={q.id || qIdx} className={`quiz-question-card ${isGraded ? (selectedOpt === q.correctAnswer ? 'correct-card' : 'incorrect-card') : ''}`}>
                          <h4 className="question-text">
                            <span className="q-num">Q{qIdx + 1}.</span> {q.question}
                          </h4>

                          <div className="options-list">
                            {(q.options || []).map((opt, oIdx) => {
                              const isSelected = selectedOpt === oIdx;
                              const isCorrectOpt = q.correctAnswer === oIdx;

                              let optClass = 'quiz-option-btn';
                              if (isSelected) optClass += ' selected';
                              if (isGraded) {
                                if (isCorrectOpt) optClass += ' option-correct';
                                else if (isSelected && !isCorrectOpt) optClass += ' option-incorrect';
                              }

                              return (
                                <button
                                  key={oIdx}
                                  type="button"
                                  className={optClass}
                                  onClick={() => handleOptionSelect(qIdx, oIdx)}
                                >
                                  <span className="option-letter">{String.fromCharCode(65 + oIdx)}.</span>
                                  <span className="option-text">{opt}</span>
                                  {isGraded && isCorrectOpt && <span className="opt-status-icon">✓</span>}
                                  {isGraded && isSelected && !isCorrectOpt && <span className="opt-status-icon">✕</span>}
                                </button>
                              );
                            })}
                          </div>

                          {isGraded && q.explanation && (
                            <div className="quiz-explanation-box">
                              <strong>Explanation:</strong> {q.explanation}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Quiz Result Card */}
                  {quizResult && (
                    <div className={`quiz-result-card ${quizResult.passed ? 'passed' : 'failed'}`}>
                      <div className="result-header">
                        <span className="result-icon">{quizResult.passed ? '🎉' : '⚠️'}</span>
                        <div>
                          <h4>{quizResult.passed ? 'Assessment Passed!' : 'Assessment Not Passed'}</h4>
                          <p>You scored <strong>{quizResult.score} / {quizResult.total}</strong> ({quizResult.percentage}%).</p>
                        </div>
                      </div>
                      {quizResult.passed && isSubmitting ? (
                        <div className="result-actions">
                          <p className="result-note">Saving your progress…</p>
                        </div>
                      ) : quizResult.passed && !isUnitCompleted(activeUnit.numId) ? (
                        <div className="result-actions">
                          <p className="result-note" style={{ color: '#b91c1c' }}>⚠️ {syncError || 'Your progress has not been saved yet.'}</p>
                          <button className="btn-action" onClick={() => persistUnitCompletion(activeUnit.numId, quizResult.score)}>
                            🔄 Retry Saving Progress
                          </button>
                        </div>
                      ) : quizResult.passed ? (
                        <div className="result-actions">
                          <p className="result-note">
                            Great job! Progress updated to {currentProgress}%.
                            {activeUnitIndex < units.length - 1 ? ' Next module is now unlocked.' : ''}
                          </p>
                          {activeUnitIndex < units.length - 1 ? (
                            <button className="btn-action" onClick={handleNextUnit}>
                              Continue to Module {activeUnitIndex + 2} →
                            </button>
                          ) : (
                            <button className="btn-action btn-gold" onClick={() => onViewCertificate(course)}>
                              🏆 Course Completed — View Certificate!
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="result-actions">
                          <p className="result-note">Passing score required is {QUIZ_PASSING_PERCENTAGE}%. Review the module lessons above and retake the quiz.</p>
                          <button className="btn-secondary" onClick={() => setQuizResult(null)}>
                            🔄 Retake Quiz
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Submit Button */}
                  {!quizResult && (
                    <div className="quiz-submit-wrap">
                      <button className="btn-action btn-lg" onClick={handleSubmitQuiz} disabled={isSubmitting}>
                        {isSubmitting ? 'Evaluating…' : 'Submit Quiz & Check Results'}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Completion for Modules without a Quiz */}
              {(!activeUnit.quiz || activeUnit.quiz.length === 0) && (
                <div className="unit-complete-wrap" style={{ marginTop: '2.5rem', padding: '1.5rem', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                  <h4 style={{ margin: '0 0 0.5rem 0', color: '#1e293b' }}>Finished studying this module?</h4>
                  <p style={{ margin: '0 0 1rem 0', color: '#64748b', fontSize: '0.9rem' }}>Mark this module as complete to update your progress and unlock the next module.</p>
                  <button className="btn-action btn-lg" onClick={handleCompleteUnitNoQuiz} disabled={isSubmitting}>
                    {isSubmitting
                      ? 'Saving…'
                      : activeUnitIndex < units.length - 1 ? 'Mark Complete & Continue to Next Module →' : '🏆 Complete Final Module & Finish Course'}
                  </button>
                  {syncError && (
                    <p style={{ margin: '0.75rem 0 0 0', color: '#b91c1c', fontSize: '0.85rem' }}>⚠️ {syncError}</p>
                  )}
                </div>
              )}
            </div>
          ) : null}
        </main>
      </div>
    </div>
  );
}
