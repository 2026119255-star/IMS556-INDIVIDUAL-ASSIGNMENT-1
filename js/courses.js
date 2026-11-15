/**
 * courses.js - Course list with a course picker, status views, search and
 * full add / edit / delete. Choosing a course shows its details and tasks.
 */
document.addEventListener('DOMContentLoaded', () => {
  if (!EduTrack.requireAuth()) return;

  const rows = document.getElementById('course-rows');
  const search = document.getElementById('course-search');
  const pills = document.querySelectorAll('.course-pill');
  const counter = document.getElementById('course-count');
  const addButton = document.getElementById('add-course-btn');

  const detail = {
    panel: document.getElementById('course-detail'),
    code: document.getElementById('detail-code'),
    title: document.getElementById('detail-title'),
    meta: document.getElementById('detail-meta'),
    status: document.getElementById('detail-status'),
    progress: document.getElementById('detail-progress'),
    bar: document.getElementById('detail-bar'),
    tasks: document.getElementById('detail-tasks')
  };

  const form = document.getElementById('course-form');
  const modal = new bootstrap.Modal(document.getElementById('course-modal'));
  const modalTitle = document.getElementById('course-modal-title');
  const submitButton = document.getElementById('course-submit');
  const fields = {
    code: document.getElementById('course-code'),
    title: document.getElementById('course-title'),
    lecturer: document.getElementById('course-lecturer'),
    credits: document.getElementById('course-credits'),
    progress: document.getElementById('course-progress'),
    status: document.getElementById('course-status-input'),
    tags: document.getElementById('course-tags')
  };

  const { escapeHtml, formatDate, markField, resetValidation } = EduTrack;
  const statusColour = { Completed: 'success', 'In Progress': 'info', 'Not Started': 'secondary' };
  const priorityColour = { High: 'danger', Medium: 'warning', Low: 'secondary' };
  const taskStatusColour = { Pending: 'secondary', 'In Progress': 'info', Completed: 'success' };

  let editingId = null;
  let currentStatus = 'all';
  let selectedCode = '';

  // Honour ?status=... and ?course=... links
  const params = new URLSearchParams(window.location.search);
  const requestedStatus = params.get('status');
  if (requestedStatus && [...pills].some((p) => p.dataset.status === requestedStatus)) {
    currentStatus = requestedStatus;
  }
  if (params.get('course')) selectedCode = params.get('course');

  /* ---------- Navigation bar state ---------- */

  const updatePills = (courses) => {
    pills.forEach((pill) => {
      const status = pill.dataset.status;
      const count = status === 'all' ? courses.length : courses.filter((c) => c.status === status).length;
      const active = status === currentStatus;
      pill.querySelector('.count').textContent = count;
      pill.classList.toggle('active', active);
      pill.setAttribute('aria-pressed', String(active));
    });
  };

  /* ---------- Details for the chosen course ---------- */

  const renderDetail = (courses) => {
    const course = courses.find((c) => c.code === selectedCode);
    detail.panel.classList.toggle('d-none', !course);
    if (!course) return;

    detail.code.textContent = course.code;
    detail.title.textContent = course.title;
    detail.meta.textContent = `${course.lecturer} \u00b7 ${course.credits} credits`;
    detail.status.className = `badge text-bg-${statusColour[course.status]}`;
    detail.status.textContent = course.status;
    detail.progress.setAttribute('aria-valuenow', String(course.progress));
    detail.progress.setAttribute('aria-label', `${course.code} progress`);
    detail.bar.style.width = `${course.progress}%`;
    detail.bar.textContent = `${course.progress}%`;

    const tasks = EduStore.getTasks()
      .filter((t) => t.course === course.code)
      .sort((a, b) => a.due.localeCompare(b.due));

    detail.tasks.innerHTML = tasks.length
      ? tasks.map((t) => `
          <li class="list-group-item d-flex justify-content-between align-items-center flex-wrap gap-2">
            <div>
              <span class="fw-semibold">${escapeHtml(t.title)}</span>
              <div class="small text-body-secondary">Due ${formatDate(t.due)}</div>
            </div>
            <span>
              <span class="badge text-bg-${priorityColour[t.priority]} me-1">${escapeHtml(t.priority)}</span>
              <span class="badge text-bg-${taskStatusColour[t.status]}">${escapeHtml(t.status)}</span>
            </span>
          </li>`).join('')
      : '<li class="list-group-item text-body-secondary">No tasks for this course yet.</li>';
  };

  /* ---------- Read and display ---------- */

  const render = () => {
    const term = search.value.trim().toLowerCase();
    const courses = EduStore.getCourses();

    if (selectedCode && !courses.some((c) => c.code === selectedCode)) selectedCode = '';

    const visible = courses.filter((c) =>
      (currentStatus === 'all' || c.status === currentStatus) &&
      (!selectedCode || c.code === selectedCode) &&
      `${c.code} ${c.title} ${c.tags.join(' ')}`.toLowerCase().includes(term)
    );

    counter.textContent = `Showing ${visible.length} of ${courses.length} courses`;
    updatePills(courses);
    renderDetail(courses);

    rows.innerHTML = visible.length
      ? visible.map((c) => `
          <tr>
            <td class="fw-semibold">${escapeHtml(c.code)}</td>
            <td>${escapeHtml(c.title)}</td>
            <td class="d-none d-md-table-cell">${escapeHtml(c.lecturer)}</td>
            <td class="text-center d-none d-sm-table-cell">${c.credits}</td>
            <td style="min-width: 140px;">
              <div class="progress" role="progressbar" aria-label="${escapeHtml(c.code)} progress"
                   aria-valuenow="${c.progress}" aria-valuemin="0" aria-valuemax="100">
                <div class="progress-bar" style="width: ${c.progress}%">${c.progress}%</div>
              </div>
            </td>
            <td><span class="badge text-bg-${statusColour[c.status]}">${escapeHtml(c.status)}</span></td>
            <td class="text-end text-nowrap">
              <button type="button" class="btn btn-sm btn-outline-primary me-1" data-action="edit"
                      data-id="${c.id}" aria-label="Edit ${escapeHtml(c.code)}">Edit</button>
              <button type="button" class="btn btn-sm btn-outline-danger" data-action="delete"
                      data-id="${c.id}" aria-label="Delete ${escapeHtml(c.code)}">Delete</button>
            </td>
          </tr>`).join('')
      : '<tr><td colspan="7" class="text-center text-body-secondary py-4">No courses match your filters.</td></tr>';
  };

  /* ---------- Add / edit form ---------- */

  const openForm = (course = null) => {
    form.reset();
    resetValidation(form);
    editingId = course ? course.id : null;

    modalTitle.textContent = course ? 'Edit course' : 'Add course';
    submitButton.textContent = course ? 'Save changes' : 'Add course';

    if (course) {
      fields.code.value = course.code;
      fields.title.value = course.title;
      fields.lecturer.value = course.lecturer;
      fields.credits.value = course.credits;
      fields.progress.value = course.progress;
      fields.status.value = course.status;
      fields.tags.value = course.tags.join(', ');
    } else {
      fields.credits.value = 3;
      fields.progress.value = 0;
      fields.status.value = 'Not Started';
    }

    modal.show();
  };

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const courses = EduStore.getCourses();
    const code = fields.code.value.trim().toUpperCase();
    const title = fields.title.value.trim();
    const lecturer = fields.lecturer.value.trim();
    const credits = Number(fields.credits.value);
    const progress = Number(fields.progress.value);
    const duplicate = courses.some((c) => c.code === code && c.id !== editingId);

    const checks = [
      markField(fields.code, !duplicate && /^[A-Z0-9-]{2,12}$/.test(code),
        duplicate ? 'That course code already exists.' : 'Use 2 to 12 letters, numbers or hyphens.'),
      markField(fields.title, title.length >= 3, 'Please enter a title (at least 3 characters).'),
      markField(fields.lecturer, lecturer.length >= 2, "Please enter the lecturer's name."),
      markField(fields.credits, Number.isInteger(credits) && credits >= 1 && credits <= 6,
        'Credits must be a whole number from 1 to 6.'),
      markField(fields.progress, Number.isInteger(progress) && progress >= 0 && progress <= 100,
        'Progress must be a whole number between 0 and 100.')
    ];

    if (checks.includes(false)) {
      EduTrack.toast('Please correct the highlighted fields.', 'warning');
      return;
    }

    const data = {
      code, title, lecturer, credits, progress,
      status: fields.status.value,
      tags: fields.tags.value.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean)
    };

    if (editingId) {
      EduStore.updateCourse(editingId, data);
      EduTrack.toast(`${code} updated.`);
    } else {
      EduStore.addCourse(data);
      EduTrack.toast(`${code} added.`);
    }
    modal.hide();
  });

  /* ---------- Edit and delete ---------- */

  rows.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-action]');
    if (!button) return;

    const course = EduStore.getCourses().find((c) => c.id === button.dataset.id);
    if (!course) return;

    if (button.dataset.action === 'edit') {
      openForm(course);
    } else if (button.dataset.action === 'delete') {
      const confirmed = await EduTrack.confirmDialog(
        `Delete ${course.code} (${course.title})? This cannot be undone.`
      );
      if (confirmed) {
        if (selectedCode === course.code) selectedCode = '';
        EduStore.deleteCourse(course.id);
        EduTrack.toast(`${course.code} deleted.`, 'danger');
      }
    }
  });

  pills.forEach((pill) => {
    pill.addEventListener('click', () => {
      currentStatus = pill.dataset.status;
      render();
    });
  });

  addButton.addEventListener('click', () => openForm());
  search.addEventListener('input', render);
  document.addEventListener('edutrack:data', render);

  render();
});
