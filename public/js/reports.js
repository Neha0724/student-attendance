// ============================================================
// reports.js - Client-side parsing and reporting dashboard
// ============================================================

let reportsData = null; // cached report response

document.addEventListener('DOMContentLoaded', fetchReports);

async function fetchReports() {
  try {
    const res = await fetch('/api/reports');
    if (!res.ok) throw new Error('Could not compute attendance analytics.');

    reportsData = await res.json();
    renderMonthlySummary(reportsData.monthlySummary);
    filterReports(); // Will render table using default filters
  } catch (err) {
    console.error(err);
    showToast('Failed to load analytical reports.', 'error');
    document.getElementById('percentageTableWrap').innerHTML = `<div class="text-danger text-center">Failed to fetch data.</div>`;
  }
}

// Render Monthly Cards Summary
function renderMonthlySummary(monthlyList) {
  const container = document.getElementById('monthlySummaryWrap');

  if (monthlyList.length === 0) {
    container.innerHTML = `<div class="text-muted" style="grid-column: 1/-1; padding: 20px 0;">No attendance records found yet to summarize.</div>`;
    return;
  }

  // Grouped cards layout
  const cards = monthlyList.map(item => {
    // Format YYYY-MM into Month Name
    const [y, m] = item.month.split('-');
    const dateObj = new Date(parseInt(y), parseInt(m) - 1, 1);
    const label = dateObj.toLocaleString('en-US', { month: 'long', year: 'numeric' });

    const total = item.present + item.absent;
    const rate = total > 0 ? Math.round((item.present / total) * 100) : 0;

    return `
      <div class="month-card">
        <div class="month-name">${label}</div>
        <div class="month-stat">📂 Working Days: <strong>${item.workingDays}</strong></div>
        <div class="month-stat">🟢 Total Presents: <strong>${item.present}</strong></div>
        <div class="month-stat">🔴 Total Absents: <strong>${item.absent}</strong></div>
        <div class="month-stat mt-1" style="border-top:1px solid var(--border); padding-top:6px;">
          Avg Attendance: <span class="badge ${rate >= 75 ? 'badge-success' : 'badge-danger'}" style="margin-left:4px;">${rate}%</span>
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = cards;
}

// Client-side filtration of computed percentages
function filterReports() {
  if (!reportsData) return;

  const classFilter = document.getElementById('reportFilterCls').value;
  const divFilter = document.getElementById('reportFilterDiv').value;
  const statusFilter = document.getElementById('reportFilterStatus').value;

  const filtered = reportsData.studentStats.filter(s => {
    const classMatch = (classFilter === 'ALL' || s.class === classFilter);
    const divMatch = (divFilter === 'ALL' || s.division === divFilter);
    
    let statusMatch = true;
    if (statusFilter === 'DEFAULTERS') {
      statusMatch = s.totalDays > 0 && s.percentage < 75;
    } else if (statusFilter === 'GOOD') {
      statusMatch = s.totalDays === 0 || s.percentage >= 75;
    }

    return classMatch && divMatch && statusMatch;
  });

  renderPercentageTable(filtered);
}

// Render dynamic stats details
function renderPercentageTable(list) {
  const container = document.getElementById('percentageTableWrap');

  if (list.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📊</div>
        <p>No student reports match the filters selected.</p>
      </div>`;
    return;
  }

  const rows = list.map(s => {
    const isDefaulter = s.totalDays > 0 && s.percentage < 75;
    
    // Percentage level tag
    const pctClass = s.totalDays === 0 ? 'text-muted' : (isDefaulter ? 'pct-low text-danger' : 'pct-high text-success');
    const badgeMarkup = isDefaulter 
      ? `<span class="badge badge-danger">⚠️ Below 75%</span>`
      : s.totalDays === 0
        ? `<span class="badge badge-info">No Attendance</span>`
        : `<span class="badge badge-success">Good Stand</span>`;

    // Progress bar color based on percentage
    const barColor = isDefaulter ? 'var(--danger)' : 'var(--success)';

    return `
      <tr>
        <td>${s.rollNo}</td>
        <td><strong>${s.name}</strong></td>
        <td class="td-muted">${s.class} - Div ${s.division}</td>
        <td>${s.presentDays} / ${s.totalDays}</td>
        <td>
          <div class="flex-center gap-2">
            <div class="progress-bar-wrap" style="width: 100px;">
              <div class="progress-bar" style="width: ${s.percentage}%; background-color: ${barColor};"></div>
            </div>
            <span class="${pctClass} fw-bold" style="min-width:35px; text-align:right;">${s.percentage}%</span>
          </div>
        </td>
        <td>${badgeMarkup}</td>
      </tr>
    `;
  }).join('');

  container.innerHTML = `
    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Roll No</th>
            <th>Student Name</th>
            <th>Class Info</th>
            <th>Presents / Total Days</th>
            <th>Attendance Rate</th>
            <th>Status Badge</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>`;
}
