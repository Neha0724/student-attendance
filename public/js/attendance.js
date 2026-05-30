let allStudents = [];
let todayAttendance = []; // Attendance records matching selected date

document.addEventListener('DOMContentLoaded', () => {
  // Set default date input to local today's date
  const dateInput = document.getElementById('attDate');
  if (dateInput) {
    dateInput.value = todayStr(); // helper from common.js
  }
  
  initializePage();
});

async function initializePage() {
  await fetchAllStudents();
  await loadAttendanceForDate();
}

async function fetchAllStudents() {
  try {
    const res = await fetch('/api/students');
    if (!res.ok) throw new Error('Failed to load students.');
    allStudents = await res.json();
  } catch (err) {
    console.error(err);
    showToast('Failed to load student profiles.', 'error');
  }
}

// Loads attendance for the active date and maps it
async function loadAttendanceForDate() {
  const date = document.getElementById('attDate').value;
  const container = document.getElementById('rosterContainer');
  const statusBadge = document.getElementById('attendanceStatusBadge');
  
  if (!date) return;

  container.innerHTML = `<div class="spinner"></div>`;

  try {
    const res = await fetch(`/api/attendance?date=${date}`);
    if (!res.ok) throw new Error('Failed to retrieve attendance logs.');
    todayAttendance = await res.json();

    // Update status badge
    if (todayAttendance.length > 0) {
      statusBadge.className = 'badge badge-success';
      statusBadge.textContent = '✏️ Saved (Modify Mode)';
    } else {
      statusBadge.className = 'badge badge-warning';
      statusBadge.textContent = '🆕 Unmarked';
    }

    renderRoster();
  } catch (err) {
    console.error(err);
    showToast('Failed to check attendance records.', 'error');
    container.innerHTML = `<div class="text-danger text-center mt-2">Error checking attendance.</div>`;
  }
}

// Render student roster filtered by class & division
function renderRoster() {
  const container = document.getElementById('rosterContainer');
  const countEl = document.getElementById('rosterCount');
  
  const classFilter = document.getElementById('filterCls').value;
  const divFilter = document.getElementById('filterDivision').value;

  // Filter student profiles list
  const filteredStudents = allStudents.filter(s => {
    const classMatch = (classFilter === 'ALL' || s.class === classFilter);
    const divMatch = (divFilter === 'ALL' || s.division === divFilter);
    return classMatch && divMatch;
  });

  countEl.textContent = filteredStudents.length;

  if (filteredStudents.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📂</div>
        <p>No students match the current filters.</p>
      </div>`;
    return;
  }

  // Create a mapping of studentId -> status from current date attendance records
  const attMap = {};
  todayAttendance.forEach(a => {
    attMap[a.studentId] = a.status;
  });

  // Render cards for each student
  const cardsHtml = filteredStudents.map(s => {
    const status = attMap[s.id] || 'Present'; // default to Present if unmarked

    return `
      <div class="attendance-row" data-student-id="${s.id}">
        <div class="student-info">
          <div class="sname">${s.name}</div>
          <div class="smeta">Roll No: ${s.rollNo} | Class: ${s.class} - Div: ${s.division}</div>
        </div>
        <div class="radio-group">
          <label class="radio-btn present ${status === 'Present' ? 'present-selected' : ''}">
            <input type="radio" name="status-${s.id}" value="Present" ${status === 'Present' ? 'checked' : ''} onchange="handleRadioClick(this)" />
            ✅ Present
          </label>
          <label class="radio-btn absent ${status === 'Absent' ? 'absent-selected' : ''}">
            <input type="radio" name="status-${s.id}" value="Absent" ${status === 'Absent' ? 'checked' : ''} onchange="handleRadioClick(this)" />
            ❌ Absent
          </label>
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = cardsHtml;
}

// Triggered when date/filters change
async function handleFilterChange() {
  // If date changed, we reload attendance from server, otherwise we just re-render roster
  const dateInput = document.getElementById('attDate');
  staticDate = dateInput.getAttribute('data-last-date') || '';
  
  if (dateInput.value !== staticDate) {
    dateInput.setAttribute('data-last-date', dateInput.value);
    await loadAttendanceForDate();
  } else {
    renderRoster();
  }
}

// Toggle visual class on radio check change
function handleRadioClick(radio) {
  const group = radio.closest('.radio-group');
  // Clear other selected classes
  group.querySelectorAll('.radio-btn').forEach(btn => {
    btn.classList.remove('present-selected', 'absent-selected');
  });

  // Add correct class
  const label = radio.closest('.radio-btn');
  if (radio.value === 'Present') {
    label.classList.add('present-selected');
  } else {
    label.classList.add('absent-selected');
  }
}

// Apply mass action (Mark All Present/Absent)
function markAll(status) {
  const rows = document.querySelectorAll('.attendance-row');
  if (rows.length === 0) return;

  rows.forEach(row => {
    const radio = row.querySelector(`input[value="${status}"]`);
    if (radio) {
      radio.checked = true;
      handleRadioClick(radio);
    }
  });

  showToast(`Marked all students as ${status} (Local changes)`, 'info');
}

// POST or PUT (bulk update) local selections to the database API
async function saveAttendance() {
  const date = document.getElementById('attDate').value;
  const saveBtn = document.getElementById('saveAttendanceBtn');
  const statusMsg = document.getElementById('saveStatusMsg');
  const rows = document.querySelectorAll('.attendance-row');

  if (!date) {
    showToast('Please select a valid date.', 'warning');
    return;
  }

  if (rows.length === 0) {
    showToast('No students to mark attendance for.', 'warning');
    return;
  }

  // Build records list to send
  const records = [];
  rows.forEach(row => {
    const studentId = parseInt(row.getAttribute('data-student-id'));
    const status = row.querySelector('input[type="radio"]:checked').value;
    records.push({ studentId, status });
  });

  saveBtn.disabled = true;
  statusMsg.textContent = 'Saving...';

  try {
    const res = await fetch('/api/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, records })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to save attendance.');

    showToast(`Attendance saved successfully for ${formatDate(date)}`, 'success');
    statusMsg.textContent = '';
    
    // Refresh date records
    await loadAttendanceForDate();
  } catch (err) {
    showToast(err.message, 'error');
    statusMsg.textContent = 'Error occurred';
  } finally {
    saveBtn.disabled = false;
  }
}
