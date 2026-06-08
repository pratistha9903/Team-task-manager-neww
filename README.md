# Team Task Manager — Full-Stack Web App

A full-stack Team Task Manager with authentication, role-based access control, project management, and task tracking.

## Tech Stack

| Layer    | Tech                  |
| -------- | --------------------- |
| Backend  | Node.js, Express.js   |
| Database | PostgreSQL (Neon)     |
| ORM      | Prisma ORM            |
| Auth     | JWT (JSON Web Tokens) |
| Frontend | React + Vite          |
| Styling  | Tailwind CSS          |

## Features

* **Authentication** — Signup / Login with JWT; protected routes
* **Role-based Access** — Global roles (Admin / Member) + per-project roles
* **Projects** — Create, view, edit, delete projects; manage team members
* **Tasks** — Create tasks with title, description, status, priority, due date, assignee
* **Dashboard** — Stats overview, overdue tasks, recent activity
* **Filters** — Filter tasks by status, priority, or "assigned to me"

## Database Schema

```text
User          → id, name, email, password, role (ADMIN/MEMBER)
Project       → id, name, description, ownerId
ProjectMember → projectId, userId, role (ADMIN/MEMBER)
Task          → id, title, description, status, priority, dueDate, projectId, assigneeId, creatorId
```

## Getting Started

### Backend

```bash
cd backend
npm install
npx prisma generate
npx prisma migrate deploy
npm run dev
```

Backend runs on:

```text
http://localhost:5000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on:

```text
http://localhost:5173
```

## Environment Variables

Create a `.env` file inside the backend directory:

```env
DATABASE_URL="your_neon_postgresql_connection_string"
JWT_SECRET="your_jwt_secret"
PORT=5000
```

## REST API Endpoints

### Auth

| Method | Route              | Description                     |
| ------ | ------------------ | ------------------------------- |
| POST   | `/api/auth/signup` | Register new user               |
| POST   | `/api/auth/login`  | Login                           |
| GET    | `/api/auth/me`     | Get current user (JWT required) |

### Projects

| Method | Route                               | Auth                 | Description                             |
| ------ | ----------------------------------- | -------------------- | --------------------------------------- |
| GET    | `/api/projects`                     | Any                  | List my projects                        |
| POST   | `/api/projects`                     | Any                  | Create project                          |
| GET    | `/api/projects/:id`                 | Member               | Get project details, tasks, and members |
| PUT    | `/api/projects/:id`                 | Project Admin        | Update project                          |
| DELETE | `/api/projects/:id`                 | Owner / Global Admin | Delete project                          |
| POST   | `/api/projects/:id/members`         | Project Admin        | Add member                              |
| DELETE | `/api/projects/:id/members/:userId` | Project Admin        | Remove member                           |

### Tasks

| Method | Route                  | Auth                       | Description                                         |
| ------ | ---------------------- | -------------------------- | --------------------------------------------------- |
| GET    | `/api/tasks/dashboard` | Any                        | Dashboard stats, overdue tasks, and recent activity |
| GET    | `/api/tasks`           | Any                        | List tasks with filters                             |
| POST   | `/api/tasks`           | Project Member             | Create task                                         |
| GET    | `/api/tasks/:id`       | Project Member             | Get task details                                    |
| PUT    | `/api/tasks/:id`       | Assignee / Creator / Admin | Update task                                         |
| DELETE | `/api/tasks/:id`       | Creator / Admin            | Delete task                                         |

### Users

| Method | Route                  | Auth | Description                   |
| ------ | ---------------------- | ---- | ----------------------------- |
| GET    | `/api/users`           | Any  | List all users                |
| GET    | `/api/users/search?q=` | Any  | Search users by name or email |

## Role-Based Access Control

| Action             | Who can do it                       |
| ------------------ | ----------------------------------- |
| Create project     | Any logged-in user                  |
| Add/remove members | Project admin                       |
| Delete project     | Project owner or global admin       |
| Create task        | Any project member                  |
| Update task        | Assignee, creator, or project admin |
| Assign task        | Project admin                       |
| Delete task        | Creator or project admin            |

## Architecture

```text
React Frontend
       │
       ▼
Express REST API
       │
       ▼
Prisma ORM
       │
       ▼
Neon PostgreSQL
```

## Deployment

### Frontend

https://team-task-manager-neww-frontend.onrender.com

### Backend

Hosted on Render

### Database

Neon PostgreSQL

## Demo Video

https://github.com/user-attachments/assets/a8447d95-bb90-478a-96d4-fb39927ed976

## License

MIT License
