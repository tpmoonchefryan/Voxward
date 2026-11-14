import type { FastifyInstance, FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import type { VoxwardDatabase } from "../db/client.js";
import {
  hasDemoCapability,
  isDemoRole,
  issueDemoSession,
  listDemoRoles,
  resolveDemoPrincipal,
  type DemoCapability,
  type DemoRole,
} from "./demo-roles.js";
import { createSandboxRuntime, type SandboxRuntime } from "./scenarios/index.js";

export interface SandboxRoutesOptions {
  readonly database: VoxwardDatabase;
  readonly runtime?: SandboxRuntime;
}

const SESSION_BODY = z.object({ role: z.string().min(1).max(64) }).strict();

const SCENARIO_BODY = z
  .object({
    scenario: z.enum([
      "normal-scoring",
      "spam-toxicity-block",
      "superchat-translation",
      "manual-review",
      "privacy-delete",
      "privacy-delete-and-except",
    ]),
    subjectKey: z.string().min(1).max(64).optional(),
  })
  .strict();

const CUSTOM_EVENT_BODY = z
  .object({
    subjectKey: z.string().min(1).max(64),
    text: z.string().min(1).max(500),
    isPaid: z.boolean().optional(),
    translationText: z.string().max(500).nullable().optional(),
  })
  .strict();

const DECIDE_BODY = z
  .object({
    classification: z.enum(["ALLOW", "ALLOW_MEANINGFUL", "ALLOW_NOISE", "BLOCK"]),
  })
  .strict();

const PRIVACY_BODY = z
  .object({
    mode: z.enum(["DELETE_DATA_ONLY", "DELETE_AND_EXCEPT"]),
    subjectKey: z.string().min(1).max(64),
  })
  .strict();

function requireDemoCapability(
  request: FastifyRequest,
  reply: FastifyReply,
  capability: DemoCapability,
): { readonly role: DemoRole; readonly capabilities: readonly DemoCapability[] } | undefined {
  const auth = resolveDemoPrincipal(request.headers);
  if (!auth.ok) {
    reply.code(auth.status).send({ error: auth.code });
    return undefined;
  }
  if (!hasDemoCapability(auth.role, capability)) {
    reply.code(403).send({ error: "FORBIDDEN" });
    return undefined;
  }
  return { role: auth.role, capabilities: auth.capabilities };
}

export const sandboxRoutes: FastifyPluginAsync<SandboxRoutesOptions> = async (
  app: FastifyInstance,
  options: SandboxRoutesOptions,
) => {
  const runtime = options.runtime ?? createSandboxRuntime(options.database);

  app.get("/sandbox-api/roles", async () => {
    return { roles: listDemoRoles(), syntheticOnly: true };
  });

  app.post("/sandbox-api/session", async (request, reply) => {
    const parsed = SESSION_BODY.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "INVALID_REQUEST" });
    if (!isDemoRole(parsed.data.role)) {
      return reply.code(403).send({ error: "DEMO_ROLE_FORBIDDEN" });
    }
    return reply.code(200).send(issueDemoSession(parsed.data.role));
  });

  app.get("/sandbox-api/state", async (request, reply) => {
    const actor = requireDemoCapability(request, reply, "sandbox.read");
    if (actor === undefined) return;
    return {
      role: actor.role,
      capabilities: actor.capabilities,
      snapshot: runtime.snapshot(),
    };
  });

  app.post("/sandbox-api/scenarios", async (request, reply) => {
    const actor = requireDemoCapability(request, reply, "sandbox.scenario");
    if (actor === undefined) return;
    const parsed = SCENARIO_BODY.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "INVALID_REQUEST" });
    const result = await runtime.runScenario(parsed.data.scenario, {
      subjectKey: parsed.data.subjectKey,
    });
    return { ok: true, result, snapshot: runtime.snapshot() };
  });

  app.post("/sandbox-api/events", async (request, reply) => {
    const actor = requireDemoCapability(request, reply, "sandbox.scenario");
    if (actor === undefined) return;
    const parsed = CUSTOM_EVENT_BODY.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "INVALID_REQUEST" });
    const result = await runtime.ingestCustom(parsed.data);
    return { ok: true, result, snapshot: runtime.snapshot() };
  });

  app.post<{ Params: { taskId: string } }>("/sandbox-api/review/:taskId/decide", async (request, reply) => {
    const actor = requireDemoCapability(request, reply, "review.decide");
    if (actor === undefined) return;
    const parsed = DECIDE_BODY.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "INVALID_REQUEST" });
    const mapped =
      parsed.data.classification === "ALLOW" ? "ALLOW_MEANINGFUL" : parsed.data.classification;
    const outcome = await runtime.decideReview(request.params.taskId, mapped);
    return reply.code(outcome.status).send({ ...(outcome.body as Record<string, unknown>), snapshot: runtime.snapshot() });
  });

  app.post("/sandbox-api/privacy", async (request, reply) => {
    const actor = requireDemoCapability(request, reply, "privacy.delete");
    if (actor === undefined) return;
    const parsed = PRIVACY_BODY.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "INVALID_REQUEST" });
    const scenario = parsed.data.mode === "DELETE_AND_EXCEPT" ? "privacy-delete-and-except" : "privacy-delete";
    const result = await runtime.runScenario(scenario, { subjectKey: parsed.data.subjectKey });
    return { ok: true, result, snapshot: runtime.snapshot() };
  });

  app.post("/sandbox-api/reset", async (request, reply) => {
    const actor = requireDemoCapability(request, reply, "sandbox.reset");
    if (actor === undefined) return;
    const result = runtime.reset();
    return { ok: true, ...result, snapshot: runtime.snapshot() };
  });
};
