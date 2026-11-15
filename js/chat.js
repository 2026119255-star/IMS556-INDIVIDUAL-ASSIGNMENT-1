/**
 * chat.js - Study assistant chat with course channels.
 *
 * Features: channels (General plus one per course), persistent history,
 * typing indicator, date separators, timestamps, message search,
 * slash commands (/tasks, /progress, /help), Enter-to-send and clearing a channel.
 *
 * The assistant is rule-based and runs entirely in the browser; it answers
 * from the courses and tasks stored by EduStore.
 */
document.addEventListener('DOMContentLoaded', () => {
  if (!EduTrack.requireAuth()) return;

  const channelList = document.getElementById('channel-list');
  const thread = document.getElementById('chat-thread');
  const titleEl = document.getElementById('channel-title');
  const subtitleEl = document.getElementById('channel-subtitle');
  const form = document.getElementById('chat-form');
  const input = document.getElementById('chat-input');
  const searchBox = document.getElementById('chat-search');
  const clearButton = document.getElementById('clear-chat');
  const typing = document.getElementById('typing-indicator');

  const { escapeHtml, formatDate } = EduTrack;
  const user = EduTrack.getCurrentUser();
  const firstName = user.fullName.split(' ')[0];

  let activeChannel = 'general';
  let replyTimer = null;

  /* ---------- Channels ---------- */

  const getChannels = () => [
    { id: 'general', name: 'General', title: 'Study assistant for all courses' },
    ...EduStore.getCourses().map((c) => ({ id: c.code, name: c.code, title: c.title }))
  ];

  const channelById = (id) => getChannels().find((ch) => ch.id === id);

  const renderChannels = () => {
    if (!channelById(activeChannel)) activeChannel = 'general';

    channelList.innerHTML = getChannels().map((ch) => `
      <button type="button"
              class="list-group-item list-group-item-action ${ch.id === activeChannel ? 'active' : ''}"
              data-channel="${escapeHtml(ch.id)}"
              ${ch.id === activeChannel ? 'aria-current="true"' : ''}>
        <div class="fw-semibold">#${escapeHtml(ch.name)}</div>
        <small class="${ch.id === activeChannel ? 'text-white-50' : 'text-muted'}">${escapeHtml(ch.title)}</small>
      </button>`).join('');

    const channel = channelById(activeChannel);
    titleEl.textContent = `#${channel.name}`;
    subtitleEl.textContent = channel.id === 'general' ? 'Assistant' : channel.title;
  };

  // Seeds a welcome message the first time a channel is opened
  const ensureWelcome = (channelId) => {
    const hasMessages = EduStore.getMessages().some((m) => m.channel === channelId);
    if (!hasMessages) {
      EduStore.addMessage({
        channel: channelId,
        author: 'bot',
        text: `Welcome to #${channelId}, ${firstName}. Type /help to see what I can do.`
      });
    }
  };

  /* ---------- Thread ---------- */

  const renderThread = () => {
    const term = searchBox.value.trim().toLowerCase();
    const all = EduStore.getMessages().filter((m) => m.channel === activeChannel);
    const messages = term ? all.filter((m) => m.text.toLowerCase().includes(term)) : all;

    if (!messages.length) {
      thread.innerHTML = `<p class="text-center text-muted my-auto">${term
        ? 'No messages match your search.'
        : 'No messages yet. Say hello or type /help.'}</p>`;
      return;
    }

    let lastDay = '';
    let html = '';

    messages.forEach((m) => {
      const date = new Date(m.time);
      const day = date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
      if (day !== lastDay) {
        html += `<div class="chat-day"><span>${day}</span></div>`;
        lastDay = day;
      }

      const mine = m.author === 'user';
      const time = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

      html += `
        <div class="chat-row ${mine ? 'mine' : 'theirs'}">
          <div class="chat-bubble ${mine ? 'bg-primary text-white' : 'bg-body-tertiary'}">
            <div class="chat-text">${escapeHtml(m.text)}</div>
            <div class="chat-time ${mine ? 'text-white-50' : 'text-muted'}">${time}</div>
          </div>
        </div>`;
    });

    thread.innerHTML = html;
    thread.scrollTop = thread.scrollHeight;
  };

  /* ---------- Assistant logic ---------- */

  const byDue = (a, b) => a.due.localeCompare(b.due);

  const assistantReply = (raw, channelId) => {
    const text = raw.trim().toLowerCase();
    const course = EduStore.getCourses().find((c) => c.code === channelId);
    const openTasks = EduStore.getTasks()
      .filter((t) => t.status !== 'Completed' && (!course || t.course === course.code))
      .sort(byDue);

    if (text === '/help' || text.includes('help')) {
      return 'Here is what I can do:\n' +
        '/tasks - list your open tasks\n' +
        '/progress - show course progress\n' +
        '/help - show this list\n\n' +
        'You can also say hello, ask about deadlines, or say thank you.';
    }

    if (text.startsWith('/tasks') || /\b(task|tasks|deadline|deadlines|due)\b/.test(text)) {
      if (!openTasks.length) {
        return course
          ? `You have no open tasks for ${course.code}. Nice work!`
          : 'You have no open tasks. Nice work!';
      }
      const lines = openTasks.slice(0, 5).map((t) =>
        `• ${t.title} (due ${formatDate(t.due)}, ${t.priority} priority)`);
      return `Open tasks${course ? ` for ${course.code}` : ''}:\n${lines.join('\n')}`;
    }

    if (text.startsWith('/progress') || text.includes('progress')) {
      if (course) {
        return `${course.code} is ${course.progress}% complete (status: ${course.status}).`;
      }
      const courses = EduStore.getCourses();
      const avg = courses.length
        ? Math.round(courses.reduce((sum, c) => sum + c.progress, 0) / courses.length)
        : 0;
      return `Your average progress across ${courses.length} courses is ${avg}%.`;
    }

    if (/^(hi|hello|hey)\b/.test(text)) {
      return `Hello ${firstName}! How can I help with your studies today? Type /help to see options.`;
    }

    if (/thank/.test(text)) {
      return "You're welcome! Good luck with your work.";
    }

    return `I'm not sure about that yet. Try /tasks, /progress or /help${course ? `, or ask about ${course.code}` : ''}.`;
  };

  /* ---------- Sending ---------- */

  const sendMessage = (rawText) => {
    const text = rawText.trim();
    if (!text) return;

    const channel = activeChannel;
    EduStore.addMessage({ channel, author: 'user', text });
    input.value = '';
    input.style.height = 'auto';

    typing.classList.remove('d-none');
    clearTimeout(replyTimer);

    // A short, text-length-based delay makes the reply feel natural
    const delay = Math.min(1500, 500 + text.length * 20);
    replyTimer = setTimeout(() => {
      typing.classList.add('d-none');
      EduStore.addMessage({ channel, author: 'bot', text: assistantReply(text, channel) });
    }, delay);
  };

  /* ---------- Events ---------- */

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    sendMessage(input.value);
  });

  // Enter sends; Shift+Enter inserts a new line
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      form.requestSubmit();
    }
  });

  // Grow the text area with its content
  input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = `${Math.min(input.scrollHeight, 140)}px`;
  });

  channelList.addEventListener('click', (event) => {
    const button = event.target.closest('[data-channel]');
    if (!button) return;
    activeChannel = button.dataset.channel;
    ensureWelcome(activeChannel);
    renderChannels();
    renderThread();
  });

  document.querySelectorAll('[data-command]').forEach((button) => {
    button.addEventListener('click', () => sendMessage(button.dataset.command));
  });

  searchBox.addEventListener('input', renderThread);

  clearButton.addEventListener('click', async () => {
    const confirmed = await EduTrack.confirmDialog(
      `Clear all messages in #${activeChannel}? This cannot be undone.`,
      'Clear'
    );
    if (confirmed) {
      EduStore.clearChannel(activeChannel);
      ensureWelcome(activeChannel);
      EduTrack.toast('Conversation cleared.');
    }
  });

  document.addEventListener('edutrack:data', () => {
    renderChannels();
    renderThread();
  });

  // Honour ?channel=... links from the multi-level menu
  const requestedChannel = new URLSearchParams(window.location.search).get('channel');
  if (requestedChannel && channelById(requestedChannel)) activeChannel = requestedChannel;

  ensureWelcome(activeChannel);
  renderChannels();
  renderThread();
});
