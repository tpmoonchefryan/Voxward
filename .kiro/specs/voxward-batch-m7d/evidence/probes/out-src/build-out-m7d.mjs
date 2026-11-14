// Builds acceptance.md and evidence-records.json for Batch m7d (re-acceptance of VOXWARD-STORY-021, VOXWARD-SUB-039, VOXWARD-SUB-040)
// from live work-show JSONs (m7d-show/*.json) and rows-m7d.mjs, running strict structural checks matching m7b & close-batch.cjs.
import fs from "node:fs";
import path from "node:path";
import { rows } from "./rows-m7d.mjs";

const showDir = process.argv[2];
const outDir = process.argv[3];
if (!showDir || !outDir) {
  throw new Error("usage: node build-out-m7d.mjs <showDir> <outDir>");
}

const KEYS = ["VOXWARD-STORY-021", "VOXWARD-SUB-039", "VOXWARD-SUB-040"];
const CODE_VERSION = "d8ed897";
const FULL_SHA = "d8ed8972f8c6264ca6d2149d2e58ef23cfcb50d0";
const LOCATOR_FILE = ".kiro/specs/voxward-batch-m7d/evidence/acceptance.md";

const kindOf = (method) =>
  method.startsWith("接口/数据字段/文档与原始需求核对") || method.startsWith("对照本单交付边界及依赖")
    ? "source-behavior-review"
    : "machine";
const anchorOf = (id) => id.toLowerCase();
const suffixOf = (id) => id.replace(/^VW-(S021|SUB039|SUB040)-/, "");

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
    problems.push(`${row.acceptanceId}: missing in rows-m7d.mjs`);
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

const headAndSummary = `# 第 m7d 批独立复验记录（总表第 7 批第四部分：S021 返工 1 复验）

- 实际模型：antigravity / gemini-4-carbon-medium（宿主报告 \`Gemini 4 Carbon (Medium)\`，未改用其它模型）。
- 候选：分离检出 \`/home/ryanlan/Code/Voxward/.worktrees/verify-m7d\` 上的 \`d8ed897\`（完整提交 \`${FULL_SHA}\`），含 \`P-S021-fix1\` 合并提交 \`ad484f7\`（规范更新 \`86b45cb\`、修复提交 \`0a3f910\`、自测记录 \`05f92f7\`）。相对第 m7b 批候选 \`7400f39\`，\`P-S021-fix1\` 共改动 15 个文件：\`packages/contracts/src/ports/output-port.ts\`（新增 \`readSendableRow\`，\`CONTRACT_VERSION\` 仍为 \`"1"\`）、\`apps/server/src/db/output-store.ts\`（实现 \`readSendableRow\` 并在 \`markSent\` 短事务内校验 \`verdicts.is_current = 1\`）、\`apps/server/src/modules/output-adapter/delivery.ts\`（每行 \`sendRow\` 前同步调用 \`readSendableRow\`）、\`apps/server/src/app.ts\`（\`startNativeOutput\` 关闭钩子由 \`onClose\` 改为 \`preClose\`）、\`apps/server/src/adapters/native-output/socket.ts\`（\`WebSocketServer\` 设置 \`maxPayload: 4096\`）、测试 \`pump.test.ts\`/\`helpers.ts\`/\`socket.test.ts\`、文档 \`docs/protocol/output-native-v1.md\` §3/§10、样例 \`examples/consumer-dedup/dedupe.mjs\` 及 \`.kiro/specs/voxward-s021-output/{design.md,tasks.md,requirements.md,source.json,evidence/rework1-self-check.md}\`（E11）。核验 \`git diff 7400f39..d8ed897 -- bench/\` 为 0 行（\`VOXWARD-SUB-049\` 已在 \`7400f39\` 关单 \`done\`，本轮不重复出证据行）。
- 检出与隔离：全程在 \`/home/ryanlan/Code/Voxward/.worktrees/verify-m7d\` 只读复验，未修改或提交任何跟踪文件（默认配置冒烟临时生成的未跟踪 \`apps/server/data/\` 已在冒烟后清理，\`git status --porcelain\` 为 0 行），结束时 \`:3000\` 与 \`:5173\` 均为 0 监听。全部测试与探针均经 \`guarded.sh\` 加载 \`net/preload.mjs\` 并在预加载后执行 \`net/selfcheck.mjs\`（Q58），外部主机与本机既有监听端口连接 0 次，\`kiro-cli\`/\`kirocrew\`/\`kiro\` 垫片调用 0 次。
- 工单读数（E01）：读取预取快照 \`m7d-show/{VOXWARD-STORY-021,VOXWARD-SUB-039,VOXWARD-SUB-040}.json\`，库版本 \`21521\`，\`headEventHash\` \`e3fe1c909fbe6795ade6e025e2d310deed08c3bc08808d3b45aa466c0d762042\`。三单状态均为 \`active\`，已落有第 m7b 批候选 \`7400f39\` 的首次验收证据（STORY-021 10 satisfied / 1 failed、SUB-039 12 satisfied、SUB-040 11 satisfied / 1 failed）：\`VOXWARD-STORY-021\`（rev 5，11 行）、\`VOXWARD-SUB-039\`（rev 4，12 行）、\`VOXWARD-SUB-040\`（rev 4，12 行），合计 **35 行**；同一 INHERIT 行在 Story 与两张子单上的 \`expected\`、\`method\`、\`requirement\` 逐字一致。
- 验收人：独立验收兼判断代理（main 档 \`@verifier\`），未参与实现。全部结论来自本轮独立门禁、源码核查与实测探针。
- 结果：**35 行：satisfied 35 行，failed 0 行，unverified 0 行（全部通过）**。第 m7b 批阻断 \`B7\` 与非阻断建议 \`N1\`–\`N4\` 在 \`d8ed897\` 上全部核验通过，无新增阻断，详见 \`judgment.md\`。

## 0. 执行记录

所有探针脚本副本、拦截记录与门禁原始日志保存在本批交付目录 \`probes/\`。

| 编号 | 命令（默认工作目录为 \`verify-m7d\`） | 退出码 | 关键输出 |
| --- | --- | --- | --- |
| E01 | \`node -e\` 解析 \`m7d-show/VOXWARD-{STORY-021,SUB-039,SUB-040}.json\` 并核对 \`git diff 7400f39..d8ed897 -- bench/\` | 0 | 库版本 21521；STORY-021 rev 5（11 行）、SUB-039 rev 4（12 行）、SUB-040 rev 4（12 行），共 35 行；\`bench/\` 差异 0 行。 |
| E02 | \`CI=1 pnpm install --frozen-lockfile\` | 0 | 锁文件一致，\`pnpm-lock.yaml\` 无变更。 |
| E03 | \`pnpm build\` | 0 | \`@voxward/contracts\`、\`@voxward/server\`（\`dist/main.js\` 带 \`--external:ws\`）、\`@voxward/web\` 全部构建通过。 |
| E04 | \`pnpm typecheck\` | 0 | contracts、server、web 与 \`bench:typecheck\` 均 0 个 \`error TS\`。 |
| E05 | \`CI=1 guarded.sh .../e05-s021-vitest pnpm --filter @voxward/server exec vitest run <S021 全部 10 个测试文件>\` | 0 | 10 个文件、62 项测试全部通过（\`socket.test.ts\` 12、\`pump.test.ts\` 14、\`resend-contract.test.ts\` 4、\`consumer-dedup.test.ts\` 5、\`frames.test.ts\` 5、\`subscription-registry.test.ts\` 3、\`output-store.test.ts\` 8、\`output-grants.test.ts\` 3、\`url-redaction.test.ts\` 4、\`error-responses.test.ts\` 4）。 |
| E06 | \`pnpm check:deps\` | 0 | \`check-deps: ok, 219 files checked, 0 violations\`。 |
| E07 | \`env -u VOXWARD_DATABASE_FILE -u VOXWARD_ADAPTERS -u VOXWARD_PORT -u VOXWARD_HOST bash .../voxward-master/tools/smoke.sh .../verify-m7d .../probes/smoke\`（事后清理未跟踪默认库） | 0 | \`dev healthz ok=1 code=200 after 2s\`；\`dist healthz ok=1 code=200 after 1s\`；停止后 \`no listeners\`，\`:3000\` 与 \`:5173\` 均 0 监听。 |
| E08 | \`CI=1 bash .../guarded.sh .../probes/e08-test pnpm test\` | 0 | **149 个测试文件、1886 项测试全部通过**。\`selfcheck.txt\` 在 preload 后执行（\`guardLoaded: true\`）；179 个 Node 进程加载拦截，外部主机连接 0 次、既有回环端口拒绝 0 次（回环 36 次、fetch-loopback 17 次、IPC 36 次、测试内受拦 DNS 1 次），\`shim.log\` 0 字节。 |
| E09 | 临时副本 \`check-deps\` 负面对照（不触碰检出）：向 \`adapters/native-output\`、\`modules/output-adapter\`、\`contracts/output\`、\`db\` 注入 6 处跨区导入运行 \`scripts/check-deps.mjs\`，删除后复核 | 0、1、0 | 基线 219 文件 0 违规；注入后精确报出 6 处违规（退出码 1）；清理后恢复 219 文件 0 违规。 |
| E10 | \`node .../mana-orchestrate/scripts/kiro-specs.mjs check --workspace "<Ether>" --work-id work:26274628cbb8f691b6cf430c --spec-dir .kiro/specs/voxward-s021-output\` | 0 | \`reasonCode: "SPEC_CURRENT"\`，\`workRevision: 5\`，\`sourceDigest\` 与 \`previousSourceDigest\` 均为 \`64cb9883…a45469\`；\`.kiro/specs/**\` 未被修改。 |
| E11 | 静态核对 \`ad484f7\` 15 个改动文件与全部探针拦截日志汇总 | 0 | 分区导入、短事务边界、\`design.md\`/\`tasks.md\`（\`R1.1\`–\`R1.6\`）与代码逐项一致；\`e11-guard-audit.json\` 确认全部 6 次受控执行 \`guardLoaded=true\`、\`shimBytes=0\`、外连 0 次。 |
| E60 | \`CI=1 bash .../guarded.sh .../e60-s021 .../tsx .../probe-m7b-s021.mts .../verify-m7d\` | 0 | **\`checks 35, failures 0\`**：\`G1–G11\`、\`Q1–Q4\`、\`C1–C5\`、\`D1–D5\`、\`S1–S9\`、**\`Z1\`**（双消费者在线下 \`app.close()\` \`0 ms\` 完成并断开，收口 \`N1\`）全部通过；观察 \`M1\` 中 16 MiB 客户端帧在 \`159 ms\` 内以 \`1009\` 断开（收口 \`N3\`）。 |
| E61 | \`CI=1 bash .../guarded.sh .../e61-s021-race .../tsx .../probe-m7b-s021-race.mts .../verify-m7d\` | 0 | **\`checks 4, failures 0\`**：**\`R1\`–\`R4\` 全部通过**（\`R1\` 真实应用慢消费者阻塞第 1 行期间改判第 2 行为 \`BLOCK\`：正常消费者与慢消费者均未收到第 2 行原文，只收到 \`DELIVER:row-1\` 与 \`WARD_BLOCKED:overturn-delivery:channel-a:op-block-2\`；\`R2\` 受控挂起改判、\`R3\` 挂起标 \`CANCELLED\`、\`R4\` 挂起过期全部跳过不发，收口 \`B7\`）。 |
| E62 | \`CI=1 bash .../guarded.sh .../e62-s021-example .../tsx .../probe-m7b-s021-example.mts .../verify-m7d\` | 0 | **\`checks 5, failures 0\`**：\`E1–E5\` 原样运行 \`examples/consumer-dedup/consumer.mjs\` 全部通过。 |
| E63 | \`CI=1 bash .../guarded.sh .../e63-s021-rework1 .../tsx .../probe-m7d-s021-rework1.mts .../verify-m7d\` | 0 | **\`checks 4, failures 0\`**：\`X1\`（4096B->4400，4097B 与 2500+2500 分片->3 ms 内 1009，日志干净且健康订阅者照常收帧）、\`X2\`（4 行混合改判 \`BLOCK\` + S019 \`CANCELLED\` 同轮精确跳过）、\`X3\`（在途行自身改判拒标 \`SENT\`、绝不二次重发且下发同 \`platformOrder=77\` 的 \`WARD_BLOCKED\`）、\`X4\`（6 MiB 慢写中途 \`app.close()\` \`0 ms\` 完成且 0 个未捕获拒绝）全部通过。 |

## 1. 共同检查与返工核验

<a id="recheck"></a>
### 1.1 复验范围

相对于第 m7b 批候选 \`7400f39\`，本候选 \`d8ed897\` 合入了 S019 初版（\`d047636\`，\`app.ts\` 增加数据请求路由挂载，不动 \`startNativeOutput\` 内部逻辑）与 \`P-S021-fix1\`（\`ad484f7\`，修改 \`output-port.ts\`、\`output-store.ts\`、\`delivery.ts\`、\`app.ts\`、\`socket.ts\`、协议文档、去重样例及测试）。由于 \`socket.ts\`、\`output-store.ts\`、\`app.ts\`、\`delivery.ts\`、\`output-port.ts\`、\`docs/protocol/\`、\`examples/\` 在新候选上均有改动，按第 m7b 批 \`judgment.md\`「复验范围」要求，本轮在 \`d8ed897\` 上完整重跑了 \`E02–E11\` 与 \`E60–E62\`，并新增边界探针 \`E63\`，对 S021 组全部 35 行在 \`d8ed897\` 上重新判定并盖新 \`codeVersion\`。\`VOXWARD-SUB-049\` 已在 \`7400f39\` 关单且 \`bench/\` 0 改动（E01），本轮不重出证据行。

<a id="spec"></a>
### 1.2 Spec 状态与 P-S021-fix1（B7、N1–N4）逐项核对

- **Spec（E10）**：\`kiro-specs.mjs check\` 对 \`.kiro/specs/voxward-s021-output\` 返回 \`SPEC_CURRENT\`（\`workRevision: 5\`）；\`design.md\`（§3、§6、§8、§13）与 \`tasks.md\`（\`R1.1\`–\`R1.6\`）均已与代码对齐。
- **B7 修复核验（通过）**：
  - \`packages/contracts/src/ports/output-port.ts:52\` 新增 \`readSendableRow({ deliveryId, nowIso })\`；\`apps/server/src/db/output-store.ts:215-231\` 同步查询 \`deliveries.id = deliveryId AND status = 'PENDING' AND valid_until > nowIso AND verdicts.is_current = 1\`；\`apps/server/src/modules/output-adapter/delivery.ts:65-68\` 在每行进入 \`sendRow\` 前同一同步段调用 \`readSendableRow\`，从重查到 \`ws.send\` 之间无任何 \`await\` 让出事件循环。
  - \`output-store.ts:253-278\` 的 \`markSent\` 在短事务内联表核验 \`verdicts.is_current = 1\`，在途行自身若在写出期间被改判，写完后不会被标为 \`SENT\`，下一轮因 \`is_current = 0\` 也不会重发，且补发被拒（E63 \`X3\`）。
  - \`E61\` \`R1–R4\`（4/4）与 \`E63\` \`X2–X3\`（2/2）全部通过。
- **N1 修复核验（通过）**：\`apps/server/src/app.ts:147\` 将 \`startNativeOutput\` 的清理钩子由 \`onClose\` 改为 \`preClose\`，在 Fastify 关闭 HTTP 服务器等待升级套接字之前先停定时器并 \`terminate()\` 全部 WebSocket 客户端。\`E60 Z1\`（双消费者在线 \`0 ms\` 返回）、\`E63 X4\`（6 MiB 慢写中途 \`0 ms\` 返回且 0 未捕获异常）与 \`socket.test.ts\` 新增用例全部通过。
- **N2 修复核验（通过）**：\`docs/protocol/output-native-v1.md\` §3（第 70 行）明确写明：当已下发 \`DELIVER\` 的消息被改判为 \`BLOCK\` 时，服务端下发同一 \`platformOrder\` 的 \`WARD_BLOCKED\` 帧，下游消费者应据此撤回或隐藏此前对应同一 \`platformOrder\` 的展示内容（与 \`E63 X3\` 实测帧序一致）。
- **N3 修复核验（通过）**：\`apps/server/src/adapters/native-output/socket.ts:77\` 为 \`WebSocketServer\` 配置 \`maxPayload: 4096\`。实测 \`4096 B\` 客户端帧走应用层 \`4400 CLIENT_DATA_NOT_ACCEPTED\`；\`4097 B\` 单帧、\`2500+2500 B\` 分片消息及 \`16 MiB\` 大帧均在 \`ws\` 帧头层立即以标准关闭码 \`1009\` 断开（4097B 耗时 \`3 ms\`，16 MiB 耗时 \`159 ms\`），日志只记 \`{ errorCode: "WS_ERR_UNSUPPORTED_MESSAGE_LENGTH" }\`，无凭据或载荷泄露，同房间健康消费者继续正常收帧（E60 \`M1\`、E63 \`X1\`）。
- **N4 修复核验（通过）**：\`docs/protocol/output-native-v1.md\` §10（第 153 行）已修正为 S003 \`auth_output_tokens\` 与原生凭据共用 \`vwo_\` 前缀、当前无任何 HTTP 路由要求 \`output.feed\` 且不能订阅原生端点；\`examples/consumer-dedup/dedupe.mjs\`（第 1–5 行）已去掉「promises at-least-once delivery」表述；\`design.md\` §3（第 91 行）已补齐 \`auth/output-grants.ts\`。
- **Q16、Q18、Q25、Q56 状态**：四项在本候选上的 S021 责任部分均持续成立（E60 \`G1–G11\`、\`Q1–Q4\`、\`S5–S6\`）。

## 2. VOXWARD-STORY-021 组逐行判定（35 行：35 satisfied，0 failed）`;

const tailScope = `<a id="scope"></a>
## 3. 未验证范围与后续责任边界

- **浏览器覆盖层页面与 OBS Browser Source 片段地址实测（Q16 浏览器侧、N2 舞台渲染、S003 令牌去留）**：由 \`VOXWARD-STORY-023\` 承接。
- **远端反向代理 WSS 终止与不记录 \`Sec-WebSocket-Protocol\` 请求头配置（N3 部署侧）**：由 \`VOXWARD-STORY-029\` 承接。
- **显示昵称安全称呼与付费展示字段**：当前无入库来源，\`display.label\` 恒为 \`null\`（\`design.md\` §11）。`;

const acceptance = [
  headAndSummary,
  "",
  ownRows("VOXWARD-STORY-021", "2.1 VOXWARD-STORY-021 本单行"),
  ownRows("VOXWARD-SUB-039", "2.2 VOXWARD-SUB-039 本单行"),
  ownRows("VOXWARD-SUB-040", "2.3 VOXWARD-SUB-040 本单行"),
  inheritRows(
    KEYS,
    "2.4 INHERIT 行（Story 与两张子单对照）",
    "同一 INHERIT 行在 VOXWARD-STORY-021、VOXWARD-SUB-039、VOXWARD-SUB-040 上的 expected、method、requirement 逐字相同（E01），expected 只列一次；P-S021-fix1 合入后全部 INHERIT 行（含 INHERIT-018）均成立。"
  ),
  tailScope,
  "",
].join("\n");

// ------------------------------------------------------------------ evidence-records.json + strict checks
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
    if (JSON.stringify(Object.keys(record)) !== JSON.stringify(EIGHT)) problems.push(`${row.acceptanceId}: bad key order`);
    if (JSON.stringify(Object.keys(record.requirement)) !== '["workId","requirementId","version"]') {
      problems.push(`${row.acceptanceId}: bad requirement keys`);
    }
    if (!Number.isInteger(record.acceptanceVersion) || record.acceptanceVersion < 1) problems.push(`${row.acceptanceId}: bad acceptanceVersion`);
    if (!Number.isInteger(record.requirement.version) || record.requirement.version < 1) problems.push(`${row.acceptanceId}: bad requirement.version`);
    if (!["satisfied", "failed", "unverified"].includes(record.outcome)) problems.push(`${row.acceptanceId}: bad outcome`);
    if (!["machine", "source-behavior-review"].includes(record.kind)) problems.push(`${row.acceptanceId}: bad kind`);
    if (typeof record.actual !== "string" || record.actual.trim().length < 40 || /^(pass|ok|success)$/i.test(record.actual.trim())) {
      problems.push(`${row.acceptanceId}: bad actual`);
    }
    if (/\$\{|undefined|TODO/.test(record.actual)) problems.push(`${row.acceptanceId}: placeholder in actual`);
    const anchorTag = `<a id="${anchorOf(row.acceptanceId)}"></a>`;
    const occurrences = acceptance.split(anchorTag).length - 1;
    if (occurrences !== 1) problems.push(`${row.acceptanceId}: anchor occurs ${occurrences} times`);
    if (!acceptance.includes(`**${row.acceptanceId}@${row.acceptanceVersion}：${record.outcome}**`)) {
      problems.push(`${row.acceptanceId}: heading missing in acceptance.md`);
    }
    evidence.push(record);
    tally.total += 1;
    tally[record.outcome] += 1;
    counts.total += 1;
    counts[record.outcome] += 1;
  }
  if (evidence.length !== card.rows.length) problems.push(`${card.externalKey}: expected ${card.rows.length} rows, got ${evidence.length}`);
  counts.byTarget[card.externalKey] = tally;
  targets.push({
    externalKey: card.externalKey,
    workId: card.workId,
    revision: card.revision,
    evidence,
  });
}

for (const key of Object.keys(rows)) {
  if (!used.has(key)) problems.push(`${key}: unused in rows-m7d.mjs`);
}
if (counts.total !== 35 || counts.satisfied !== 35 || counts.failed !== 0 || counts.unverified !== 0) {
  problems.push(`unexpected counts: ${JSON.stringify(counts)}`);
}

if (problems.length > 0) {
  console.error("BUILD_OUT_M7D_PROBLEMS:", problems);
  process.exit(1);
}

const evidenceFile = {
  note: "草稿，供主线程链写。targets[].evidence 中每一行只含引擎 evidence 行允许的八个键，可原样追加到对应工单 content.evidence（close-batch.cjs 会保留 7400f39 历史行并追加 d8ed897 新行）。35 行全部 satisfied（failed 0、unverified 0）：VOXWARD-STORY-021 11/11、VOXWARD-SUB-039 12/12、VOXWARD-SUB-040 12/12。VOXWARD-SUB-049 已在 7400f39 关单且 bench/ 无改动，按简报不含在本文件。locator 指向 .kiro/specs/voxward-batch-m7d/evidence/acceptance.md，主线程需把本轮 acceptance.md 放到该路径。",
  candidate: {
    codeVersion: CODE_VERSION,
    fullSha: FULL_SHA,
    note: "引擎按字符串精确比较 evidence.codeVersion 与完成候选。三张工单 35 行全部 satisfied，可以 DONE_KEYS=VOXWARD-SUB-039,VOXWARD-SUB-040,VOXWARD-STORY-021 在 d8ed897 上关单（close-batch.cjs 先关子单再关 Story）。写入时以读回的 revision 为准。",
  },
  readFrom: {
    command: "预取实时工单快照 m7d-show/VOXWARD-{STORY-021,SUB-039,SUB-040}.json（einzbern.mjs work-show --workspace <Ether> --external-key <KEY>）",
    libraryVersion: cards[0].libraryVersion,
    headEventHash: cards[0].headEventHash,
  },
  shapeCheck:
    "生成脚本对每一行检查：键名与顺序精确为八个、requirement 三键、正整数版本、outcome 与 kind 枚举、kind 按方法确定（方法以「接口/数据字段/文档与原始需求核对」或「对照本单交付边界及依赖」开头的为 source-behavior-review，其余为 machine）、actual 非空且不是裸 pass/ok/success、无未替换占位符、locator 锚点在 acceptance.md 中恰好出现一次且该行标题存在、codeVersion 为 d8ed897，并核对每单写出的行数与 E01 读到的实时行数相同（11+12+12=35）、rows-m7d.mjs 没有多余或缺少的行、同一 INHERIT 行在 Story 与子单上的 expected 与 method 相同。未调用引擎写入。",
  counts,
  targets,
};

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "acceptance.md"), acceptance);
fs.writeFileSync(path.join(outDir, "evidence-records.json"), `${JSON.stringify(evidenceFile, null, 1)}\n`);
console.log(JSON.stringify({ ok: true, counts }, null, 2));
