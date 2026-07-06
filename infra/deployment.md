# Production deployment

Target shape:

- `https://YOUR_DOMAIN` serves the Next.js web app.
- `https://YOUR_DOMAIN/api/*` proxies to the NestJS API.
- `Caddy` manages HTTPS certificates automatically.
- `Postgres` and `Redis` run inside the private Docker network.

## 1. Prepare the Droplet

Install Docker, Docker Compose plugin, Git, and clone the repo:

```sh
sudo mkdir -p /opt/3s-design
sudo chown -R "$USER":"$USER" /opt/3s-design
git clone YOUR_REPO_URL /opt/3s-design
cd /opt/3s-design
cp .env.production.example .env.production
```

Edit `.env.production` and replace every placeholder value.

## 2. DNS

Create an `A` record:

```txt
YOUR_DOMAIN -> DROPLET_PUBLIC_IP
```

## 3. GitHub secrets

Add these repository secrets:

```txt
DROPLET_HOST
DROPLET_USER
DROPLET_SSH_KEY
```

The deploy workflow publishes images to `GHCR` and then runs:

```sh
sh scripts/deploy-prod.sh
```

## 4. First manual deploy

On the Droplet:

```sh
cd /opt/3s-design
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
```

Then create the first admin user:

```sh
docker compose --env-file .env.production -f docker-compose.prod.yml exec api pnpm --filter @3s-design/api seed:admin
```

## 5. Health checks

```sh
curl https://YOUR_DOMAIN/api/health
curl https://YOUR_DOMAIN
```

Expected API response:

```json
{ "ok": true, "service": "api", "databaseConfigured": true }
```
