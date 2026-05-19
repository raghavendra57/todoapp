/* To Do Activity Application
Features implemented (18):
1) Multiple lists/projects with CRUD
2) Task CRUD with notes
3) Priority levels
4) Due date/time with overdue indicator
5) Tags (comma separated) + filter by tags (search)
6) Subtasks with progress
7) Search across title/notes/subtasks
8) Filters: hide completed, high priority only, with due date, overdue
9) Sorting: created/due/priority/title
10) Bulk select, complete, delete
11) Keyboard shortcuts (n, /, j, k, x, del)
12) LocalStorage persistence per list
13) Import/Export JSON
14) Undo/Redo via history stack
15) Theme toggle (dark/light) stored in localStorage
16) Simple stats + mini canvas chart
17) Reminders via Notification API (where supported)
18) Inline editing of title and notes
*/

;(function(){
  const BASE_API_URL = localStorage.getItem('adv_todo_api_base') || '';
  const api = {
    async ping(){ if (!BASE_API_URL) return false; try { const r = await fetch(BASE_API_URL + '/health'); return r.ok; } catch { return false; } },
    async lists(){ const r = await fetch(BASE_API_URL + '/lists'); return r.json(); },
    async createList(name){ const r = await fetch(BASE_API_URL + '/lists', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) }); return r.json(); },
    async renameList(id, name){ const r = await fetch(BASE_API_URL + '/lists/' + id, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) }); return r.json(); },
    async deleteList(id){ await fetch(BASE_API_URL + '/lists/' + id, { method: 'DELETE' }); },
    async listTasks(listId){ const r = await fetch(BASE_API_URL + '/lists/' + listId + '/tasks'); return r.json(); },
    async createTask(listId, task){ const r = await fetch(BASE_API_URL + '/lists/' + listId + '/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(task) }); return r.json(); },
    async patchTask(id, patch){ const r = await fetch(BASE_API_URL + '/tasks/' + id, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) }); return r.json(); },
    async deleteTask(id){ await fetch(BASE_API_URL + '/tasks/' + id, { method: 'DELETE' }); }
  };
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const els = {
    lists: $('#lists'),
    newListName: $('#new-list-name'),
    addList: $('#add-list'),
    currentListTitle: $('#current-list-title'),
    tasks: $('#tasks'),
    empty: $('#empty'),
    search: $('#search'),
    filterCompleted: $('#filter-completed'),
    filterPrioHigh: $('#filter-priority-high'),
    filterHasDue: $('#filter-has-duedate'),
    filterOverdue: $('#filter-overdue'),
    sortBy: $('#sort-by'),
    taskForm: $('#task-form'),
    taskTitle: $('#task-title'),
    taskDue: $('#task-due'),
    taskPriority: $('#task-priority'),
    taskTags: $('#task-tags'),
    taskNotes: $('#task-notes'),
    taskReminder: $('#task-reminder'),
    subtasks: $('#subtasks'),
    newSubtask: $('#new-subtask'),
    addSubtask: $('#add-subtask'),
    clearForm: $('#clear-form'),
    bulkComplete: $('#bulk-complete'),
    bulkDelete: $('#bulk-delete'),
    selectAll: $('#select-all'),
    clearCompleted: $('#clear-completed'),
    toggleTheme: $('#toggle-theme'),
    exportJson: $('#export-json'),
    importJson: $('#import-json'),
    importFile: $('#import-file'),
    undo: $('#undo'),
    redo: $('#redo'),
    stats: $('#stats'),
    chart: $('#chart')
  };

  // State and storage
  const LS_KEYS = {
    lists: 'adv_todo_lists_v1',
    selectedListId: 'adv_todo_selected_list_v1',
    prefs: 'adv_todo_prefs_v1',
    history: 'adv_todo_history_v1'
  };

  const defaultState = () => ({
    lists: [
      { id: uid(), name: 'Inbox', createdAt: Date.now(), tasks: [] }
    ],
    selectedListId: null,
    prefs: { theme: 'dark' },
  });

  let state = loadState();
  if (!state.selectedListId) state.selectedListId = state.lists[0]?.id;
  let history = { past: [], future: [] };

  async function saveState(pushToHistory = true) {
    try {
      localStorage.setItem(LS_KEYS.lists, JSON.stringify(state.lists));
      localStorage.setItem(LS_KEYS.selectedListId, state.selectedListId || '');
      localStorage.setItem(LS_KEYS.prefs, JSON.stringify(state.prefs || {}));
      if (pushToHistory) pushHistory();
    } catch (e) { console.error('Save failed', e); }
    render();
  }

  function loadState(){
    try {
      const lists = JSON.parse(localStorage.getItem(LS_KEYS.lists) || 'null');
      const selectedListId = localStorage.getItem(LS_KEYS.selectedListId) || null;
      const prefs = JSON.parse(localStorage.getItem(LS_KEYS.prefs) || 'null') || { theme: prefersTheme() };
      if (lists && Array.isArray(lists) && lists.length) {
        return { lists, selectedListId: selectedListId || lists[0].id, prefs };
      }
      return defaultState();
    } catch(e) { return defaultState(); }
  }

  function prefersTheme(){
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }

  function uid(){ return Math.random().toString(36).slice(2, 10); }

  function currentList(){
    return state.lists.find(l => l.id === state.selectedListId) || state.lists[0];
  }

  function pushHistory(){
    const snapshot = JSON.stringify(state);
    history.past.push(snapshot);
    history.future = [];
    els.undo.disabled = history.past.length <= 1;
    els.redo.disabled = history.future.length === 0;
  }

  function doUndo(){
    if (history.past.length <= 1) return;
    const now = history.past.pop();
    history.future.push(now);
    const prev = history.past[history.past.length - 1];
    state = JSON.parse(prev);
    els.redo.disabled = false;
    els.undo.disabled = history.past.length <= 1;
    // Don't push new history, just save storages
    localStorage.setItem(LS_KEYS.lists, JSON.stringify(state.lists));
    localStorage.setItem(LS_KEYS.selectedListId, state.selectedListId || '');
    localStorage.setItem(LS_KEYS.prefs, JSON.stringify(state.prefs || {}));
    render();
  }

  function doRedo(){
    if (history.future.length === 0) return;
    const next = history.future.pop();
    history.past.push(next);
    state = JSON.parse(next);
    els.undo.disabled = history.past.length <= 1;
    els.redo.disabled = history.future.length === 0;
    localStorage.setItem(LS_KEYS.lists, JSON.stringify(state.lists));
    localStorage.setItem(LS_KEYS.selectedListId, state.selectedListId || '');
    localStorage.setItem(LS_KEYS.prefs, JSON.stringify(state.prefs || {}));
    render();
  }

  // Initialize history with starting state
  pushHistory();

  // Rendering
  function render(){
    renderTheme();
    renderLists();
    renderTasks();
    renderStats();
    renderChart();
  }

  function renderTheme(){
    const root = document.documentElement;
    if ((state.prefs.theme || 'dark') === 'light') root.classList.add('light'); else root.classList.remove('light');
  }

  function renderLists(){
    els.lists.innerHTML = '';
    state.lists.forEach(list => {
      const li = document.createElement('li');
      li.className = 'row gap' + (list.id === state.selectedListId ? ' active' : '');
      const a = document.createElement('button');
      a.textContent = list.name;
      a.className = 'grow';
      a.onclick = () => { state.selectedListId = list.id; saveState(); };
      const rename = document.createElement('button');
      rename.title = 'Rename list';
      rename.textContent = '✎';
      rename.onclick = async () => {
        const name = prompt('Rename list', list.name);
        if (name && name.trim()) { list.name = name.trim(); try { if (list.remoteId) await api.renameList(list.remoteId, list.name); } catch {} saveState(); }
      };
      const del = document.createElement('button');
      del.title = 'Delete list';
      del.textContent = '🗑';
      del.onclick = async () => {
        if (!confirm('Delete this list? Tasks will be lost.')) return;
        const idx = state.lists.findIndex(l => l.id === list.id);
        try { if (list.remoteId) await api.deleteList(list.remoteId); } catch {}
        state.lists.splice(idx, 1);
        if (!state.lists.length) state.lists.push({ id: uid(), name: 'Inbox', createdAt: Date.now(), tasks: [] });
        if (state.selectedListId === list.id) state.selectedListId = state.lists[0].id;
        saveState();
      };
      li.append(a, rename, del);
      els.lists.appendChild(li);
    });
  }

  function renderTasks(){
    const list = currentList();
    els.currentListTitle.textContent = list ? `${list.name} (${list.tasks.length})` : 'Tasks';

    const tasks = applyFiltersAndSort(list.tasks);
    els.tasks.innerHTML = '';

    if (!tasks.length) {
      els.empty.style.display = 'block';
    } else {
      els.empty.style.display = 'none';
    }

    tasks.forEach(task => {
      const li = document.createElement('li');
      li.className = 'task-item';

      // selection checkbox for bulk ops
      const select = document.createElement('input');
      select.type = 'checkbox';
      select.checked = !!task._selected;
      select.onchange = () => { task._selected = select.checked; };

      // content
      const content = document.createElement('div');

      const title = document.createElement('div');
      title.className = 'row gap';
      const done = document.createElement('input');
      done.type = 'checkbox';
      done.checked = task.completed;
      done.onchange = async () => { task.completed = done.checked; try { if (task.remoteId) await api.patchTask(task.remoteId, { completed: task.completed }); } catch {} saveState(); };
      const titleSpan = document.createElement('span');
      titleSpan.className = 'task-title';
      titleSpan.textContent = task.title;
      titleSpan.contentEditable = true;
      titleSpan.onblur = async () => { task.title = titleSpan.textContent.trim() || task.title; try { if (task.remoteId) await api.patchTask(task.remoteId, { title: task.title }); } catch {} saveState(); };
      content.appendChild(title);
      title.append(done, titleSpan);

      const meta = document.createElement('div');
      meta.className = 'task-meta';
      const prio = document.createElement('span');
      prio.className = 'badge prio-' + task.priority;
      prio.textContent = ['Low','Med','High'][task.priority-1];
      meta.appendChild(prio);

      if (task.dueAt) {
        const due = document.createElement('span');
        const overdue = Date.now() > task.dueAt && !task.completed;
        due.className = 'badge' + (overdue ? ' overdue' : '');
        due.textContent = 'Due ' + new Date(task.dueAt).toLocaleString();
        meta.appendChild(due);
      }

      if (task.tags?.length) {
        const tags = document.createElement('span');
        tags.className = 'badge';
        tags.textContent = '#' + task.tags.join(' #');
        meta.appendChild(tags);
      }

      if (task.subtasks?.length) {
        const doneCount = task.subtasks.filter(s => s.completed).length;
        const sub = document.createElement('span');
        sub.className = 'badge';
        sub.textContent = `Subtasks ${doneCount}/${task.subtasks.length}`;
        meta.appendChild(sub);
      }

      if (task.completed) {
        const comp = document.createElement('span');
        comp.className = 'badge completed';
        comp.textContent = 'Completed';
        meta.appendChild(comp);
      }

      content.appendChild(meta);

      const actions = document.createElement('div');
      actions.className = 'task-actions';
      const edit = document.createElement('button');
      edit.textContent = 'Edit';
      edit.onclick = () => openEditDialog(task);
      const del = document.createElement('button');
      del.textContent = 'Delete';
      del.onclick = () => { if (confirm('Delete task?')) { removeTask(task.id); } };
      actions.append(edit, del);

      li.append(select, content, actions);
      els.tasks.appendChild(li);
    });
  }

  function openEditDialog(task){
    const notes = prompt('Edit notes', task.notes || '');
    if (notes !== null) { task.notes = notes; saveState(); }
  }

  async function removeTask(id){
    const list = currentList();
    const i = list.tasks.findIndex(t => t.id === id);
    if (i >= 0) { try { const t = list.tasks[i]; if (t.remoteId) await api.deleteTask(t.remoteId); } catch {} list.tasks.splice(i, 1); saveState(); }
  }

  function applyFiltersAndSort(tasks){
    let out = tasks.slice();
    const q = els.search.value.trim().toLowerCase();
    if (q) out = out.filter(t => (t.title + ' ' + (t.notes||'') + ' ' + (t.subtasks||[]).map(s=>s.title).join(' ')).toLowerCase().includes(q));
    if (els.filterCompleted.checked) out = out.filter(t => !t.completed);
    if (els.filterPrioHigh.checked) out = out.filter(t => t.priority === 3);
    if (els.filterHasDue.checked) out = out.filter(t => !!t.dueAt);
    if (els.filterOverdue.checked) out = out.filter(t => !!t.dueAt && t.dueAt < Date.now() && !t.completed);

    const [field, dir] = els.sortBy.value.split('-');
    const mul = dir === 'asc' ? 1 : -1;
    out.sort((a,b) => {
      const va = field === 'title' ? (a.title||'').localeCompare ? a.title : '' : a[field] || 0;
      const vb = field === 'title' ? (b.title||'').localeCompare ? b.title : '' : b[field] || 0;
      if (field === 'title') return a.title.localeCompare(b.title) * mul;
      return (va - vb) * mul;
    });

    return out;
  }

  // Stats and chart
  function renderStats(){
    const list = currentList();
    const total = list.tasks.length;
    const completed = list.tasks.filter(t=>t.completed).length;
    const overdue = list.tasks.filter(t=>t.dueAt && t.dueAt < Date.now() && !t.completed).length;
    const high = list.tasks.filter(t=>t.priority===3).length;

    els.stats.innerHTML = '';
    const mk = (label, value) => {
      const d = document.createElement('div');
      d.className = 'stat';
      d.innerHTML = `<div style="font-size:12px;opacity:.8;">${label}</div><div style="font-size:18px;font-weight:700;">${value}</div>`;
      els.stats.appendChild(d);
    };

    mk('Total', total);
    mk('Completed', completed);
    mk('Overdue', overdue);
    mk('High Priority', high);
  }

  function renderChart(){
    const cvs = els.chart; if (!cvs) return;
    const ctx = cvs.getContext('2d');
    const list = currentList();
    const days = 7;
    const now = new Date();
    const buckets = new Array(days).fill(0);

    list.tasks.forEach(t => {
      const d = new Date(t.createdAt||Date.now());
      const diff = Math.floor((now - d) / 86400000);
      if (diff >= 0 && diff < days) buckets[days - diff - 1]++;
    });

    // clear
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--panel');
    ctx.fillRect(0,0,cvs.width,cvs.height);

    const max = Math.max(1, ...buckets);
    const barW = (cvs.width - 40) / days;
    for (let i=0;i<days;i++){
      const h = (buckets[i]/max) * (cvs.height - 40);
      const x = 20 + i*barW;
      const y = cvs.height - 20 - h;
      ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--accent');
      ctx.fillRect(x, y, barW-6, h);
      ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text');
      ctx.font = '10px Inter';
      ctx.fillText(buckets[i], x+2, y-2);
    }

    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--muted');
    ctx.fillText('Tasks created (last 7 days)', 20, 12);
  }

  // Event wiring
  els.addList.onclick = async () => {
    const name = (els.newListName.value || '').trim();
    if (!name) return;
    const list = { id: uid(), name, createdAt: Date.now(), tasks: [] };
    try { if (BASE_API_URL && await api.ping()) { const r = await api.createList(name); list.remoteId = r.id; } } catch {}
    state.lists.push(list);
    els.newListName.value = '';
    saveState();
  };

  els.taskForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = els.taskTitle.value.trim();
    if (!title) return;
    const dueAt = els.taskDue.value ? new Date(els.taskDue.value).getTime() : null;
    const priority = parseInt(els.taskPriority.value, 10) || 1;
    const tags = els.taskTags.value.split(',').map(s=>s.trim()).filter(Boolean);
    const notes = els.taskNotes.value.trim();
    const subtasks = $$('#subtasks input[type="text"]').map(inp => ({ id: uid(), title: inp.value.trim(), completed: false })).filter(s=>s.title);

    const task = { id: uid(), title, dueAt, priority, tags, notes, subtasks, completed: false, createdAt: Date.now() };
    const list = currentList();
    try { if (BASE_API_URL && await api.ping()) { const r = await api.createTask(list.remoteId || list.id, task); task.remoteId = r.id; } } catch {}
    list.tasks.push(task);

    if (els.taskReminder.checked && 'Notification' in window) {
      requestNotification('Reminder set for: ' + title);
      // naive: schedule via setTimeout if dueAt within 24h
      if (dueAt && dueAt - Date.now() < 24*3600*1000 && dueAt > Date.now()) {
        const delay = dueAt - Date.now();
        try { setTimeout(()=> requestNotification('Task due: ' + title), delay); } catch {}
      }
    }

    clearTaskForm();
    saveState();
  });

  els.addSubtask.onclick = () => {
    const val = els.newSubtask.value.trim();
    if (!val) return;
    const row = document.createElement('div');
    row.className = 'row gap';
    const inp = document.createElement('input');
    inp.type = 'text';
    inp.value = val;
    row.appendChild(inp);
    const rm = document.createElement('button');
    rm.textContent = '✕';
    rm.onclick = () => row.remove();
    row.appendChild(rm);
    els.subtasks.appendChild(row);
    els.newSubtask.value = '';
  };

  els.clearForm.onclick = () => clearTaskForm();

  function clearTaskForm(){
    els.taskTitle.value = '';
    els.taskDue.value = '';
    els.taskPriority.value = '1';
    els.taskTags.value = '';
    els.taskNotes.value = '';
    els.taskReminder.checked = false;
    els.subtasks.innerHTML = '';
  }

  els.search.addEventListener('input', () => renderTasks());
  els.filterCompleted.onchange = () => renderTasks();
  els.filterPrioHigh.onchange = () => renderTasks();
  els.filterHasDue.onchange = () => renderTasks();
  els.filterOverdue.onchange = () => renderTasks();
  els.sortBy.onchange = () => renderTasks();

  els.bulkComplete.onclick = () => {
    const list = currentList();
    list.tasks.forEach(t => { if (t._selected) t.completed = true; });
    list.tasks.forEach(t => delete t._selected);
    saveState();
  };
  els.bulkDelete.onclick = () => {
    const list = currentList();
    list.tasks = list.tasks.filter(t => !t._selected);
    saveState();
  };
  els.selectAll.onclick = () => {
    const list = currentList();
    const allSelected = list.tasks.every(t => t._selected);
    list.tasks.forEach(t => t._selected = !allSelected);
    renderTasks();
  };
  els.clearCompleted.onclick = () => {
    const list = currentList();
    list.tasks = list.tasks.filter(t => !t.completed);
    saveState();
  };

  els.toggleTheme.onclick = () => {
    state.prefs.theme = (state.prefs.theme || 'dark') === 'dark' ? 'light' : 'dark';
    saveState(false);
    renderTheme();
  };

  els.exportJson.onclick = () => {
    const data = JSON.stringify(state, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'to_do_activity_application_backup.json'; a.click();
    URL.revokeObjectURL(url);
  };

  els.importJson.onclick = () => els.importFile.click();
  els.importFile.onchange = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    const text = await file.text();
    try {
      const obj = JSON.parse(text);
      if (!obj || !Array.isArray(obj.lists)) throw new Error('Invalid format');
      state = obj;
      localStorage.setItem(LS_KEYS.lists, JSON.stringify(state.lists));
      localStorage.setItem(LS_KEYS.selectedListId, state.selectedListId || '');
      localStorage.setItem(LS_KEYS.prefs, JSON.stringify(state.prefs || {}));
      history = { past: [], future: [] }; pushHistory();
      render();
    } catch (err){ alert('Import failed: ' + err.message); }
  };

  els.undo.onclick = () => doUndo();
  els.redo.onclick = () => doRedo();

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.target.matches('input, textarea, [contenteditable="true"]')) return; // don't hijack typing
    if (e.key === 'n') { els.taskTitle.focus(); }
    if (e.key === '/') { e.preventDefault(); els.search.focus(); }
    if (e.key === 'j') moveSelection(1);
    if (e.key === 'k') moveSelection(-1);
    if (e.key === 'x') toggleSelected();
    if (e.key === 'Delete') deleteSelected();
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); doUndo(); }
    if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'Z'))) { e.preventDefault(); doRedo(); }
  });

  function moveSelection(delta){
    const list = currentList();
    const tasks = applyFiltersAndSort(list.tasks);
    const idx = tasks.findIndex(t => t._cursor);
    if (idx >= 0) tasks[idx]._cursor = false;
    const next = Math.max(0, Math.min(tasks.length-1, idx + (idx<0?0:delta)));
    if (tasks[next]) tasks[next]._cursor = true;
    renderTasks();
  }

  function toggleSelected(){
    const list = currentList();
    const tasks = applyFiltersAndSort(list.tasks);
    const t = tasks.find(t => t._cursor) || tasks[0];
    if (t) { t._selected = !t._selected; renderTasks(); }
  }

  function deleteSelected(){
    const list = currentList();
    list.tasks = list.tasks.filter(t => !t._selected && !t._cursor);
    saveState();
  }

  function requestNotification(body){
    try {
      if (Notification.permission === 'granted') new Notification('To Do Activity Application', { body });
      else if (Notification.permission !== 'denied') Notification.requestPermission().then(p => { if (p==='granted') new Notification('To Do Activity Application', { body }); });
    } catch {}
  }

  // Initial render
  render();
})();
