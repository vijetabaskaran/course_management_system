const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 4000;
const DB_PATH = path.join(__dirname, "data", "db.json");

// ── Middleware ──────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── DB helpers ──────────────────────────────────────────────────
function readDB() {
  return JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
}

function writeDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf8");
}

/** Generate a short random ID (same style as json-server) */
function newId() {
  return Math.random().toString(36).slice(2, 13);
}

// ── Home page ──────────────────────────────────────────────────
app.get("/", (req, res) => {
  const db = readDB();
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8"/>
      <title>EduPortal Backend API</title>
      <style>
        body { font-family: sans-serif; max-width: 600px; margin: 60px auto; color: #1a1a2e; }
        h1   { color: #4361ee; }
        ul   { line-height: 2; }
        a    { color: #4361ee; text-decoration: none; }
        a:hover { text-decoration: underline; }
        .badge { background: #e7ecff; color: #4361ee; border-radius: 12px;
                 padding: 1px 10px; font-size: 0.85rem; margin-left: 6px; }
      </style>
    </head>
    <body>
      <h1>🎓 EduPortal Backend — port ${PORT}</h1>
      <p>Resources available:</p>
      <ul>
        <li><a href="/courses">/courses</a> <span class="badge">${db.courses.length} items</span></li>
        <li><a href="/students">/students</a> <span class="badge">${db.students.length} items</span></li>
        <li><a href="/enrollments">/enrollments</a> <span class="badge">${db.enrollments.length} items</span></li>
      </ul>
    </body>
    </html>
  `);
});

// ══════════════════════════════════════════════════════════════
//  COURSES
// ══════════════════════════════════════════════════════════════
app.get("/courses", (req, res) => {
  res.json(readDB().courses);
});

app.get("/courses/:id", (req, res) => {
  const course = readDB().courses.find((c) => c.id === req.params.id);
  if (!course) return res.status(404).json({ error: "Course not found" });
  res.json(course);
});

app.post("/courses", (req, res) => {
  const db = readDB();
  const course = { ...req.body, id: req.body.id || "CRS-" + newId() };
  db.courses.push(course);
  writeDB(db);
  res.status(201).json(course);
});

app.put("/courses/:id", (req, res) => {
  const db = readDB();
  const idx = db.courses.findIndex((c) => c.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Course not found" });
  db.courses[idx] = { ...req.body, id: req.params.id };
  writeDB(db);
  res.json(db.courses[idx]);
});

app.delete("/courses/:id", (req, res) => {
  const db = readDB();
  const idx = db.courses.findIndex((c) => c.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Course not found" });
  const [deleted] = db.courses.splice(idx, 1);
  writeDB(db);
  res.json(deleted);
});

// ══════════════════════════════════════════════════════════════
//  STUDENTS
// ══════════════════════════════════════════════════════════════
app.get("/students", (req, res) => {
  res.json(readDB().students);
});

app.get("/students/:id", (req, res) => {
  const student = readDB().students.find((s) => s.id === req.params.id);
  if (!student) return res.status(404).json({ error: "Student not found" });
  res.json(student);
});

app.post("/students", (req, res) => {
  const db = readDB();
  const student = { ...req.body, id: req.body.id || newId() };
  db.students.push(student);
  writeDB(db);
  res.status(201).json(student);
});

app.put("/students/:id", (req, res) => {
  const db = readDB();
  const idx = db.students.findIndex((s) => s.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Student not found" });
  db.students[idx] = { ...req.body, id: req.params.id };
  writeDB(db);
  res.json(db.students[idx]);
});

app.patch("/students/:id", (req, res) => {
  const db = readDB();
  const idx = db.students.findIndex((s) => s.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Student not found" });
  db.students[idx] = { ...db.students[idx], ...req.body };
  writeDB(db);
  res.json(db.students[idx]);
});

app.delete("/students/:id", (req, res) => {
  const db = readDB();
  const idx = db.students.findIndex((s) => s.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Student not found" });
  const [deleted] = db.students.splice(idx, 1);
  writeDB(db);
  res.json(deleted);
});

// ══════════════════════════════════════════════════════════════
//  ENROLLMENTS
// ══════════════════════════════════════════════════════════════
app.get("/enrollments", (req, res) => {
  res.json(readDB().enrollments);
});

app.get("/enrollments/:id", (req, res) => {
  const enrollment = readDB().enrollments.find((e) => e.id === req.params.id);
  if (!enrollment) return res.status(404).json({ error: "Enrollment not found" });
  res.json(enrollment);
});

app.post("/enrollments", (req, res) => {
  const db = readDB();
  const enrollment = { ...req.body, id: req.body.id || newId() };
  db.enrollments.push(enrollment);
  writeDB(db);
  res.status(201).json(enrollment);
});

app.patch("/enrollments/:id", (req, res) => {
  const db = readDB();
  const idx = db.enrollments.findIndex((e) => e.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Enrollment not found" });
  db.enrollments[idx] = { ...db.enrollments[idx], ...req.body };
  writeDB(db);
  res.json(db.enrollments[idx]);
});

app.delete("/enrollments/:id", (req, res) => {
  const db = readDB();
  const idx = db.enrollments.findIndex((e) => e.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Enrollment not found" });
  const [deleted] = db.enrollments.splice(idx, 1);
  writeDB(db);
  res.json(deleted);
});

// ── Start ────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n  🎓 EduPortal Backend running on http://localhost:${PORT}\n`);
  console.log(`  GET  http://localhost:${PORT}/courses`);
  console.log(`  GET  http://localhost:${PORT}/students`);
  console.log(`  GET  http://localhost:${PORT}/enrollments\n`);
});
