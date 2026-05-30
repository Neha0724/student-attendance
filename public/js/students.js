let allStudents = [];

// Load students on start
document.addEventListener('DOMContentLoaded', () => {
  fetchStudents();

  // Add Form Submit Listener
  const form = document.getElementById('addStudentForm');
  if (form) {
    form.addEventListener('submit', handleAddStudent);
  }
});

// Fetch all students from API
async function fetchStudents() {
  const tableWrap = document.getElementById('studentsTableWrap');
  try {
    const res = await fetch('/api/students');
    if (!res.ok) throw new Error('Failed to fetch students.');
    allStudents = await res.json();
    renderStudents(allStudents);
  } catch (err) {
    console.error(err);
    showToast('Could not load student list.', 'error');
    tableWrap.innerHTML = `<div class="text-danger text-center mt-2">Error loading student list.</div>`;
  }
}

// Render student array to HTML table
function renderStudents(studentsList) {
  const countBadge = document.getElementById('studentCount');
  const tableWrap = document.getElementById('studentsTableWrap');

  if (countBadge) countBadge.textContent = studentsList.length;

  if (studentsList.length === 0) {
    tableWrap.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">👥</div>
        <p>No students found. Add a new student or adjust search query.</p>
      </div>`;
    return;
  }

  const rows = studentsList.map(s => `
    <tr>
      <td>${s.rollNo}</td>
      <td><strong>${s.name}</strong></td>
      <td>${s.class}</td>
      <td><span class="badge badge-purple">${s.division}</span></td>
      <td>
        <button class="btn btn-outline btn-sm" onclick="openEditModal(${s.id}, '${s.rollNo}', '${s.name}', '${s.class}', '${s.division}')">✏️ Edit</button>
        <button class="btn btn-danger btn-sm" style="margin-left:6px;" onclick="handleDelete(${s.id}, '${s.name}')">🗑️ Delete</button>
      </td>
    </tr>
  `).join('');

  tableWrap.innerHTML = `
    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Roll No</th>
            <th>Name</th>
            <th>Class</th>
            <th>Division</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>`;
}

// Search / Filter implementation
function searchStudents() {
  const q = document.getElementById('searchInput').value.toLowerCase().trim();
  if (!q) {
    renderStudents(allStudents);
    return;
  }
  const filtered = allStudents.filter(s =>
    s.name.toLowerCase().includes(q) ||
    s.rollNo.toLowerCase().includes(q) ||
    s.class.toLowerCase().includes(q) ||
    s.division.toLowerCase().includes(q)
  );
  renderStudents(filtered);
}

// Handle Add Student submit
async function handleAddStudent(e) {
  e.preventDefault();

  const rollNo = document.getElementById('rollNo').value.trim();
  const name = document.getElementById('name').value.trim();
  const cls = document.getElementById('cls').value;
  const division = document.getElementById('division').value;

  try {
    const res = await fetch('/api/students', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rollNo, name, class: cls, division })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to add student.');

    showToast(`Successfully added student: ${name}`, 'success');
    resetAddForm();
    fetchStudents(); // Refresh table
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Handle Delete Student
async function handleDelete(id, name) {
  const confirm = await showConfirm(
    'Delete Student?',
    `Are you sure you want to delete ${name}? This will also delete their entire attendance history.`
  );

  if (!confirm) return;

  try {
    const res = await fetch(`/api/students/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to delete student.');

    showToast(`Successfully deleted student: ${name}`, 'success');
    fetchStudents(); // Refresh table
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Edit Modal opening and filling
function openEditModal(id, rollNo, name, cls, division) {
  document.getElementById('editId').value = id;
  document.getElementById('editRollNo').value = rollNo;
  document.getElementById('editName').value = name;
  document.getElementById('editCls').value = cls;
  document.getElementById('editDivision').value = division;

  document.getElementById('editModal').classList.add('open');
}

function closeEditModal() {
  document.getElementById('editModal').classList.remove('open');
}

// Save edited details
async function saveEdit() {
  const id = document.getElementById('editId').value;
  const rollNo = document.getElementById('editRollNo').value.trim();
  const name = document.getElementById('editName').value.trim();
  const cls = document.getElementById('editCls').value;
  const division = document.getElementById('editDivision').value;

  if (!rollNo || !name || !cls || !division) {
    showToast('Please fill in all fields.', 'warning');
    return;
  }

  try {
    const res = await fetch(`/api/students/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rollNo, name, class: cls, division })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update student details.');

    showToast(`Successfully updated student: ${name}`, 'success');
    closeEditModal();
    fetchStudents(); // Refresh table
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Helpers
function resetAddForm() {
  document.getElementById('addStudentForm').reset();
}

function toggleForm() {
  const wrap = document.getElementById('addFormWrap');
  const btn = document.getElementById('toggleFormBtn');
  if (wrap.classList.contains('hidden')) {
    wrap.classList.remove('hidden');
    btn.textContent = 'Hide Form';
  } else {
    wrap.classList.add('hidden');
    btn.textContent = 'Show Form';
  }
}
