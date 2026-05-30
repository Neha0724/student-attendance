// ============================================================
// common.js - Shared utilities for all pages
// ============================================================

// --- Mark active navigation link based on current page ---
function setActiveNav() {
  const page = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-link').forEach(link => {
    const href = link.getAttribute('href');
    if (href === page || (page === '' && href === 'index.html')) {
      link.classList.add('active');
    }
  });
}

// --- Mobile sidebar toggle ---
function initSidebar() {
  const hamburger = document.getElementById('hamburger');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');

  if (!hamburger || !sidebar) return;

  hamburger.addEventListener('click', () => {
    sidebar.classList.toggle('open');
    overlay.classList.toggle('open');
  });

  if (overlay) {
    overlay.addEventListener('click', () => {
      sidebar.classList.remove('open');
      overlay.classList.remove('open');
    });
  }
}

// --- Toast Notification System ---
// type: 'success' | 'error' | 'warning' | 'info'
function showToast(message, type = 'info', duration = 3500) {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || 'ℹ️'}</span>
    <span class="toast-msg">${message}</span>
  `;
  container.appendChild(toast);

  // Auto-remove after duration
  setTimeout(() => {
    toast.classList.add('fade-out');
    setTimeout(() => toast.remove(), 350);
  }, duration);
}

// --- Confirm Dialog ---
// Returns a Promise<boolean>
function showConfirm(title, message) {
  return new Promise(resolve => {
    const overlay = document.getElementById('confirmOverlay');
    const titleEl = document.getElementById('confirmTitle');
    const msgEl = document.getElementById('confirmMsg');
    const yesBtn = document.getElementById('confirmYes');
    const noBtn = document.getElementById('confirmNo');

    if (!overlay) { resolve(false); return; }

    titleEl.textContent = title;
    msgEl.textContent = message;
    overlay.classList.add('open');

    // Clean up listeners before adding new ones
    const newYes = yesBtn.cloneNode(true);
    const newNo = noBtn.cloneNode(true);
    yesBtn.parentNode.replaceChild(newYes, yesBtn);
    noBtn.parentNode.replaceChild(newNo, noBtn);

    newYes.addEventListener('click', () => { overlay.classList.remove('open'); resolve(true); });
    newNo.addEventListener('click', () => { overlay.classList.remove('open'); resolve(false); });
  });
}

// --- Format date "YYYY-MM-DD" to readable "May 30, 2026" ---
function formatDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[parseInt(m)-1]} ${parseInt(d)}, ${y}`;
}

// --- Get today's date string "YYYY-MM-DD" in local time ---
function todayStr() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// --- Set topbar date badge ---
function setDateBadge() {
  const badge = document.getElementById('dateBadge');
  if (badge) {
    badge.textContent = new Date().toLocaleDateString('en-IN', {
      weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
    });
  }
}

// --- Run all common init on DOM load ---
document.addEventListener('DOMContentLoaded', () => {
  setActiveNav();
  initSidebar();
  setDateBadge();
});
