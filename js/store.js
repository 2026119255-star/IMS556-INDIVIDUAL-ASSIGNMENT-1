/**
 * store.js - Data layer for courses, tasks and chat messages.
 *
 * Seeds from EDUTRACK_DATA (data.js) the first time, then persists every
 * add / edit / delete to localStorage. Each write fires an "edutrack:data"
 * event so any page that displays the data can re-render itself.
 */
const EduStore = (() => {

  const KEYS = {
    courses: 'edutrack.courses',
    tasks: 'edutrack.tasks',
    messages: 'edutrack.messages'
  };

  const read = (key, seed) => {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? structuredClone(seed) : JSON.parse(raw);
    } catch (error) {
      console.warn(`Could not read ${key}; falling back to sample data.`, error);
      return structuredClone(seed);
    }
  };

  const write = (key, value) => {
    localStorage.setItem(key, JSON.stringify(value));
    document.dispatchEvent(new CustomEvent('edutrack:data'));
  };

  const newId = (prefix) =>
    `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

  const today = () => new Date().toISOString().slice(0, 10);

  /* ---------- Courses ---------- */

  const getCourses = () => read(KEYS.courses, EDUTRACK_DATA.courses);

  const addCourse = (data) => {
    const course = { id: newId('c'), lastUpdated: today(), ...data };
    write(KEYS.courses, [...getCourses(), course]);
    return course;
  };

  const updateCourse = (id, data) =>
    write(KEYS.courses, getCourses().map((c) =>
      c.id === id ? { ...c, ...data, lastUpdated: today() } : c));

  const deleteCourse = (id) =>
    write(KEYS.courses, getCourses().filter((c) => c.id !== id));

  /* ---------- Tasks ---------- */

  const getTasks = () => read(KEYS.tasks, EDUTRACK_DATA.tasks);

  const addTask = (data) => {
    const task = { id: newId('t'), ...data };
    write(KEYS.tasks, [...getTasks(), task]);
    return task;
  };

  const updateTask = (id, data) =>
    write(KEYS.tasks, getTasks().map((t) => (t.id === id ? { ...t, ...data } : t)));

  const deleteTask = (id) =>
    write(KEYS.tasks, getTasks().filter((t) => t.id !== id));

  /* ---------- Chat messages ---------- */

  const getMessages = () => read(KEYS.messages, []);

  const addMessage = ({ channel, author, text }) => {
    const message = { id: newId('m'), channel, author, text, time: new Date().toISOString() };
    write(KEYS.messages, [...getMessages(), message]);
    return message;
  };

  const clearChannel = (channel) =>
    write(KEYS.messages, getMessages().filter((m) => m.channel !== channel));

  /* ---------- Reset ---------- */

  const resetAll = () => {
    Object.values(KEYS).forEach((key) => localStorage.removeItem(key));
    document.dispatchEvent(new CustomEvent('edutrack:data'));
  };

  return {
    getCourses, addCourse, updateCourse, deleteCourse,
    getTasks, addTask, updateTask, deleteTask,
    getMessages, addMessage, clearChannel,
    resetAll
  };
})();
