# UberFix Project Operating Rules

This document defines mandatory working rules for any human or AI assistant operating on the UberFix project.

## 1. Evidence-first rule

No operational instruction, deployment command, path, package manager decision, dependency assumption, domain decision, or infrastructure claim may be given as fact unless it is verified from one of the following sources:

1. Live terminal output from the target server.
2. Repository files from the active branch.
3. Official provider documentation.
4. Supabase, Docker, GitHub, DNS, or hosting dashboard values explicitly supplied by the project owner.

If a value is proposed without verification, it must be clearly labeled as a proposal, not as the current state.

## 2. No guessing rule

Guessing is prohibited for:

- Server paths.
- Installed software versions.
- Package manager selection.
- Docker / Docker Compose availability.
- Supabase project references.
- Secrets and environment variable names.
- Production domains.
- Database status.
- Deployment status.
- Running services.
- Git branch state.
- Build readiness.

Every command must be based on verified context or must begin with a diagnostic command that proves the context.

## 3. Current-state before action

Before giving an action command, first collect or request the minimum required state.

Examples:

```bash
pwd
ls -la
node -v
npm -v
pnpm -v
docker --version
docker compose version || true
systemctl is-active docker || true
git remote -v
git branch --show-current
```

The result of these commands controls the next step.

## 4. Separate proposals from facts

Use clear language:

- `Verified:` for facts proven by output or repository files.
- `Proposed:` for recommended structure or future production layout.
- `Unknown:` for anything not yet checked.
- `Next diagnostic:` for commands whose purpose is only inspection.

Never present a proposed production path as if it already exists on the server.

## 5. Production path policy

The accepted project source path for this server session is:

```bash
/home/azab/core/uberfix.shop
```

This path is valid only after the repository is actually cloned there and verified with:

```bash
cd /home/azab/core/uberfix.shop
pwd
git remote -v
cat package.json
```

Build output should be generated from the source path and later served from an explicit web root such as:

```bash
/var/www/uberfix.shop
```

The web root must not be assumed to exist until verified or created.

## 6. Package manager policy

The package manager must be selected from actual repository files and `package.json` engines.

If `package.json` requires:

```json
{
  "node": ">=24.0.0",
  "pnpm": ">=11.0.0",
  "npm": ">=11.0.0"
}
```

Then the server must satisfy those versions before install or build.

Use:

```bash
node -v
npm -v
pnpm -v
ls -la | grep -E "pnpm-lock.yaml|package-lock.json|yarn.lock"
```

The lockfile decides the safest install command.

## 7. Docker policy

Do not assume Docker Compose exists because Docker Engine exists.

Always verify separately:

```bash
docker --version
docker compose version || true
docker buildx version || true
sudo systemctl is-active docker || true
```

If `docker compose` is unavailable, the next step must inspect the installed Docker source and apt repositories before changing packages:

```bash
apt-cache policy docker.io docker-ce docker-compose-plugin docker-buildx-plugin
apt-cache search docker-compose | head -20
```

## 8. Supabase policy

Do not run `supabase start` on the production server unless the goal is explicitly local/self-hosted Supabase.

For the hosted Supabase project, link only from the repository root after confirming:

```bash
cat supabase/config.toml
```

The UberFix project reference currently stored in the repository is:

```text
zrrffsjbfkphridqyais
```

Secrets must be stored outside Git, for example:

```bash
/home/azab/core/env/supabase-cli.env
```

Never print access tokens, service-role keys, database passwords, or OAuth secrets in chat or logs.

## 9. Commands must be reversible when possible

Before destructive actions, inspect first.

Examples:

- Before deleting files, show what will be deleted.
- Before removing packages, show installed packages and sources.
- Before overwriting configuration, back up the existing file.
- Before deploying, confirm current branch, commit, build output, and web root.

## 10. Deployment readiness gate

A deployment step is not allowed until these checks pass:

```bash
pwd
git status --short
git branch --show-current
git rev-parse --short HEAD
node -v
npm -v
pnpm -v
pnpm install --frozen-lockfile || pnpm install
pnpm run build
ls -la dist
```

If any check fails, stop and diagnose the exact failure. Do not continue to Nginx, SSL, or service reload steps.

## 11. Communication rule

For this project, responses must be operational, evidence-based, and direct.

Every technical answer should identify:

- What is verified.
- What is unknown.
- What command proves the next state.
- What action follows only after the proof.

Do not fill missing information with assumptions.
