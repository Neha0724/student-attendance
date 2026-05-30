// ============================================================
// dashboard.js - Fetch and render dashboard statistics
// ============================================================

const today = todayStr(); // from common.js

// Load all dashboard data when page is ready
document.addEventListener('DOMContentLoaded', loadDashboard);

async function loadDashboard() {
  try {
    // Fetch students and reports in parallel for speed
    const [students, reports, todayAtt] = await Promise.all([
      fetch('/api/students').then(r => r.json()),
      fetch('/api/reports').then(r => r.json()),
      fetch(`/api/attendance?date=${today}`).then(r => r.json())
    ]);

    // --- Stat Cards ---
    document.getElementById('totalStudents').textContent = students.length;

    const presentCount = todayAtt.filter(a => a.status === 'Present').length;
    const absentCount = todayAtt.filter(a => a.status === 'Absent').length;
    document.getElementById('presentToday').textContent = presentCount;
    document.getElementById('absentToday').textContent = absentCount;

    // Overall attendance percentage across all records
    const { studentStats } = reports;
    const totalDays = studentStats.reduce((s, r) => s + r.totalDays, 0);
    const totalPresent = studentStats.reduce((s, r) => s + r.presentDays, 0);
    const overallPct = totalDays > 0 ? Math.round((totalPresent / totalDays) * 100) : 0;
    document.getElementById('overallPct').textContent = overallPct + '%';

    // --- Today's Attendance Table ---
    renderTodayAttendance(students, todayAtt);

    // --- Defaulters Widget ---
    renderDefaulters(reports.defaulters);

  } catch (err) {
    console.error('Dashboard load error:', err);
    showToast('Failed to load dashboard data', 'error');
  }
}

// Render today's attendance summary in a table
function renderTodayAttendance(students, todayAtt) {
  const container = document.getElementById('recentAttBody');

  if (students.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">👥</div><p>No students found. <a href="students.html" style="color:var(--accent)">Add students</a> first.</p></div>`;
    return;
  }

  if (todayAtt.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">📋</div><p>Attendance not marked yet for today.<br/><a href="attendance.html" style="color:var(--accent)">Mark attendance now</a></p></div>`;
    return;
  }

  // Map studentId -> status for quick lookup
  const attMap = {};
  todayAtt.forEach(a => { attMap[a.studentId] = a.status; });

  const rows = students.map(s => {
    const status = attMap[s.id];
    const badge = status === 'Present'
      ? '<span class="badge badge-success">✅ Present</span>'
      : status === 'Absent'
        ? '<span class="badge badge-danger">❌ Absent</span>'
        : '<span class="badge badge-info">– Not marked</span>';
    return `
      <tr>
        <td>${s.rollNo}</td>
        <td>${s.name}</td>
        <td class="td-muted">${s.class} - ${s.division}</td>
        <td>${badge}</td>
      </tr>`;
  }).join('');

  container.innerHTML = `
    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Roll No</th><th>Name</th><th>Class</th><th>Status</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

// Render defaulters list (students below 75% attendance)
function renderDefaulters(defaulters) {
  const container = document.getElementById('defaultersBody');

  if (defaulters.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">🎉</div><p>No defaulters! All students have 75%+ attendance.</p></div>`;
    return;
  }

  const rows = defaulters.map(s => `
    <tr>
      <td>${s.name}</td>
      <td class="td-muted">${s.class} ${s.division}</td>
      <td><span class="badge badge-danger pct-low">${s.percentage}%</span></td>
    </tr>`).join('');

  container.innerHTML = `
    <div class="table-wrapper">
      <table>
        <thead>
          <tr><th>Name</th><th>Class</th><th>Attendance</th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}
