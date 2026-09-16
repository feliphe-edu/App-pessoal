const STORAGE_KEY = "meuCantinho.v1";

const defaultState = {
  profile: { name: "" },
  habits: [
    { id: crypto.randomUUID(), name: "Academia", checks: {} },
    { id: crypto.randomUUID(), name: "Estudar", checks: {} },
    { id: crypto.randomUUID(), name: "Programar", checks: {} }
  ],
  moods: {},
  journal: [],
  goals: [],
  counters: [],
  lastOpen: null
};

let state = loadState();

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved) return structuredClone(defaultState);
    return {
      ...structuredClone(defaultState),
      ...saved,
      profile: { ...defaultState.profile, ...(saved.profile || {}) },
      habits: Array.isArray(saved.habits) ? saved.habits : defaultState.habits,
      moods: saved.moods || {},
      journal: Array.isArray(saved.journal) ? saved.journal : [],
      goals: Array.isArray(saved.goals) ? saved.goals : [],
      counters: Array.isArray(saved.counters) ? saved.counters : []
    };
  } catch {
    return structuredClone(defaultState);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

function todayKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDate(key) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit", month: "long", year: "numeric"
  }).format(new Date(`${key}T12:00:00`));
}

function escapeHTML(text) {
  return String(text).replace(/[&<>"']/g, (c) => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[c]));
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 2200);
}

function isHabitDone(habit, key = todayKey()) {
  return Boolean(habit.checks && habit.checks[key]);
}

function toggleHabit(id) {
  const habit = state.habits.find(h => h.id === id);
  if (!habit) return;
  habit.checks ||= {};
  const key = todayKey();
  habit.checks[key] = !habit.checks[key];
  saveState();
  renderAll();
  showToast(habit.checks[key] ? "Hábito concluído! ✅" : "Check-in desmarcado.");
}

function renderHabitList(targetId) {
  const target = $(targetId);
  if (!state.habits.length) {
    target.innerHTML = '<div class="empty">Nenhum hábito ainda. Crie o primeiro acima.</div>';
    return;
  }

  target.innerHTML = state.habits.map(h => {
    const done = isHabitDone(h);
    const total = Object.values(h.checks || {}).filter(Boolean).length;
    return `
      <div class="habit-item ${done ? "done" : ""}">
        <button class="check-btn" data-toggle-habit="${h.id}" aria-label="Marcar hábito">
          ${done ? "✓" : ""}
        </button>
        <div class="habit-info">
          <div class="habit-name">${escapeHTML(h.name)}</div>
          <div class="habit-meta">${total} check-in${total === 1 ? "" : "s"} registrado${total === 1 ? "" : "s"}</div>
        </div>
        <button class="delete-btn" data-delete-habit="${h.id}" aria-label="Excluir hábito">✕</button>
      </div>`;
  }).join("");
}

function addHabit() {
  const input = $("#habitInput");
  const name = input.value.trim();
  if (!name) return showToast("Digite um hábito primeiro.");
  state.habits.push({ id: crypto.randomUUID(), name, checks: {} });
  input.value = "";
  saveState();
  renderAll();
  showToast("Hábito criado.");
}

function deleteHabit(id) {
  if (!confirm("Excluir este hábito?")) return;
  state.habits = state.habits.filter(h => h.id !== id);
  saveState();
  renderAll();
}

function setMood(mood) {
  state.moods[todayKey()] = mood;
  saveState();
  renderAll();
  showToast("Humor registrado.");
}

function calculateStreak() {
  let streak = 0;
  const hasAnyCheck = (key) => state.habits.some(h => isHabitDone(h, key));
  const cursor = new Date();
  while (hasAnyCheck(todayKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function calculateTotalChecks() {
  return state.habits.reduce((sum, h) =>
    sum + Object.values(h.checks || {}).filter(Boolean).length, 0);
}

function renderHome() {
  const name = state.profile.name?.trim();
  $("#userNameLabel").textContent = name || "você";

  const now = new Date();
  $("#todayDate").textContent = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long", day: "numeric", month: "long"
  }).format(now);

  const hour = now.getHours();
  $("#todayGreeting").textContent =
    hour < 12 ? "Bom dia. Vamos começar?" :
    hour < 18 ? "Boa tarde. Como está indo?" :
    "Boa noite. Como foi seu dia?";

  $("#streakPill").textContent = `🔥 ${calculateStreak()} ${calculateStreak() === 1 ? "dia" : "dias"}`;

  const mood = state.moods[todayKey()];
  $$("#moodRow button").forEach(btn =>
    btn.classList.toggle("selected", btn.dataset.mood === mood));

  renderHabitList("#homeHabitList");
}

function renderJournal() {
  const text = $("#journalText");
  text.value = "";
  $("#journalCount").textContent = "0/3000";

  const history = $("#journalHistory");
  if (!state.journal.length) {
    history.innerHTML = '<div class="empty">Ainda não há entradas. Escreva a primeira.</div>';
    return;
  }

  history.innerHTML = state.journal.slice(0, 8).map(entry => `
    <article class="journal-entry">
      <time>${formatDate(entry.date)}</time>
      <p>${escapeHTML(entry.text)}</p>
    </article>
  `).join("");
}

function saveJournal() {
  const text = $("#journalText").value.trim();
  if (!text) return showToast("Escreva alguma coisa antes de salvar.");
  const key = todayKey();
  const existing = state.journal.find(e => e.date === key);

  if (existing) {
    existing.text = text;
  } else {
    state.journal.unshift({ id: crypto.randomUUID(), date: key, text });
  }

  state.journal.sort((a,b) => b.date.localeCompare(a.date));
  saveState();
  renderJournal();
  updateStats();
  showToast("Entrada salva. 📝");
}

function renderGoals() {
  const target = $("#goalList");
  if (!state.goals.length) {
    target.innerHTML = '<div class="empty">Nenhuma meta ainda. Crie uma acima.</div>';
    return;
  }

  target.innerHTML = state.goals.map(g => {
    const progress = Math.max(0, Math.min(100, Number(g.progress) || 0));
    return `
      <div class="goal-item">
        <div class="goal-top">
          <div class="goal-title">${escapeHTML(g.title)}</div>
          <button class="delete-btn" data-delete-goal="${g.id}">✕</button>
        </div>
        <div class="goal-progress"><span style="width:${progress}%"></span></div>
        <div class="goal-top">
          <small class="muted">${progress}% concluído</small>
          <div class="small-actions">
            <button class="small-btn" data-goal-step="${g.id}" data-step="-10">−10</button>
            <button class="small-btn" data-goal-step="${g.id}" data-step="10">+10</button>
            <button class="small-btn" data-goal-step="${g.id}" data-step="100">Concluir</button>
          </div>
        </div>
      </div>`;
  }).join("");
}

function addGoal() {
  const input = $("#goalInput");
  const title = input.value.trim();
  if (!title) return showToast("Digite uma meta primeiro.");
  state.goals.unshift({ id: crypto.randomUUID(), title, progress: 0 });
  input.value = "";
  saveState();
  renderGoals();
  updateStats();
  showToast("Meta criada.");
}

function updateGoal(id, step) {
  const goal = state.goals.find(g => g.id === id);
  if (!goal) return;
  goal.progress = Math.max(0, Math.min(100, (Number(goal.progress) || 0) + Number(step)));
  saveState();
  renderGoals();
}

function deleteGoal(id) {
  if (!confirm("Excluir esta meta?")) return;
  state.goals = state.goals.filter(g => g.id !== id);
  saveState();
  renderGoals();
  updateStats();
}

function renderCounters() {
  const target = $("#counterList");
  if (!state.counters.length) {
    target.innerHTML = '<div class="empty">Nenhum contador ainda. Crie um acima.</div>';
    return;
  }

  target.innerHTML = state.counters.map(c => {
    const start = new Date(`${c.startDate}T12:00:00`);
    const now = new Date();
    const diff = Math.max(0, Math.floor((new Date(now.getFullYear(), now.getMonth(), now.getDate()) - new Date(start.getFullYear(), start.getMonth(), start.getDate())) / 86400000));
    return `
      <div class="counter-item-card">
        <div class="counter-top">
          <div class="counter-title">${escapeHTML(c.title)}</div>
          <button class="delete-btn" data-delete-counter="${c.id}">✕</button>
        </div>
        <div class="counter-number">${diff}</div>
        <div class="counter-sub">dias desde ${formatDate(c.startDate)}</div>
        <div class="small-actions" style="margin-top:12px">
          <button class="small-btn" data-reset-counter="${c.id}">Recomeçar hoje</button>
        </div>
      </div>`;
  }).join("");
}

function addCounter() {
  const input = $("#counterInput");
  const title = input.value.trim();
  if (!title) return showToast("Digite o nome do contador.");
  state.counters.unshift({ id: crypto.randomUUID(), title, startDate: todayKey() });
  input.value = "";
  saveState();
  renderCounters();
  showToast("Contador criado.");
}

function resetCounter(id) {
  const counter = state.counters.find(c => c.id === id);
  if (!counter) return;
  if (!confirm("Recomeçar este contador hoje?")) return;
  counter.startDate = todayKey();
  saveState();
  renderCounters();
}

function deleteCounter(id) {
  if (!confirm("Excluir este contador?")) return;
  state.counters = state.counters.filter(c => c.id !== id);
  saveState();
  renderCounters();
}

function renderWeekChart() {
  const target = $("#weekChart");
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = todayKey(d);
    const count = state.habits.filter(h => isHabitDone(h, key)).length;
    days.push({
      label: new Intl.DateTimeFormat("pt-BR", { weekday: "short" }).format(d).replace(".", "").slice(0,3),
      count,
      date: key
    });
  }
  const max = Math.max(1, state.habits.length);

  target.innerHTML = days.map(day => `
    <div class="day-bar" title="${day.date}">
      <strong>${day.count}</strong>
      <div class="bar" style="height:${Math.max(8, (day.count / max) * 105)}px"></div>
      <small>${day.label}</small>
    </div>
  `).join("");
}

function updateStats() {
  $("#statStreak").textContent = calculateStreak();
  $("#statChecks").textContent = calculateTotalChecks();
  $("#statJournals").textContent = state.journal.length;
  $("#statGoals").textContent = state.goals.length;
  renderWeekChart();
}

function renderSettings() {
  $("#nameInput").value = state.profile.name || "";
}

function renderAll() {
  renderHome();
  renderHabitList("#allHabitList");
  renderJournal();
  renderGoals();
  renderCounters();
  updateStats();
  renderSettings();
}

function openView(viewName) {
  $$(".view").forEach(v => v.classList.toggle("active", v.id === `view-${viewName}`));
  $$(".nav-btn").forEach(btn => btn.classList.toggle("active", btn.dataset.view === viewName));
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function saveName() {
  state.profile.name = $("#nameInput").value.trim();
  saveState();
  renderHome();
  showToast("Nome salvo.");
}

function exportData() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `meu-cantinho-backup-${todayKey()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast("Backup exportado.");
}

function importData(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const imported = JSON.parse(reader.result);
      if (!imported || typeof imported !== "object" || !Array.isArray(imported.habits)) {
        throw new Error("Formato inválido");
      }
      state = {
        ...structuredClone(defaultState),
        ...imported,
        profile: { ...defaultState.profile, ...(imported.profile || {}) }
      };
      saveState();
      renderAll();
      showToast("Backup importado.");
    } catch {
      showToast("Não foi possível importar esse arquivo.");
    }
  };
  reader.readAsText(file);
}

function resetData() {
  if (!confirm("Isso apagará os dados salvos neste navegador. Continuar?")) return;
  localStorage.removeItem(STORAGE_KEY);
  state = structuredClone(defaultState);
  saveState();
  renderAll();
  showToast("Dados apagados.");
}

// Navegação
$$(".nav-btn").forEach(btn => {
  btn.addEventListener("click", () => openView(btn.dataset.view));
});

$$("[data-go]").forEach(btn => {
  btn.addEventListener("click", () => openView(btn.dataset.go));
});

// Hábitos
$("#addHabitBtn").addEventListener("click", addHabit);
$("#habitInput").addEventListener("keydown", e => {
  if (e.key === "Enter") addHabit();
});

document.addEventListener("click", e => {
  const toggle = e.target.closest("[data-toggle-habit]");
  if (toggle) toggleHabit(toggle.dataset.toggleHabit);

  const delHabit = e.target.closest("[data-delete-habit]");
  if (delHabit) deleteHabit(delHabit.dataset.deleteHabit);

  const delGoal = e.target.closest("[data-delete-goal]");
  if (delGoal) deleteGoal(delGoal.dataset.deleteGoal);

  const goalStep = e.target.closest("[data-goal-step]");
  if (goalStep) updateGoal(goalStep.dataset.goalStep, goalStep.dataset.step);

  const delCounter = e.target.closest("[data-delete-counter]");
  if (delCounter) deleteCounter(delCounter.dataset.deleteCounter);

  const resetCounterBtn = e.target.closest("[data-reset-counter]");
  if (resetCounterBtn) resetCounter(resetCounterBtn.dataset.resetCounter);
});

// Humor
$$("#moodRow button").forEach(btn => btn.addEventListener("click", () => setMood(btn.dataset.mood)));

// Diário
$("#journalText").addEventListener("input", () => {
  $("#journalCount").textContent = `${$("#journalText").value.length}/3000`;
});
$("#saveJournalBtn").addEventListener("click", saveJournal);

// Metas
$("#addGoalBtn").addEventListener("click", addGoal);
$("#goalInput").addEventListener("keydown", e => {
  if (e.key === "Enter") addGoal();
});

// Contadores
$("#addCounterBtn").addEventListener("click", addCounter);
$("#counterInput").addEventListener("keydown", e => {
  if (e.key === "Enter") addCounter();
});

// Configurações
$("#settingsBtn").addEventListener("click", () => openView("config"));
$("#saveNameBtn").addEventListener("click", saveName);
$("#exportBtn").addEventListener("click", exportData);
$("#importInput").addEventListener("change", e => importData(e.target.files[0]));
$("#resetBtn").addEventListener("click", resetData);

// PWA
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(err => {
      console.warn("Service Worker não registrado:", err);
    });
  });
}

renderAll();
