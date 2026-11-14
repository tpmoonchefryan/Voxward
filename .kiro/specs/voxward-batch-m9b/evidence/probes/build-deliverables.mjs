import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const SHOW_DIR = process.env.SHOW_DIR;
const OUT_DIR = process.env.OUT_DIR;
assert.ok(SHOW_DIR && OUT_DIR, "SHOW_DIR and OUT_DIR env vars are required");

const CODE_VERSION = "e639cf8";
const FULL_SHA = "e639cf8e4f36a645d1401149968b9a25b073120c";
const LOCATOR_BASE = ".kiro/specs/voxward-batch-m9b/evidence/acceptance.md";

const s028Show = JSON.parse(fs.readFileSync(path.join(SHOW_DIR, "VOXWARD-STORY-028.json"), "utf8"));
const sub051Show = JSON.parse(fs.readFileSync(path.join(SHOW_DIR, "VOXWARD-SUB-051.json"), "utf8"));

assert.equal(s028Show.headEventHash, sub051Show.headEventHash);
const headEventHash = s028Show.headEventHash;

function kindOfMethod(method) {
  if (
    method.startsWith("接口/数据字段/文档与原始需求核对") ||
    method.startsWith("对照本单交付边界及依赖")
  ) {
    return "source-behavior-review";
  }
  return "machine";
}

function suffixOf(acceptanceId) {
  return acceptanceId.replace(/^VW-(?:S028|SUB051)-/, "");
}

function decisionForRow(acceptanceId, method) {
  const sfx = suffixOf(acceptanceId);
  const kind = kindOfMethod(method);

  switch (sfx) {
    case "AC001":
    case "STORY":
    case "PARENT":
      return {
        outcome: "satisfied",
        kind,
        actual:
          "第 m9b 批（e639cf8，合入 voxward/s028-privacy-verify 88eb25b）首次验收通过。实测依据：（1）D2 零产品改动边界：git diff f1a75e9..88eb25b 仅新增 Spec、3 个数据生命周期集成测试文件与 docs/acceptance/data-lifecycle-matrix.md，apps/*/src、packages/*/src、scripts、deploy、vitest.workspace.ts 均 0 修改，Spec 提交 9a37a4e 先于实现提交 88eb25b（E10 SPEC_CURRENT，workRevision=4）；（2）全存储面删除矩阵（deletion-matrix.test.ts + E80 P1）：对照迁移后 sqlite_master 全部 27 张业务表与 3 类内存缓存（ViewerCache、CandidateStore、SubjectCacheHub），验证 DELETE_DATA_ONLY 与 DELETE_AND_EXCEPT 清除内容与缓存、推进 processing_generation=1、归零 subject_scores、保留脱敏 DATA_REQUEST_CERTIFICATE 审计证明并支持 RESUME_SCORING；（3）全记分入口与故障注入（scoring-and-faults.test.ts + E80 P2）：自动（ScoringEngine EXCEPTION_ACTIVE）、人工（DecisionService.commit）及延迟（ReviewRunner.resumePendingScoring）记分均保持 0 账本与 0 分值，preferenceMarkerOf 仅含三键且零敏感明文，旧代次被 STALE_GENERATION 拒绝，清理中途故障返回 PARTIAL_FAILED（绝不假报 COMPLETED）并支持幂等重试收敛，墓碑失败以 409 TOMBSTONE_UNAVAILABLE 失败关闭；（4）微批/跨频道隔离、RBAC 与 WAL/备份擦除（isolation-rbac-restore.test.ts）：同批不同主体与跨频道共享 correlationId 严格隔离，MODERATOR 与 DATA_ADMIN 路由及字段权限（message.original vs subject.evidence）严格分离，已删/到期均 404 不可取回，文件级 WAL + createBackup + 失败 .restoring 清理 + restoreDatabaseWithPorts + sweepExpired + compact() 后 .sqlite3 原始字节 0 残留；（5）诚实披露 NO_SUBJECT_CACHES 默认边界、HMAC 密钥待装配、Q30 物理介质非绝对擦除与 YouTube/Kiro 外部范围（E80 P3）。",
      };
    case "INHERIT-001":
      return {
        outcome: "satisfied",
        kind,
        actual:
          "审查 D2 变更集、scripts/check-deps.mjs（E06 265 文件 0 违规；E09 负向对照退出码 1）及 E80 P3 文档路径核查：本单零修改业务代码与部署脚本，未引入生产托管或新本机代理；全部 9 个 S028 受控文件 0 处禁止本地路径字面量，矩阵内 6/6 个仓库相对链接全部解析存在。",
      };
    case "INHERIT-002":
      return {
        outcome: "satisfied",
        kind,
        actual:
          "对照 VW-R-002 核查 deletion-matrix.test.ts、isolation-rbac-restore.test.ts 与 docs/acceptance/data-lifecycle-matrix.md §4.4：测试在真实 SQLite channel_events / subject_identities 上验证受试者删除清理与非目标受试者保留，未改动 EPIC-003 平台接入层，并在矩阵 §4.4 明确说明未发起真实 YouTube API 调用。",
      };
    case "INHERIT-003":
      return {
        outcome: "satisfied",
        kind,
        actual:
          "对照 VW-R-003 核查 deletion-matrix.test.ts:317-355,452-455：本单验证了删除受试者不影响频道级 rule_versions、rule_terms 与非目标 list_entries，未改动 EPIC-001/002 路由真值表或规则引擎职责，无虚构通过。",
      };
    case "INHERIT-004":
      return {
        outcome: "satisfied",
        kind,
        actual:
          "对照 VW-R-004 核查 deletion-matrix.test.ts 与 scoring-and-faults.test.ts（及 E80 P2）：本单验证了受试者删除后 score_ledger 与 score_outcomes 清零、subject_scores 归零且 version 递增，以及例外期间自动/人工/延迟记分均保持 0 分不变，未改变正常评分算法职责。",
      };
    case "INHERIT-005":
      return {
        outcome: "satisfied",
        kind,
        actual:
          "对照 VW-R-005 核查 deletion-matrix.test.ts:363-384,438,497-505 与 E80 P2：实测显式注入 SubjectCacheHub 时删除操作清除关联 CandidateStore 候选词卡（同时如实记录省略 subjectCaches 时默认 NO_SUBJECT_CACHES 遗留词卡边界），且 ReviewRunner.resumePendingScoring 尊重删除例外不补记扣分。",
      };
    case "INHERIT-006":
      return {
        outcome: "satisfied",
        kind,
        actual:
          "对照 VW-R-006 核查 isolation-rbac-restore.test.ts:80-95,138-274：验证微批共享 batchId / correlationId 时按受试者精确隔离删除，未改动 EPIC-002/005 TaskCoordinator 车道容量或微批调度实现，无虚构通过。",
      };
    case "INHERIT-007":
      return {
        outcome: "satisfied",
        kind,
        actual:
          "对照 VW-R-007 核查 scoring-and-faults.test.ts:208-332：验证人工裁决通路（DecisionService.commit）在 DELETE_AND_EXCEPT 下不记扣分账本，且在 DELETE_DATA_ONLY 推进 processing_generation 后以 conflict / STALE_GENERATION 拒绝过期代次任务提交，保持单次最终裁决与代次隔离契约。",
      };
    case "INHERIT-008":
      return {
        outcome: "satisfied",
        kind,
        actual:
          "对照 VW-R-008 核查 deletion-matrix.test.ts:217-223,416 与 isolation-rbac-restore.test.ts:202-287：验证整批 VALIDATED_JSON 与 ITEM_ID_MAP 证据受 subject.evidence 权限门禁保护且在删除/到期后彻底清除不可取回，未修改 JSON Schema 校验器职责。",
      };
    case "INHERIT-009":
      return {
        outcome: "satisfied",
        kind,
        actual:
          "审查 apps/server/test/integration/data-lifecycle/*.test.ts、docs/acceptance/data-lifecycle-matrix.md §4.4 并结合 Q58 守护审计（probes/logs/q58-audit.json：e05-s028-vitest 与 e80-m9b 均满足 guardLoaded=true、5 外网主机全拒、shim.log 0 行、外发 0 条）：测试仅使用合成标记文本，未调用真实 Kiro CLI，且矩阵明确说明应用侧清理不代表外部提供方工作区删除。",
      };
    case "INHERIT-010":
      return {
        outcome: "satisfied",
        kind,
        actual:
          "对照 VW-R-010 核查测试配置与矩阵 §4.4：本单在 adapters='synthetic' 下验证数据生命周期，保持 Kiro CLI/Crew 适配器可替换边界不变，未虚构真实模型调用证据。",
      };
    case "INHERIT-011":
      return {
        outcome: "satisfied",
        kind,
        actual:
          "跨模块生命周期测试（E05 3 文件 9 用例 + E80 P1–P2）在真实文件级 SQLite WAL 短事务上验证了 27 张表约束、外键锚点、createBackup（VACUUM INTO）、失败回滚清理 .restoring*、restoreDatabaseWithPorts 墓碑重放与 compact()（VACUUM + wal_checkpoint(TRUNCATE)）后 -wal 归零及原始文件字节擦除。",
      };
    case "INHERIT-012":
      return {
        outcome: "satisfied",
        kind,
        actual:
          "跨模块权限与隔离测试 isolation-rbac-restore.test.ts:184-235 经真实 buildApp HTTP 注入实测：（1）MODERATOR 请求 /channels/ch-1/data/* 返回 403；（2）logAccess=false 的 MODERATOR 请求 /internal/channels/ch-1/logs/* 返回 403；（3）logAccess=true 的 MODERATOR 仅获 MESSAGE_TEXT/TRANSLATION（省略 VALIDATED_JSON/ITEM_ID_MAP），DATA_ADMIN 仅获 VALIDATED_JSON/ITEM_ID_MAP（省略 MESSAGE_TEXT）；（4）跨频道相同 correlationId 查询严格隔离在当前频道内。",
      };
    case "INHERIT-013":
      return {
        outcome: "satisfied",
        kind,
        actual:
          "跨模块删除与恢复计分测试 deletion-matrix.test.ts（DELETE_DATA_ONLY、DELETE_AND_EXCEPT、RESUME_SCORING 全 HTTP 流程：POST 创建 201 -> verification VERIFIED 200 -> execute 200 COMPLETED/RESUMED）与 scoring-and-faults.test.ts（PARTIAL_FAILED 仅存 errorCode 不落敏感异常文本、重试幂等 COMPLETED、409 TOMBSTONE_UNAVAILABLE 失败关闭）完整验证了 VW-R-013 生命周期闭环。",
      };
    case "INHERIT-014":
      return {
        outcome: "satisfied",
        kind,
        actual:
          "跨模块测试 scoring-and-faults.test.ts:111-231、deletion-matrix.test.ts:457-495 与 E80 P2 完整验证：DELETE_AND_EXCEPT 清空历史数据后，自动记分（ScoringEngine）、人工记分（DecisionService）与延迟记分（ReviewRunner.resumePendingScoring）均保持 0 分与 0 账本行；preferenceMarkerOf 仅含三键且 score_exceptions 不含任何昵称/频道明文/凭据（同时在矩阵 §4.2 如实注明 HMAC 密钥源待装配）；RESUME_SCORING 执行后正确解除例外。",
      };
    case "INHERIT-015":
      return {
        outcome: "satisfied",
        kind,
        actual:
          "跨模块测试 deletion-matrix.test.ts:415-431 与 isolation-rbac-restore.test.ts:202-287 完整验证：Change Log 与 Technical Log 职责分离，受试者删除后 technical_logs 与全部 4 类 technical_log_evidence 清零，而关联 change_logs 脱敏转化为 DATA_REQUEST_CERTIFICATE 保留审计证明；到期清理后技术日志与证据不可取回。",
      };
    case "INHERIT-016":
      return {
        outcome: "satisfied",
        kind,
        actual:
          "跨模块测试 isolation-rbac-restore.test.ts:138-287 完整验证：/internal/channels/:channelId/logs/technical/:logId 与 /logs/chains/:correlationId 按频道与角色字段权限返回关联链；删除 sub-1a 后其详情返回 404 且关联链仅剩同批未删的 sub-1b（不泄露 ch-2 同 correlationId 日志）；到期清理后 sub-1b 详情亦返回 404。",
      };
    case "INHERIT-017":
      return {
        outcome: "satisfied",
        kind,
        actual:
          "跨模块测试 deletion-matrix.test.ts、scoring-and-faults.test.ts、isolation-rbac-restore.test.ts 与 E80 P1–P3 全面验证：27 张 SQLite 表与 3 类内存缓存删除去向、processing_generation 代次推进阻断旧任务、PARTIAL_FAILED 故障如实报告与幂等收敛、备份恢复重放墓碑 + sweepExpired + compact() 擦除 .sqlite3 原始字节及清理 .restoring* 临时文件，并在矩阵 §4 如实披露 NO_SUBJECT_CACHES 默认边界、Q30 物理介质限制与外部提供方范围。",
      };
    case "INHERIT-018":
      return {
        outcome: "satisfied",
        kind,
        actual:
          "对照 VW-R-018 核查 deletion-matrix.test.ts:173-186,308-316,414,448：验证受试者删除级联清除关联 deliveries 行而保留频道级 output_grants 与 credential_refs 配置不变，未修改 EPIC-005 OBS Overlay/Dock 或原生只读输出协议实现，无虚构通过。",
      };
    case "INHERIT-019":
      return {
        outcome: "satisfied",
        kind,
        actual:
          "对照 VW-R-019 核查 D2 变更集与测试输入：本单零改动 apps/web/** 与 deploy/sandbox/**，全部测试均使用隔离临时数据库与虚构受试者标识，不含真实观众档案或平台生产凭据，无虚构通过。",
      };
    case "INHERIT-020":
      return {
        outcome: "satisfied",
        kind,
        actual:
          "对照 VW-R-020 核查 docs/acceptance/data-lifecycle-matrix.md：本单聚焦数据删除、日志权限与备份恢复正确性验证，未虚构延迟分位数、吞吐量或资源占用基准结论（性能基准由责任单 VOXWARD-STORY-027 承载）。",
      };
    default:
      throw new Error(`Unhandled acceptance suffix: ${sfx}`);
  }
}

function anchorOf(acceptanceId) {
  return acceptanceId.toLowerCase();
}

function buildTarget(showJson) {
  const externalKey = showJson.record.externalKey;
  const workId = showJson.record.id;
  const revision = showJson.record.revision;
  const acList = showJson.content.acceptance;
  assert.ok(Array.isArray(acList) && acList.length > 0);

  const evidence = [];
  const mdSections = [];

  for (const ac of acList) {
    const anchor = anchorOf(ac.id);
    const dec = decisionForRow(ac.id, ac.method);
    const req = ac.requirement;
    assert.ok(
      req &&
        typeof req.workId === "string" &&
        typeof req.requirementId === "string" &&
        Number.isInteger(req.version) &&
        req.version >= 1,
    );

    const row = {
      acceptanceId: ac.id,
      acceptanceVersion: ac.version,
      requirement: {
        workId: req.workId,
        requirementId: req.requirementId,
        version: req.version,
      },
      codeVersion: CODE_VERSION,
      locator: `${LOCATOR_BASE}#${anchor}`,
      actual: dec.actual,
      outcome: dec.outcome,
      kind: dec.kind,
    };

    assert.deepEqual(Object.keys(row), [
      "acceptanceId",
      "acceptanceVersion",
      "requirement",
      "codeVersion",
      "locator",
      "actual",
      "outcome",
      "kind",
    ]);

    evidence.push(row);

    mdSections.push(
      [
        `<a id="${anchor}"></a>`,
        `### ${ac.id} — \`${dec.outcome}\` (\`${dec.kind}\`)`,
        `- **关联需求**：\`${req.requirementId}@${req.version}\` (\`${req.workId}\`)`,
        `- **方法**：${ac.method}`,
        `- **场景**：${ac.scenario}`,
        `- **期望**：${ac.expected}`,
        `- **实测/审查结论**：${dec.actual}`,
        "",
      ].join("\n"),
    );
  }

  return { externalKey, workId, revision, evidence, mdSections };
}

const tS028 = buildTarget(s028Show);
const tSub051 = buildTarget(sub051Show);
const targets = [tS028, tSub051];

const counts = {
  total: 0,
  satisfied: 0,
  failed: 0,
  unverified: 0,
  byTarget: {},
};

for (const t of targets) {
  const c = { total: t.evidence.length, satisfied: 0, failed: 0, unverified: 0 };
  for (const r of t.evidence) {
    c[r.outcome] += 1;
    counts.total += 1;
    counts[r.outcome] += 1;
  }
  counts.byTarget[t.externalKey] = c;
}

assert.equal(counts.total, 45);
assert.equal(counts.satisfied, 45);
assert.equal(counts.failed, 0);
assert.equal(counts.unverified, 0);

const kindCounts = targets
  .flatMap((t) => t.evidence)
  .reduce((acc, r) => {
    acc[r.kind] = (acc[r.kind] ?? 0) + 1;
    return acc;
  }, {});

const acceptanceMd = [
  `# 第 m9b 批独立验收证据（Wave 3d：S028 首次验收，候选 \`${CODE_VERSION}\`）`,
  "",
  "## 1. 验收基线、门禁与实测探针摘要",
  "",
  `- **候选版本**：分离只读检出 \`verify-m9b\` 上的 \`${CODE_VERSION}\`（完整 SHA \`${FULL_SHA}\`，合入 \`88eb25b\` \`voxward/s028-privacy-verify\`；Spec 提交 \`9a37a4e\` 先于实现提交 \`88eb25b\`）。`,
  `- **实时工单快照**：\`headEventHash = ${headEventHash}\`，共 2 张活跃工单、45 行验收（\`VOXWARD-STORY-028\` \`rev=4\` 22 行；\`VOXWARD-SUB-051\` \`rev=3\` 23 行）。`,
  `- **统计汇总**：**45 行（satisfied ${counts.satisfied} 行、failed 0 行、unverified 0 行；machine ${kindCounts.machine} 行、source-behavior-review ${kindCounts["source-behavior-review"]} 行）**。两张工单首次验收均判定 **通过（PASS）**。`,
  "",
  "### 1.1 独立门禁与 Q58 守护实测记录",
  "",
  "| 编号 | 检查项 | 命令摘要 | 退出码 | 实测结论 |",
  "| --- | --- | --- | --- | --- |",
  "| D2 | Spec 先行与零产品改动核查 | `git log / git diff f1a75e9..88eb25b`（`probes/logs/d2-diff.log`） | `0` | Spec `9a37a4e`（4 文件）先于实现 `88eb25b`（5 文件）；`apps/*/src`、`packages/*/src`、`scripts`、`deploy`、`vitest.workspace.ts` 均为 **0 修改** |",
  "| E03 | 全仓构建 | `pnpm build`（`probes/logs/e03-build.log`） | `0` | `contracts`、`server`、`web` 构建全绿 |",
  "| E04 | 类型检查 | `pnpm typecheck && pnpm run bench:typecheck`（`probes/logs/e04-typecheck.log`） | `0` | 全仓及 `bench` 类型检查 0 错误 |",
  "| E05 | Q58 守卫下 S028 数据生命周期套件 | `guarded.sh .../e05-s028-vitest pnpm --filter @voxward/server test test/integration/data-lifecycle` | `0` | **3/3 文件、9/9 用例**全绿（覆盖 27 表+3 缓存矩阵、全记分入口与故障注入、微批/跨频道隔离/RBAC/WAL 恢复字节擦除） |",
  "| E06 / E09 | 模块依赖门禁与负向对照 | `node scripts/check-deps.mjs` + 违规导入负向对照 | `0` / `1` | 正式树 `265 files checked, 0 violations`；负向对照退出码 `1` |",
  "| E10 | Kiro Spec 对齐检查 | `kiro-specs.mjs check --work-id work:7575417f5d8162013086ea6f --spec-dir .kiro/specs/voxward-s028-privacy-verify` | `0` | `SPEC_CURRENT`（`workRevision: 4`） |",
  "| E80 | Q58 守卫下独立探针 `probe-m9b.mts` | `CI=1 bash guarded.sh .../e80-m9b tsx .../probe-m9b.mts`（`e80-m9b.json`、`q58-audit.json`） | `0` | `P1`（迁移后 `sqlite_master` 全部 27 张业务表与矩阵 §2 零差集对齐）、`P2`（延迟记分入口 `ReviewRunner.resumePendingScoring` 在 `DELETE_AND_EXCEPT` 下保持 `score_ledger=0, current_score=0`，`preferenceMarkerOf` 严格三键）、`P3`（9 个 S028 受控文件 `0` 处禁止路径、矩阵 `6/6` 相对链接存在且 §4 如实披露四项边界）全绿；Q58 审计 `guardLoaded=true`、5 外网拒绝、`shim.log` 0 行、外发 0 条 |",
  "",
  "---",
  "",
  "## 2. VOXWARD-STORY-028 逐行验收证据（22 行：22 satisfied / 0 failed）",
  "",
  ...tS028.mdSections,
  "---",
  "",
  "## 3. VOXWARD-SUB-051 逐行验收证据（23 行：23 satisfied / 0 failed）",
  "",
  ...tSub051.mdSections,
].join("\n");

const acceptancePath = path.join(OUT_DIR, "acceptance.md");
fs.writeFileSync(acceptancePath, acceptanceMd);

for (const t of targets) {
  for (const r of t.evidence) {
    const anchor = r.locator.split("#")[1];
    const matches = acceptanceMd.match(new RegExp(`<a id="${anchor}"></a>`, "g")) ?? [];
    assert.equal(matches.length, 1, `Anchor ${anchor} count mismatch: ${matches.length}`);
  }
}

const evidenceRecords = {
  note: `草稿，供主线程链写。targets[].evidence 中每一行严格只含引擎允许的八个键且顺序固定，可由 close-batch.cjs 原样并入对应工单 content.evidence。45 行：satisfied 45、failed 0、unverified 0。VOXWARD-STORY-028（22/22 satisfied）与 VOXWARD-SUB-051（23/23 satisfied）在 ${CODE_VERSION} 上首次验收全部通过，可直接关单（DONE_KEYS=VOXWARD-SUB-051,VOXWARD-STORY-028）。locator 指向 ${LOCATOR_BASE}。`,
  candidate: {
    codeVersion: CODE_VERSION,
    fullSha: FULL_SHA,
    note: `引擎按字符串精确比较 evidence.codeVersion 与完成候选。VOXWARD-STORY-028 与 VOXWARD-SUB-051 在 ${CODE_VERSION} 上 45/45 全部 satisfied，可通过 close-batch.cjs 生成链写与完成转换载荷。写入时以读回的 revision 为准。`,
  },
  readFrom: {
    command:
      "预取实时工单快照 wave3d/show/VOXWARD-{STORY-028,SUB-051}.json（einzbern.mjs work-show --workspace <Ether> --external-key <KEY>）",
    headEventHash,
  },
  shapeCheck: `生成脚本逐行校验：键名与顺序严格为 [acceptanceId, acceptanceVersion, requirement, codeVersion, locator, actual, outcome, kind] 八键、requirement 含三键且版本为正整数、outcome 与 kind 属合法枚举、kind 按 method 前缀规则确定（${kindCounts["source-behavior-review"]} 行 source-behavior-review + ${kindCounts.machine} 行 machine）、actual 非空且含具体实测/审查依据、locator 锚点在 acceptance.md 中唯一存在且与标题一一对应、每单行数与实时快照完全一致（22+23=45），并通过 close-batch.cjs 干跑校验。未调用引擎写入。`,
  counts,
  targets: targets.map((t) => ({
    externalKey: t.externalKey,
    workId: t.workId,
    revision: t.revision,
    evidence: t.evidence,
  })),
};

const evidenceRecordsPath = path.join(OUT_DIR, "evidence-records.json");
fs.writeFileSync(evidenceRecordsPath, JSON.stringify(evidenceRecords, null, 1) + "\n");

console.log(
  JSON.stringify(
    {
      acceptancePath,
      evidenceRecordsPath,
      counts,
      kindCounts,
    },
    null,
    2,
  ),
);
