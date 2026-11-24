# VoxWard k3s Deployment Guide (`deploy/k3s/`)

VoxWard provides two separate k3s deployment overlays backed by a single multi-stage Node 24 container image ([Dockerfile](../../Dockerfile)):

| Deployment | Manifests | Entrypoint | Storage | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **Sandbox** | [`deploy/k3s/sandbox/`](sandbox/kustomization.yaml) | `apps/server/dist/sandbox-main.js` | Ephemeral `emptyDir` (`/var/lib/voxward-sandbox`) | Kiroween 2026 online judge demo (`/sandbox`), stateless & isolated, no OAuth/production secrets |
| **Production** | [`deploy/k3s/production/`](production/kustomization.yaml) | `apps/server/dist/main.js` | Single `local-path` `ReadWriteOnce` PVC (`/var/lib/voxward`) | Self-hosted single-node production deployment with SQLite WAL persistence and one-time owner bootstrap |

> [!IMPORTANT]
> Neither `docker`/`podman` nor a live k3s control plane is required at repo check time; container image builds (`docker build`) and live `k3s kubectl apply` validation must be run on your build host / target k3s cluster.

---

## 1. Build and Import the Container Image

The `Dockerfile` uses `node:24-bookworm-slim` (`better-sqlite3@13.0.3` bundles N-API prebuilds for both `linux-x64` and `linux-arm64`) and runs as non-root UID/GID `10001`.

### Option A: Local build + `k3s ctr images import` (single-node / air-gapped)

```bash
docker build -t voxward:local .
docker save voxward:local | sudo k3s ctr images import -
```

Update `image:` in the target `deployment.yaml` (and `production/bootstrap-owner-job.yaml` for production) to `voxward:local`, keeping `imagePullPolicy: IfNotPresent`.

### Option B: Push to GHCR (or private registry)

```bash
docker build -t ghcr.io/<org>/voxward:<tag> .
docker push ghcr.io/<org>/voxward:<tag>
```

The default image reference in the manifests is `ghcr.io/tpmoonchefryan/voxward:rc0.1.0`.

---

## 2. Deploy Online `/sandbox` (Kiroween 2026 Demo)

1. Point DNS for your sandbox domain (for example `sandbox.voxward.example.com`) at your k3s Traefik Ingress node and replace the placeholder host in [sandbox/ingress.yaml](sandbox/ingress.yaml).
2. Create the TLS secret in namespace `voxward-sandbox` (or use `cert-manager`):

```bash
k3s kubectl create namespace voxward-sandbox --dry-run=client -o yaml | k3s kubectl apply -f -
k3s kubectl -n voxward-sandbox create secret tls voxward-sandbox-tls \
  --cert=/path/to/fullchain.pem \
  --key=/path/to/privkey.pem
```

3. Apply the sandbox kustomization:

```bash
k3s kubectl apply -k deploy/k3s/sandbox
k3s kubectl -n voxward-sandbox rollout status deploy/voxward-sandbox
```

4. Smoke-check health and UI routes:

```bash
curl -fsS https://sandbox.voxward.example.com/healthz
curl -fsSI https://sandbox.voxward.example.com/sandbox
```

`VOXWARD_SANDBOX_ENABLED=true` and `VOXWARD_SANDBOX_DB=/var/lib/voxward-sandbox/voxward-sandbox.sqlite3` satisfy `assertSandboxStartupSafe`, and `sandbox-main.js` refuses to start if any `GOOGLE_*` or `YOUTUBE_*` credential environment variables are injected.

---

## 3. Deploy Self-Hosted Production

1. Replace the placeholder host in [production/ingress.yaml](production/ingress.yaml) (`voxward.example.com`), configure DNS, and provision the TLS secret `voxward-tls` in namespace `voxward`:

```bash
k3s kubectl create namespace voxward --dry-run=client -o yaml | k3s kubectl apply -f -
k3s kubectl -n voxward create secret tls voxward-tls \
  --cert=/path/to/fullchain.pem \
  --key=/path/to/privkey.pem
```

2. Apply the base production resources (excludes the one-time bootstrap Job):

```bash
k3s kubectl apply -k deploy/k3s/production
k3s kubectl -n voxward rollout status deploy/voxward
```

3. Perform the **one-time Channel Owner bootstrap** (must pause the Deployment briefly so only one writer holds the `ReadWriteOnce` SQLite database):

```bash
k3s kubectl -n voxward scale deploy/voxward --replicas=0
k3s kubectl -n voxward wait --for=delete pod -l app.kubernetes.io/name=voxward,app.kubernetes.io/component=server --timeout=60s

# Choose a strong passphrase (>= 12 characters); avoid leaving it in shell history.
k3s kubectl -n voxward create secret generic voxward-bootstrap-secret \
  --from-literal=password='replace-with-strong-passphrase'

k3s kubectl apply -f deploy/k3s/production/bootstrap-owner-job.yaml
k3s kubectl -n voxward wait --for=condition=complete job/voxward-bootstrap-owner --timeout=60s
k3s kubectl -n voxward logs job/voxward-bootstrap-owner

# Clean up the bootstrap Job and secret before bringing the server back up.
k3s kubectl delete -f deploy/k3s/production/bootstrap-owner-job.yaml
k3s kubectl -n voxward delete secret voxward-bootstrap-secret

k3s kubectl -n voxward scale deploy/voxward --replicas=1
k3s kubectl -n voxward rollout status deploy/voxward
```

> [!NOTE]
> `bootstrap-owner.mjs` fails closed with `OWNER_ALREADY_BOOTSTRAPPED` if an active `CHANNEL_OWNER` already exists in the database.

4. Verify health and HTTPS UI:

```bash
curl -fsS https://voxward.example.com/healthz
curl -fsSI https://voxward.example.com/
```

---

## 4. Mandatory k3s Runtime Constraints

1. **`enableServiceLinks: false` is required on every PodSpec**
   `apps/server/src/config/load.ts` rejects any unrecognized `VOXWARD_*` environment variable with `CONFIG_UNKNOWN_KEY`. Naming a Service `voxward` without `enableServiceLinks: false` causes Kubernetes to inject `VOXWARD_SERVICE_HOST`, `VOXWARD_SERVICE_PORT`, and `VOXWARD_PORT=tcp://...`, crashing startup immediately.
2. **Single-replica SQLite WAL + `local-path` RWO + `Recreate`**
   Production opens SQLite with `journal_mode = WAL`, `synchronous = FULL`, and writes audit tombstones beside the database file (`/var/lib/voxward/tombstones`). Keep `replicas: 1`, `strategy.type: Recreate`, and `storageClassName: local-path` (`ReadWriteOnce`). Never mount SQLite WAL databases over NFS/SMB or run concurrent writers.
3. **Traefik TLS and `Host` header preservation**
   Session cookies (`vw_session`) set `HttpOnly; Secure; SameSite=Strict`, so browser clients must connect over `https://`. WebSocket handshakes (`authorizeSocketHandshake`) verify `Origin` matches `Host`; Traefik preserves `Host` and forwards WebSocket upgrades by default.
4. **Host clock synchronization (NTP)**
   Ensure k3s host nodes run NTP/chrony cleanly because OAuth token expirations, session lifetimes, and audit timestamps rely on accurate wall-clock time.
5. **Backups & rollbacks**
   Back up `/var/lib/voxward` cleanly before upgrades or schema changes following [`docs/deployment/backup-and-recovery.md`](../../docs/deployment/backup-and-recovery.md) and [`docs/deployment/upgrade-and-rollback.md`](../../docs/deployment/upgrade-and-rollback.md).
