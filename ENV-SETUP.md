# Environment setup

Real `.env` files stay on your machine. They are listed in `.gitignore` and `.dockerignore`, so Git and Docker image builds do not include them. Commit `.sample.env` instead.

## 1. Create your env files

From the `slack-dev` folder:

```bash
copy slack-dev-client\.sample.env slack-dev-client\.env
copy slack-dev-server\config\.sample.env slack-dev-server\config\.env
```

On macOS or Linux, use `cp` instead of `copy`.

Open both new `.env` files and replace every empty value and every `change-me` with your own keys. Do not commit those files.

## 2. What each file is for

`slack-dev-client/.env` is read by the Vite app. `VITE_API_URL` should be `http://localhost:4000` when the API runs on your machine.

`slack-dev-server/config/.env` is read by the API on startup. `MONGODB_URI` and `JWT_SECRET` are required. Leave email, GitHub, Stripe, Zoom, and Cloudinary blank until you use those features.

## 3. Run with Docker Compose

Docker Compose still reads the local `.env` files. It does not bake them into the images.

```bash
docker compose up --build
```

Inside Compose, Redis is `redis` and RabbitMQ is `rabbitmq`. The compose file overrides those hostnames, plus the public URLs, for the server container. Your `.env` can keep `localhost` for running the API outside Docker.

The app is at http://localhost:5173. The API is at http://localhost:4000.

## 4. Run without Docker

Start MongoDB, Redis, and RabbitMQ yourself, then:

```bash
cd slack-dev-server
npm install
npm run dev
```

```bash
cd slack-dev-client
npm install
npm run dev
```

If `config/.env` is missing and `MONGODB_URI` is not already set, the server stops and points you back to this file.
