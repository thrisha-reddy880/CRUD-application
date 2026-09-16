const taskForm = document.getElementById("taskForm");
const titleInput = document.getElementById("title");
const descriptionInput = document.getElementById("description");
const statusInput = document.getElementById("status");
const submitButton = document.getElementById("submitButton");
const formHeading = document.getElementById("formHeading");
const formMessage = document.getElementById("formMessage");
const cancelEdit = document.getElementById("cancelEdit");
const taskList = document.getElementById("taskList");
const emptyState = document.getElementById("emptyState");
const loading = document.getElementById("loading");
const searchInput = document.getElementById("searchInput");
const filterStatus = document.getElementById("filterStatus");

let tasks = [];
let editingId = null;

async function request(url, options = {}) {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Something went wrong.");
  return data;
}

async function loadTasks() {
  loading.classList.remove("hidden");
  emptyState.classList.add("hidden");
  try {
    tasks = await request("/api/tasks");
    renderTasks();
    updateStats();
  } catch (error) {
    taskList.innerHTML = `<div class="state-box"><h3>Could not load tasks</h3><p>${escapeHtml(error.message)}</p></div>`;
  } finally {
    loading.classList.add("hidden");
  }
}

function renderTasks() {
  const search = searchInput.value.trim().toLowerCase();
  const filter = filterStatus.value;

  const visible = tasks.filter(task => {
    const matchesSearch =
      task.title.toLowerCase().includes(search) ||
      task.description.toLowerCase().includes(search);
    const matchesStatus = filter === "All" || task.status === filter;
    return matchesSearch && matchesStatus;
  });

  taskList.innerHTML = visible.map(taskTemplate).join("");
  emptyState.classList.toggle("hidden", visible.length !== 0);
  document.getElementById("taskCountLabel").textContent =
    `${visible.length} ${visible.length === 1 ? "task" : "tasks"}`;
}

function taskTemplate(task) {
  const badgeClass = task.status === "Completed" ? "completed" :
    task.status === "In Progress" ? "progress" : "pending";

  return `
    <article class="task">
      <div class="task-top">
        <div>
          <h3>${escapeHtml(task.title)}</h3>
          <p>${escapeHtml(task.description || "No description added.")}</p>
        </div>
        <span class="badge ${badgeClass}">${escapeHtml(task.status)}</span>
      </div>
      <div class="task-bottom">
        <span class="task-date">Created ${formatDate(task.created_at)}</span>
        <div class="actions">
          <button class="action" onclick="editTask(${task.id})">Edit</button>
          <button class="action delete" onclick="deleteTask(${task.id})">Delete</button>
        </div>
      </div>
    </article>
  `;
}

function updateStats() {
  document.getElementById("totalCount").textContent = tasks.length;
  document.getElementById("pendingCount").textContent =
    tasks.filter(t => t.status === "Pending").length;
  document.getElementById("progressCount").textContent =
    tasks.filter(t => t.status === "In Progress").length;
  document.getElementById("completedCount").textContent =
    tasks.filter(t => t.status === "Completed").length;
}

taskForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  formMessage.textContent = "";

  const payload = {
    title: titleInput.value.trim(),
    description: descriptionInput.value.trim(),
    status: statusInput.value
  };

  submitButton.disabled = true;
  submitButton.textContent = editingId ? "Saving..." : "Adding...";

  try {
    if (editingId) {
      await request(`/api/tasks/${editingId}`, {
        method: "PUT",
        body: JSON.stringify(payload)
      });
    } else {
      await request("/api/tasks", {
        method: "POST",
        body: JSON.stringify(payload)
      });
    }

    resetForm();
    await loadTasks();
  } catch (error) {
    formMessage.textContent = error.message;
  } finally {
    submitButton.disabled = false;
    submitButton.innerHTML = editingId ? "Save Changes" : "<span>＋</span> Add Task";
  }
});

window.editTask = function(id) {
  const task = tasks.find(item => item.id === id);
  if (!task) return;

  editingId = id;
  titleInput.value = task.title;
  descriptionInput.value = task.description;
  statusInput.value = task.status;

  formHeading.textContent = "Edit Task";
  submitButton.innerHTML = "Save Changes";
  cancelEdit.classList.remove("hidden");
  titleInput.focus();
  window.scrollTo({ top: 0, behavior: "smooth" });
};

window.deleteTask = async function(id) {
  const task = tasks.find(item => item.id === id);
  if (!task) return;

  const confirmed = confirm(`Delete "${task.title}"? This cannot be undone.`);
  if (!confirmed) return;

  try {
    await request(`/api/tasks/${id}`, { method: "DELETE" });
    if (editingId === id) resetForm();
    await loadTasks();
  } catch (error) {
    alert(error.message);
  }
};

cancelEdit.addEventListener("click", resetForm);
searchInput.addEventListener("input", renderTasks);
filterStatus.addEventListener("change", renderTasks);

function resetForm() {
  editingId = null;
  taskForm.reset();
  statusInput.value = "Pending";
  formHeading.textContent = "Add a Task";
  submitButton.innerHTML = "<span>＋</span> Add Task";
  cancelEdit.classList.add("hidden");
  formMessage.textContent = "";
}

function formatDate(value) {
  const date = new Date(value.replace(" ", "T") + "Z");
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

loadTasks();