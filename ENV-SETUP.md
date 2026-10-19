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

## 5. How someone uses Docker

They clone the project, create the two env files, paste their own keys, and start Compose. The containers read those files when they start. The files are not stored inside the images.

```bash
copy slack-dev-client\.sample.env slack-dev-client\.env
copy slack-dev-server\config\.sample.env slack-dev-server\config\.env
```

Open `slack-dev-server\config\.env` and set `MONGODB_URI`, `JWT_SECRET`, and `ENCRYPTION_KEY`. For Docker, MongoDB on the Windows host is not `localhost` inside the container. Use:

```env
MONGODB_URI=mongodb://host.docker.internal:27017/slack-devs
```

Open `slack-dev-client\.env` and paste the Stripe publishable key, GitHub client id, and the same encryption key.

From the `slack-dev` folder:

```bash
docker compose up --build
```

App: http://localhost:5173. API: http://localhost:4000.

After you edit an env file, create the containers again so they pick up the new values:

```bash
docker compose up -d --force-recreate
```

## 6. Push the images to Docker Hub

Create a Docker Hub account, then sign in. Replace `yourname` with your Docker Hub username. Only the client and server images are yours. Redis and RabbitMQ stay on their public images.

```powershell
docker login
$env:DOCKERHUB_USER = "yourname"
docker compose build server client
docker compose push server client
```

In Command Prompt the username line is `set DOCKERHUB_USER=yourname`.

Someone else runs them with:

```powershell
$env:DOCKERHUB_USER = "yourname"
docker compose pull server client
docker compose up
```

They still need their own `.env` files on that machine. Pulling the image does not include your keys.
