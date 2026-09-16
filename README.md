# TaskFlow — Student Task Manager

A complete full-stack CRUD application built for the **CRUD Application with a Real Database** assignment.

## ✨ Features

- ✅ Create tasks
- ✅ View all tasks
- ✅ Edit existing tasks
- ✅ Delete tasks
- ✅ Persistent SQLite database
- ✅ Search tasks
- ✅ Filter tasks by status
- ✅ Task statistics dashboard
- ✅ Form validation
- ✅ Loading and empty states
- ✅ Responsive design for mobile and desktop
- ✅ REST API
- ✅ Render-ready Node.js configuration

## 🛠️ Tech Stack

- **Frontend:** HTML5, CSS3, Vanilla JavaScript
- **Backend:** Node.js + Express
- **Database:** SQLite using better-sqlite3
- **Deployment:** Render

## 📁 Project Structure

```text
CRUD-application/
├── public/
│   ├── index.html
│   ├── style.css
│   └── script.js
├── .gitignore
├── package.json
├── README.md
└── server.js

The SQLite database file is generated automatically when the server starts and is excluded from Git.
🚀 Run Locally
Make sure Node.js 18+ is installed.
1. Install Dependencies
npm install
2. Start the Application
npm start
3. Open in Browser
http://localhost:10000
💻 Development
For development, run:
npm run dev
🔌 API Endpoints
Method
Endpoint
Purpose
GET
/api/health
Health check
GET
/api/tasks
Get all tasks
GET
/api/tasks/:id
Get one task
POST
/api/tasks
Create task
PUT
/api/tasks/:id
Update task
DELETE
/api/tasks/:id
Delete task

🔄 CRUD Flow
User fills in the task form.
Frontend sends a POST request to the Express API.
Express validates the input.
SQLite stores the record.
The updated task list is returned to the browser.
Refreshing the page loads the stored records from the database.
☁️ Deployment on Render
Create a Web Service connected to this GitHub repository.
Render Configuration
Runtime: Node
Build Command: npm install
Start Command: npm start
Branch: main
The server listens on Render's PORT environment variable and 0.0.0.0.
Note: SQLite is a real database and persists data during the lifetime of the deployed service's filesystem. For production-grade persistence across infrastructure replacement, use a managed PostgreSQL database.