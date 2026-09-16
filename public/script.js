const $ = (id) => document.getElementById(id);

let tasks = [];
let editingId = null;
let toastTimer = null;

/* =========================
   API
========================= */

async function request(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "Something went wrong.");
  }

  return data;
}

/* =========================
   LOAD TASKS
========================= */

async function loadTasks() {
  $("loading").classList.remove("hidden");
  $("emptyState").classList.add("hidden");

  try {
    tasks = await request("/api/tasks");

    renderTasks();
    updateStats();
    updateProgress();
  } catch (error) {
    $("taskList").innerHTML = `
      <div class="state-box">
        <h3>Could not load tasks</h3>
        <p>${escapeHtml(error.message)}</p>
      </div>
    `;
  } finally {
    $("loading").classList.add("hidden");
  }
}

/* =========================
   RENDER TASKS
========================= */

function renderTasks() {
  const searchQuery = $("searchInput").value.trim().toLowerCase();
  const filter = $("filterStatus").value;

  const filteredTasks = tasks.filter((task) => {
    const title = (task.title || "").toLowerCase();
    const description = (task.description || "").toLowerCase();

    const matchesSearch =
      title.includes(searchQuery) ||
      description.includes(searchQuery);

    const matchesFilter =
      filter === "All" || task.status === filter;

    return matchesSearch && matchesFilter;
  });

  $("taskList").innerHTML = filteredTasks
    .map(taskTemplate)
    .join("");

  $("emptyState").classList.toggle(
    "hidden",
    filteredTasks.length > 0
  );

  $("taskCountLabel").textContent =
    `${filteredTasks.length} ${
      filteredTasks.length === 1 ? "task" : "tasks"
    }`;

  $("clearSearch").classList.toggle(
    "hidden",
    !searchQuery
  );

  $("activeFilter").classList.toggle(
    "hidden",
    filter === "All"
  );

  if (filter !== "All") {
    $("activeFilterText").textContent = filter;
  }

  /* Keep stat cards visually synchronized */
  document.querySelectorAll(".stat-card").forEach((card) => {
    card.classList.toggle(
      "active",
      card.dataset.filter === filter
    );
  });
}

/* =========================
   TASK CARD
========================= */

function taskTemplate(task) {
  const statusClass =
    task.status === "Completed"
      ? "completed"
      : task.status === "In Progress"
      ? "progress"
      : "pending";

  return `
    <article class="task">

      <div class="task-top">

        <div>
          <h3>${escapeHtml(task.title)}</h3>

          <p>
            ${escapeHtml(
              task.description || "No description added."
            )}
          </p>
        </div>

        <span class="badge ${statusClass}">
          ${escapeHtml(task.status)}
        </span>

      </div>

      <div class="task-bottom">

        <span class="task-date">
          Created ${formatDate(task.created_at)}
        </span>

        <div class="actions">

          <button
            class="action"
            type="button"
            onclick="editTask(${task.id})"
            aria-label="Edit ${escapeHtml(task.title)}"
          >
            Edit
          </button>

          <button
            class="action delete"
            type="button"
            onclick="deleteTask(${task.id})"
            aria-label="Delete ${escapeHtml(task.title)}"
          >
            Delete
          </button>

        </div>

      </div>

    </article>
  `;
}

/* =========================
   STATISTICS
========================= */

function updateStats() {
  const total = tasks.length;

  const pending = tasks.filter(
    (task) => task.status === "Pending"
  ).length;

  const inProgress = tasks.filter(
    (task) => task.status === "In Progress"
  ).length;

  const completed = tasks.filter(
    (task) => task.status === "Completed"
  ).length;

  $("totalCount").textContent = total;
  $("pendingCount").textContent = pending;
  $("progressCount").textContent = inProgress;
  $("completedCount").textContent = completed;
}

/* =========================
   PROGRESS
========================= */

function updateProgress() {
  const total = tasks.length;

  const completed = tasks.filter(
    (task) => task.status === "Completed"
  ).length;

  const percentage = total
    ? Math.round((completed / total) * 100)
    : 0;

  $("completionPercent").textContent =
    `${percentage}%`;

  $("completionBar").style.width =
    `${percentage}%`;

  if (!total) {
    $("progressTitle").textContent =
      "Let's get started 🚀";

    $("progressText").textContent =
      "Add your first task and build your progress.";

    return;
  }

  if (percentage === 100) {
    $("progressTitle").textContent =
      "Everything completed! 🎉";

    $("progressText").textContent =
      "Amazing work! You've completed every task.";
  } else if (percentage >= 70) {
    $("progressTitle").textContent =
      "You're on a roll! 🔥";

    $("progressText").textContent =
      `${completed} of ${total} tasks completed. Keep going!`;
  } else {
    $("progressTitle").textContent =
      "Keep the momentum going 💪";

    $("progressText").textContent =
      `${completed} of ${total} tasks completed. Every task counts.`;
  }
}

/* =========================
   ADD / UPDATE TASK
========================= */

$("taskForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  $("formMessage").textContent = "";

  const isEditing = Boolean(editingId);

  const payload = {
    title: $("title").value.trim(),
    description: $("description").value.trim(),
    status: $("status").value
  };

  if (!payload.title) {
    $("formMessage").textContent =
      "Please enter a task title.";

    $("title").focus();

    return;
  }

  $("submitButton").disabled = true;

  $("submitButton").textContent =
    isEditing ? "Saving..." : "Adding...";

  try {
    await request(
      isEditing
        ? `/api/tasks/${editingId}`
        : "/api/tasks",
      {
        method: isEditing ? "PUT" : "POST",
        body: JSON.stringify(payload)
      }
    );

    resetForm();

    await loadTasks();

    showToast(
      isEditing
        ? "Task updated successfully ✨"
        : "Task added successfully 🎉"
    );

  } catch (error) {
    $("formMessage").textContent =
      error.message;

  } finally {
    $("submitButton").disabled = false;

    if (!editingId) {
      $("submitButton").innerHTML =
        "<span>＋</span> Add Task";
    }
  }
});

/* =========================
   EDIT TASK
========================= */

window.editTask = (id) => {
  const task = tasks.find(
    (item) => item.id === id
  );

  if (!task) return;

  editingId = id;

  $("title").value = task.title;
  $("description").value = task.description || "";
  $("status").value = task.status;

  $("formHeading").textContent =
    "Edit Task";

  $("submitButton").textContent =
    "Save Changes";

  $("cancelEdit").classList.remove(
    "hidden"
  );

  $("formPanel").scrollIntoView({
    behavior: "smooth",
    block: "start"
  });

  setTimeout(() => {
    $("title").focus();
  }, 350);
};

/* =========================
   DELETE TASK
========================= */

window.deleteTask = async (id) => {
  const task = tasks.find(
    (item) => item.id === id
  );

  if (!task) return;

  const confirmed = confirm(
    `Delete "${task.title}"?\n\nThis action cannot be undone.`
  );

  if (!confirmed) return;

  try {
    await request(
      `/api/tasks/${id}`,
      {
        method: "DELETE"
      }
    );

    if (editingId === id) {
      resetForm();
    }

    await loadTasks();

    showToast(
      "Task deleted successfully"
    );

  } catch (error) {
    showToast(error.message);
  }
};

/* =========================
   RESET FORM
========================= */

function resetForm() {
  $("taskForm").reset();

  editingId = null;

  $("status").value = "Pending";

  $("formHeading").textContent =
    "Add a Task";

  $("submitButton").innerHTML =
    "<span>＋</span> Add Task";

  $("cancelEdit").classList.add(
    "hidden"
  );

  $("formMessage").textContent = "";
}

$("cancelEdit").onclick = resetForm;

/* =========================
   SEARCH
========================= */

$("searchInput").addEventListener(
  "input",
  renderTasks
);

$("clearSearch").onclick = () => {
  $("searchInput").value = "";

  renderTasks();

  $("searchInput").focus();
};

/* =========================
   FILTER
========================= */

$("filterStatus").addEventListener(
  "change",
  renderTasks
);

$("clearFilter").onclick = () => {
  $("filterStatus").value = "All";

  renderTasks();
};

/* =========================
   STAT CARD FILTERING
========================= */

document.querySelectorAll(".stat-card").forEach(
  (card) => {

    card.addEventListener("click", () => {

      const selectedFilter =
        card.dataset.filter;

      $("filterStatus").value =
        selectedFilter;

      renderTasks();

      /*
       * FIXED:
       * The old code searched for
       * "tasks-panel", but the HTML
       * didn't have that ID.
       */

      const tasksPanel =
        $("tasksPanel") ||
        document.querySelector(".tasks-panel");

      if (tasksPanel) {
        tasksPanel.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
      }
    });

  }
);

/* =========================
   QUICK ADD
========================= */

$("quickAdd").onclick = () => {

  resetForm();

  $("formPanel").scrollIntoView({
    behavior: "smooth",
    block: "start"
  });

  setTimeout(() => {
    $("title").focus();
  }, 350);
};

/* =========================
   TOAST
========================= */

function showToast(message) {
  clearTimeout(toastTimer);

  $("toast").textContent = message;

  $("toast").classList.add("show");

  toastTimer = setTimeout(() => {
    $("toast").classList.remove("show");
  }, 2500);
}

/* =========================
   DATE FORMAT
========================= */

function formatDate(value) {
  if (!value) return "Unknown date";

  const date = new Date(
    value.replace(" ", "T") + "Z"
  );

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString(
    undefined,
    {
      day: "numeric",
      month: "short",
      year: "numeric"
    }
  );
}

/* =========================
   SECURITY
========================= */

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/* =========================
   DARK / LIGHT MODE
========================= */

const savedTheme =
  localStorage.getItem("taskflow-theme");

if (savedTheme === "dark") {
  document.body.classList.add("dark");
}

function updateThemeButton() {
  const isDark =
    document.body.classList.contains("dark");

  $("themeToggle").innerHTML = isDark
    ? "☀ <span>Theme</span>"
    : "☾ <span>Theme</span>";

  $("themeToggle").setAttribute(
    "aria-pressed",
    String(isDark)
  );

  $("themeToggle").setAttribute(
    "aria-label",
    isDark
      ? "Switch to light mode"
      : "Switch to dark mode"
  );
}

$("themeToggle").onclick = () => {

  document.body.classList.toggle("dark");

  const isDark =
    document.body.classList.contains("dark");

  localStorage.setItem(
    "taskflow-theme",
    isDark ? "dark" : "light"
  );

  updateThemeButton();

  showToast(
    isDark
      ? "Dark mode enabled 🌙"
      : "Light mode enabled ☀️"
  );
};

updateThemeButton();

/* =========================
   KEYBOARD SHORTCUTS
========================= */

document.addEventListener(
  "keydown",
  (event) => {

    /* Ctrl + K / Cmd + K → Search */
    if (
      (event.ctrlKey || event.metaKey) &&
      event.key.toLowerCase() === "k"
    ) {
      event.preventDefault();

      $("searchInput").focus();
    }

    /* Escape → Cancel editing */
    if (
      event.key === "Escape" &&
      editingId
    ) {
      resetForm();
    }

  }
);

/* =========================
   START APPLICATION
========================= */

loadTasks();