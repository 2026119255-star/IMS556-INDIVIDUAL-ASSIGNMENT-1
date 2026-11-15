/**
 * dashboard.js - Summary cards, charts and upcoming deadlines.
 * Re-renders whenever data changes or the theme is switched, so the
 * charts always reflect the latest courses and tasks.
 */
document.addEventListener('DOMContentLoaded', () => {
  if (!EduTrack.requireAuth()) return;

  const welcome = document.getElementById('welcome-name');
  const statCards = document.getElementById('stat-cards');
  const deadlineList = document.getElementById('deadline-list');
  const progressCanvas = document.getElementById('progressChart');
  const statusCanvas = document.getElementById('statusChart');

  const priorityColour = { High: 'danger', Medium: 'warning', Low: 'secondary' };
  const statusOrder = ['Pending', 'In Progress', 'Completed'];
  let charts = [];

  const drawCharts = (courses, tasks) => {
    charts.forEach((chart) => chart.destroy());

    const dark = EduTrack.getTheme() === 'dark';
    const text = dark ? '#cbd5e1' : '#475569';
    const grid = dark ? 'rgba(148, 163, 184, 0.2)' : 'rgba(15, 23, 42, 0.08)';
    Chart.defaults.color = text;

    charts = [
      new Chart(progressCanvas, {
        type: 'bar',
        data: {
          labels: courses.map((c) => c.code),
          datasets: [{
            label: 'Progress (%)',
            data: courses.map((c) => c.progress),
            backgroundColor: '#4f46e5',
            borderRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: { callbacks: { label: (ctx) => ` ${ctx.parsed.y}% complete` } }
          },
          scales: {
            x: { grid: { display: false } },
            y: { beginAtZero: true, max: 100, grid: { color: grid }, ticks: { callback: (v) => `${v}%` } }
          }
        }
      }),
      new Chart(statusCanvas, {
        type: 'doughnut',
        data: {
          labels: statusOrder,
          datasets: [{
            data: statusOrder.map((s) => tasks.filter((t) => t.status === s).length),
            backgroundColor: ['#f59e0b', '#06b6d4', '#10b981'],
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '62%',
          plugins: { legend: { position: 'bottom' } }
        }
      })
    ];
  };

  const render = () => {
    const user = EduTrack.getCurrentUser();
    const courses = EduStore.getCourses();
    const tasks = EduStore.getTasks();

    welcome.textContent = user.fullName.split(' ')[0];

    const openTasks = tasks.filter((t) => t.status !== 'Completed');
    const completedCount = tasks.length - openTasks.length;
    const avgProgress = courses.length
      ? Math.round(courses.reduce((sum, c) => sum + c.progress, 0) / courses.length)
      : 0;

    const stats = [
      { label: 'Enrolled courses', value: courses.length, variant: 'primary' },
      { label: 'Open tasks', value: openTasks.length, variant: 'warning' },
      { label: 'Completed tasks', value: completedCount, variant: 'success' },
      { label: 'Average progress', value: `${avgProgress}%`, variant: 'info' }
    ];

    statCards.innerHTML = stats.map((s) => `
      <div class="col-6 col-lg-3">
        <div class="card stat-card text-bg-${s.variant} h-100 shadow-sm">
          <div class="card-body">
            <p class="stat-label mb-1">${s.label}</p>
            <p class="stat-value mb-0">${s.value}</p>
          </div>
        </div>
      </div>`).join('');

    const upcoming = [...openTasks].sort((a, b) => a.due.localeCompare(b.due)).slice(0, 5);

    deadlineList.innerHTML = upcoming.length
      ? upcoming.map((t) => `
          <li class="list-group-item d-flex justify-content-between align-items-center flex-wrap gap-2">
            <div>
              <strong>${EduTrack.escapeHtml(t.title)}</strong>
              <div class="small text-muted">${EduTrack.escapeHtml(t.course)} &middot; Due ${EduTrack.formatDate(t.due)}</div>
            </div>
            <span class="badge text-bg-${priorityColour[t.priority]}">${t.priority} priority</span>
          </li>`).join('')
      : '<li class="list-group-item">No open tasks. Great work!</li>';

    drawCharts(courses, tasks);
  };

  document.addEventListener('edutrack:data', render);
  document.addEventListener('edutrack:theme', render);
  render();
});
