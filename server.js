// server.js - Student Attendance Management System Backend
const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;;

// Paths to JSON data files
const STUDENTS_FILE = path.join(__dirname, 'data', 'students.json');
const ATTENDANCE_FILE = path.join(__dirname, 'data', 'attendance.json');

// --- Middleware ---
app.use(express.json()); // Parse incoming JSON bodies
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files

// Helper Functions
// Read a JSON file and return the parsed data
function readData(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    return []; // Return empty array if file is empty or missing
  }
}

// Write data to a JSON file
function writeData(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

// Generate next auto-incremented ID from an array of records
function nextId(arr) {
  if (arr.length === 0) return 1;
  return Math.max(...arr.map(item => item.id)) + 1;
}

// STUDENT ROUTES
// GET /api/students - Get all students (optional search query)
app.get('/api/students', (req, res) => {
  let students = readData(STUDENTS_FILE);
  const q = req.query.q ? req.query.q.toLowerCase() : '';
  if (q) {
    students = students.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.rollNo.toLowerCase().includes(q) ||
      s.class.toLowerCase().includes(q) ||
      s.division.toLowerCase().includes(q)
    );
  }
  res.json(students);
});

// POST /api/students - Add a new student
app.post('/api/students', (req, res) => {
  const students = readData(STUDENTS_FILE);
  const { rollNo, name, class: cls, division } = req.body;

  // Basic validation
  if (!rollNo || !name || !cls || !division) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  // Check for duplicate roll number
  const exists = students.find(s => s.rollNo === rollNo);
  if (exists) {
    return res.status(400).json({ error: 'Roll number already exists.' });
  }

  const newStudent = {
    id: nextId(students),
    rollNo,
    name,
    class: cls,
    division
  };

  students.push(newStudent);
  writeData(STUDENTS_FILE, students);
  res.status(201).json(newStudent);
});

// PUT /api/students/:id - Update a student
app.put('/api/students/:id', (req, res) => {
  const students = readData(STUDENTS_FILE);
  const id = parseInt(req.params.id);
  const idx = students.findIndex(s => s.id === id);

  if (idx === -1) return res.status(404).json({ error: 'Student not found.' });

  const { rollNo, name, class: cls, division } = req.body;

  // Check duplicate roll number (exclude self)
  const dup = students.find(s => s.rollNo === rollNo && s.id !== id);
  if (dup) return res.status(400).json({ error: 'Roll number already exists.' });

  students[idx] = { ...students[idx], rollNo, name, class: cls, division };
  writeData(STUDENTS_FILE, students);
  res.json(students[idx]);
});

// DELETE /api/students/:id - Delete a student and their attendance records
app.delete('/api/students/:id', (req, res) => {
  const students = readData(STUDENTS_FILE);
  const attendance = readData(ATTENDANCE_FILE);
  const id = parseInt(req.params.id);

  const idx = students.findIndex(s => s.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Student not found.' });

  // Remove student
  students.splice(idx, 1);
  writeData(STUDENTS_FILE, students);

  // Also remove all attendance records for this student
  const updatedAttendance = attendance.filter(a => a.studentId !== id);
  writeData(ATTENDANCE_FILE, updatedAttendance);

  res.json({ message: 'Student deleted successfully.' });
});


// ATTENDANCE ROUTES
// GET /api/attendance - Get all attendance records (optional date filter)
app.get('/api/attendance', (req, res) => {
  let attendance = readData(ATTENDANCE_FILE);
  if (req.query.date) {
    attendance = attendance.filter(a => a.date === req.query.date);
  }
  res.json(attendance);
});

// POST /api/attendance - Save attendance for a date (bulk save)
// Expects: { date: "YYYY-MM-DD", records: [{ studentId, status }] }
// Prevents duplicate entries for same student + date
app.post('/api/attendance', (req, res) => {
  let attendance = readData(ATTENDANCE_FILE);
  const { date, records } = req.body;

  if (!date || !Array.isArray(records)) {
    return res.status(400).json({ error: 'date and records array are required.' });
  }

  const saved = [];
  for (const rec of records) {
    const { studentId, status } = rec;

    // Check if record already exists for this student + date
    const existingIdx = attendance.findIndex(
      a => a.studentId === studentId && a.date === date
    );

    if (existingIdx !== -1) {
      // Update existing record
      attendance[existingIdx].status = status;
      saved.push(attendance[existingIdx]);
    } else {
      // Create new record
      const newRec = { id: nextId(attendance), studentId, date, status };
      attendance.push(newRec);
      // Recalculate nextId to avoid conflicts within the same loop
      saved.push(newRec);
    }
  }

  writeData(ATTENDANCE_FILE, attendance);
  res.status(201).json(saved);
});

// PUT /api/attendance/:id - Update a specific attendance record
app.put('/api/attendance/:id', (req, res) => {
  const attendance = readData(ATTENDANCE_FILE);
  const id = parseInt(req.params.id);
  const idx = attendance.findIndex(a => a.id === id);

  if (idx === -1) return res.status(404).json({ error: 'Record not found.' });

  attendance[idx].status = req.body.status;
  writeData(ATTENDANCE_FILE, attendance);
  res.json(attendance[idx]);
});

// REPORTS ROUTE
// GET /api/reports - Generate attendance reports
app.get('/api/reports', (req, res) => {
  const students = readData(STUDENTS_FILE);
  const attendance = readData(ATTENDANCE_FILE);

  // --- Per-Student Attendance Percentage ---
  const studentStats = students.map(student => {
    const records = attendance.filter(a => a.studentId === student.id);
    const total = records.length;
    const present = records.filter(a => a.status === 'Present').length;
    const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
    return {
      id: student.id,
      name: student.name,
      rollNo: student.rollNo,
      class: student.class,
      division: student.division,
      totalDays: total,
      presentDays: present,
      absentDays: total - present,
      percentage
    };
  });

  // --- Defaulters List (below 75%) ---
  const defaulters = studentStats.filter(s => s.totalDays > 0 && s.percentage < 75);

  // --- Monthly Summary ---
  // Group attendance by month: { "2026-05": { date: { present, absent } } }
  const monthlySummary = {};
  attendance.forEach(rec => {
    const month = rec.date.substring(0, 7); // "YYYY-MM"
    if (!monthlySummary[month]) monthlySummary[month] = { present: 0, absent: 0, dates: new Set() };
    monthlySummary[month].dates.add(rec.date);
    if (rec.status === 'Present') monthlySummary[month].present++;
    else monthlySummary[month].absent++;
  });

  // Convert Set to array for JSON serialization
  const monthlyArr = Object.entries(monthlySummary).map(([month, data]) => ({
    month,
    totalRecords: data.present + data.absent,
    present: data.present,
    absent: data.absent,
    workingDays: data.dates.size
  }));

  res.json({
    studentStats,
    defaulters,
    monthlySummary: monthlyArr
  });
});


// Start Server
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
  console.log(`   Press Ctrl+C to stop.`);
});
