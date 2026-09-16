const express = require("express");
const path = require("path");
const Database = require("better-sqlite3");

const app = express();
const PORT = process.env.PORT || 10000;

const db = new Database(path.join(__dirname, "database.sqlite"));
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    status TEXT NOT NULL DEFAULT 'Pending'
      CHECK(status IN ('Pending', 'In Progress', 'Completed')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

function validateTask(body) {
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const description = typeof body.description === "string" ? body.description.trim() : "";
  const status = typeof body.status === "string" ? body.status : "Pending";
  const allowed = ["Pending", "In Progress", "Completed"];

  if (!title) return { error: "Task title is required." };
  if (title.length > 120) return { error: "Task title must be 120 characters or less." };
  if (description.length > 1000) return { error: "Description must be 1000 characters or less." };
  if (!allowed.includes(status)) return { error: "Invalid task status." };

  return { title, description, status };
}

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", database: "connected" });
});

app.get("/api/tasks", (req, res) => {
  const tasks = db.prepare(`
    SELECT id, title, description, status, created_at, updated_at
    FROM tasks
    ORDER BY id DESC
  `).all();

  res.json(tasks);
});

app.get("/api/tasks/:id", (req, res) => {
  const task = db.prepare(`
    SELECT id, title, description, status, created_at, updated_at
    FROM tasks WHERE id = ?
  `).get(Number(req.params.id));

  if (!task) return res.status(404).json({ error: "Task not found." });
  res.json(task);
});

app.post("/api/tasks", (req, res) => {
  const result = validateTask(req.body);
  if (result.error) return res.status(400).json(result);

  const info = db.prepare(`
    INSERT INTO tasks (title, description, status)
    VALUES (?, ?, ?)
  `).run(result.title, result.description, result.status);

  const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(info.lastInsertRowid);
  res.status(201).json(task);
});

app.put("/api/tasks/:id", (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: "Invalid task ID." });

  const result = validateTask(req.body);
  if (result.error) return res.status(400).json(result);

  const info = db.prepare(`
    UPDATE tasks
    SET title = ?, description = ?, status = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(result.title, result.description, result.status, id);

  if (!info.changes) return res.status(404).json({ error: "Task not found." });

  const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(id);
  res.json(task);
});

app.delete("/api/tasks/:id", (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: "Invalid task ID." });

  const info = db.prepare("DELETE FROM tasks WHERE id = ?").run(id);
  if (!info.changes) return res.status(404).json({ error: "Task not found." });

  res.json({ message: "Task deleted successfully." });
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Student Task Manager running on port ${PORT}`);
});