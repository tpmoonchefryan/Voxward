// Builds acceptance.md and evidence-records.json for Batch m7c (VOXWARD-STORY-019, VOXWARD-SUB-035, VOXWARD-SUB-036)
// from live work-show JSONs (m7c-show/*.json) and rows-m7c.mjs, running strict structural checks matching m7b & close-batch.cjs.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { rows } from "./rows-m7c.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const showDir = process.argv[2];
const outDir = process.argv[3];
if (!showDir || !outDir) {
  throw new Error("usage: node build-out-m7c.mjs <showDir> <outDir>");
}

const KEYS = ["VOXWARD-STORY-019", "VOXWARD-SUB-035", "VOXWARD-SUB-036"];
const CODE_VERSION = "d047636";
const FULL_SHA = "d04763689803accabc09a37d2d21ec8e7bb9a3eb";
const LOCATOR_FILE = ".kiro/specs/voxward-batch-m7c/evidence/acceptance.md";

const kindOf = (method) =>
  method.startsWith("接口/数据字段/文档与原始需求核对") || method.startsWith("对照本单交付边界及依赖")
    ? "source-behavior-review"
    : "machine";
const anchorOf = (id) => id.toLowerCase();
const suffixOf = (id) => id.replace(/^VW-(S019|SUB035|SUB036)-/, "");

const cards = KEYS.map((externalKey) => {
  const raw = JSON.parse(fs.readFileSync(path.join(showDir, `${externalKey}.json`), "utf8"));
  return {
    externalKey: raw.record.externalKey,
    workId: raw.record.id,
    revision: raw.record.revision,
    status: raw.record.status,
    libraryVersion: raw.version,
    headEventHash: raw.headEventHash,
    rows: raw.content.acceptance.map((r) => ({
      acceptanceId: r.id,
      acceptanceVersion: r.version,
      requirement: r.requirement,
      scenario: r.scenario,
      method: r.method,
      expected: r.expected,
    })),
  };
});

const byKey = Object.fromEntries(cards.map((c) => [c.externalKey, c]));
const problems = [];

function rowBlock(row, { withExpected }) {
  const entry = rows[row.acceptanceId];
  if (entry === undefined) {
    problems.push(`${row.acceptanceId}: missing in rows-m7c.mjs`);
    return "";
  }
  const kind = kindOf(row.method);
  const req = row.requirement;
  const lines = [
    `<a id="${anchorOf(row.acceptanceId)}"></a>`,
    `##### ${row.acceptanceId}`,
    "",
    `**${row.acceptanceId}@${row.acceptanceVersion}：${entry.outcome}**（${kind}；要求 ${req.workId}#${req.requirementId}@${req.version}）`,
    "",
  ];
  if (withExpected) lines.push(`- expected：${row.expected}`);
  lines.push(`- 依据：${entry.actual}`, "");
  return lines.join("\n");
}

function ownRows(key, heading) {
  const card = byKey[key];
  const own = card.rows.filter((r) => !suffixOf(r.acceptanceId).startsWith("INHERIT-"));
  return [`### ${heading}`, "", ...own.map((r) => rowBlock(r, { withExpected: true }))].join("\n");
}

function inheritRows(keys, heading, note) {
  const parts = [`### ${heading}`, "", note, ""];
  const first = byKey[keys[0]];
  for (const twin of first.rows.filter((r) => suffixOf(r.acceptanceId).startsWith("INHERIT-"))) {
    const suffix = suffixOf(twin.acceptanceId);
    parts.push(`#### ${twin.requirement.requirementId}@${twin.requirement.version}（${suffix}）`, "", `expected：${twin.expected}`, "");
    for (const key of keys) {
      const row = byKey[key].rows.find((c) => suffixOf(c.acceptanceId) === suffix);
      if (row === undefined) {
        problems.push(`${key}: missing ${suffix}`);
        continue;
      }
      if (row.expected !== twin.expected || row.method !== twin.method) {
        problems.push(`${row.acceptanceId}: expected/method differs from ${twin.acceptanceId}`);
      }
      parts.push(rowBlock(row, { withExpected: false }));
    }
  }
  return parts.join("\n");
}

const headAndSummary = `# 第 m7c 批独立验收记录（总表第 7 批第三部分：S019 首次验收）

- 实际模型：antigravity / gemini-4-carbon-medium（宿主报告 \`Gemini 4 Carbon (Medium)\`，未改用其它模型）。
- 候选：分离检出 \`/home/ryanlan/Code/Voxward/.worktrees/verify-m7c\` 上的 \`d047636\`（完整提交 \`${FULL_SHA}\`），即 \`9e2c585\` 之上合入 \`voxward/s019-delete-exception\`（规范提交 \`83823d8\`、SUB-035 \`eedd0f9\`、合入主干 \`24d498e\`、SUB-036 \`cc8f101\`、自测证据 \`e05bf37\`）。相对 \`9e2c585\` 共改动 37 个文件：契约包扩展 \`packages/contracts/src/ports/{data-request.ts,audit-log.ts}\`（\`CONTRACT_VERSION\` 仍为 \`"1"\`）；数据库层新增 \`apps/server/src/db/migrations/0006_data_deletion_targets.sql\`、\`db/subject-cleanup.ts\`，更新 \`db/{data-request-store.ts,audit-log.ts,schema/data-requests.ts}\` 与 \`docs/data-dictionary.md\`；业务模块 \`apps/server/src/modules/data-lifecycle-service/\` 新增 \`delete-with-exception.ts\`、\`preference-marker.ts\`、\`resume-scoring.ts\`、\`cleanup-targets.ts\`、\`cleanup-executor.ts\` 并更新路由与类型；进程内缓存新增失效方法 \`moderation-engine/nickname-cache/cache.ts\`（\`forget\`）、\`platform-source/youtube/identity.ts\`（\`forget\`）、\`moderation-engine/candidates/store.ts\`（\`removeBySourceCorrelations\`）；组合层更新 \`app.ts\` 与 \`auth/data-routes.ts\`。未改动 \`scripts/check-deps.mjs\`、\`pnpm-lock.yaml\`、\`decision-service/\`、\`scoring-engine/\`、\`task-coordinator/\`、\`output-adapter/\`、\`bench/\`（E11）。
- 检出与隔离：全程在 \`/home/ryanlan/Code/Voxward/.worktrees/verify-m7c\` 只读验证，未修改或提交任何跟踪文件（冒烟在无 \`VOXWARD_DATABASE_FILE\` 下临时生成的未跟踪 \`apps/server/data/\` 已在冒烟后清理，\`git status --porcelain\` 为 0 行），结束时 \`:3000\` 与 \`:5173\` 均为 0 监听。所有测试与探针均经 \`guarded.sh\` 加载 \`net/preload.mjs\` 并在预加载后执行 \`net/selfcheck.mjs\`（Q58），外部主机与本机既有监听端口连接 0 次，\`kiro-cli\`/\`kirocrew\`/\`kiro\` 垫片调用 0 次。
- 工单读数（E01）：读取预取快照 \`m7c-show/{VOXWARD-STORY-019,VOXWARD-SUB-035,VOXWARD-SUB-036}.json\`，库版本 \`21511\`，\`headEventHash\` \`2dba511f12eb4fc1041aaf362d3391de842367740d97093e38ee3e07e366b3ee\`，工作空间 \`workspace:7732a51de4c38afb83bb77cf\`，项目 \`project:f824c7861e6888255132af42\`。三单状态均为 \`active\`，\`workContent.complete = true\`，\`content.evidence\` 均为空（首次验收）：\`VOXWARD-STORY-019\`（rev 4，12 行）、\`VOXWARD-SUB-035\`（rev 3，13 行）、\`VOXWARD-SUB-036\`（rev 3，13 行），合计 **38 行**；同一 INHERIT 行在 Story 与两张子单上的 \`expected\`、\`method\`、\`requirement\` 逐字一致。
- 验收人：独立验收兼判断代理（main 档 \`@verifier\`），未参与实现。实施自测证据 \`.kiro/specs/voxward-s019-delete-exception/evidence/self-check.md\` 仅作参考，全部结论基于本轮独立门禁、源码审查与实测探针。
- 判定口径（与第 m6r1、m7b 批一致）：\`satisfied\` 表示该行 \`expected\` 在候选 \`d047636\` 上全部成立；任一部分不成立判 \`failed\`。子单 \`AC001\` 与 \`STORY\` 行按该子单承担的交付切片判定；某一子单交付导致的缺陷判在 Story 与该责任子单对应行，未触及缺陷文件的另一子单按自身交付判定并注明边界。\`kind\` 严格按该行 \`method\` 确定（以「接口/数据字段/文档与原始需求核对」或「对照本单交付边界及依赖」开头为 \`source-behavior-review\`，共 18 行；其余实测行为 \`machine\`，共 20 行）。
- 结果：**38 行：satisfied 29 行，failed 9 行，unverified 0 行**。其中 \`VOXWARD-SUB-035\` **13/13 satisfied**；\`VOXWARD-STORY-019\` **8/12 satisfied、4 failed**（\`VW-S019-AC001\`、\`VW-S019-PARENT\`、\`VW-S019-INHERIT-013\`、\`VW-S019-INHERIT-017\`）；\`VOXWARD-SUB-036\` **8/13 satisfied、5 failed**（\`VW-SUB036-AC001\`、\`VW-SUB036-STORY\`、\`VW-SUB036-PARENT\`、\`VW-SUB036-INHERIT-013\`、\`VW-SUB036-INHERIT-017\`）。阻断编号接第 m7b 批 \`B7\`，新登记 \`B8\`、\`B9\`（均归 \`VOXWARD-SUB-036\`），非阻断建议 \`N7\`–\`N10\`，详见 \`judgment.md\`。

## 0. 执行记录

所有探针与门禁原始日志保存在本批交付目录 \`probes/\`。

| 编号 | 命令（默认工作目录为 \`verify-m7c\`） | 退出码 | 关键输出 |
| --- | --- | --- | --- |
| E01 | \`node -e\` 解析 \`m7c-show/{VOXWARD-STORY-019,VOXWARD-SUB-035,VOXWARD-SUB-036}.json\` | 0 | 库版本 21511；STORY-019 rev 4（12 行）、SUB-035 rev 3（13 行）、SUB-036 rev 3（13 行），共 38 行，\`content.evidence\` 均为空。 |
| E02 | \`CI=1 pnpm install --frozen-lockfile\` | 0 | 锁文件一致，\`pnpm-lock.yaml\` sha256 未变。 |
| E03 | \`pnpm build\` | 0 | \`@voxward/contracts\`、\`@voxward/server\`（\`dist/main.js\` 含迁移复制）、\`@voxward/web\` 全部构建通过。 |
| E04 | \`pnpm typecheck\` | 0 | contracts、server、web 与 \`bench:typecheck\` 均 0 个 \`error TS\`。 |
| E05 | \`CI=1 guarded.sh .../e05-s019-vitest pnpm --filter @voxward/server exec vitest run <S019 相关 9 个测试文件>\` | 0 | 9 个测试文件、92 项测试全部通过（\`transaction.test.ts\` 6、\`preference-marker.test.ts\` 5、\`executor.test.ts\` 5、\`execute-routes.test.ts\` 2、\`subject-chain.test.ts\` 1、\`candidates/store.test.ts\` 14、\`nickname-cache/cache.test.ts\` 14、\`identity.test.ts\` 12、\`schema.test.ts\` 33）。 |
| E06 | \`pnpm check:deps\` | 0 | \`check-deps: ok, 219 files checked, 0 violations\`。 |
| E07 | \`env -u VOXWARD_DATABASE_FILE -u VOXWARD_ADAPTERS -u VOXWARD_PORT -u VOXWARD_HOST bash .../voxward-master/tools/smoke.sh .../verify-m7c .../probes/smoke\`（事后清理未跟踪默认库） | 0 | \`dev healthz ok=1 code=200 after 2s\`；\`dist healthz ok=1 code=200 after 1s\`；停止后 \`no listeners\`，\`:3000\` 与 \`:5173\` 均 0 监听。 |
| E08 | \`CI=1 bash .../guarded.sh .../probes/e08-test pnpm test\` | 0 | **149 个测试文件、1882 项测试全部通过**。\`selfcheck.txt\` 在 preload 后执行（\`guardLoaded: true\`，5 个外部主机 fetch/https/net/dns 全拒）；178 个 Node 进程加载拦截，外部连接 0 次、既有回环端口拒绝 0 次，\`shim.log\` 0 行。 |
| E09 | 临时副本 \`check-deps\` 负面对照（不触碰检出）：向 \`data-lifecycle-service\`、\`db\`、\`contracts\` 注入跨区导入运行 \`scripts/check-deps.mjs\`，再移除复核 | 0、1、0 | 基线 219 文件 0 违规；注入后精确检出 4 处违规（退出码 1）；清理后恢复 219 文件 0 违规。 |
| E10 | \`node .../mana-orchestrate/scripts/kiro-specs.mjs check --workspace "<Ether>" --work-id work:7f0ac0774bc508523d09b5f1 --spec-dir .kiro/specs/voxward-s019-delete-exception\` | 0 | \`reasonCode: "SPEC_CURRENT"\`，\`workRevision: 4\`，\`sourceDigest\` 与 \`previousSourceDigest\` 均为 \`2cef8b13…eebda5\`；\`.kiro/specs/**\` 文件 sha256 前后不变。 |
| E11 | 静态核对：\`eedd0f9\`（SUB-035）与 \`cc8f101\`（SUB-036）共 32 个 \`.ts\` 文件的导入树、环境变量、定时器、网络 API、SQL 迁移与数据字典对比 | 0 | S019 模块/存储/契约文件 0 处 \`process.env\`、0 处网络 API、0 处定时器（仅 \`app.ts\` 含 S021 既有投递泵定时器）；迁移 \`0006\` 与 \`docs/data-dictionary.md\` 一致。 |
| E60 | \`CI=1 bash .../guarded.sh .../probes/e60-s019 .../tsx .../probes/probe-m7c-s019.mts .../verify-m7c\` | 0 | 14 组实测断言全部执行完成（\`A1–A4\` HTTP 鉴权/校验/默认空缓存注册表/Q35 查看器缓存联动/Q29，\`B1–B5\` 单事务回滚/零记分窗口/代次拒绝/例外路由/最小标记与恢复计分，\`C1–C3\` 18 面清理/TWIN 隔离/\`EXCEPTION_NOT_CONFIRMED\`，\`R1–R3\` 复现 B8 与 B9，\`R4\` 修复对照验证通过）。\`guardLoaded: true\`，外连 0 次，\`shim.log\` 0 字节。 |

## 1. 共同检查

<a id="recheck"></a>
### 1.1 复验范围：首次验收

三张工单 \`content.evidence\` 均为空，属首次独立验收。本轮在候选 \`d047636\` 上完整执行了 \`E01–E11\` 与 \`E60\`。S019 未修改 S011（任务协调与复盘运行器核心）、S014（决策服务）、S015、S021 传输层与 S027 基准目录，全量 149 个测试文件 1882 项测试在网络与 CLI 拦截下全部通过（E08）。

<a id="spec"></a>
### 1.2 Spec 状态与设计、代码一致性

- \`.kiro/specs/voxward-s019-delete-exception\` 经 \`kiro-specs.mjs check\` 核验为 \`SPEC_CURRENT\`（\`workRevision: 4\`，E10）；\`tasks.md\` 受管段正式任务保持未勾选，受管段外本地清单 \`S-1\`、\`35-1..35-6\`、\`36-1..36-5\`、\`F-1..F-4\` 均已勾选并与提交历史对应。
- 设计与代码一致的部分：§2 目录映射（\`data-lifecycle-service\`）；§3 分区依赖（E06、E09、E11）；§4 迁移 \`0006\` 与数据字典；§5 \`startDeletion\` 单短事务顺序、\`markItem\`、\`finishExecution\`、\`resumeException\`、\`SubjectCacheHub\`；§7 幂等启动、双部分完成判定（\`EXCEPTION_NOT_CONFIRMED\`）、\`RESUME_SCORING\` 唯一解除路径、\`DATA_REQUEST_CERTIFICATE\` 文本、共用 \`InvalidationBus\`（Q35）；§11–§14 的实现说明与两个已披露缺口。
- 设计、契约与代码不一致处：
  1. **\`readCleanupFacts\` 漏掉事件关联链（B8）**：契约 \`packages/contracts/src/ports/data-request.ts:235\` 与 \`design.md\` §5（第 105 行）、§6（第 134 行）均写明 \`readCleanupFacts\` 返回主体**事件与技术日志**去重后的 \`correlationIds\`，并因此将 \`CANDIDATE_CARD\` 排在步骤 4（步骤 3 \`TECHNICAL_LOG\` 之后、步骤 13 \`CHANNEL_EVENT\` 之前）；实际 \`db/subject-cleanup.ts:33-34\` 直接取 \`locateSubjectLogs(subjectId).correlationIds\`，而 \`db/audit-log.ts:346-347\` 只把 \`eventCorrelationIds\` 并入内部 \`chainIds\`（供 \`change_logs\` 使用），返回的 \`correlationIds\` 仅含 \`technical_logs\`，导致技术日志 7 天到期后或步骤 4 续作时 \`correlationIds\` 为空，漏删 \`CandidateStore\` 卡片却将删除置为 \`COMPLETED\`（E60 R1、R2）。
  2. **\`PARTIAL_FAILED\` 续作仅在 \`TASK\` 前补扫技术日志，漏掉 \`VERDICT\` 与 \`CHANNEL_EVENT\` 的外键子表前扫（B9）**：\`design.md\` §11（第 206 行）注意到执行期间新写入会因外键阻塞删除，只在 \`TASK\` 前补扫了 \`technical_logs\`，未处理 \`PARTIAL_FAILED\` 期间例外观众新发消息经正常审核产生的 \`deliveries -> verdicts -> tasks -> channel_events\` 外键链，导致已 \`DONE\` 的 \`DELIVERY\` 在续作时被跳过，\`VERDICT\`（及 \`CHANNEL_EVENT\`）永久抛 \`SQLITE_CONSTRAINT_FOREIGNKEY\`（E60 R3）。

<a id="gates"></a>
### 1.3 门禁与启动冒烟

\`pnpm install --frozen-lockfile\`、\`pnpm build\`、\`pnpm typecheck\`、\`pnpm check:deps\`（219 文件 0 违规）与拦截下 \`pnpm test\`（149 文件 1882 项）全部退出 0（E02–E06、E08）。默认配置冒烟 \`smoke.sh\` 在清除 \`VOXWARD_*\` 环境变量后分别验证 \`pnpm dev\` 与 \`node apps/server/dist/main.js\`，\`/healthz\` 均返回 200，仅监听 \`127.0.0.1\`，退出后 \`:3000\` 与 \`:5173\` 均无残留监听（E07）。

<a id="isolation"></a>
### 1.4 网络与外部服务隔离（Q58）

\`E05\`、\`E08\`、\`E60\` 均通过 \`guarded.sh\` 运行：预加载 \`net/preload.mjs\` 后先运行 \`net/selfcheck.mjs\`，确认 \`guardLoaded: true\` 且 \`oauth2.googleapis.com\`、\`www.googleapis.com\`、\`accounts.google.com\`、\`prod.us-east-1.auth.desktop.kiro.dev\`、\`example.com\` 的 \`fetch\`/\`https\`/\`net\`/\`dns\` 全部拒绝；运行全程对外部主机连接 0 次、对本机既有监听端口连接 0 次、CLI 垫片调用 0 次。

<a id="deps"></a>
### 1.5 依赖方向

\`pnpm check:deps\` 219 个文件 0 违规（E06）；副本负面对照确认 \`data-lifecycle-service\` 导入 \`db\` 或 \`fastify\`、\`db\` 导入模块、\`contracts\` 导入 \`apps/server\` 均被拦截（E09）。

## 2. VOXWARD-STORY-019 组（38 行：satisfied 29，failed 9）

<a id="s019-summary"></a>
### 2.0 S019 实测与两项已披露缺口裁定摘要

1. **HTTP 路由、角色边界与参数校验（E60 A1–A4）**：
   - \`POST /channels/:channelId/data/requests\` 支持 \`DELETE\`（\`DELETE_DATA_ONLY\` / \`DELETE_AND_EXCEPT\`）与 \`RESUME_SCORING\`；\`DELETE\` 缺 \`mode\` 或 \`RESUME_SCORING\` 带 \`mode\` 均返回 \`400 INVALID_REQUEST\`（A1）。
   - \`POST /channels/:channelId/data/requests/:requestId/execute\` 实测：未登录 \`401\`、无 CSRF \`403\`、S003 Bearer 输出令牌 \`403\`、同频道 \`MODERATOR\` \`403\`、同频道 \`CHANNEL_OWNER\` \`403\`（仅 \`DATA_ADMIN\` 持有 \`data.handle\`）、跨频道 \`DATA_ADMIN\` \`403\`、本频道 \`DATA_ADMIN\` \`200\`（A2、A4）；未验证 \`DELETE\` 返回 \`409 NOT_VERIFIED\`，已验证 \`ACCESS\` 返回 \`409 NOT_EXECUTABLE\`，未知请求返回 \`404 REQUEST_NOT_FOUND\`（A3）。
2. **SUB-035 单事务原子性、零记分窗口、晚到回调与偏好最小标记（E60 B1–B5）**：
   - **事务回滚（B1）**：在 \`startDeletion\` 写入例外与提升代次之后注入重复目标项主键异常，验证 \`score_exceptions\`（0 行）、\`subjects.processing_generation\`（仍为 0）、\`data_request_items\`（0 行）、请求状态（仍为 \`PENDING\`）全部原子回滚。
   - **零记分窗口与启动幂等（B2）**：\`startDeletionRequest\` 返回后、清理尚未开始前，\`ScoringEngine\` 的 \`applyVerdict\`、\`applyIdentityTransition\`、\`applyManualCorrection\` 全部立即以 \`EXCEPTION_ACTIVE\` 拒绝；重复启动返回 200，代次保持 1，例外行仍为 1 行。
   - **晚到结果丢弃与例外新消息审核（B3、B4）**：删除启动前已创建的代次 0 任务在 \`DecisionService.commit\` 提交时返回 \`{ status: "conflict", reason: "STALE_GENERATION" }\`，0 行裁决落库；例外生效后 \`planRoute\` 在 \`whitelisted=true, noise=true, scoreReachesFastPass=true\` 下仍返回 \`REALTIME_REVIEW(reason="EXCEPTION")\`（基础规则 \`BLOCK\` 仍直接 \`BASE_BLOCK\`），代次 1 新任务提交裁决成功（\`committed\`）且计分返回 \`refused\`、账本 0 新增。
   - **偏好最小标记与恢复计分（A4、B5）**：\`preferenceMarkerOf\` 仅含 \`{ purpose: "SCORING_EXCEPTION_PREFERENCE", subjectId, createdAt }\`，\`score_exceptions\` 不存旧分、昵称或正文；名单移除、身份观测与 \`DELETE_DATA_ONLY\` 均不解除已有例外；已验证 \`RESUME_SCORING\` 执行返回 \`{ outcome: "RESUMED" }\` 并写入 \`removed_at\` 与 \`RESUME_REQUESTED\`，重放同一请求返回 \`409\`。
3. **SUB-036 18 个存储面清理、Q 项核验与双部分完成门禁（E60 A4、C1–C3）**：
   - 挂载 \`SubjectCacheHub(["CANDIDATE_CARD", "NICKNAME_VERDICT", "IDENTITY_TRACKER"])\` 时共登记 18 项（15 个数据库表面 + 3 个进程内表面），常规单轮执行全部 \`DONE\`：覆盖 \`Q7\`（\`NicknameVerdictCache.forget\`）、\`Q29\`（无技术日志的 \`subject:<id>\` 变更日志证书化，含本次新建的 \`SCORE_EXCEPTION_CHANGED\` 行一并证书化为 \`DATA_REQUEST_CERTIFICATE\`）、\`Q35\`（\`buildApp\` 默认内部共用一条 \`InvalidationBus\`，HTTP 查看器预热缓存在删除后即刻失效）、\`Q42\`（\`IdentityTracker.forget\`）、\`Q51\`（\`score_outcomes\` 按主体删除与常规单轮候选词卡片清理），同频道同昵称哈希 \`TWIN\` 的全部数据完好保留（A4、C1）。
   - 执行中途若通过 \`RESUME_SCORING\` 解除例外，即便 18 个存储面全部 \`DONE\`，\`DELETE_AND_EXCEPT\` 请求仍置 \`PARTIAL_FAILED\` 并记录 \`DATA_REQUEST EXCEPTION_NOT_CONFIRMED\`，不虚报 \`COMPLETED\`（C3）。
4. **实测复现的两项阻断缺陷（E60 R1–R4，均归 SUB-036）**：
   - **B8（\`R1\`、\`R2\`）**：\`db/subject-cleanup.ts\` 的 \`readCleanupFacts\` 漏读 \`channel_events.correlation_id\`。当技术日志已按 7 天保留期清理（\`R1\`），或第 1 轮在步骤 3 删除技术日志后于步骤 4 \`CANDIDATE_CARD\` 失败、第 2 轮续作时（\`R2\`），\`readCleanupFacts\` 返回 \`correlationIds: []\`，\`CANDIDATE_CARD\` 标 \`DONE\` 且整单返回 \`COMPLETED\`，而观众消息生成的候选词卡片仍留在 \`CandidateStore\`。
   - **B9（\`R3\`）**：第 1 轮在步骤 10 \`DELIVERY\` 标 \`DONE\` 后于步骤 11 \`VERDICT\` 失败（\`PARTIAL_FAILED\`）；重试前例外观众发 1 条新消息并完成正常审核落库，后续重试跳过已 \`DONE\` 的 \`DELIVERY\`，在 \`DELETE FROM verdicts\` 上永久抛 \`SQLITE_CONSTRAINT_FOREIGNKEY\`。探针内补齐事件 \`correlationId\` 与子表前扫（\`R4\`）后，续作正常 \`COMPLETED\` 且卡片清零。
5. **两项设计已披露缺口的独立裁定（\`design.md\` §8、§14）**：
   - **缺口 (a) \`AppOptions.subjectCaches\` 在 \`buildApp\` 默认使用 \`NO_SUBJECT_CACHES\`**：**不构成 S019 阻断（记为 \`N7\`）**。核查 \`app.ts\` 与 \`modules/registry.ts\`，当前服务端组合根尚未实例化 \`NicknameVerdictCache\`、\`IdentityTracker\`、\`CandidateStore\`（审核与平台流水线装配归后续接线 Story / \`Q39\`），进程内本就不存在未清理缓存；默认空注册表只登记 15 个真实数据库表面（E60 A4），不伪造进程内表面已清理，且一旦注册表面缺失即报 \`SURFACE_NOT_REGISTERED\` 置 \`PARTIAL_FAILED\`。
   - **缺口 (b) 未在 \`data-lifecycle-service\` 内做二次 HMAC 派生，且保留 \`list_entries\`**：**不构成 S019 阻断（记为 \`N8\`、\`N9\`）**。提案 §11.4 写「建议保存频道范围的 HMAC 主体标记…不保存旧分数和昵称历史」，而仓库架构已在 S002 数据字典与 S005 \`platform-source/youtube/to-business-event.ts:20-21\`（\`senderRefOf(platformChannelId)\` 注释写明由组合层用带密钥哈希派生不透明引用）把主体伪名化放在平台接入边界，使原始平台用户 ID 从不进入 \`subjects\` 或 \`score_exceptions\`；本单保留 \`subjects.platform_subject_key\` + \`score_exceptions\` 最小字段且清零分数、删除昵称/身份/账本/正文，满足全部验收行 \`expected\`「不保存隐藏分或原值凭证」，仅需在平台接入接线与部署配置（S026/S029）注入频道范围 HMAC 密钥并在隐私说明（S030）如实披露。至于 \`list_entries\`（黑白名单），提案 §11.4 明确区分记分例外与黑名单，若观众删除请求一并删除黑名单将使被封禁者借删除请求自行解封；本单保留生效名单行并将 \`subject:<id>\` 的历史 \`LIST_CHANGED\` 变更日志证书化（Q29），边界合理。`;

const tailScope = `<a id="scope"></a>
## 3. 未验证范围与后续责任边界

- **真实平台与真实观众数据**：本轮全部测试与探针均在 \`guarded.sh\` 网络拦截下使用合成数据完成，未连接 YouTube/Google API，未触碰真实观众数据。
- **Kiro CLI / Kiro Crew 会话文件与第三方模型提供方留存**：本地 AI 会话目录清理由 S008/S009 生命周期承接，第三方提供方侧留存边界由 S030 政策与披露材料说明（提案 §12.4）。
- **生产组合根进程内缓存挂载与 \`senderRefOf\` HMAC 密钥装配**：等平台接入与审核流水线在组合根挂载实例时传入 \`AppOptions.subjectCaches\`（N7），并在组合层/保险箱接入 \`senderRefOf\` 频道范围 HMAC 密钥（N8）。
- **SQLite 空闲页擦除（Q30）与保留期定时清理**：归 S020；跨模块端到端与备份恢复演练归 VOXWARD-EPIC-006。`;

const acceptance = [
  headAndSummary,
  "",
  ownRows("VOXWARD-STORY-019", "2.1 VOXWARD-STORY-019 本单行"),
  ownRows("VOXWARD-SUB-035", "2.2 VOXWARD-SUB-035 本单行"),
  ownRows("VOXWARD-SUB-036", "2.3 VOXWARD-SUB-036 本单行"),
  inheritRows(
    KEYS,
    "2.4 INHERIT 行（Story 与两张子单对照）",
    "同一 INHERIT 行在 VOXWARD-STORY-019、VOXWARD-SUB-035、VOXWARD-SUB-036 上的 expected、method、requirement 逐字相同（E01），expected 只列一次；SUB-035 按自身交付切片判定为 satisfied，SUB-036 与 Story 在受 B8、B9 影响的 INHERIT-013、INHERIT-017 上判为 failed。"
  ),
  tailScope,
  "",
].join("\n");

// Strict shape verification matching m7b build-out.mjs & close-batch.cjs
const EIGHT = ["acceptanceId", "acceptanceVersion", "requirement", "codeVersion", "locator", "actual", "outcome", "kind"];
const targets = [];
const counts = { total: 0, satisfied: 0, failed: 0, unverified: 0, byTarget: {} };
const used = new Set();

for (const card of cards) {
  const evidence = [];
  const tally = { total: 0, satisfied: 0, failed: 0, unverified: 0 };
  for (const row of card.rows) {
    const entry = rows[row.acceptanceId];
    if (entry === undefined) continue;
    used.add(row.acceptanceId);
    const record = {
      acceptanceId: row.acceptanceId,
      acceptanceVersion: row.acceptanceVersion,
      requirement: {
        workId: row.requirement.workId,
        requirementId: row.requirement.requirementId,
        version: row.requirement.version,
      },
      codeVersion: CODE_VERSION,
      locator: `${LOCATOR_FILE}#${anchorOf(row.acceptanceId)}`,
      actual: entry.actual,
      outcome: entry.outcome,
      kind: kindOf(row.method),
    };
    if (JSON.stringify(Object.keys(record)) !== JSON.stringify(EIGHT)) problems.push(`${row.acceptanceId}: keys`);
    if (JSON.stringify(Object.keys(record.requirement)) !== '["workId","requirementId","version"]') {
      problems.push(`${row.acceptanceId}: requirement keys`);
    }
    if (!Number.isInteger(record.acceptanceVersion) || record.acceptanceVersion < 1) problems.push(`${row.acceptanceId}: version`);
    if (!Number.isInteger(record.requirement.version) || record.requirement.version < 1) {
      problems.push(`${row.acceptanceId}: req version`);
    }
    if (!["satisfied", "failed", "unverified"].includes(record.outcome)) problems.push(`${row.acceptanceId}: outcome`);
    if (!["machine", "source-behavior-review"].includes(record.kind)) problems.push(`${row.acceptanceId}: kind`);
    if (typeof record.actual !== "string" || record.actual.trim().length < 40 || /^(pass|ok|success)$/i.test(record.actual.trim())) {
      problems.push(`${row.acceptanceId}: actual`);
    }
    if (/\$\{|undefined|TODO/.test(record.actual)) problems.push(`${row.acceptanceId}: placeholder`);
    const anchorTag = `<a id="${anchorOf(row.acceptanceId)}"></a>`;
    const occurrences = acceptance.split(anchorTag).length - 1;
    if (occurrences !== 1) problems.push(`${row.acceptanceId}: anchor occurs ${occurrences} times`);
    const headingLine = `##### ${row.acceptanceId}`;
    if (acceptance.split(headingLine).length - 1 !== 1) problems.push(`${row.acceptanceId}: heading occurs != 1`);
    if (!acceptance.includes(`**${row.acceptanceId}@${row.acceptanceVersion}：${record.outcome}**`)) {
      problems.push(`${row.acceptanceId}: outcome badge missing`);
    }
    evidence.push(record);
    tally.total += 1;
    tally[record.outcome] += 1;
  }
  if (evidence.length !== card.rows.length) {
    problems.push(`${card.externalKey}: ${evidence.length} written vs ${card.rows.length} live`);
  }
  counts.byTarget[card.externalKey] = tally;
  counts.total += tally.total;
  counts.satisfied += tally.satisfied;
  counts.failed += tally.failed;
  counts.unverified += tally.unverified;
  targets.push({ externalKey: card.externalKey, workId: card.workId, revision: card.revision, evidence });
}

for (const id of Object.keys(rows)) {
  if (!used.has(id)) problems.push(`${id}: unused in rows-m7c.mjs`);
}
for (const id of ["recheck", "spec", "gates", "isolation", "deps", "s019-summary", "scope"]) {
  if (acceptance.split(`<a id="${id}"></a>`).length - 1 !== 1) problems.push(`section anchor ${id}`);
}

if (problems.length > 0) {
  console.error("SHAPE CHECK FAILED:\n" + problems.join("\n"));
  process.exit(1);
}

const failedIds = targets.flatMap((t) => t.evidence.filter((r) => r.outcome === "failed").map((r) => r.acceptanceId));
const evidenceRecords = {
  note: `草稿，供主线程链写。targets[].evidence 中每一行只含引擎 evidence 行允许的八个键，可原样追加到对应工单 content.evidence；targets 外层与说明字段不是引擎格式，写入前去掉。${counts.total} 行：satisfied ${counts.satisfied}、failed ${counts.failed}、unverified ${counts.unverified}。VOXWARD-SUB-035 13 行全部 satisfied；VOXWARD-STORY-019（4 行 failed）与 VOXWARD-SUB-036（5 行 failed）共 9 行 failed（${failedIds.join("、")}；根因 B8、B9，见 judgment.md）。三单的 content.evidence 目前为空。locator 指向 ${LOCATOR_FILE}，主线程需把本轮 acceptance.md 放到该路径。`,
  candidate: {
    codeVersion: CODE_VERSION,
    fullSha: FULL_SHA,
    note: "引擎按字符串精确比较 evidence.codeVersion 与完成候选。VOXWARD-SUB-035 13/13 satisfied，可按主线程决定以 d047636 先行关单或随 S019 返工候选一并关单；VOXWARD-STORY-019 与 VOXWARD-SUB-036 有 failed 行，不能以 d047636 关单，需在 SUB-036 返工后的新候选上复验（见 judgment.md「复验范围」）。写入时以读回的 revision 为准。",
  },
  readFrom: {
    command: "预取实时工单快照 m7c-show/VOXWARD-{STORY-019,SUB-035,SUB-036}.json（einzbern.mjs work-show --workspace <Ether> --external-key <KEY>）",
    libraryVersion: cards[0].libraryVersion,
    headEventHash: cards[0].headEventHash,
  },
  shapeCheck:
    "生成脚本对每一行检查：键名与顺序精确为八个、requirement 三键、正整数版本、outcome 与 kind 枚举、kind 按方法确定（方法以「接口/数据字段/文档与原始需求核对」或「对照本单交付边界及依赖」开头的为 source-behavior-review，其余为 machine）、actual 非空且不是裸 pass/ok/success、无未替换占位符、locator 锚点在 acceptance.md 中恰好出现一次且该行标题存在、codeVersion 为 d047636，并核对每单写出的行数与 E01 读到的实时行数相同（12+13+13=38）、rows-m7c.mjs 没有多余或缺少的行、同一 INHERIT 行在 Story 与子单上的 expected 与 method 相同。未调用引擎写入。",
  counts,
  targets,
};

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "acceptance.md"), acceptance);
fs.writeFileSync(path.join(outDir, "evidence-records.json"), `${JSON.stringify(evidenceRecords, null, 1)}\n`);
console.log(JSON.stringify({ ok: true, counts, failedIds }, null, 2));
