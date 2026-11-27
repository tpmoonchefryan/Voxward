#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runDeployChecks } from "./deploy-check.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export function verifySlsaAttestationBundle(bundleResponse, provenance) {
  const expectedHex = String(provenance?.appImage?.digest ?? "").replace(/^sha256:/, "");
  const expectedRepo = String(provenance?.appImage?.repository ?? "");
  const expectedProv = provenance?.appImage?.provenance ?? {};

  const entries = Array.isArray(bundleResponse?.attestations) ? bundleResponse.attestations : [];
  if (entries.length === 0) {
    return { ok: false, reason: "ATTESTATION_MISSING" };
  }

  for (const entry of entries) {
    const payloadB64 = entry?.bundle?.dsseEnvelope?.payload;
    if (typeof payloadB64 !== "string" || payloadB64.length === 0) continue;
    let statement;
    try {
      statement = JSON.parse(Buffer.from(payloadB64, "base64").toString("utf8"));
    } catch {
      continue;
    }
    const subjects = Array.isArray(statement.subject) ? statement.subject : [];
    const matchingSubject = subjects.some(
      (s) => s?.name === expectedRepo && s?.digest?.sha256 === expectedHex,
    );
    const matchingPredicateType = statement.predicateType === expectedProv.predicateType;
    const workflow = statement.predicate?.buildDefinition?.externalParameters?.workflow;
    const matchingWorkflow =
      workflow?.repository === expectedProv.sourceRepository && workflow?.path === expectedProv.workflow;
    const deps = Array.isArray(statement.predicate?.buildDefinition?.resolvedDependencies)
      ? statement.predicate.buildDefinition.resolvedDependencies
      : [];
    const matchingCommit = deps.some((d) => d?.digest?.gitCommit === expectedProv.sourceCommit);

    if (matchingSubject && matchingPredicateType && matchingWorkflow && matchingCommit) {
      return {
        ok: true,
        subject: `${expectedRepo}@sha256:${expectedHex}`,
        predicateType: statement.predicateType,
        sourceCommit: expectedProv.sourceCommit,
        workflow: workflow.path,
      };
    }
  }

  return { ok: false, reason: "ATTESTATION_MISMATCH" };
}

async function main() {
  const localCheck = runDeployChecks({ root: ROOT });
  const provenanceCheck = localCheck.checks.find((c) => c.name === "supply-chain:app-image-provenance");
  if (!provenanceCheck?.ok) {
    process.stderr.write(`PROVENANCE_FAILED: ${provenanceCheck?.detail ?? "invalid provenance.json"}\n`);
    process.exit(1);
  }

  const provenance = JSON.parse(readFileSync(resolve(ROOT, "deploy/provenance.json"), "utf8"));
  const apiUrl = provenance.appImage.provenance.attestationApiUrl;
  const token = process.env.GITHUB_TOKEN?.trim();
  const headers = {
    accept: "application/vnd.github+json",
    "user-agent": "voxward-verify-provenance",
    ...(token ? { authorization: `Bearer ${token}` } : {}),
  };

  const res = await fetch(apiUrl, { headers });
  if (!res.ok) {
    process.stderr.write(`PROVENANCE_FAILED: GitHub attestations API returned HTTP ${res.status}\n`);
    process.exit(1);
  }
  const bundle = await res.json();
  const verified = verifySlsaAttestationBundle(bundle, provenance);
  if (!verified.ok) {
    process.stderr.write(`PROVENANCE_FAILED: ${verified.reason}\n`);
    process.exit(1);
  }
  process.stdout.write(`${JSON.stringify({ ok: true, ...verified })}\n`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  void main().catch((err) => {
    process.stderr.write(`PROVENANCE_FAILED: ${err instanceof Error ? err.message : String(err)}\n`);
    process.exit(1);
  });
}
