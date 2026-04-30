/* ================================================
   AudioCPD — Application Logic
   Handles: CRUD, PDF export, filtering, dark mode
   ================================================ */

'use strict';

// ===== STATE =====
let entries = [];
let editingId = null;
let currentView = 'dashboard';

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  loadFromStorage();
  showView('dashboard');
  initFileDropZone();
  setDefaultDate();
  loadTheme();
});

// ===== STORAGE =====
function loadFromStorage() {
  try {
    const raw = localStorage.getItem('audiocpd_entries');
    entries = raw ? JSON.parse(raw) : [];
  } catch (e) {
    entries = [];
  }
}

function saveToStorage() {
  localStorage.setItem('audiocpd_entries', JSON.stringify(entries));
}

// ===== ROUTING =====
function showView(viewName) {
  currentView = viewName;
  document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
  document.querySelectorAll('.nav-btn[data-view]').forEach(b => b.classList.remove('active'));

  document.getElementById('view-' + viewName).classList.remove('hidden');
  const activeBtn = document.querySelector(`.nav-btn[data-view="${viewName}"]`);
  if (activeBtn) activeBtn.classList.add('active');

  if (viewName === 'dashboard') renderDashboard();
  if (viewName === 'records')   renderRecords();
  if (viewName === 'form' && !editingId) resetForm();
}

// ===== SET DEFAULT DATE =====
function setDefaultDate() {
  const dateInput = document.getElementById('f-date');
  if (dateInput && !dateInput.value) {
    dateInput.value = new Date().toISOString().split('T')[0];
  }
}

// ===== FORM HELPERS =====
function getFormData() {
  return {
    id:         editingId || generateId(),
    name:       val('f-name'),
    date:       val('f-date'),
    topic:      val('f-topic'),
    type:       val('f-type'),
    provider:   val('f-provider'),
    duration:   parseFloat(val('f-duration')) || 0,
    link:       val('f-link'),
    tags:       val('f-tags').split(',').map(t => t.trim()).filter(Boolean),
    objectives: val('f-objectives'),
    reflection: val('f-reflection'),
    takeaways:  val('f-takeaways'),
    impact:     val('f-impact'),
    evidence:   document.getElementById('file-preview').textContent || '',
    createdAt:  editingId ? (entries.find(e => e.id === editingId)?.createdAt || Date.now()) : Date.now(),
    updatedAt:  Date.now()
  };
}

function val(id) {
  return (document.getElementById(id)?.value || '').trim();
}

function generateId() {
  return 'cpd_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
}

function populateForm(entry) {
  document.getElementById('f-name').value       = entry.name || '';
  document.getElementById('f-date').value       = entry.date || '';
  document.getElementById('f-topic').value      = entry.topic || '';
  document.getElementById('f-type').value       = entry.type || '';
  document.getElementById('f-provider').value   = entry.provider || '';
  document.getElementById('f-duration').value   = entry.duration || '';
  document.getElementById('f-link').value       = entry.link || '';
  document.getElementById('f-tags').value       = (entry.tags || []).join(', ');
  document.getElementById('f-objectives').value = entry.objectives || '';
  document.getElementById('f-reflection').value = entry.reflection || '';
  document.getElementById('f-takeaways').value  = entry.takeaways || '';
  document.getElementById('f-impact').value     = entry.impact || '';
  if (entry.evidence) {
    document.getElementById('file-preview').textContent = entry.evidence;
  }
}

function resetForm() {
  editingId = null;
  document.getElementById('form-view-title').textContent = 'New CPD Entry';
  ['f-name','f-topic','f-type','f-provider','f-duration','f-link','f-tags',
   'f-objectives','f-reflection','f-takeaways','f-impact'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  document.getElementById('file-preview').textContent = '';
  setDefaultDate();
  clearErrors();
}

function clearErrors() {
  document.querySelectorAll('.field-error').forEach(el => el.textContent = '');
  document.querySelectorAll('.field-input.invalid').forEach(el => el.classList.remove('invalid'));
}

// ===== VALIDATION =====
function validateForm() {
  clearErrors();
  let valid = true;

  const required = [
    { id: 'f-name',       err: 'err-name',       label: 'Name is required' },
    { id: 'f-date',       err: 'err-date',       label: 'Date is required' },
    { id: 'f-topic',      err: 'err-topic',      label: 'Topic / title is required' },
    { id: 'f-type',       err: 'err-type',       label: 'Please select a CPD type' },
    { id: 'f-duration',   err: 'err-duration',   label: 'Duration is required' },
    { id: 'f-objectives', err: 'err-objectives', label: 'Learning objectives are required' },
    { id: 'f-reflection', err: 'err-reflection', label: 'Reflection notes are required' },
    { id: 'f-impact',     err: 'err-impact',     label: 'Impact on practice is required' }
  ];

  required.forEach(({ id, err, label }) => {
    const el = document.getElementById(id);
    if (!el || !el.value.trim()) {
      document.getElementById(err).textContent = label;
      el?.classList.add('invalid');
      valid = false;
    }
  });

  const dur = parseFloat(document.getElementById('f-duration').value);
  if (!isNaN(dur) && dur <= 0) {
    document.getElementById('err-duration').textContent = 'Duration must be greater than 0';
    document.getElementById('f-duration').classList.add('invalid');
    valid = false;
  }

  return valid;
}

// ===== CRUD =====
function saveEntry() {
  if (!validateForm()) {
    showToast('Please fix the errors highlighted in the form', 'error');
    return;
  }

  const data = getFormData();

  if (editingId) {
    const idx = entries.findIndex(e => e.id === editingId);
    if (idx >= 0) entries[idx] = data;
    showToast('Entry updated successfully ✓', 'success');
  } else {
    entries.unshift(data);
    showToast('CPD entry saved successfully ✓', 'success');
  }

  saveToStorage();
  resetForm();
  editingId = null;
  showView('records');
}

function saveAndExport() {
  if (!validateForm()) {
    showToast('Please fix the errors highlighted in the form', 'error');
    return;
  }
  const data = getFormData();

  if (editingId) {
    const idx = entries.findIndex(e => e.id === editingId);
    if (idx >= 0) entries[idx] = data;
  } else {
    entries.unshift(data);
  }

  saveToStorage();
  exportSinglePDF(data);
  resetForm();
  editingId = null;
  showView('records');
}

function editEntry(id) {
  const entry = entries.find(e => e.id === id);
  if (!entry) return;
  editingId = id;
  document.getElementById('form-view-title').textContent = 'Edit CPD Entry';
  populateForm(entry);
  closeModal();
  showView('form');
}

function deleteEntry(id) {
  if (!confirm('Are you sure you want to delete this CPD entry? This action cannot be undone.')) return;
  entries = entries.filter(e => e.id !== id);
  saveToStorage();
  closeModal();
  renderRecords();
  renderDashboard();
  showToast('Entry deleted', 'info');
}

function duplicateEntry(id) {
  const entry = entries.find(e => e.id === id);
  if (!entry) return;
  const dupe = { ...entry, id: generateId(), topic: entry.topic + ' (copy)', createdAt: Date.now(), updatedAt: Date.now() };
  entries.unshift(dupe);
  saveToStorage();
  closeModal();
  renderRecords();
  showToast('Entry duplicated ✓', 'success');
}

// ===== DASHBOARD =====
function renderDashboard() {
  renderStats();
  renderRecentEntries();
  renderTypeBreakdown();
}

function renderStats() {
  const total = entries.length;
  const totalHours = entries.reduce((s, e) => s + (e.duration || 0), 0);
  const thisYear = new Date().getFullYear();
  const yearHours = entries
    .filter(e => e.date && new Date(e.date).getFullYear() === thisYear)
    .reduce((s, e) => s + (e.duration || 0), 0);
  const types = new Set(entries.map(e => e.type).filter(Boolean)).size;

  const statsHtml = [
    { icon: statsIcon('docs'),  value: total,                    label: 'Total Entries',     cls: 'teal' },
    { icon: statsIcon('hours'), value: totalHours.toFixed(1)+'h', label: 'Total CPD Hours',  cls: 'navy' },
    { icon: statsIcon('year'),  value: yearHours.toFixed(1)+'h', label: `Hours This Year`,  cls: 'amber' },
    { icon: statsIcon('types'), value: types,                    label: 'Activity Types',    cls: 'rose' }
  ].map(s => `
    <div class="stat-card">
      <div class="stat-icon ${s.cls}">${s.icon}</div>
      <div class="stat-value">${s.value}</div>
      <div class="stat-label">${s.label}</div>
    </div>
  `).join('');

  document.getElementById('stats-grid').innerHTML = statsHtml;
}

function statsIcon(type) {
  const icons = {
    docs:  `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`,
    hours: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
    year:  `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
    types: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`
  };
  return icons[type] || '';
}

function renderRecentEntries() {
  const el = document.getElementById('recent-entries-list');
  if (!entries.length) {
    el.innerHTML = `<div style="color:var(--text-light);font-size:0.87rem;padding:1rem 0;">No entries yet. <button style="background:none;border:none;color:var(--teal);font-weight:600;cursor:pointer;" onclick="showView('form')">Add your first entry →</button></div>`;
    return;
  }
  el.innerHTML = entries.slice(0, 6).map(e => `
    <div class="recent-item" onclick="openModal('${e.id}')">
      <span class="recent-badge">${escHtml(e.type || 'CPD')}</span>
      <div class="recent-info">
        <div class="recent-title">${escHtml(e.topic)}</div>
        <div class="recent-meta">${formatDate(e.date)} · ${escHtml(e.provider || 'No provider')}</div>
      </div>
      <div class="recent-hrs">${e.duration}h</div>
    </div>
  `).join('');
}

function renderTypeBreakdown() {
  const el = document.getElementById('type-breakdown');
  if (!entries.length) { el.innerHTML = ''; return; }

  const counts = {};
  entries.forEach(e => { if (e.type) counts[e.type] = (counts[e.type] || 0) + 1; });
  const max = Math.max(...Object.values(counts), 1);

  el.innerHTML = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([type, count]) => `
      <div class="type-bar-row">
        <span class="type-name">${escHtml(type)}</span>
        <div class="type-bar-wrap">
          <div class="type-bar" style="width: ${(count / max) * 100}%"></div>
        </div>
        <span class="type-count">${count}</span>
      </div>
    `).join('');
}

// ===== RECORDS =====
function renderRecords(filtered) {
  const list = filtered !== undefined ? filtered : entries;
  const container = document.getElementById('records-list');
  const empty = document.getElementById('records-empty');

  if (!list.length) {
    container.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }

  empty.classList.add('hidden');
  container.innerHTML = list.map(entry => buildRecordCard(entry)).join('');
}

function buildRecordCard(entry) {
  const tagsHtml = (entry.tags || []).slice(0, 3).map(t =>
    `<span class="tag tag-custom">${escHtml(t)}</span>`
  ).join('');

  return `
    <div class="record-card" id="card-${entry.id}">
      <div class="record-card-top">
        <div class="record-card-tags">
          <span class="tag tag-type">${escHtml(entry.type || 'CPD')}</span>
          ${tagsHtml}
        </div>
        <div class="record-card-title">${escHtml(entry.topic)}</div>
        <div class="record-card-meta">
          <div class="record-card-meta-row">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            ${escHtml(entry.name)}
          </div>
          <div class="record-card-meta-row">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            ${formatDate(entry.date)}
          </div>
          ${entry.provider ? `<div class="record-card-meta-row">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            ${escHtml(entry.provider)}
          </div>` : ''}
        </div>
        ${entry.reflection ? `<div class="record-card-preview">${escHtml(entry.reflection)}</div>` : ''}
      </div>
      <div class="record-card-bottom">
        <div>
          <div class="record-hrs">${entry.duration}h</div>
          <div class="record-hrs-label">CPD Hours</div>
        </div>
        <div class="record-card-actions">
          <button class="icon-btn" onclick="openModal('${entry.id}')" title="View">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          </button>
          <button class="icon-btn" onclick="editEntry('${entry.id}')" title="Edit">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="icon-btn" onclick="duplicateEntry('${entry.id}')" title="Duplicate">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          </button>
          <button class="icon-btn" onclick="exportSinglePDF(entries.find(e=>e.id==='${entry.id}'))" title="Export PDF">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          </button>
          <button class="icon-btn del" onclick="deleteEntry('${entry.id}')" title="Delete">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
          </button>
        </div>
      </div>
    </div>
  `;
}

// ===== FILTER / SEARCH =====
function filterRecords() {
  const q     = document.getElementById('search-input').value.toLowerCase();
  const type  = document.getElementById('filter-type').value;

  const filtered = entries.filter(e => {
    const matchSearch = !q || [e.topic, e.name, e.provider, e.type, e.reflection, e.objectives, (e.tags || []).join(' ')].some(f => f && f.toLowerCase().includes(q));
    const matchType = !type || e.type === type;
    return matchSearch && matchType;
  });

  renderRecords(filtered);
}

// ===== MODAL =====
function openModal(id) {
  const entry = entries.find(e => e.id === id);
  if (!entry) return;

  const tagsHtml = (entry.tags || []).map(t => `<span class="tag tag-custom">${escHtml(t)}</span>`).join('');

  document.getElementById('modal-content').innerHTML = `
    <div class="modal-hero">
      <span class="modal-badge">${escHtml(entry.type || 'CPD')}</span>
      <div class="modal-title">${escHtml(entry.topic)}</div>
      <div class="modal-meta">
        <span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          ${escHtml(entry.name)}
        </span>
        <span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          ${formatDate(entry.date)}
        </span>
        <span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          ${entry.duration} hours
        </span>
        ${entry.provider ? `<span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>${escHtml(entry.provider)}</span>` : ''}
      </div>
      ${tagsHtml ? `<div class="modal-tags" style="margin-top:0.75rem;">${tagsHtml}</div>` : ''}
    </div>

    ${entry.link ? `<div class="modal-section">
      <div class="modal-section-label">CPD Link</div>
      <a href="${escHtml(entry.link)}" target="_blank" rel="noopener" class="modal-link">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
        ${escHtml(entry.link)}
      </a>
    </div>` : ''}

    ${buildModalSection('Learning Objectives', entry.objectives)}
    ${buildModalSection('Notes / Reflection', entry.reflection)}
    ${buildModalSection('Key Takeaways', entry.takeaways)}
    ${buildModalSection('Impact on Practice', entry.impact)}
    ${entry.evidence ? `<div class="modal-section">
      <div class="modal-section-label">Evidence</div>
      <div class="modal-section-text" style="color:var(--teal);">📎 ${escHtml(entry.evidence)}</div>
    </div>` : ''}
  `;

  document.getElementById('modal-actions').innerHTML = `
    <button class="btn btn-ghost btn-sm" onclick="duplicateEntry('${entry.id}')">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
      Duplicate
    </button>
    <button class="btn btn-danger btn-sm" onclick="deleteEntry('${entry.id}')">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
      Delete
    </button>
    <button class="btn btn-secondary btn-sm" onclick="exportSinglePDF(entries.find(e=>e.id==='${entry.id}'))">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
      Export PDF
    </button>
    <button class="btn btn-primary btn-sm" onclick="editEntry('${entry.id}')">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
      Edit
    </button>
  `;

  document.getElementById('modal-overlay').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function buildModalSection(label, content) {
  if (!content || !content.trim()) return '';
  return `
    <div class="modal-section">
      <div class="modal-section-label">${label}</div>
      <div class="modal-section-text">${escHtml(content)}</div>
    </div>
  `;
}

function closeModal(event) {
  if (event && event.target !== document.getElementById('modal-overlay')) return;
  document.getElementById('modal-overlay').classList.add('hidden');
  document.body.style.overflow = '';
}

// ===== PDF EXPORT =====

/** Export a single entry as A4 PDF */
function exportSinglePDF(entry) {
  if (!entry) return;
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const MARGIN  = 20;
  const WIDTH   = 210 - MARGIN * 2;
  const NAVY    = [15, 31, 61];
  const TEAL    = [13, 140, 122];
  const GRAY    = [74, 88, 120];
  const LIGHT   = [130, 144, 168];

  let y = 0;

  // ---- Header band ----
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, 210, 42, 'F');

  doc.setFillColor(...TEAL);
  doc.rect(0, 0, 6, 42, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.text('Audiology CPD Record', MARGIN + 4, 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(180, 200, 220);
  doc.text('Continuing Professional Development Portfolio', MARGIN + 4, 26);

  doc.setFontSize(8);
  doc.text(`Generated: ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}`, MARGIN + 4, 34);

  y = 54;

  // ---- Summary row ----
  const summaryItems = [
    { label: 'Audiologist', value: entry.name },
    { label: 'Date',        value: formatDate(entry.date) },
    { label: 'Type',        value: entry.type },
    { label: 'Duration',    value: entry.duration + ' hours' }
  ];

  const colW = WIDTH / summaryItems.length;
  summaryItems.forEach((item, i) => {
    const x = MARGIN + i * colW;
    doc.setFillColor(240, 245, 252);
    doc.roundedRect(x, y - 4, colW - 2, 18, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...TEAL);
    doc.text(item.label.toUpperCase(), x + 4, y + 3);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...NAVY);
    doc.text(item.value || '—', x + 4, y + 10, { maxWidth: colW - 8 });
  });

  y += 26;

  // ---- Topic ----
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...NAVY);
  const topicLines = doc.splitTextToSize(entry.topic, WIDTH);
  doc.text(topicLines, MARGIN, y);
  y += topicLines.length * 7 + 4;

  if (entry.provider) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(10);
    doc.setTextColor(...GRAY);
    doc.text(`Provider: ${entry.provider}`, MARGIN, y);
    y += 7;
  }

  if (entry.link) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...TEAL);
    doc.text(`🔗 ${entry.link}`, MARGIN, y, { maxWidth: WIDTH });
    y += 7;
  }

  if (entry.tags && entry.tags.length) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...LIGHT);
    doc.text('Tags: ' + entry.tags.join(', '), MARGIN, y);
    y += 7;
  }

  y += 3;

  // ---- Divider ----
  doc.setDrawColor(...TEAL);
  doc.setLineWidth(0.5);
  doc.line(MARGIN, y, MARGIN + WIDTH, y);
  y += 8;

  // ---- Content sections ----
  const sections = [
    { label: 'Learning Objectives',  content: entry.objectives },
    { label: 'Notes / Reflection',    content: entry.reflection },
    { label: 'Key Takeaways',         content: entry.takeaways },
    { label: 'Impact on Practice',    content: entry.impact }
  ];

  sections.forEach(sec => {
    if (!sec.content || !sec.content.trim()) return;
    if (y > 260) { doc.addPage(); y = 20; }

    // Section label pill
    doc.setFillColor(...TEAL);
    doc.roundedRect(MARGIN, y - 4, WIDTH, 8, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text(sec.label.toUpperCase(), MARGIN + 4, y + 1);
    y += 11;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(30, 40, 60);
    const lines = doc.splitTextToSize(sec.content, WIDTH);

    lines.forEach(line => {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.text(line, MARGIN, y);
      y += 5.5;
    });

    y += 5;
  });

  // ---- Evidence ----
  if (entry.evidence) {
    if (y > 265) { doc.addPage(); y = 20; }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...TEAL);
    doc.text('EVIDENCE', MARGIN, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...GRAY);
    doc.text(`📎 ${entry.evidence}`, MARGIN, y);
    y += 8;
  }

  // ---- Footer ----
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFillColor(240, 245, 252);
    doc.rect(0, 287, 210, 10, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...LIGHT);
    doc.text('AudioCPD — Audiology Continuing Professional Development Record', MARGIN, 293);
    doc.text(`Page ${i} of ${pageCount}`, 190, 293, { align: 'right' });
  }

  const safeName = (entry.topic || 'cpd-record').replace(/[^a-z0-9]/gi, '-').toLowerCase().slice(0, 40);
  doc.save(`${safeName}-${entry.date || 'record'}.pdf`);
  showToast('PDF exported successfully ✓', 'success');
}

/** Export ALL entries as a portfolio PDF */
function exportAllPDF() {
  if (!entries.length) {
    showToast('No entries to export', 'error');
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const MARGIN = 20;
  const WIDTH  = 210 - MARGIN * 2;
  const NAVY   = [15, 31, 61];
  const TEAL   = [13, 140, 122];
  const GRAY   = [74, 88, 120];
  const LIGHT  = [130, 144, 168];

  // ===== COVER PAGE =====
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, 210, 297, 'F');

  // Decorative circles
  doc.setFillColor(13, 100, 90);
  doc.circle(175, 60, 55, 'F');
  doc.setFillColor(10, 70, 65);
  doc.circle(30, 250, 40, 'F');

  doc.setFillColor(...TEAL);
  doc.rect(0, 0, 8, 297, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(36);
  doc.setTextColor(255, 255, 255);
  doc.text('Audiology', MARGIN + 4, 120);
  doc.text('CPD Portfolio', MARGIN + 4, 138);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.setTextColor(130, 180, 175);
  doc.text('Continuing Professional Development Record', MARGIN + 4, 154);

  const totalHours = entries.reduce((s, e) => s + (e.duration || 0), 0);
  const yearNow = new Date().getFullYear();

  doc.setFontSize(10);
  doc.setTextColor(180, 210, 210);
  doc.text(`${entries.length} entries  ·  ${totalHours} total CPD hours  ·  Generated ${yearNow}`, MARGIN + 4, 168);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 150, 150);
  doc.text(`Exported: ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}`, MARGIN + 4, 280);

  // ===== SUMMARY TABLE PAGE =====
  doc.addPage();
  let y = 20;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...NAVY);
  doc.text('CPD Summary', MARGIN, y); y += 12;

  // Stats row
  const stats = [
    ['Total Entries', entries.length],
    ['Total Hours', totalHours + 'h'],
    ['Types Used', new Set(entries.map(e => e.type).filter(Boolean)).size],
    ['This Year', entries.filter(e => e.date && new Date(e.date).getFullYear() === yearNow).reduce((s, e) => s + (e.duration || 0), 0) + 'h']
  ];

  const sw = WIDTH / stats.length;
  stats.forEach(([label, value], i) => {
    const x = MARGIN + i * sw;
    doc.setFillColor(...TEAL);
    doc.roundedRect(x, y, sw - 3, 20, 3, 3, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    doc.text(String(value), x + (sw - 3) / 2, y + 11, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text(label.toUpperCase(), x + (sw - 3) / 2, y + 17, { align: 'center' });
  });

  y += 28;

  // Table header
  doc.autoTable({
    startY: y,
    head: [['Date', 'Topic', 'Type', 'Provider', 'Hours']],
    body: entries.map(e => [
      formatDate(e.date),
      (e.topic || '').slice(0, 50),
      e.type || '',
      (e.provider || '').slice(0, 30),
      e.duration + 'h'
    ]),
    headStyles: {
      fillColor: NAVY,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8
    },
    bodyStyles: { fontSize: 8, textColor: [30, 40, 60] },
    alternateRowStyles: { fillColor: [245, 248, 255] },
    columnStyles: {
      0: { cellWidth: 24 },
      1: { cellWidth: 65 },
      2: { cellWidth: 25 },
      3: { cellWidth: 40 },
      4: { cellWidth: 16, halign: 'right' }
    },
    margin: { left: MARGIN, right: MARGIN },
    tableWidth: WIDTH
  });

  // ===== INDIVIDUAL ENTRIES =====
  entries.forEach((entry, idx) => {
    doc.addPage();
    let ey = 20;

    // Mini header
    doc.setFillColor(...NAVY);
    doc.rect(0, 0, 210, 30, 'F');
    doc.setFillColor(...TEAL);
    doc.rect(0, 0, 5, 30, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text(`CPD Entry ${idx + 1} of ${entries.length}`, MARGIN + 3, 12);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(130, 170, 180);
    doc.text(`${entry.type || ''} · ${formatDate(entry.date)} · ${entry.duration}h`, MARGIN + 3, 22);

    ey = 40;

    // Topic
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...NAVY);
    const topicLines = doc.splitTextToSize(entry.topic || '', WIDTH);
    doc.text(topicLines, MARGIN, ey);
    ey += topicLines.length * 6 + 3;

    if (entry.name || entry.provider) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...GRAY);
      doc.text([entry.name, entry.provider].filter(Boolean).join(' · '), MARGIN, ey);
      ey += 8;
    }

    doc.setDrawColor(...TEAL);
    doc.setLineWidth(0.4);
    doc.line(MARGIN, ey, MARGIN + WIDTH, ey);
    ey += 7;

    const secs = [
      ['LEARNING OBJECTIVES', entry.objectives],
      ['NOTES / REFLECTION',  entry.reflection],
      ['KEY TAKEAWAYS',        entry.takeaways],
      ['IMPACT ON PRACTICE',   entry.impact]
    ];

    secs.forEach(([label, content]) => {
      if (!content || !content.trim()) return;
      if (ey > 260) { doc.addPage(); ey = 20; }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(...TEAL);
      doc.text(label, MARGIN, ey); ey += 5;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(30, 40, 60);
      const lines = doc.splitTextToSize(content, WIDTH);
      lines.forEach(line => {
        if (ey > 272) { doc.addPage(); ey = 20; }
        doc.text(line, MARGIN, ey);
        ey += 5;
      });
      ey += 4;
    });
  });

  // ===== FOOTER ALL PAGES =====
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    if (i === 1) continue; // skip cover
    doc.setFillColor(240, 245, 252);
    doc.rect(0, 287, 210, 10, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...LIGHT);
    doc.text('AudioCPD — Audiology Continuing Professional Development Portfolio', MARGIN, 293);
    doc.text(`Page ${i} of ${total}`, 190, 293, { align: 'right' });
  }

  doc.save(`audiology-cpd-portfolio-${yearNow}.pdf`);
  showToast(`Exported ${entries.length} entries as PDF ✓`, 'success');
}

// ===== FILE DROP ZONE =====
function initFileDropZone() {
  const zone  = document.getElementById('file-drop-zone');
  const input = document.getElementById('f-evidence');
  const preview = document.getElementById('file-preview');

  if (!zone || !input) return;

  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
  zone.addEventListener('drop', e => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) setFilePreview(file, preview);
  });

  input.addEventListener('change', () => {
    if (input.files[0]) setFilePreview(input.files[0], preview);
  });
}

function setFilePreview(file, previewEl) {
  previewEl.textContent = `📎 ${file.name} (${formatBytes(file.size)})`;
}

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1024 / 1024).toFixed(1) + ' MB';
}

// ===== THEME =====
function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('audiocpd_theme', next);
}

function loadTheme() {
  const saved = localStorage.getItem('audiocpd_theme');
  if (saved) document.documentElement.setAttribute('data-theme', saved);
}

// ===== TOAST =====
function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast ${type} show`;
  setTimeout(() => toast.classList.remove('show'), 3200);
}

// ===== UTILS =====
function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
  } catch { return dateStr; }
}

// Expose entries globally so inline onclick handlers can access them
window.entries = entries;
// Re-expose after each mutation to keep reference fresh
const originalSaveToStorage = saveToStorage;
window.saveToStorage = function() {
  originalSaveToStorage();
  window.entries = entries;
};
