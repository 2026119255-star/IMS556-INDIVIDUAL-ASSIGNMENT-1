/**
 * tasks.js - Task cards with status filters and full CRUD. Status and course
 * filters come from the top-bar menu (?status= and ?course= links).
 */
document.addEventListener('DOMContentLoaded', () => {
  if (!EduTrack.requireAuth()) return;

  const grid = document.getElementById('task-grid');
  const note = document.getElementById('task-filter-note');
  const filterButtons = document.querySelectorAll('[data-filter]');
  const addButton = document.getElementById('add-task-btn');

  const form = document.getElementById('task-form');
  const modal = new bootstrap.Modal(document.getElementById('task-modal'));
  const modalTitle = document.getElementById('task-modal-title');
  const submitButton = document.getElementById('task-submit');
  const fields = {
    title: document.getElementById('task-title'),
    course: document.getElementById('task-course'),
    due: document.getElementById('task-due'),
    priority: document.getElementById('task-priority'),
    status: document.getElementById('task-status')
  };

  const { escapeHtml, markField, resetValidation, formatDate } = EduTrack;
  const priorityColour = { High: 'danger', Medium: 'warning', Low: 'secondary' };
  const statusColour = { Pending: 'secondary', 'In Progress': 'info', Completed: 'success' };

  const params = new URLSearchParams(window.location.search);
  let currentFilter = params.get('status') || 'all';
  let currentCourse = params.get('course') || '';
  let editingId = null;

  const syncFilterButtons = () => {
    filterButtons.forEach((b) => {
      const isActive = b.dataset.filter === currentFilter;
      b.classList.toggle('active', isActive);
      b.setAttribute('aria-pressed', String(isActive));
    });
  };

  /* ---------- Read and display ---------- */

  const render = () => {
    const list = EduStore.getTasks()
      .filter((t) => (currentFilter === 'all' || t.status === currentFilter) &&
                     (!currentCourse || t.course === currentCourse))
      .sort((a, b) => a.due.localeCompare(b.due));

    note.innerHTML = currentCourse
      ? `Showing tasks for <strong>${escapeHtml(currentCourse)}</strong>. <a href="tasks.html">Show all courses</a>`
      : '';

    grid.innerHTML = list.length
      ? list.map((t) => `
          <div class="col-md-6 col-xl-4">
            <article class="card task-card h-100 shadow-sm">
              <div class="card-body d-flex flex-column">
                <div class="d-flex justify-content-between align-items-start mb-2">
                  <span class="badge text-bg-light border text-dark">${escapeHtml(t.course)}</span>
                  <span class="badge text-bg-${priorityColour[t.priority]}">${escapeHtml(t.priority)}</span>
                </div>
                <h3 class="h6 card-title">${escapeHtml(t.title)}</h3>
                <p class="small text-muted mb-3">Due ${formatDate(t.due)}</p>
                <div class="mt-auto">
                  <span class="badge text-bg-${statusColour[t.status]}">${escapeHtml(t.status)}</span>
                </div>
              </div>
              <div class="card-footer bg-transparent d-flex justify-content-end gap-2">
                <button type="button" class="btn btn-sm btn-outline-primary" data-action="edit"
                        data-id="${t.id}" aria-label="Edit task ${escapeHtml(t.title)}">Edit</button>
                <button type="button" class="btn btn-sm btn-outline-danger" data-action="delete"
                        data-id="${t.id}" aria-label="Delete task ${escapeHtml(t.title)}">Delete</button>
              </div>
            </article>
          </div>`).join('')
      : '<div class="col-12"><p class="text-muted">No tasks in this category.</p></div>';
  };

  /* ---------- Add / edit form ---------- */

  const populateCourses = () => {
    const courses = EduStore.getCourses();
    fields.course.innerHTML = courses.length
      ? courses.map((c) => `<option value="${escapeHtml(c.code)}">${escapeHtml(c.code)} - ${escapeHtml(c.title)}</option>`).join('')
      : '<option value="">Add a course first</option>';
  };

  const openForm = (task = null) => {
    form.reset();
    resetValidation(form);
    populateCourses();
    editingId = task ? task.id : null;

    modalTitle.textContent = task ? 'Edit task' : 'Add task';
    submitButton.textContent = task ? 'Save changes' : 'Add task';

    if (task) {
      fields.title.value = task.title;
      fields.course.value = task.course;
      fields.due.value = task.due;
      fields.priority.value = task.priority;
      fields.status.value = task.status;
    } else {
      fields.due.value = new Date().toISOString().slice(0, 10);
    }

    modal.show();
  };

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const title = fields.title.value.trim();
    const checks = [
      markField(fields.title, title.length >= 3, 'Please enter a title (at least 3 characters).'),
      markField(fields.course, fields.course.value !== '', 'Please choose a course.'),
      markField(fields.due, /^\d{4}-\d{2}-\d{2}$/.test(fields.due.value), 'Please choose a due date.')
    ];

    if (checks.includes(false)) {
      EduTrack.toast('Please correct the highlighted fields.', 'warning');
      return;
    }

    const data = {
      title,
      course: fields.course.value,
      due: fields.due.value,
      priority: fields.priority.value,
      status: fields.status.value
    };

    if (editingId) {
      EduStore.updateTask(editingId, data);
      EduTrack.toast('Task updated.');
    } else {
      EduStore.addTask(data);
      EduTrack.toast('Task added.');
    }
    modal.hide();
  });

  /* ---------- Edit and delete ---------- */

  grid.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-action]');
    if (!button) return;

    const task = EduStore.getTasks().find((t) => t.id === button.dataset.id);
    if (!task) return;

    if (button.dataset.action === 'edit') {
      openForm(task);
    } else if (button.dataset.action === 'delete') {
      const confirmed = await EduTrack.confirmDialog(`Delete the task "${task.title}"? This cannot be undone.`);
      if (confirmed) {
        EduStore.deleteTask(task.id);
        EduTrack.toast('Task deleted.', 'danger');
      }
    }
  });

  filterButtons.forEach((button) => {
    button.addEventListener('click', () => {
      currentFilter = button.dataset.filter;
      syncFilterButtons();
      render();
    });
  });

  addButton.addEventListener('click', () => openForm());
  document.addEventListener('edutrack:data', render);

  syncFilterButtons();
  render();
});
