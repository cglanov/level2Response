// Set your Google Apps Script Web App URL after deploying[cite: 1]
const GOOGLE_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxRFx2qbJQsx6SotmwAKxuC1zjXxpSmqbE2yJJnmLySzLQdGyxAhKuK5SVs5NwHzMi5/exec';[cite: 1]

let state = {
  activeStudents: [],
  responders: [],
  selectedStudent: null,
  selectedResponder: null
};[cite: 1]

// DOM Elements[cite: 1]
const studentListEl = document.getElementById('student-list');[cite: 1]
const responderListEl = document.getElementById('responder-list');[cite: 1]
const responderPanelEl = document.getElementById('panel-responders');[cite: 1]
const statusPanelEl = document.getElementById('panel-status');[cite: 1]
const resolveBtn = document.getElementById('resolve-btn');[cite: 1]
const statusMsgEl = document.getElementById('status-message');[cite: 1]
const notesModal = document.getElementById('notes-modal');[cite: 1]
const responseNotesInput = document.getElementById('response-notes');[cite: 1]
const modalCancelBtn = document.getElementById('modal-cancel-btn');[cite: 1]
const modalSubmitBtn = document.getElementById('modal-submit-btn');[cite: 1]

document.addEventListener('DOMContentLoaded', () => {
  fetchDashboardData();[cite: 1]
  // Timer to update elapsed times every 30 seconds[cite: 1]
  setInterval(updateElapsedTimesUI, 30000);[cite: 1]
});

async function fetchDashboardData() {
  studentListEl.innerHTML = '<p class="status-msg">Loading active alerts...</p>';[cite: 1]
  try {
    const response = await fetch(`${GOOGLE_APPS_SCRIPT_URL}?action=getDashboardData`);[cite: 1]
    const result = await response.json();[cite: 1]
    if (result.status === 'success') {
      state.activeStudents = result.students || [];[cite: 1]
      state.responders = result.responders || [];[cite: 1]
      renderStudentList();[cite: 1]
      renderResponderList();[cite: 1]
    } else {
      throw new Error(result.message || 'Error fetching data');[cite: 1]
    }
  } catch (err) {
    console.error('Fetch error:', err);[cite: 1]
    studentListEl.innerHTML = `<p class="status-msg" style="color: red;">Failed to load data. Please check Web App URL.</p>`;[cite: 1]
  }
}

function renderStudentList() {
  studentListEl.innerHTML = '';[cite: 1]
  if (state.activeStudents.length === 0) {
    studentListEl.innerHTML = '<p class="status-msg">No active Level 2 requests.</p>';[cite: 1]
    return;[cite: 1]
  }

  state.activeStudents.forEach((student) => {
    // Label: Col A + space + Col B first char[cite: 1]
    const colA = String(student.colA || '').trim();[cite: 1]
    const colB = String(student.colB || '').trim();[cite: 1]
    const firstCharB = colB.length > 0 ? colB.charAt(0).toUpperCase() : '';[cite: 1]
    const displayLabel = `${colA} ${firstCharB}`.trim();[cite: 1]
    const locationText = student.location || 'Location unspecified';[cite: 1]

    const btn = document.createElement('button');[cite: 1]
    btn.className = 'student-card-btn';[cite: 1]
    btn.innerHTML = `
      <div class="student-name">${displayLabel}</div>
      <div class="student-location">${locationText}</div>
    `;
    btn.addEventListener('click', () => selectStudent(student, displayLabel, btn));
    studentListEl.appendChild(btn);
  });
}

function renderResponderList() {
  responderListEl.innerHTML = '';[cite: 1]
  if (state.responders.length === 0) {
    responderListEl.innerHTML = '<p class="placeholder-text">No responders found.</p>';[cite: 1]
    return;[cite: 1]
  }

  state.responders.forEach(name => {
    const btn = document.createElement('button');[cite: 1]
    btn.className = 'responder-btn';[cite: 1]
    btn.textContent = name;[cite: 1]
    btn.addEventListener('click', () => selectResponder(name, btn));[cite: 1]
    responderListEl.appendChild(btn);[cite: 1]
  });
}

function selectStudent(studentData, displayLabel, btnElement) {
  state.selectedStudent = { ...studentData, displayLabel };[cite: 1]
  state.selectedResponder = null;[cite: 1]

  document.querySelectorAll('.student-card-btn').forEach(b => b.classList.remove('selected'));[cite: 1]
  btnElement.classList.add('selected');[cite: 1]

  // Activate Panel 2, reset Panel 3[cite: 1]
  responderPanelEl.classList.remove('disabled');[cite: 1]
  statusPanelEl.classList.add('disabled');[cite: 1]
  document.querySelectorAll('.responder-btn').forEach(b => b.classList.remove('selected'));[cite: 1]
  resolveBtn.disabled = true;[cite: 1]
  resolveBtn.textContent = 'Select a responder';[cite: 1]
}

function selectResponder(responderName, btnElement) {
  state.selectedResponder = responderName;[cite: 1]

  document.querySelectorAll('.responder-btn').forEach(b => b.classList.remove('selected'));[cite: 1]
  btnElement.classList.add('selected');[cite: 1]

  // Activate Panel 3[cite: 1]
  statusPanelEl.classList.remove('disabled');[cite: 1]
  resolveBtn.disabled = false;[cite: 1]
  resolveBtn.textContent = `Level 2 for ${state.selectedStudent.displayLabel} resolved`;[cite: 1]
}

// Modal handling[cite: 1]
resolveBtn.addEventListener('click', () => {
  if (!state.selectedStudent || !state.selectedResponder) return;[cite: 1]
  if (responseNotesInput) responseNotesInput.value = '';[cite: 1]
  notesModal.classList.remove('hidden');[cite: 1]
});

modalCancelBtn.addEventListener('click', () => {
  notesModal.classList.add('hidden');[cite: 1]
});

modalSubmitBtn.addEventListener('click', async () => {
  // Capture notes input cleanly directly from the input element[cite: 1]
  const notesText = responseNotesInput ? responseNotesInput.value.trim() : '';[cite: 1]

  notesModal.classList.add('hidden');[cite: 1]
  resolveBtn.disabled = true;[cite: 1]
  statusMsgEl.style.color = '#1a73e8';[cite: 1]
  statusMsgEl.textContent = 'Submitting resolution...';[cite: 1]

  // Defensive check for student name fields[cite: 1]
  const colA = state.selectedStudent ? (state.selectedStudent.colA || '') : '';[cite: 1]
  const colB = state.selectedStudent ? (state.selectedStudent.colB || '') : '';[cite: 1]

  const payload = {
    action: 'resolveLevel2',[cite: 1]
    studentColA: colA,[cite: 1]
    studentColB: colB,[cite: 1]
    teacher: state.selectedStudent ? state.selectedStudent.teacher : '',[cite: 1]
    requestTimestamp: state.selectedStudent ? state.selectedStudent.requestTimestamp : '',[cite: 1]
    responder: state.selectedResponder,[cite: 1]
    notes: notesText,[cite: 1]
    responseTimestamp: new Date().toLocaleString()[cite: 1]
  };

  try {
    // Use text/plain for no-cors to prevent browser header stripping[cite: 1]
    await fetch(GOOGLE_APPS_SCRIPT_URL, {
      method: 'POST',[cite: 1]
      mode: 'no-cors',[cite: 1]
      headers: { 'Content-Type': 'text/plain' },[cite: 1]
      body: JSON.stringify(payload)[cite: 1]
    });

    statusMsgEl.style.color = '#137333';[cite: 1]
    statusMsgEl.textContent = 'Resolved successfully!';[cite: 1]
    setTimeout(() => {
      statusMsgEl.textContent = '';[cite: 1]
      resetPanels();[cite: 1]
      fetchDashboardData();[cite: 1]
    }, 2000);[cite: 1]
  } catch (err) {
    console.error('Submit error:', err);[cite: 1]
    statusMsgEl.style.color = '#d93025';[cite: 1]
    statusMsgEl.textContent = 'Failed to submit. Check connection.';[cite: 1]
    resolveBtn.disabled = false;[cite: 1]
  }
});

function resetPanels() {
  state.selectedStudent = null;[cite: 1]
  state.selectedResponder = null;[cite: 1]
  responderPanelEl.classList.add('disabled');[cite: 1]
  statusPanelEl.classList.add('disabled');[cite: 1]
  resolveBtn.disabled = true;[cite: 1]
  resolveBtn.textContent = 'Select student & responder';[cite: 1]
}

function updateElapsedTimesUI() {
  fetchDashboardData();
}
