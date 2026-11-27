# VoxWard k3s Deployment Guide (`deploy/k3s/`)

VoxWard provides two separate k3s deployment overlays backed by a single multi-stage Node 24 container image ([Dockerfile](../../Dockerfile)):

| Deployment | Manifests | Entrypoint | Storage | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **Sandbox** | [`deploy/k3s/sandbox/`](sandbox/kustomization.yaml) | `apps/server/dist/sandbox-main.js` | Ephemeral `emptyDir` (`/var/lib/voxward-sandbox`) | Kiroween 2026 online judge demo (`/sandbox`), stateless & isolated, no OAuth/production secrets |
| **Production** | [`deploy/k3s/production/`](production/kustomization.yaml) | `apps/server/dist/main.js` | Single `local-path` `ReadWriteOnce` PVC (`/var/lib/voxward`) | Self-hosted single-node production deployment with SQLite WAL persistence and one-time owner bootstrap |

> [!IMPORTANT]
> Neither `docker`/`podman` nor a live k3s control plane is required at repo check time; container image builds (`docker build`) and live `k3s kubectl apply` validation must be run on your build host / target k3s cluster.

---

## 1. Build, Digest Verification, and Import of the Container Image

The `Dockerfile` pins `node:24-bookworm-slim@sha256:873f586f3794f52281bd039bf02c048a0be08fde619338f9941bad1eb6b34530`, verifies the `pnpm@12.18.0` tarball SHA-256 checksum (`29d1d7d99bf6ec6d0a3dbb0ec5656f0d16e997e8be676ca45c581d11cb71f753`) before installing build tools (`better-sqlite3` bundles N-API prebuilds for `linux-x64` and `linux-arm64`), and runs as non-root UID/GID `10001`.

### Option A: Local build + offline digest verification + `k3s ctr images import` (single-node / air-gapped)

```bash
docker build -t ghcr.io/tpmoonchefryan/voxward:local .
docker save ghcr.io/tpmoonchefryan/voxward:local | sudo k3s ctr images import -
DIGEST=$(sudo k3s ctr images ls -q | grep voxward || true)
sudo k3s ctr images info ghcr.io/tpmoonchefryan/voxward:local
```

Inspect the imported OCI manifest digest (`sha256:...`), then update `appImage.digest` in `deploy/provenance.json` and replace `image: ghcr.io/tpmoonchefryan/voxward@sha256:<64-hex>` in [production/deployment.yaml](production/deployment.yaml), [production/bootstrap-owner-job.yaml](production/bootstrap-owner-job.yaml), and [sandbox/deployment.yaml](sandbox/deployment.yaml). Keep `imagePullPolicy: IfNotPresent` and re-run `node scripts/deploy-check.mjs --env-file deploy/server/server.env.example` before applying.

### Option B: Push to GHCR (or private registry) and pin immutable `@sha256:` digest

```bash
docker buildx build --push --provenance=mode=max -t ghcr.io/<org>/voxward:<tag> .
# Read the exact pushed manifest digest and record it in deploy/provenance.json + k3s manifests:
docker buildx imagetools inspect ghcr.io/<org>/voxward:<tag>
```

The repository manifests pin the immutable attested OCI digest (`ghcr.io/tpmoonchefryan/voxward@sha256:dca8691ecc042e9c692155ee363616916ce93a19e07b65371022952d98df588e`) built by [container-provenance.yml](../../.github/workflows/container-provenance.yml) and verified against `deploy/provenance.json` (`imageDigestStatus: verified`). Verify SLSA v1.0 provenance live before deploying:

```bash
node scripts/deploy-check.mjs --env-file deploy/server/server.env.example
node scripts/verify-provenance.mjs
```

Floating `:latest`, mutable tag-only references, and all-zero placeholder digests are rejected by `scripts/deploy-check.mjs`.

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
