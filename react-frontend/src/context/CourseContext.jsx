import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import api from "../services/api";
import { getProgress, saveProgress, clearStudentCourseProgress } from "../services/storage";

const CourseContext = createContext(null);

const COURSE_GRADIENT_PALETTES = [
  "linear-gradient(135deg,#A88F70,#8C7358)",
  "linear-gradient(135deg,#8C7358,#6B5D50)",
  "linear-gradient(135deg,#6B5D50,#5C4E43)",
  "linear-gradient(135deg,#D8C3A5,#A88F70)",
  "linear-gradient(135deg,#9C8B7A,#7A6855)",
  "linear-gradient(135deg,#A88F70,#3F352C)",
  "linear-gradient(135deg,#7A6855,#5C4E43)",
  "linear-gradient(135deg,#C4A882,#8C7358)",
];

// Keeps title/name/domain/code always filled (same as old getCourses())
function normalizeCourse(c) {
  return {
    ...c,
    name: c.name || c.title,
    title: c.title || c.name,
    domain: c.domain || c.category || "General",
    code: c.code || `CRS-${c.id}`,
  };
}

export function CourseProvider({ children }) {
  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const hasLoadedRef = useRef(false);

  // ── Load everything from the backend ─────────────────────────
  // Only the first load toggles `loading`: dashboards render nothing while
  // loading, so a refresh must not unmount views the user is working in.
  const fetchAll = useCallback(async () => {
    try {
      if (!hasLoadedRef.current) setLoading(true);
      const [courseRes, studentRes, enrollmentRes] = await Promise.all([
        api.get("/courses"),
        api.get("/students"),
        api.get("/enrollments"),
      ]);
      setCourses(courseRes.data.map(normalizeCourse));
      setStudents(studentRes.data);
      setEnrollments(enrollmentRes.data);
      setError(null);
      hasLoadedRef.current = true;
    } catch (err) {
      console.error("Failed to load data:", err);
      setError("Unable to load data. Is the backend running? (cd backend && npm start)");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // ── Courses ──────────────────────────────────────────────────
  async function addCourse(courseData) {
    const title = courseData.title || courseData.name;
    const domain = courseData.domain || courseData.category || "General";
    const { id: _ignored, ...rest } = courseData;

    const body = {
      ...rest,
      title,
      name: title,
      domain,
      code: courseData.code || "CS-" + Math.floor(100 + Math.random() * 900),
      color:
        courseData.color ||
        COURSE_GRADIENT_PALETTES[courses.length % COURSE_GRADIENT_PALETTES.length],
      createdAt: Date.now(),
    };

    const response = await api.post("/courses", body);
    const saved = normalizeCourse(response.data);
    setCourses((prev) => [...prev, saved]);
    return saved;
  }

  async function updateCourse(id, updatedFields) {
    const existing = courses.find((c) => c.id === id);
    const title = updatedFields.title || updatedFields.name || existing?.title;
    const domain =
      updatedFields.domain || updatedFields.category || existing?.domain || "General";

    const body = {
      ...existing,
      ...updatedFields,
      id,
      title,
      name: title,
      domain,
      updatedAt: Date.now(),
    };

    const response = await api.put(`/courses/${id}`, body);
    const saved = normalizeCourse(response.data);
    setCourses((prev) => prev.map((c) => (c.id === id ? saved : c)));
    return saved;
  }

  // Same name/behaviour as old storage.upsertCourse(data)
  async function upsertCourse(courseData) {
    if (courseData.id && courses.some((c) => c.id === courseData.id)) {
      return updateCourse(courseData.id, courseData);
    }
    return addCourse(courseData);
  }

  async function deleteCourse(id) {
    await api.delete(`/courses/${id}`);

    // remove this course's enrollments too (handles both backend cascade and individual deletion)
    const related = enrollments.filter((e) => e.courseId === id);
    await Promise.all(related.map((e) => api.delete(`/enrollments/${e.id}`).catch(() => {})));

    saveProgress(getProgress().filter((p) => p.courseId !== id));

    setCourses((prev) => prev.filter((c) => c.id !== id));
    setEnrollments((prev) => prev.filter((e) => e.courseId !== id));
  }

  function getCourseById(id) {
    return courses.find((c) => c.id === id) || null;
  }

  // ── Students ─────────────────────────────────────────────────
  async function addStudent(student) {
    const response = await api.post("/students", student);
    setStudents((prev) => [...prev, response.data]);
    return response.data;
  }

  function findStudentByEmail(email) {
    return (
      students.find((s) => s.email.toLowerCase() === email.toLowerCase()) || null
    );
  }

  function findStudentByUsername(username) {
    return (
      students.find(
        (s) => s.username.toLowerCase() === username.toLowerCase()
      ) || null
    );
  }

  // ── Enrollments ──────────────────────────────────────────────
  function isEnrolled(studentEmail, courseId) {
    if (!studentEmail || !courseId) return false;
    const lowerEmail = studentEmail.toLowerCase().trim();
    return enrollments.some(
      (e) => (e.studentEmail && e.studentEmail.toLowerCase().trim() === lowerEmail) && e.courseId === courseId
    );
  }

  async function enrollStudent(studentEmail, courseId) {
    const response = await api.post("/api/v1/enrollments", { courseId });
    const newEnroll = response.data?.enrollment || response.data;
    if (studentEmail) clearStudentCourseProgress(studentEmail, courseId);
    setEnrollments((prev) => [...prev, { ...newEnroll, progressPercentage: 0, completedUnits: 0 }]);
    return response.data;
  }

  async function unenrollStudent(studentEmail, courseId) {
    const response = await api.delete(`/api/v1/enrollments/${courseId}`);
    if (studentEmail) clearStudentCourseProgress(studentEmail, courseId);
    setEnrollments((prev) => prev.filter(e => {
      const matchEmail = studentEmail && e.studentEmail && e.studentEmail.toLowerCase().trim() === studentEmail.toLowerCase().trim();
      const matchCourse = e.courseId === courseId;
      return !(matchEmail && matchCourse);
    }));
    return response.data;
  }

  function getStudentEnrollments(studentEmail) {
    if (!studentEmail) return [];
    const lowerEmail = studentEmail.toLowerCase().trim();
    return enrollments.filter((e) => e.studentEmail && e.studentEmail.toLowerCase().trim() === lowerEmail);
  }

  function getCourseEnrollments(courseId) {
    return enrollments.filter((e) => e.courseId === courseId);
  }

  return (
    <CourseContext.Provider
      value={{
        // data
        courses,
        students,
        enrollments,
        loading,
        error,
        fetchAll,
        fetchCourses: fetchAll,
        // courses
        addCourse,
        updateCourse,
        upsertCourse,
        deleteCourse,
        getCourseById,
        // students
        addStudent,
        findStudentByEmail,
        findStudentByUsername,
        // enrollments
        enrollStudent,
        unenrollStudent,
        isEnrolled,
        getStudentEnrollments,
        getCourseEnrollments,
      }}
    >
      {children}
    </CourseContext.Provider>
  );
}

export function useCourses() {
  return useContext(CourseContext);
}
