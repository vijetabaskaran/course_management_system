import { useState, useCallback, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useChatNotifications } from '../context/ChatNotificationContext';
import { useCourses } from '../context/CourseContext';
import Sidebar from '../components/Sidebar';
import StatCard from '../components/StatCard';
import Toast from '../components/Toast';
import {
  getInitials, generateStudentId, formatCurrentDate,
  getGreeting, getProgressColor, formatTimeAgo,
} from '../services/storage';
import '../styles/dashboard.css';

const enrollmentProgress = (e) => (typeof e.progressPercentage === 'number' ? e.progressPercentage : 0);
const averageProgress = (list) => (list.length ? Math.round(list.reduce((s, e) => s + enrollmentProgress(e), 0) / list.length) : 0);
const sameEmail = (a, b) => (a || '').toLowerCase() === (b || '').toLowerCase();

/* ── Sidebar sections ─────────────────────────── */
const ADMIN_SECTIONS = [
  { key: 'overview', label: 'Overview', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg> },
  { key: 'courses', label: 'Courses', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg> },
  { key: 'students', label: 'Students', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
  { key: 'enrollments', label: 'Enrollments', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg> },
  { key: 'chat', label: 'Chat', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> },
  { key: 'settings', label: 'Settings', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg> },
];

const DEPARTMENTS = [
  'Computer Science','Software Engineering','Information Technology',
  'Electrical Engineering','Mechanical Engineering','Business Administration',
  'Mathematics','Physics','Chemistry','Economics',
];

const AVATAR_COLORS = ['#A88F70','#8C7358','#6B5D50','#5C4E43','#9C8B7A','#7A6855','#C4A882','#D8C3A5'];

import { LEARNING_DOMAINS } from '../data/coursesData';
import Chat from '../components/Chat';

/* ── Course Modal (with full Module, Lesson, & Quiz Management) ── */
function CourseModal({ course, onClose, onSave, saving }) {
  const isEdit = !!course?.id;
  const [activeTab, setActiveTab] = useState("basic");
  const [form, setForm] = useState({
    id:          course?.id          || "",
    name:        course?.name || course?.title || "",
    code:        course?.code        || "",
    domain:      course?.domain || course?.category || "Python",
    description: course?.description || "",
    department:  course?.department  || "",
    duration:    course?.duration    || "",
    instructor:  course?.instructor  || "",
  });

  const [modules, setModules] = useState(() => {
    if (Array.isArray(course?.modules) && course.modules.length > 0) {
      return JSON.parse(JSON.stringify(course.modules));
    }
    return [];
  });

  const [quiz, setQuiz] = useState(() => {
    if (Array.isArray(course?.quiz) && course.quiz.length > 0) {
      return JSON.parse(JSON.stringify(course.quiz));
    }
    return [];
  });

  const [errors, setErrors] = useState({});

  const set = (k, v) => {
    setForm(f => ({ ...f, [k]: v }));
    if (errors[k]) setErrors(e => ({ ...e, [k]: "" }));
  };

  const handleAddModule = () => {
    const modNum = modules.length + 1;
    setModules(prev => [
      ...prev,
      {
        id: "mod-" + Date.now() + "-" + modNum,
        title: "Module " + modNum + ": New Module",
        description: "",
        order: modNum,
        lessons: [
          {
            id: "les-" + Date.now() + "-1",
            title: "Lesson 1: Introduction",
            description: "",
            content: "",
            order: 1,
            duration: "15 mins",
          }
        ],
        quiz: []
      }
    ]);
  };

  const handleUpdateModule = (mIdx, field, val) => {
    setModules(prev => {
      const copy = [...prev];
      copy[mIdx] = { ...copy[mIdx], [field]: val };
      return copy;
    });
  };

  const handleDeleteModule = (mIdx) => {
    if (window.confirm("Are you sure you want to delete this module and its lessons?")) {
      setModules(prev => prev.filter((_, idx) => idx !== mIdx));
    }
  };

  const handleMoveModule = (mIdx, dir) => {
    const targetIdx = mIdx + dir;
    if (targetIdx < 0 || targetIdx >= modules.length) return;
    setModules(prev => {
      const copy = [...prev];
      const temp = copy[mIdx];
      copy[mIdx] = copy[targetIdx];
      copy[targetIdx] = temp;
      return copy;
    });
  };

  const handleAddLesson = (mIdx) => {
    setModules(prev => {
      const copy = [...prev];
      const currentLessons = copy[mIdx].lessons || [];
      const lesNum = currentLessons.length + 1;
      copy[mIdx] = {
        ...copy[mIdx],
        lessons: [
          ...currentLessons,
          {
            id: "les-" + Date.now() + "-" + lesNum,
            title: "Lesson " + lesNum + ": New Lesson",
            description: "",
            content: "",
            order: lesNum,
            duration: "15 mins",
          }
        ]
      };
      return copy;
    });
  };

  const handleUpdateLesson = (mIdx, lIdx, field, val) => {
    setModules(prev => {
      const copy = [...prev];
      const lessons = [...(copy[mIdx].lessons || [])];
      lessons[lIdx] = { ...lessons[lIdx], [field]: val };
      copy[mIdx] = { ...copy[mIdx], lessons };
      return copy;
    });
  };

  const handleDeleteLesson = (mIdx, lIdx) => {
    setModules(prev => {
      const copy = [...prev];
      copy[mIdx] = {
        ...copy[mIdx],
        lessons: (copy[mIdx].lessons || []).filter((_, idx) => idx !== lIdx)
      };
      return copy;
    });
  };

  const handleAddModuleQuestion = (mIdx) => {
    setModules(prev => {
      const copy = [...prev];
      const currentQuiz = copy[mIdx].quiz || [];
      copy[mIdx] = {
        ...copy[mIdx],
        quiz: [
          ...currentQuiz,
          {
            id: "q-" + Date.now() + "-" + (currentQuiz.length + 1),
            question: "",
            options: ["Option A", "Option B", "Option C", "Option D"],
            correctAnswer: 0,
            explanation: "",
          }
        ]
      };
      return copy;
    });
  };

  const handleUpdateModuleQuestion = (mIdx, qIdx, field, val) => {
    setModules(prev => {
      const copy = [...prev];
      const currentQuiz = [...(copy[mIdx].quiz || [])];
      currentQuiz[qIdx] = { ...currentQuiz[qIdx], [field]: val };
      copy[mIdx] = { ...copy[mIdx], quiz: currentQuiz };
      return copy;
    });
  };

  const handleDeleteModuleQuestion = (mIdx, qIdx) => {
    setModules(prev => {
      const copy = [...prev];
      copy[mIdx] = {
        ...copy[mIdx],
        quiz: (copy[mIdx].quiz || []).filter((_, idx) => idx !== qIdx)
      };
      return copy;
    });
  };

  const handleAddCourseQuestion = () => {
    setQuiz(prev => [
      ...prev,
      {
        id: "q-top-" + Date.now() + "-" + (prev.length + 1),
        question: "",
        options: ["Option A", "Option B", "Option C", "Option D"],
        correctAnswer: 0,
        explanation: "",
      }
    ]);
  };

  const handleUpdateCourseQuestion = (qIdx, field, val) => {
    setQuiz(prev => {
      const copy = [...prev];
      copy[qIdx] = { ...copy[qIdx], [field]: val };
      return copy;
    });
  };

  const handleDeleteCourseQuestion = (qIdx) => {
    setQuiz(prev => prev.filter((_, idx) => idx !== qIdx));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.name.trim()) errs.name = "Course name is required.";
    if (!form.code.trim()) errs.code = "Course code is required.";
    if (Object.keys(errs).length) { setErrors(errs); return; }

    onSave({
      ...form,
      id: form.id || null,
      title: form.name,
      category: form.domain,
      modules,
      quiz,
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box modal-wide" style={{ maxWidth: "820px", width: "92vw" }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <p id="modal-title" className="modal-title">{isEdit ? "Edit Course" : "Create New Course"}</p>
            <p className="modal-subtitle">
              {isEdit ? "Update course information, modules, and quizzes" : "Fill in course metadata, learning curriculum, and assessments"}
            </p>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div style={{ display: "flex", borderBottom: "1px solid var(--border)", background: "var(--bg-surface)", padding: "0 1.5rem" }}>
          <button
            type="button"
            className={"btn-tab " + (activeTab === "basic" ? "active" : "")}
            style={{
              padding: "0.75rem 1.25rem",
              border: "none",
              background: "none",
              borderBottom: activeTab === "basic" ? "2px solid var(--primary, #A88F70)" : "none",
              fontWeight: activeTab === "basic" ? 700 : 500,
              color: activeTab === "basic" ? "var(--text-primary)" : "var(--text-muted)",
              cursor: "pointer",
            }}
            onClick={() => setActiveTab("basic")}
          >
            📋 Basic Info
          </button>
          <button
            type="button"
            className={"btn-tab " + (activeTab === "modules" ? "active" : "")}
            style={{
              padding: "0.75rem 1.25rem",
              border: "none",
              background: "none",
              borderBottom: activeTab === "modules" ? "2px solid var(--primary, #A88F70)" : "none",
              fontWeight: activeTab === "modules" ? 700 : 500,
              color: activeTab === "modules" ? "var(--text-primary)" : "var(--text-muted)",
              cursor: "pointer",
            }}
            onClick={() => setActiveTab("modules")}
          >
            📚 Modules & Lessons ({modules.length})
          </button>
          <button
            type="button"
            className={"btn-tab " + (activeTab === "quizzes" ? "active" : "")}
            style={{
              padding: "0.75rem 1.25rem",
              border: "none",
              background: "none",
              borderBottom: activeTab === "quizzes" ? "2px solid var(--primary, #A88F70)" : "none",
              fontWeight: activeTab === "quizzes" ? 700 : 500,
              color: activeTab === "quizzes" ? "var(--text-primary)" : "var(--text-muted)",
              cursor: "pointer",
            }}
            onClick={() => setActiveTab("quizzes")}
          >
            📝 Course Quizzes ({quiz.length})
          </button>
        </div>

        <form id="course-form" onSubmit={handleSubmit}>
          <div className="modal-body" style={{ maxHeight: "65vh", overflowY: "auto", padding: "1.5rem" }}>
            {activeTab === "basic" && (
              <div className="modal-grid">
                <div className="modal-full">
                  <div className="form-group" style={{ marginBottom: "1rem" }}>
                    <label className="form-label">Course Name <span className="required">*</span></label>
                    <input id="course-name" type="text" className={"form-input no-icon" + (errors.name ? " error" : "")} placeholder="e.g. Python Programming Masterclass" value={form.name} onChange={e => set("name", e.target.value)}/>
                    {errors.name && <span id="course-name-error" className="field-error">{errors.name}</span>}
                  </div>
                </div>

                <div>
                  <div className="form-group" style={{ marginBottom: "1rem" }}>
                    <label className="form-label">Learning Domain <span className="required">*</span></label>
                    <div className="select-wrapper">
                      <select id="course-domain" className="form-select" value={form.domain} onChange={e => set("domain", e.target.value)}>
                        {LEARNING_DOMAINS.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                      </select>
                      <span className="select-chevron"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg></span>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="form-group" style={{ marginBottom: "1rem" }}>
                    <label className="form-label">Course Code <span className="required">*</span></label>
                    <input id="course-code" type="text" className={"form-input no-icon" + (errors.code ? " error" : "")} placeholder="CS101" value={form.code} onChange={e => set("code", e.target.value)}/>
                    {errors.code && <span id="course-code-error" className="field-error">{errors.code}</span>}
                  </div>
                </div>

                <div>
                  <div className="form-group" style={{ marginBottom: "1rem" }}>
                    <label className="form-label">Duration</label>
                    <input id="course-duration" type="text" className="form-input no-icon" placeholder="e.g. 12 Weeks" value={form.duration} onChange={e => set("duration", e.target.value)}/>
                  </div>
                </div>

                <div>
                  <div className="form-group" style={{ marginBottom: "1rem" }}>
                    <label className="form-label">Department</label>
                    <div className="select-wrapper">
                      <select id="course-department" className="form-select" value={form.department} onChange={e => set("department", e.target.value)}>
                        <option value="">Select department</option>
                        {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                      <span className="select-chevron"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg></span>
                    </div>
                  </div>
                </div>

                <div className="modal-full">
                  <div className="form-group" style={{ marginBottom: "1rem" }}>
                    <label className="form-label">Instructor</label>
                    <input id="course-instructor" type="text" className="form-input no-icon" placeholder="Dr. Jane Smith" value={form.instructor} onChange={e => set("instructor", e.target.value)}/>
                  </div>
                </div>
                
                <div className="modal-full">
                  <div className="form-group">
                    <label className="form-label">Description</label>
                    <textarea id="course-description" className="form-input no-icon" placeholder="Brief course overview..." rows="3" style={{ resize: "vertical", paddingTop: "0.72rem" }} value={form.description} onChange={e => set("description", e.target.value)}/>
                  </div>
                </div>
                <input type="hidden" id="course-id" value={form.id}/>
              </div>
            )}

            {activeTab === "modules" && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                  <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--text-muted)" }}>
                    Add and arrange modules and detailed lessons for this course curriculum.
                  </p>
                  <button type="button" className="btn-action btn-sm" onClick={handleAddModule}>
                    + Add Module
                  </button>
                </div>

                {modules.length === 0 ? (
                  <div style={{ padding: "2.5rem", textAlign: "center", background: "#f8fafc", border: "1px dashed #cbd5e1", borderRadius: "8px" }}>
                    <p style={{ margin: 0, color: "#64748b" }}>No modules added to this course yet.</p>
                    <button type="button" className="btn-secondary btn-sm" style={{ marginTop: "0.75rem" }} onClick={handleAddModule}>
                      + Create First Module
                    </button>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                    {modules.map((mod, mIdx) => (
                      <div key={mod.id || mIdx} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "1.25rem" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                          <span style={{ fontWeight: 700, color: "#334155", fontSize: "0.95rem" }}>
                            Module {mIdx + 1}
                          </span>
                          <div style={{ display: "flex", gap: "0.35rem" }}>
                            <button type="button" className="btn-secondary btn-sm" style={{ padding: "2px 8px" }} disabled={mIdx === 0} onClick={() => handleMoveModule(mIdx, -1)}>↑</button>
                            <button type="button" className="btn-secondary btn-sm" style={{ padding: "2px 8px" }} disabled={mIdx === modules.length - 1} onClick={() => handleMoveModule(mIdx, 1)}>↓</button>
                            <button type="button" className="btn-secondary btn-sm" style={{ padding: "2px 8px", color: "#dc2626" }} onClick={() => handleDeleteModule(mIdx)}>🗑️ Delete</button>
                          </div>
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "0.75rem", marginBottom: "1rem" }}>
                          <div>
                            <label className="form-label" style={{ fontSize: "0.8rem" }}>Module Title</label>
                            <input
                              type="text"
                              className="form-input no-icon"
                              value={mod.title || ""}
                              onChange={e => handleUpdateModule(mIdx, "title", e.target.value)}
                              placeholder="e.g. Module 1: Python Fundamentals"
                            />
                          </div>
                          <div>
                            <label className="form-label" style={{ fontSize: "0.8rem" }}>Module Description</label>
                            <input
                              type="text"
                              className="form-input no-icon"
                              value={mod.description || mod.overview || ""}
                              onChange={e => handleUpdateModule(mIdx, "description", e.target.value)}
                              placeholder="Brief summary of module objectives"
                            />
                          </div>
                        </div>

                        <div style={{ background: "#fff", border: "1px solid #cbd5e1", borderRadius: "6px", padding: "1rem" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                            <span style={{ fontWeight: 600, fontSize: "0.85rem", color: "#475569" }}>
                              Lessons ({mod.lessons?.length || 0})
                            </span>
                            <button type="button" className="btn-secondary btn-sm" onClick={() => handleAddLesson(mIdx)}>
                              + Add Lesson
                            </button>
                          </div>

                          {(mod.lessons || []).map((les, lIdx) => (
                            <div key={les.id || lIdx} style={{ borderBottom: lIdx < mod.lessons.length - 1 ? "1px solid #e2e8f0" : "none", paddingBottom: "0.75rem", marginBottom: "0.75rem" }}>
                              <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
                                <input
                                  type="text"
                                  className="form-input no-icon"
                                  style={{ flex: 2, fontSize: "0.85rem" }}
                                  value={les.title || ""}
                                  onChange={e => handleUpdateLesson(mIdx, lIdx, "title", e.target.value)}
                                  placeholder="Lesson title"
                                />
                                <button type="button" className="btn-secondary btn-sm" style={{ color: "#ef4444" }} onClick={() => handleDeleteLesson(mIdx, lIdx)}>
                                  ✕
                                </button>
                              </div>
                              <textarea
                                className="form-input no-icon"
                                rows="2"
                                style={{ fontSize: "0.82rem", width: "100%", resize: "vertical" }}
                                value={les.content || ""}
                                onChange={e => handleUpdateLesson(mIdx, lIdx, "content", e.target.value)}
                                placeholder="Lesson learning content, notes, or code examples..."
                              />
                            </div>
                          ))}
                        </div>

                        <div style={{ marginTop: "1rem", background: "#fff", border: "1px solid #cbd5e1", borderRadius: "6px", padding: "1rem" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                            <span style={{ fontWeight: 600, fontSize: "0.85rem", color: "#475569" }}>
                              Module Assessment Quiz ({mod.quiz?.length || 0} Questions)
                            </span>
                            <button type="button" className="btn-secondary btn-sm" onClick={() => handleAddModuleQuestion(mIdx)}>
                              + Add Question
                            </button>
                          </div>

                          {(mod.quiz || []).map((q, qIdx) => (
                            <div key={q.id || qIdx} style={{ background: "#f8fafc", padding: "0.75rem", borderRadius: "6px", marginBottom: "0.75rem", border: "1px solid #e2e8f0" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                                <span style={{ fontWeight: 600, fontSize: "0.8rem" }}>Question {qIdx + 1}</span>
                                <button type="button" className="btn-secondary btn-sm" style={{ color: "#ef4444", padding: "1px 6px" }} onClick={() => handleDeleteModuleQuestion(mIdx, qIdx)}>✕</button>
                              </div>
                              <input
                                type="text"
                                className="form-input no-icon"
                                style={{ marginBottom: "0.5rem", fontSize: "0.85rem" }}
                                value={q.question || ""}
                                onChange={e => handleUpdateModuleQuestion(mIdx, qIdx, "question", e.target.value)}
                                placeholder="Enter question prompt"
                              />
                              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", marginBottom: "0.5rem" }}>
                                {(q.options || []).map((opt, oIdx) => (
                                  <input
                                    key={oIdx}
                                    type="text"
                                    className="form-input no-icon"
                                    style={{ fontSize: "0.82rem" }}
                                    value={opt}
                                    onChange={e => {
                                      const nextOpts = [...(q.options || [])];
                                      nextOpts[oIdx] = e.target.value;
                                      handleUpdateModuleQuestion(mIdx, qIdx, "options", nextOpts);
                                    }}
                                    placeholder={"Option " + String.fromCharCode(65 + oIdx)}
                                  />
                                ))}
                              </div>
                              <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                                <label style={{ fontSize: "0.8rem", color: "#475569" }}>Correct Answer:</label>
                                <select
                                  className="form-select"
                                  style={{ padding: "3px 8px", fontSize: "0.82rem" }}
                                  value={q.correctAnswer || 0}
                                  onChange={e => handleUpdateModuleQuestion(mIdx, qIdx, "correctAnswer", Number(e.target.value))}
                                >
                                  {(q.options || []).map((opt, oIdx) => (
                                    <option key={oIdx} value={oIdx}>Option {String.fromCharCode(65 + oIdx)} ({opt || "Empty"})</option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "quizzes" && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                  <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--text-muted)" }}>
                    Add comprehensive course-level quiz questions for final student assessment.
                  </p>
                  <button type="button" className="btn-action btn-sm" onClick={handleAddCourseQuestion}>
                    + Add Question
                  </button>
                </div>

                {quiz.length === 0 ? (
                  <div style={{ padding: "2.5rem", textAlign: "center", background: "#f8fafc", border: "1px dashed #cbd5e1", borderRadius: "8px" }}>
                    <p style={{ margin: 0, color: "#64748b" }}>No course-level assessment questions defined.</p>
                    <button type="button" className="btn-secondary btn-sm" style={{ marginTop: "0.75rem" }} onClick={handleAddCourseQuestion}>
                      + Create First Assessment Question
                    </button>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    {quiz.map((q, qIdx) => (
                      <div key={q.id || qIdx} style={{ background: "#f8fafc", padding: "1rem", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                          <span style={{ fontWeight: 600, fontSize: "0.85rem" }}>Question {qIdx + 1}</span>
                          <button type="button" className="btn-secondary btn-sm" style={{ color: "#ef4444" }} onClick={() => handleDeleteCourseQuestion(qIdx)}>✕ Delete</button>
                        </div>
                        <input
                          type="text"
                          className="form-input no-icon"
                          style={{ marginBottom: "0.5rem" }}
                          value={q.question || ""}
                          onChange={e => handleUpdateCourseQuestion(qIdx, "question", e.target.value)}
                          placeholder="Question title or prompt"
                        />
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", marginBottom: "0.5rem" }}>
                          {(q.options || []).map((opt, oIdx) => (
                            <input
                              key={oIdx}
                              type="text"
                              className="form-input no-icon"
                              style={{ fontSize: "0.85rem" }}
                              value={opt}
                              onChange={e => {
                                const nextOpts = [...(q.options || [])];
                                nextOpts[oIdx] = e.target.value;
                                handleUpdateCourseQuestion(qIdx, "options", nextOpts);
                              }}
                              placeholder={"Option " + String.fromCharCode(65 + oIdx)}
                            />
                          ))}
                        </div>
                        <div style={{ display: "flex", gap: "1rem", alignItems: "center", marginBottom: "0.5rem" }}>
                          <label style={{ fontSize: "0.8rem", color: "#475569" }}>Correct Answer:</label>
                          <select
                            className="form-select"
                            style={{ padding: "4px 10px", fontSize: "0.85rem" }}
                            value={q.correctAnswer || 0}
                            onChange={e => handleUpdateCourseQuestion(qIdx, "correctAnswer", Number(e.target.value))}
                          >
                            {(q.options || []).map((opt, oIdx) => (
                              <option key={oIdx} value={oIdx}>Option {String.fromCharCode(65 + oIdx)} ({opt || "Empty"})</option>
                            ))}
                          </select>
                        </div>
                        <input
                          type="text"
                          className="form-input no-icon"
                          style={{ fontSize: "0.82rem" }}
                          value={q.explanation || ""}
                          onChange={e => handleUpdateCourseQuestion(qIdx, "explanation", e.target.value)}
                          placeholder="Explanation for correct answer (optional)"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button id="course-save-btn" type="submit" className="btn-action" disabled={saving}>
              {saving ? "Saving…" : (isEdit ? "Update Course & Curriculum" : "Save Course & Curriculum")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Course Detail Modal ──────────────────────── */
function CourseDetailModal({ course, onClose, students, enrollments }) {
  if (!course) return null;
  const courseEnrollments = enrollments.filter(e => e.courseId === course.id);
  const avgProg = averageProgress(courseEnrollments);
  const completedCount = courseEnrollments.filter(e => enrollmentProgress(e) === 100).length;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box modal-wide" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <p id="detail-title" className="modal-title">{course.name}</p>
            <p id="detail-subtitle" className="modal-subtitle">{course.code}{course.instructor ? ` · ${course.instructor}` : ''}</p>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div id="detail-stats-row" className="detail-stats-row">
          <div className="detail-stat"><span className="detail-stat-num">{courseEnrollments.length}</span><span className="detail-stat-label">Enrolled</span></div>
          <div className="detail-stat"><span className="detail-stat-num">{completedCount}</span><span className="detail-stat-label">Completed</span></div>
          <div className="detail-stat"><span className="detail-stat-num">{avgProg}%</span><span className="detail-stat-label">Avg Progress</span></div>
          {course.department && <div className="detail-stat"><span className="detail-stat-num" style={{ fontSize: '1rem' }}>{course.department}</span><span className="detail-stat-label">Department</span></div>}
          {course.duration && <div className="detail-stat"><span className="detail-stat-num" style={{ fontSize: '1rem' }}>{course.duration}</span><span className="detail-stat-label">Duration</span></div>}
        </div>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr><th>Student</th><th>Department</th><th>Enrolled On</th><th>Progress</th></tr>
            </thead>
            <tbody id="detail-students-tbody">
              {courseEnrollments.length === 0 ? (
                <tr><td colSpan="4" className="table-empty">No students enrolled yet.</td></tr>
              ) : courseEnrollments.map(e => {
                const student = students.find(s => sameEmail(s.email, e.studentEmail));
                if (!student) return null;
                const prog = enrollmentProgress(e);
                const joined = new Date(e.enrolledAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                return (
                  <tr key={e.id}>
                    <td><strong>{student.fullname}</strong><br/><small style={{ color: 'var(--text-muted)' }}>{student.email}</small></td>
                    <td><span className="dept-badge">{student.department || 'N/A'}</span></td>
                    <td>{joined}</td>
                    <td>
                      <div className="progress-cell">
                        <div className="cprogress-bar" style={{ minWidth: 80 }}>
                          <div className="cprogress-fill" style={{ width: `${prog}%`, background: getProgressColor(prog) }}/>
                        </div>
                        <span className="progress-pct">{prog}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="modal-footer"><button className="btn-secondary" onClick={onClose}>Close</button></div>
      </div>
    </div>
  );
}

/* ── Delete Confirmation Modal ────────────────── */
function DeleteModal({ course, enrollments, onCancel, onConfirm, deleting }) {
  if (!course) return null;
  const count = enrollments.filter(e => e.courseId === course.id).length;
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-box modal-sm" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <p className="modal-title">Delete Course</p>
          <button className="modal-close" onClick={onCancel}>✕</button>
        </div>
        <div className="modal-body">
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Are you sure you want to delete <strong>"{course.name}"</strong>?
            {count > 0 && <> This will also remove <strong>{count} enrollment record(s)</strong>.</>}
            {' '}This action cannot be undone.
          </p>
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onCancel}>Cancel</button>
          <button className="btn-action" style={{ background: 'linear-gradient(135deg,#9B3A3A,#C04545)' }} onClick={onConfirm} disabled={deleting}>
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Overview Section ─────────────────────────── */
function OverviewSection({ courses, students, enrollments }) {
  const avg = averageProgress(enrollments);

  const getTime = (d) => (d ? new Date(d).getTime() : 0);
  const recentStudents = students.slice().sort((a, b) => getTime(b.createdAt) - getTime(a.createdAt)).slice(0, 6);

  // Activity log
  const events = [];
  students.slice().sort((a, b) => getTime(b.createdAt) - getTime(a.createdAt)).slice(0, 3)
    .forEach(s => events.push({ text: `${s.fullname} registered`, ts: s.createdAt, color: 'blue-dot' }));
  courses.slice().sort((a, b) => getTime(b.createdAt) - getTime(a.createdAt)).slice(0, 3)
    .forEach(c => events.push({ text: `Course "${c.name}" created`, ts: c.createdAt, color: 'green-dot' }));
  enrollments.slice().sort((a, b) => getTime(b.enrolledAt) - getTime(a.enrolledAt)).slice(0, 3).forEach(e => {
    const st = students.find(s => sameEmail(s.email, e.studentEmail));
    const co = courses.find(c => c.id === e.courseId);
    if (st && co) events.push({ text: `${st.fullname} enrolled in "${co.name}"`, ts: e.enrolledAt, color: 'orange-dot' });
  });
  events.sort((a, b) => getTime(b.ts) - getTime(a.ts));

  return (
    <>
      <div className="section-header">
        <div>
          <h2 id="welcome-heading" className="section-title">{getGreeting('Admin')}</h2>
          <p className="section-subtitle" id="current-date">{formatCurrentDate()}</p>
        </div>
        <span className="header-date">System Administrator</span>
      </div>

      <div className="stats-grid">
        <StatCard icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>} number={students.length} label="TOTAL STUDENTS" badge="Registered"/>
        <StatCard icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>} number={courses.length} label="TOTAL COURSES" badge="Active Courses"/>
        <StatCard icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>} number={enrollments.length} label="TOTAL ENROLLMENTS" badge="All Time"/>
        <StatCard icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>} number={`${avg}%`} label="AVG. PROGRESS" badge="Across All Courses"/>
      </div>

      <div className="content-grid">
        <div className="content-card">
          <h3 className="card-title">Recently Registered Students</h3>
          {recentStudents.length === 0 ? <p className="empty-state-sm">No students registered yet.</p> : (
            <div className="reg-list" id="recent-students-list">
              {recentStudents.map((s, i) => (
                <div key={s.email} className="reg-item">
                  <div className="reg-avatar" style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}>{getInitials(s.fullname)}</div>
                  <div className="reg-info">
                    <span className="reg-name">{s.fullname}</span>
                    <span className="reg-meta">{s.department || 'N/A'} · {formatTimeAgo(s.createdAt)}</span>
                  </div>
                  <span className="status-pill status-good">Active</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="content-card">
          <h3 className="card-title">Recent Activity</h3>
          {events.length === 0 ? <p className="empty-state-sm">No recent activity.</p> : (
            <div className="activity-log" id="activity-log">
              {events.slice(0, 7).map((ev, i) => (
                <div key={i} className="activity-item">
                  <span className={`activity-dot ${ev.color}`}/>
                  <div className="activity-info">
                    <span>{ev.text}</span>
                    <span className="activity-time">{formatTimeAgo(ev.ts)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

/* ── Courses Section ──────────────────────────── */
function CoursesSection({ courses, enrollments, onAdd, onEdit, onView, onDelete }) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || sessionStorage.getItem('role') === 'admin';

  return (
    <>
      <div className="section-header">
        <div><h2 className="section-title">Course Management</h2><p className="section-subtitle">Create, edit and manage all courses.</p></div>
        {isAdmin && <button className="btn-action" onClick={() => onAdd()}>+ New Course</button>}
      </div>
      {courses.length === 0 ? (
        <div className="empty-state"><h3>No courses yet</h3><p>Create your first course to get started.</p></div>
      ) : (
        <div id="admin-courses-grid" className="courses-grid">
          {courses.map(course => {
            const courseEnrollments = enrollments.filter(e => e.courseId === course.id);
            const count = courseEnrollments.length;
            const avgProg = averageProgress(courseEnrollments);
            return (
              <div key={course.id} className="course-card admin-course-card">
                <div className="course-card-banner" style={{ background: course.color }}/>
                <div className="course-card-body">
                  <span className="course-card-code">{course.code}</span>
                  <h4 className="course-card-name">{course.name}</h4>
                  <p className="course-card-instructor">{course.instructor || <span className="text-muted">No instructor assigned</span>}</p>
                  {course.department && <span className="dept-badge" style={{ marginBottom: '.5rem', display: 'inline-block' }}>{course.department}</span>}
                  <div className="admin-course-meta">
                    <span>👥 {count} Student{count !== 1 ? 's' : ''}</span>
                    {course.duration && <span>⏱ {course.duration}</span>}
                  </div>
                  <div className="course-card-progress" style={{ marginBottom: '.75rem' }}>
                    <div className="cprogress-bar" style={{ flex: 1 }}>
                      <div className="cprogress-fill" style={{ width: `${avgProg}%`, background: getProgressColor(avgProg) }}/>
                    </div>
                    <span>{avgProg}% avg</span>
                  </div>
                  <div className="course-card-footer">
                    <button className="action-btn" onClick={() => onView(course)}>👁 View</button>
                    {isAdmin && <button className="action-btn" onClick={() => onEdit(course)}>✏ Edit</button>}
                    {isAdmin && <button className="action-btn danger" onClick={() => onDelete(course)}>🗑 Delete</button>}
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

/* ── Students Section ─────────────────────────── */
function StudentsSection({ students, enrollments }) {
  const [search, setSearch] = useState('');

  const filtered = students.filter(s => {
    if (!search) return true;
    const q = search.toLowerCase();
    return `${s.fullname} ${s.email} ${s.department || ''}`.toLowerCase().includes(q);
  }).sort((a, b) => b.createdAt - a.createdAt);

  return (
    <>
      <div className="section-header">
        <div><h2 className="section-title">Student Management</h2><p className="section-subtitle">View and manage all registered students.</p></div>
      </div>
      <div className="table-card">
        <div className="table-toolbar">
          <input className="table-search" type="search" placeholder="Search students…" value={search} onChange={e => setSearch(e.target.value)}/>
        </div>
        <div className="table-responsive">
          <table className="data-table">
            <thead><tr><th>Student ID</th><th>Name</th><th>Department</th><th>Email</th><th>Enrolled</th><th>Joined</th><th>Status</th></tr></thead>
            <tbody id="students-tbody">
              {filtered.length === 0 ? (
                <tr id="students-empty-row"><td colSpan="7" className="table-empty">{search ? 'No students match your search.' : 'No students registered yet.'}</td></tr>
              ) : filtered.map(student => {
                const enrolledCount = enrollments.filter(e => sameEmail(e.studentEmail, student.email)).length;
                const joined = new Date(student.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                return (
                  <tr key={student.email} data-search={`${student.fullname} ${student.email} ${student.department || ''}`.toLowerCase()}>
                    <td>{generateStudentId(student.username)}</td>
                    <td><strong>{student.fullname}</strong></td>
                    <td><span className="dept-badge">{student.department || 'N/A'}</span></td>
                    <td>{student.email}</td>
                    <td><span className="enroll-count">{enrolledCount}</span></td>
                    <td>{joined}</td>
                    <td><span className="status-pill status-good">Active</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

/* ── Enrollments Section ──────────────────────── */
function EnrollmentsSection({ courses, students, enrollments }) {
  return (
    <>
      <div className="section-header">
        <div><h2 className="section-title">Enrollment Monitoring</h2><p className="section-subtitle">Track student enrollment and progress per course.</p></div>
      </div>
      {courses.length === 0 ? (
        <div className="empty-state"><h3>No courses yet</h3><p>Create courses to monitor enrollments.</p></div>
      ) : (
        <div id="enrollment-courses-list">
          {courses.map(course => {
            const courseEnrollments = enrollments.filter(e => e.courseId === course.id);
            const avgProg = averageProgress(courseEnrollments);
            const completedCount = courseEnrollments.filter(e => enrollmentProgress(e) === 100).length;
            const enrolledStudents = courseEnrollments.map(e => {
              const student = students.find(s => sameEmail(s.email, e.studentEmail));
              return { student, prog: enrollmentProgress(e), enrolledAt: e.enrolledAt };
            }).filter(item => item.student);

            return (
              <div key={course.id} className="enrollment-course-card">
                <div className="enrollment-card-header">
                  <div className="enrollment-card-title-row">
                    <div>
                      <span className="course-card-code">{course.code}</span>
                      <h3 className="enrollment-course-name">{course.name}</h3>
                      {course.instructor && <p className="course-card-instructor">{course.instructor}</p>}
                    </div>
                    <div className="enrollment-summary">
                      <div className="enrollment-stat"><span className="enrollment-stat-num">{courseEnrollments.length}</span><span className="enrollment-stat-label">Students</span></div>
                      <div className="enrollment-stat"><span className="enrollment-stat-num">{completedCount}</span><span className="enrollment-stat-label">Completed</span></div>
                      <div className="enrollment-stat"><span className="enrollment-stat-num">{avgProg}%</span><span className="enrollment-stat-label">Avg Progress</span></div>
                    </div>
                  </div>
                  <div className="course-card-progress" style={{ marginTop: '.5rem' }}>
                    <div className="cprogress-bar" style={{ flex: 1 }}>
                      <div className="cprogress-fill" style={{ width: `${avgProg}%`, background: getProgressColor(avgProg) }}/>
                    </div>
                  </div>
                </div>
                {enrolledStudents.length > 0 ? (
                  <div className="table-responsive">
                    <table className="data-table enrollment-inner-table" style={{ fontSize: '0.83rem' }}>
                      <thead><tr><th>Student</th><th>Department</th><th>Enrolled On</th><th>Progress</th></tr></thead>
                      <tbody>
                        {enrolledStudents.map((item, i) => (
                          <tr key={i}>
                            <td><strong>{item.student.fullname}</strong></td>
                            <td><span className="dept-badge">{item.student.department || 'N/A'}</span></td>
                            <td>{new Date(item.enrolledAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                            <td>
                              <div className="progress-cell">
                                <div className="cprogress-bar" style={{ minWidth: 80 }}>
                                  <div className="cprogress-fill" style={{ width: `${item.prog}%`, background: getProgressColor(item.prog) }}/>
                                </div>
                                <span className="progress-pct">{item.prog}%</span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : <p className="no-enrollments-msg">No students enrolled yet.</p>}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

/* ── Settings Section ─────────────────────────── */
function SettingsSection({ toast }) {
  const cards = [
    { title: 'Security Settings', desc: 'Configure password policies, session timeouts, and two-factor authentication.' },
    { title: 'Email Notifications', desc: 'Manage automated email notifications for students and faculty.' },
    { title: 'Academic Calendar', desc: 'Set semester dates, holidays, and important academic milestones.' },
    { title: 'Data Backup', desc: 'Schedule automated backups and manage data retention policies.' },
  ];
  return (
    <>
      <div className="section-header"><div><h2 className="section-title">System Settings</h2><p className="section-subtitle">Configure portal preferences and system options.</p></div></div>
      <div className="settings-grid">
        {cards.map(c => (
          <div key={c.title} className="settings-card">
            <h4>{c.title}</h4>
            <p>{c.desc}</p>
            <button className="btn-action" onClick={() => toast(`${c.title} — coming soon!`)}>Configure</button>
          </div>
        ))}
      </div>
    </>
  );
}

/* ── Main AdminDashboard ──────────────────────── */
export default function AdminDashboard() {
  const { user, loading: authLoading } = useAuth();
  const { unreadCount } = useChatNotifications();
  const {
    courses, students, enrollments,
    loading: dataLoading,
    upsertCourse, deleteCourse, fetchAll,
  } = useCourses();

  const [activeSection, setActiveSection] = useState('overview');
  const [toastMsg, setToastMsg] = useState('');
  const [courseModal, setCourseModal] = useState(null);   // null | course object (null id = new)
  const [detailCourse, setDetailCourse] = useState(null);
  const [deleteCourseObj, setDeleteCourseObj] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const showToast = useCallback((msg) => setToastMsg(msg), []);
  const clearToast = useCallback(() => setToastMsg(''), []);

  useEffect(() => {
    if (fetchAll) fetchAll();
  }, [fetchAll, activeSection]);

  const breadcrumbLabels = {
    overview: 'Overview', courses: 'Course Management',
    students: 'Student Management', enrollments: 'Enrollment Monitoring', chat: 'Chat', settings: 'System Settings',
  };

  if (authLoading || dataLoading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: 'var(--bg-main, #0f172a)',
        color: 'var(--text-secondary, #94a3b8)',
        fontFamily: 'sans-serif',
      }}>
        <div style={{
          width: '36px',
          height: '36px',
          border: '3px solid rgba(67, 97, 238, 0.2)',
          borderTopColor: '#4361ee',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
          marginBottom: '1rem',
        }} />
        <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>Loading Admin Dashboard...</span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }
  if (!user || user.role !== 'admin') return <Navigate to="/" replace/>;

  const handleCourseModalSave = async (data) => {
    setSaving(true);
    try {
      await upsertCourse(data);
      setCourseModal(null);
      showToast(data.id ? '✅ Course updated successfully!' : '✅ Course created successfully!');
    } catch (err) {
      console.error('Failed to save course:', err);
      showToast('❌ Failed to save course. Is the API running?');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteCourseObj) return;
    setDeleting(true);
    try {
      await deleteCourse(deleteCourseObj.id);
      setDeleteCourseObj(null);
      showToast('🗑️ Course deleted.');
    } catch (err) {
      console.error('Failed to delete course:', err);
      showToast('❌ Failed to delete course. Is the API running?');
    } finally {
      setDeleting(false);
    }
  };

  const renderSection = () => {
    switch (activeSection) {
      case 'overview':
        return <OverviewSection key={activeSection} courses={courses} students={students} enrollments={enrollments}/>;
      case 'courses':
        return <CoursesSection
          key={activeSection}
          courses={courses}
          enrollments={enrollments}
          onAdd={() => setCourseModal({})}
          onEdit={c => setCourseModal(c)}
          onView={c => setDetailCourse(c)}
          onDelete={c => setDeleteCourseObj(c)}
        />;
      case 'students':
        return <StudentsSection key={activeSection} students={students} enrollments={enrollments}/>;
      case 'enrollments':
        return <EnrollmentsSection key={activeSection} courses={courses} students={students} enrollments={enrollments}/>;
      case 'chat':
        return <Chat key={activeSection} />;
      case 'settings':
        return <SettingsSection key={activeSection} toast={showToast}/>;
      default:
        return null;
    }
  };

  return (
    <div className="dashboard-layout admin-theme">
      <Sidebar
        sections={ADMIN_SECTIONS}
        activeSection={activeSection}
        onNavigate={setActiveSection}
        theme="admin-theme"
      />

      <div className="main-content">
        <header className="topbar">
          <div className="topbar-left">
            <span className="admin-label">Administrator</span>
            <span className="breadcrumb">{breadcrumbLabels[activeSection]}</span>
          </div>
                    <div className="topbar-right" style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <button
              className="notification-bell-btn"
              onClick={() => setActiveSection('chat')}
              title={unreadCount > 0 ? `${unreadCount} unread message(s) - Click to view` : 'Notifications'}
              style={{
                position: 'relative',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-secondary, #64748b)',
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              {unreadCount > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '2px',
                  right: '2px',
                  background: '#ef4444',
                  color: '#ffffff',
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  borderRadius: '10px',
                  padding: '1px 5px',
                  minWidth: '16px',
                  height: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  lineHeight: 1,
                  boxShadow: '0 0 5px rgba(239, 68, 68, 0.5)',
                }}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
            <div className="user-avatar" title={`${user.fullname} (Admin)`}>{getInitials(user.fullname)}</div>
          </div>
        </header>

        <div className="dashboard-section active">
          {renderSection()}
        </div>
      </div>

      {/* Modals */}
      {courseModal !== null && (
        <CourseModal course={courseModal} onClose={() => setCourseModal(null)} onSave={handleCourseModalSave} saving={saving}/>
      )}
      {detailCourse && (
        <CourseDetailModal course={detailCourse} onClose={() => setDetailCourse(null)} students={students} enrollments={enrollments}/>
      )}
      {deleteCourseObj && (
        <DeleteModal course={deleteCourseObj} enrollments={enrollments} onCancel={() => setDeleteCourseObj(null)} onConfirm={handleDeleteConfirm} deleting={deleting}/>
      )}

      <Toast message={toastMsg} onHide={clearToast}/>
    </div>
  );
}
