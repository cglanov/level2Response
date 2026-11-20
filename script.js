// Set your Google Apps Script Web App URL after deploying
const GOOGLE_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxJi5fstpdPXgRx45hU2MGV7OoZ-SAqdWKpVS4rp6V4_dkVRvH6ua8bC9tSM3ZH3PTY/exec';

let state = {
  activeStudents: [],
  responders: [],
  selectedStudent: null,
  selectedResponder: null
};

// DOM Elements
const studentListEl = document.getElementById('student-list');
const responderListEl = document.getElementById('responder-list');
const responderPanelEl = document.getElementById('panel-responders');
const statusPanelEl = document.getElementById('panel-status');
const resolveBtn = document.getElementById('resolve-btn');
const statusMsgEl = document.getElementById('status-message');
const notesModal = document.getElementById('notes-modal');
const responseNotesInput = document.getElementById('response-notes');
const modalCancelBtn = document.getElementById('modal-cancel-btn');
const modalSubmitBtn = document.getElementById('modal-submit-btn');

document.addEventListener('DOMContentLoaded', () => {
  fetchDashboardData(true);
  // Refresh active alerts every 30 seconds without clearing active selections
  setInterval(() => fetchDashboardData(false), 30000);
});

function isSameStudent(a, b) {
  if (!a || !b) return false;
  return (
    String(a.colA || '').trim() === String(b.colA || '').trim() &&
    String(a.colB || '').trim() === String(b.colB || '').trim() &&
    String(a.requestTimestamp || '') === String(b.requestTimestamp || '')
  );
}

async function fetchDashboardData(showLoading = false) {
  if (showLoading) {
    studentListEl.innerHTML = '<p class="status-msg">Loading active alerts...</p>';
  }
  try {
    const response = await fetch(`${GOOGLE_APPS_SCRIPT_URL}?action=getDashboardData`);
    const result = await response.json();
    if (result.status === 'success') {
      state.activeStudents = result.students || [];
      state.responders = result.responders || [];

      // If the currently selected student was resolved on another device, reset panels
      if (
        state.selectedStudent &&
        !state.activeStudents.some((s) => isSameStudent(s, state.selectedStudent))
      ) {
        resetPanels();
      }

      renderStudentList();
      renderResponderList();
    } else {
      throw new Error(result.message || 'Error fetching data');
    }
  } catch (err) {
    console.error('Fetch error:', err);
    if (showLoading) {
      studentListEl.innerHTML = `<p class="status-msg" style="color: red;">Failed to load data. Please check Web App URL.</p>`;
    }
  }
}

function renderStudentList() {
  studentListEl.innerHTML = '';
  if (state.activeStudents.length === 0) {
    studentListEl.innerHTML = '<p class="status-msg">No active Level 2 requests.</p>';
    return;
  }

  state.activeStudents.forEach((student) => {
    // Label: Col A + space + Col B first char
    const colA = String(student.colA || '').trim();
    const colB = String(student.colB || '').trim();
    const firstCharB = colB.length > 0 ? colB.charAt(0).toUpperCase() : '';
    const displayLabel = `${colA} ${firstCharB}`.trim();
    const locationText = student.location || 'Location unspecified';

    const btn = document.createElement('button');
    btn.className = 'student-card-btn';
    if (isSameStudent(student, state.selectedStudent)) {
      btn.classList.add('selected');
    }

    btn.innerHTML = `
      <div class="student-info">
        <div class="student-name">${displayLabel}</div>
        <div class="student-location">${locationText}</div>
      </div>
    `;
    btn.addEventListener('click', () => selectStudent(student, displayLabel, btn));
    studentListEl.appendChild(btn);
  });
}

function renderResponderList() {
  responderListEl.innerHTML = '';
  if (state.responders.length === 0) {
    responderListEl.innerHTML = '<p class="placeholder-text">No responders found.</p>';
    return;
  }

  state.responders.forEach((name) => {
    const btn = document.createElement('button');
    btn.className = 'responder-btn';
    if (state.selectedResponder === name) {
      btn.classList.add('selected');
    }
    btn.textContent = name;
    btn.addEventListener('click', () => selectResponder(name, btn));
    responderListEl.appendChild(btn);
  });
}

function selectStudent(studentData, displayLabel, btnElement) {
  state.selectedStudent = { ...studentData, displayLabel };
  state.selectedResponder = null;

  document.querySelectorAll('.student-card-btn').forEach((b) => b.classList.remove('selected'));
  btnElement.classList.add('selected');

  // Activate Panel 2, reset Panel 3
  responderPanelEl.classList.remove('disabled');
  statusPanelEl.classList.add('disabled');
  document.querySelectorAll('.responder-btn').forEach((b) => b.classList.remove('selected'));
  resolveBtn.disabled = true;
  resolveBtn.textContent = 'Select a responder';

  // Ensure responder panel is visible on shorter mobile viewports
  if (window.innerWidth <= 768) {
    responderPanelEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

function selectResponder(responderName, btnElement) {
  state.selectedResponder = responderName;

  document.querySelectorAll('.responder-btn').forEach((b) => b.classList.remove('selected'));
  btnElement.classList.add('selected');

  // Activate Panel 3
  statusPanelEl.classList.remove('disabled');
  resolveBtn.disabled = false;
  resolveBtn.textContent = `Level 2 for ${state.selectedStudent.displayLabel} resolved`;
}

// Modal handling
resolveBtn.addEventListener('click', () => {
  if (!state.selectedStudent || !state.selectedResponder) return;
  if (responseNotesInput) responseNotesInput.value = '';
  notesModal.classList.remove('hidden');
});

modalCancelBtn.addEventListener('click', () => {
  notesModal.classList.add('hidden');
});

modalSubmitBtn.addEventListener('click', async () => {
  const notesText = responseNotesInput ? responseNotesInput.value.trim() : '';

  notesModal.classList.add('hidden');
  resolveBtn.disabled = true;
  statusMsgEl.style.color = '#1a73e8';
  statusMsgEl.textContent = 'Submitting resolution...';

  const colA = state.selectedStudent ? (state.selectedStudent.colA || '') : '';
  const colB = state.selectedStudent ? (state.selectedStudent.colB || '') : '';

  const payload = {
    action: 'resolveLevel2',
    studentColA: colA,
    studentColB: colB,
    teacher: state.selectedStudent ? state.selectedStudent.teacher : '',
    requestTimestamp: state.selectedStudent ? state.selectedStudent.requestTimestamp : '',
    responder: state.selectedResponder,
    notes: notesText,
    responseTimestamp: new Date().toLocaleString()
  };

  try {
    // Use text/plain for no-cors to prevent browser header stripping
    await fetch(GOOGLE_APPS_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(payload)
    });

    statusMsgEl.style.color = '#137333';
    statusMsgEl.textContent = 'Resolved successfully!';
    setTimeout(() => {
      statusMsgEl.textContent = '';
      resetPanels();
      fetchDashboardData(false);
    }, 2000);
  } catch (err) {
    console.error('Submit error:', err);
    statusMsgEl.style.color = '#d93025';
    statusMsgEl.textContent = 'Failed to submit. Check connection.';
    resolveBtn.disabled = false;
  }
});

function resetPanels() {
  state.selectedStudent = null;
  state.selectedResponder = null;
  responderPanelEl.classList.add('disabled');
  statusPanelEl.classList.add('disabled');
  resolveBtn.disabled = true;
  resolveBtn.textContent = 'Select student & responder';
}

// Register Service Worker for PWA installability
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((err) => {
      console.error('Service worker registration failed:', err);
    });
  });
}
