<div align="center">
  <img src="public/logo.svg" alt="Slack Dev" width="96" height="96">

  <h1>Slack Dev Server</h1>
  <p>The API for Slack Dev: accounts, tasks, meetings, workspaces, chat, and GitHub-aware automations.</p>
</div>

Slack Dev Server is the backend for the Slack Dev workspace. It stores users, tasks, projects, and messages, and it pushes live updates over Socket.IO. The web app that talks to this API is the Slack Dev client, which runs on port 5173.

## What it covers

- Register, log in, email verification, and password reset
- Tasks with status, priority, assignees, and repositories
- Meetings, including online rooms on Jitsi
- Projects, purchases, and explore
- Workspaces, invitations, friends, and permissions
- Group and direct chat, with files stored for chat uploads
- Notifications and notes
- GitHub OAuth and pull-request sync that moves a task to In Progress or Done
- Overdue reminders, meeting follow-ups, a daily standup digest, and welcome mail
- Stripe payments and Cloudinary uploads
- Interactive API docs

## Stack

Node.js 22, TypeScript, Express 5, MongoDB and Mongoose, Redis, RabbitMQ, Socket.IO, JWT, Nodemailer, Stripe, and Swagger.

## Requirements

- Node.js 22
- npm
- MongoDB 6 or newer
- Redis
- RabbitMQ

Email, GitHub, Stripe, Zoom, and Cloudinary are optional until you use those features.

## Install locally

```bash
git clone https://github.com/Jawad-Ali-Soomro/slack-dev-server.git
cd slack-dev-server
copy config\.sample.env config\.env
npm install
npm run dev
```

On macOS or Linux, use `cp config/.sample.env config/.env` instead of `copy`.

The API listens on http://localhost:4000. API docs are at http://localhost:4000/api-docs. Health is at http://localhost:4000/api/health.

Open `config/.env` and set at least `MONGODB_URI` and `JWT_SECRET`. Replace every `change-me`. Do not commit `config/.env`. The sample and the longer notes are in [config/.sample.env](config/.sample.env) and [ENV-SETUP.md](ENV-SETUP.md).

```env
PORT=4000
MONGODB_URI=mongodb://localhost:27017/slack-devs
JWT_SECRET=change-me
CLIENT_URL=http://localhost:5173
REDIS_URL=redis://localhost:6379
RABBITMQ_URL=amqp://slack:slack@localhost:5672
```

`CLIENT_URL` is the browser origin allowed by CORS. `ENCRYPTION_KEY` must match `VITE_ENCRYPTION_KEY` in the client. `GITHUB_CLIENT_ID` must match `VITE_CLIENT_ID`.

### Seed data

With MongoDB running and `config/.env` filled in:

```bash
npm run seed
npm run seed:workspace
```

`npm run seed:challenges` loads the learning challenges.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the API with reload |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run the compiled server |
| `npm run seed` | Seed base data |
| `npm run seed:workspace` | Seed a workspace |

## API groups

All routes are under `/api`.

| Path | Area |
| --- | --- |
| `/api/auth` | Register, login, email OTP, GitHub connect |
| `/api/tasks` | Tasks |
| `/api/meetings` | Meetings |
| `/api/projects` | Projects |
| `/api/teams` | Workspaces |
| `/api/chat` | Messages |
| `/api/friends` | Friends |
| `/api/automations` | Automation switches |
| `/api/notifications` | Notifications |
| `/api/explore` | Public projects |
| `/api/permissions` | Roles and permissions |

## Layout

```
config/         Env loading and .sample.env
controllers/    Request handlers
models/         Mongoose models
routes/         Express routers
services/       Chat, Redis, RabbitMQ, automations, cron
templates/      Email templates
public/         logo.svg
index.ts        Process entry
```

Automations run on a schedule after an admin enables them. Pull-request sync checks GitHub every 5 minutes. A matching open pull request sets the task to In Progress. A merged pull request sets it to Done. A group-chat note is posted only when the person who assigned the task is already in that workspace chat.

## Docker

From the parent `slack-dev` folder, after `config/.env` exists:

```bash
docker compose up --build
```

Compose points this service at the Redis and RabbitMQ containers and publishes port 4000. The image build does not copy `config/.env`.

## If it will not start

- `Environment file not found`: copy `config/.sample.env` to `config/.env`.
- MongoDB connection errors: MongoDB is not running, or `MONGODB_URI` is wrong.
- Redis or RabbitMQ errors: start those services, or use Docker Compose, which starts both.
- The browser cannot call the API: `CLIENT_URL` must be `http://localhost:5173`.
