# bsky.mk – Bluesky Community Handles

This project powers **bsky.mk**, a self-hosted Bluesky community handle service.

It allows people to claim handles like:

```
@username.bsky.mk
```

and automatically resolves them through the ATProto protocol used by Bluesky.

Example:

```
@x.bsky.mk
@nina.bsky.mk
```

Each handle maps to a DID record served at:

```
https://<handle>.bsky.mk/.well-known/atproto-did
```

Bluesky clients resolve this endpoint to confirm ownership.

---

# Project Origins

This project is based on the open source **Bluesky Community Handles tool** created by:

https://github.com/mozzius/community-handles

That project was originally built for communities like:

```
@user.swifties.social
```

Huge credit to the original author for creating the foundation for community handle infrastructure.

This repository is now a **self-hosted adaptation for bsky.mk**, modified to run on our own infrastructure rather than the original Vercel-based deployment model.

Changes include:

- self-hosting instead of Vercel
- Dockerized deployment
- Traefik wildcard routing
- Dokploy application management
- infrastructure documentation
- middleware fixes for reverse proxy environments

---

# What is a Community Handle?

A **community handle** allows many users to have Bluesky handles under a shared domain.

Example:

```
@alisa.bsky.mk
@bobi.bsky.mk
```

Each user receives their own subdomain which resolves to their Bluesky DID.

This is done through the ATProto standard endpoint:

```
.well-known/atproto-did
```

Bluesky clients automatically fetch this endpoint when resolving a handle.

---

# Architecture

The service runs as a **Next.js application with PostgreSQL**.

### Application

Next.js application with middleware routing.

Routes are internally structured as:

```
/[domain]/[handle]
```

Example internal route:

```
/bsky.mk/100/.well-known/atproto-did
```

### Middleware

The middleware performs host-based routing.

Example request:

```
x.bsky.mk/.well-known/atproto-did
```

is rewritten internally to:

```
/bsky.mk/100/.well-known/atproto-did
```

This allows Next.js dynamic routes to resolve the correct handle.

---

# Infrastructure (Current Production Setup)

The service is deployed on a self-hosted server using:

- **Dokploy** – application platform
- **Traefik** – reverse proxy
- **Docker** – container runtime
- **PostgreSQL** – database

### Networking Flow

```
Internet
   │
   ▼
Traefik (wildcard routing)
   │
   ▼
Dokploy managed container
   │
   ▼
Next.js application
   │
   ▼
PostgreSQL database
```

---

# Wildcard Routing

Handles are served through wildcard subdomains:

```
*.bsky.mk
```

Example:

```
x.bsky.mk
nina.bsky.mk
```

### Important

Dokploy currently has issues handling wildcard domains directly.

Because of this, wildcard routing is handled via a **custom Traefik dynamic configuration file**.

Location:

```
/etc/dokploy/traefik/dynamic/bskymk-wildcard.yml
```

This rule forwards all subdomains to the application container.

Example rule:

```
HostRegexp(`{handle:[a-zA-Z0-9-]+}.bsky.mk`)
```

When Dokploy adds stable wildcard support this workaround can be removed.

---

# Middleware Fixes for Self-Hosting

The upstream project assumed it would run behind **Vercel**.

When self-hosting behind Traefik we had to adjust middleware behavior.

### Fix 1 – Correct hostname detection

Original code relied on:

```
url.hostname
```

Behind a reverse proxy this becomes `localhost`.

The fix uses forwarded headers:

```
x-forwarded-host
host
```

This allows correct detection of:

```
x.bsky.mk
bsky.mk
```

---

### Fix 2 – Prevent static asset rewrites

Original middleware rewrote **every request**, including Next.js assets like:

```
/_next/static/...
```

This broke CSS and JS loading.

The middleware now explicitly bypasses rewrites for:

```
/_next/*
/api/*
/js/*
/proxy/*
```

This allows Next.js assets to load normally.

---

# Database

Handles and user mappings are stored in PostgreSQL using Prisma.

Typical schema entities include:

```
Domain
User
Handle
```

Each handle maps to a DID.

---

# Deployment

Deployment is handled through **Dokploy**.

Each deploy:

1. Pulls from the Git repository
2. Builds the Docker image
3. Starts a container
4. Traefik automatically routes traffic

Redeploying does **not affect wildcard routing** because that is handled outside Dokploy.

---

# Repository Structure

```
app/
components/
lib/
prisma/
public/
styles/
middleware.ts
next.config.mjs
```

Key files:

```
middleware.ts
```

Host-based routing logic.

```
prisma/
```

Database schema.

```
public/
```

Static assets.

---

# Operational Notes

### Wildcard routing override

Wildcard routing is currently handled by:

```
/etc/dokploy/traefik/dynamic/bskymk-wildcard.yml
```

This exists because Dokploy wildcard handling is currently unreliable.

When Dokploy fixes this upstream the override can be removed.

---

### Archived stacks

Previous deployments are archived under:

```
/opt/_archived/
```

Docker compose files inside archived stacks are renamed to prevent accidental startup.

---

### Migration backups

Temporary migration data is stored under:

```
/opt/_migrations/
```

These are safe to delete once migrations are fully confirmed.

---

# Future Improvements

Possible future work:

- UI improvements
- better onboarding for communities
- improved error handling (404 vs 500)
- rate limiting
- caching DID responses
- admin interface

The current implementation focuses on **reliable infrastructure and handle resolution**.

---

# Credits

Original project:

https://github.com/mozzius/community-handles

Thank you to **@mozzius** for creating the original open source tool that made community handles possible.

This repository represents a **self-hosted deployment and infrastructure adaptation** for the **bsky.mk** community.

---

# License

Same license as the upstream project unless otherwise specified.
