import { useState, useEffect } from 'react';
import { getCourseUnits, QUIZ_PASSING_PERCENTAGE } from '../data/coursesData';
import { 
  getStudentCourseUnitProgress, 
  completeUnitAndQuiz, 
  getStudentCourseProgress,
  getProgressColor 
} from '../services/storage';

export default function CourseLearningView({ course, user, onBack, onCompleteCourse, onViewCertificate }) {
  const units = getCourseUnits(course);
  const studentEmail = user?.email;

  // Retrieve stored progress
  const [unitProg, setUnitProg] = useState(() => getStudentCourseUnitProgress(studentEmail, course.id));
  const [activeUnitId, setActiveUnitId] = useState(1);
  const [answers, setAnswers] = useState({});
  const [quizResult, setQuizResult] = useState(null); // { score, total, percentage, passed }
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Sync unit progress from storage
  useEffect(() => {
    const fresh = getStudentCourseUnitProgress(studentEmail, course.id);
    setUnitProg(fresh);
    // Default active unit to first incomplete unlocked unit
    const completed = fresh.completedUnits || [];
    let nextUnit = 1;
    for (let i = 1; i <= units.length; i++) {
      if (!completed.includes(i)) {
        nextUnit = i;
        break;
      }
    }
    setActiveUnitId(Math.min(nextUnit, units.length));
  }, [course.id, studentEmail, units.length]);

  const completedUnits = unitProg.completedUnits || [];
  const currentProgress = getStudentCourseProgress(studentEmail, course.id);

  // Determine if unit is unlocked
  const isUnitUnlocked = (unitId) => {
    if (unitId === 1) return true;
    return completedUnits.includes(unitId - 1);
  };

  const isUnitCompleted = (unitId) => completedUnits.includes(unitId);

  const activeUnit = units.find(u => u.id === activeUnitId) || units[0];
  const unlocked = isUnitUnlocked(activeUnitId);

  // Handle quiz option selection
  const handleOptionSelect = (questionIndex, optionIndex) => {
    if (quizResult && quizResult.passed) return; // Prevent changing after pass
    setAnswers(prev => ({ ...prev, [questionIndex]: optionIndex }));
  };

  // Submit Quiz
  const handleSubmitQuiz = () => {
    if (!activeUnit.quiz) return;
    
    // Validate all questions answered
    const unanswered = activeUnit.quiz.some((_, idx) => answers[idx] === undefined);
    if (unanswered) {
      alert('Please answer all 5 quiz questions before submitting.');
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
      const res = completeUnitAndQuiz(studentEmail, course.id, activeUnitId, score);
      setUnitProg(getStudentCourseUnitProgress(studentEmail, course.id));

      if (res.percent === 100 && onCompleteCourse) {
        onCompleteCourse(course);
      }
    }
  };

  // Reset quiz state when switching units
  const handleSelectUnit = (unitId) => {
    if (!isUnitUnlocked(unitId)) return;
    setActiveUnitId(unitId);
    setAnswers({});
    setQuizResult(null);
    setMobileNavOpen(false);
  };

  const handleNextUnit = () => {
    if (activeUnitId < units.length && isUnitUnlocked(activeUnitId + 1)) {
      handleSelectUnit(activeUnitId + 1);
    }
  };

  return (
    <div className="learning-experience-layout">
      {/* Top Header Bar */}
      <div className="learning-topbar">
        <div className="learning-topbar-left">
          <button className="btn-back-learning" onClick={onBack}>
            ← Back to Courses
          </button>
          <div className="learning-course-meta">
            <span className="learning-domain-tag">{course.domain || course.category}</span>
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
              🏆 Certificate
            </button>
          )}
          <button className="mobile-units-toggle" onClick={() => setMobileNavOpen(!mobileNavOpen)}>
            ☰ Units Menu
          </button>
        </div>
      </div>

      <div className="learning-body-container">
        {/* Left Sidebar: Unit Navigation */}
        <aside className={`learning-sidebar ${mobileNavOpen ? 'mobile-open' : ''}`}>
          <div className="sidebar-unit-header">
            <h4>Course Units</h4>
            <span className="unit-completed-count">{completedUnits.length} / {units.length} Completed</span>
          </div>

          <div className="units-nav-list">
            {units.map((unit, idx) => {
              const unitUnlocked = isUnitUnlocked(unit.id);
              const unitDone = isUnitCompleted(unit.id);
              const isActive = activeUnitId === unit.id;

              return (
                <button
                  key={unit.id}
                  className={`unit-nav-btn ${isActive ? 'active' : ''} ${unitDone ? 'completed' : ''} ${!unitUnlocked ? 'locked' : ''}`}
                  onClick={() => handleSelectUnit(unit.id)}
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
                    <span className="unit-nav-subtitle">Unit {idx + 1}</span>
                    <span className="unit-nav-title">{unit.title.replace(/^Unit \d+:?\s*/i, '')}</span>
                  </div>
                  {unitDone && <span className="unit-check-badge">Passed</span>}
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
                <h3>Unit {activeUnitId} is Locked</h3>
                <p>Complete Unit {activeUnitId - 1} quiz with a score of 70% or higher to unlock this unit.</p>
                <button className="btn-action" onClick={() => handleSelectUnit(activeUnitId - 1)}>
                  Go to Unit {activeUnitId - 1} →
                </button>
              </div>
            </div>
          ) : (
            <div className="unit-content-view">
              {/* Unit Title Header */}
              <div className="unit-title-card">
                <span className="unit-number-tag">Unit {activeUnitId} of {units.length}</span>
                <h2 className="unit-display-title">{activeUnit.title}</h2>
                <p className="unit-overview-text">{activeUnit.overview}</p>
              </div>

              {/* Learning Sections */}
              <div className="unit-sections-container">
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
              </div>

              {/* Quiz Section */}
              <div className="unit-quiz-wrapper" id="quiz-section">
                <div className="quiz-header-card">
                  <div>
                    <h3 className="quiz-title">Unit {activeUnitId} Assessment Quiz</h3>
                    <p className="quiz-subtitle">Answer all 5 questions. Passing threshold: {QUIZ_PASSING_PERCENTAGE}% (4/5 correct).</p>
                  </div>
                  {isUnitCompleted(activeUnitId) && (
                    <span className="unit-passed-banner">✓ Unit Completed</span>
                  )}
                </div>

                {/* Question List */}
                <div className="quiz-questions-list">
                  {activeUnit.quiz?.map((q, qIdx) => {
                    const selectedOpt = answers[qIdx];
                    const isGraded = quizResult !== null;

                    return (
                      <div key={qIdx} className={`quiz-question-card ${isGraded ? (selectedOpt === q.correctAnswer ? 'correct-card' : 'incorrect-card') : ''}`}>
                        <h4 className="question-text">
                          <span className="q-num">Q{qIdx + 1}.</span> {q.question}
                        </h4>

                        <div className="options-list">
                          {q.options.map((opt, oIdx) => {
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

                        {/* Explanation display after quiz submission */}
                        {isGraded && (
                          <div className="quiz-explanation-box">
                            <strong>Explanation:</strong> {q.explanation}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Quiz Result Banner */}
                {quizResult && (
                  <div className={`quiz-result-card ${quizResult.passed ? 'passed' : 'failed'}`}>
                    <div className="result-header">
                      <span className="result-icon">{quizResult.passed ? '🎉' : '⚠️'}</span>
                      <div>
                        <h4>{quizResult.passed ? 'Unit Assessment Passed!' : 'Assessment Not Passed'}</h4>
                        <p>You scored <strong>{quizResult.score} / {quizResult.total}</strong> ({quizResult.percentage}%).</p>
                      </div>
                    </div>
                    {quizResult.passed ? (
                      <div className="result-actions">
                        <p className="result-note">Great job! Progress updated to {currentProgress}%. Next unit is now unlocked.</p>
                        {activeUnitId < units.length ? (
                          <button className="btn-action" onClick={handleNextUnit}>
                            Continue to Unit {activeUnitId + 1} →
                          </button>
                        ) : (
                          <button className="btn-action btn-gold" onClick={() => onViewCertificate(course)}>
                            🏆 Course Completed — View Certificate!
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="result-actions">
                        <p className="result-note">Passing score required is {QUIZ_PASSING_PERCENTAGE}%. Review the course unit content above and retake the quiz.</p>
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
                    <button className="btn-action btn-lg" onClick={handleSubmitQuiz}>
                      Submit Quiz & Check Results
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
