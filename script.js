// Set your Google Apps Script Web App URL after deploying
const GOOGLE_APPS_SCRIPT_URL = 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE';

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
  fetchDashboardData();
  // Timer to update elapsed times every 30 seconds
  setInterval(updateElapsedTimesUI, 30000);
});

async function fetchDashboardData() {
  studentListEl.innerHTML = '<p class="status-msg">Loading active alerts...</p>';
  
  try {
    const response = await fetch(`${GOOGLE_APPS_SCRIPT_URL}?action=getDashboardData`);
    const result = await response.json();

    if (result.status === 'success') {
      state.activeStudents = result.students || [];
      state.responders = result.responders || [];
      renderStudentList();
      renderResponderList();
    } else {
      throw new Error(result.message || 'Error fetching data');
    }
  } catch (err) {
    console.error('Fetch error:', err);
    studentListEl.innerHTML = `<p class="status-msg" style="color: red;">Failed to load data. Please check Web App URL.</p>`;
  }
}

function renderStudentList() {
  studentListEl.innerHTML = '';

  if (state.activeStudents.length === 0) {
    studentListEl.innerHTML = '<p class="status-msg">No active Level 2 requests.</p>';
    return;
  }

  state.activeStudents.forEach((student, idx) => {
    // Label: Col A + space + Col B first char
    const colA = String(student.colA || '').trim();
    const colB = String(student.colB || '').trim();
    const firstCharB = colB.length > 0 ? colB.charAt(0).toUpperCase() : '';
    const displayLabel = `${colA} ${firstCharB}`.trim();
    const locationText = student.location || 'Location unspecified';

    const btn = document.createElement('button');
    btn.className = 'student-card-btn';
    btn.dataset.index = idx;

    btn.innerHTML = `
      <div class="student-info">
        <span class="student-name">${displayLabel}</span>
        <span class="student-location">${locationText}</span>
      </div>
      <span class="elapsed-time" data-timestamp="${student.requestTimestamp}">
        ${calculateElapsedTime(student.requestTimestamp)}
      </span>
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

  state.responders.forEach(name => {
    const btn = document.createElement('button');
    btn.className = 'responder-btn';
    btn.textContent = name;
    btn.addEventListener('click', () => selectResponder(name, btn));
    responderListEl.appendChild(btn);
  });
}

function selectStudent(studentData, displayLabel, btnElement) {
  state.selectedStudent = { ...studentData, displayLabel };
  state.selectedResponder = null;

  document.querySelectorAll('.student-card-btn').forEach(b => b.classList.remove('selected'));
  btnElement.classList.add('selected');

  // Activate Panel 2, reset Panel 3
  responderPanelEl.classList.remove('disabled');
  statusPanelEl.classList.add('disabled');
  document.querySelectorAll('.responder-btn').forEach(b => b.classList.remove('selected'));

  resolveBtn.disabled = true;
  resolveBtn.textContent = 'Select a responder';
}

function selectResponder(responderName, btnElement) {
  state.selectedResponder = responderName;

  document.querySelectorAll('.responder-btn').forEach(b => b.classList.remove('selected'));
  btnElement.classList.add('selected');

  // Activate Panel 3
  statusPanelEl.classList.remove('disabled');
  resolveBtn.disabled = false;
  resolveBtn.textContent = `Level 2 for ${state.selectedStudent.displayLabel} resolved`;
}

// Modal handling
resolveBtn.addEventListener('click', () => {
  if (!state.selectedStudent || !state.selectedResponder) return;
  responseNotesInput.value = '';
  notesModal.classList.remove('hidden');
});

modalCancelBtn.addEventListener('click', () => {
  notesModal.classList.add('hidden');
});

modalSubmitBtn.addEventListener('click', async () => {
  const notes = responseNotesInput.value.trim();
  notesModal.classList.add('hidden');

  resolveBtn.disabled = true;
  statusMsgEl.style.color = '#1a73e8';
  statusMsgEl.textContent = 'Submitting resolution...';

  const payload = {
    action: 'resolveLevel2',
    studentColA: state.selectedStudent.colA,
    studentColB: state.selectedStudent.colB,
    teacher: state.selectedStudent.teacher,
    requestTimestamp: state.selectedStudent.requestTimestamp,
    responder: state.selectedResponder,
    notes: notes,
    responseTimestamp: new Date().toLocaleString()
  };

  try {
    await fetch(GOOGLE_APPS_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    statusMsgEl.style.color = '#137333';
    statusMsgEl.textContent = 'Resolved successfully!';

    setTimeout(() => {
      statusMsgEl.textContent = '';
      resetPanels();
      fetchDashboardData();
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

function calculateElapsedTime(timestampStr) {
  if (!timestampStr) return '0m ago';
  const reqTime = new Date(timestampStr).getTime();
  if (isNaN(reqTime)) return timestampStr;

  const now = new Date().getTime();
  const diffMs = Math.max(0, now - reqTime);
  const diffMins = Math.floor(diffMs / (1000 * 60));
  
  if (diffMins < 60) return `${diffMins}m ago`;
  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;
  return `${hours}h ${mins}m ago`;
}

function updateElapsedTimesUI() {
  document.querySelectorAll('.elapsed-time').forEach(el => {
    const rawTs = el.getAttribute('data-timestamp');
    if (rawTs) el.textContent = calculateElapsedTime(rawTs);
  });
}
