# VOXWARD-STORY-001 第 1 批判断

- 总判定：**通过**，不打回。候选 `ffa1ddc`（本地 main，合并 SUB-001 `3c94ba6`、SUB-002 `4ea44a6`、SUB-003 `14dd8ed`）。
- 范围：VOXWARD-STORY-001 的 11 行与 VOXWARD-SUB-001/002/003 各 12 行，共 47 行验收，全部 `satisfied`；没有 `failed` 或 `unverified` 行。逐条依据见 `.kiro/specs/voxward-s001-skeleton/evidence/acceptance.md`。
- rejection 计数：本轮不增加。
- 判断人：独立验收兼判断子代理（main 档），未参与实现；按小轮条件（1 个实施包）一次完成验收、判断与 lessons。

## 阻断发现

无。

按 batch-execution-v1「Acceptance evidence and recheck scope」第 2 条，阻断需要当前行为、明确契约或可信安全边界，并写清触发与影响。本轮实测（E02–E13）与源码审查（E14、E15）没有发现满足该条件的问题。下列建议均不影响任何验收行的 expected。

## 与实施方自测的对照

`self-check.md` 报告的数字在本次干净检出上全部复现：41 项测试、check-deps 38 个文件 0 违规、两份 Spec 为 SPEC_CURRENT（workRevision 4 与 3）、四类配置失败的退出码与报错文字。实施方报告的一次 Vite `Pre-transform error` 本次没有出现，原因仍未查明。

## 非阻断建议

**N1 check-deps 有扫描盲区**（SUB-003，`scripts/check-deps.mjs`）
- 触发：在模块目录放 `.mts`、`.cts`、`.js` 或 `.mjs` 文件，或写模板字符串动态导入 ``import(`fastify`)``，或写 `require("fastify")`。
- 观察：E11 中 `.mts` 文件没有被扫描（扫描数 50 = 38 + 12），模板字符串动态导入没有报出；`require(` 不在匹配模式里（静态审查）。当前代码没有这些写法，所以不影响本批判定。
- 建议：把扫描扩展名扩到 `.mts/.cts/.js/.mjs/.jsx`，导入正则接受反引号并加 `require(`；或改用 TypeScript 编译器 API 解析导入。
- 关联：模块区禁止一切外部包与 `node:` 内置模块。S002 引入 SQLite/Drizzle 时，需要先决定数据库访问放在 adapter 还是模块，再同步更新区划表与 `design.md` §2。

**N2 listen 失败没有受控报错**（SUB-003，`apps/server/src/main.ts`、`apps/server/src/config/schema.ts`）
- 触发：`VOXWARD_HOST=not-a-host.invalid`（schema 只要求非空字符串），或端口已被占用。
- 观察：E09 中未捕获的 `getaddrinfo ENOTFOUND` 打印完整堆栈，退出码 1。主机名不是密钥，验收行只要求未知配置与缺必需项受控报错，所以不阻断。
- 建议：`main.ts` 捕获 `app.listen` 的失败并输出一行带错误码的报错；host 校验为 IP 或主机名。

**N3 InferenceRequest 用 correlationId 作唯一编号**（SUB-002，`packages/contracts/src/modules/inference-provider.ts`）
- 观察：注释称它是「temporary correlation id」，边界测试直接传入事件的 `correlationId`。提案 §12.2 把 correlationId 定义为同一消息从接入到最终处理全程沿用的日志关联 ID；§8.1 要求模型输入只带临时 `itemId`；§10 由 Technical Log 保存临时 itemId 映射。
- 影响：S001 没有真实推理适配器，没有数据发往模型，当前无影响。若后续 Kiro 适配器把 correlationId 直接当作模型可见的 itemId，会偏离 §8.1。
- 建议：修正注释；EPIC-002 的 Kiro 适配器 Story 在适配器内为每次任务生成 itemId 并记录映射，correlationId 只用于本地关联与 `cancel`/`releaseSession`。如需让契约显式表达，给 InferenceRequest 增加 itemId，并按契约版本变更处理。

**N4 工单交付清单与实际路径不一致**（SUB-001、SUB-003 的 `details.deliverables`）
- SUB-001 列出 `apps/web/src/App.tsx`，实际不存在；`main.tsx` 直接渲染 `routes.tsx` 生成的路由。
- SUB-003 列出 `modules/{platform-source,moderation,scoring,inference,task-coordinator,decision,output,data-lifecycle,audit}`，实际目录为 `platform-source`、`moderation-engine`、`scoring-engine`、`inference-provider`、`task-coordinator`、`decision-service`、`output-adapter`、`data-lifecycle-service`、`audit-store`，与接口名一致。
- 没有行为影响。后续派工引用实际路径。

**N5 类型级契约断言只由 typecheck 强制**（SUB-002，`packages/contracts/test/contracts.test.ts`）
- `vitest run` 不检查类型，这些用例在运行时总是通过（E12 已证明 tsc 会报错）。只跑 `pnpm test` 的门禁会漏掉契约形状回归。
- 建议：保持 `pnpm typecheck` 为必需门禁，或启用 vitest 的 typecheck 模式。

**N6 vitest workspace 文件已弃用**（`vitest.workspace.ts`，vitest 3.2.7）
- 升级 vitest 主版本时迁移到 `test.projects`。

**N7 §9.3 的部分职责还没有方法**（SUB-002，`packages/contracts/src/modules/`）
- PlatformSource 的身份能力；ScoringEngine 的人工纠错，且 `ScoreChange` 未显式带频道范围；DataLifecycleService 的例外、保留期限与清理；AuditStore 的删除索引。
- S001 设计只定签名；相应 Story 扩展这些接口时按契约版本变更处理。

**N8 生产启动需要显式指定适配器集**（`apps/server/package.json` 的 `start` 脚本）
- `node dist/main.js` 不设 `VOXWARD_ADAPTERS` 时以 `CONFIG_INVALID: adapters (required key is missing)` 退出 1。这是设计选择，部署说明需写明。

## 复验范围

本轮没有阻断，不需要复验。若之后处理非阻断项：N1 重跑 `pnpm check:deps` 与 E11 负面对照；N2 重跑 E08、E09；N3 只改注释时无需复验，改契约字段需重跑 E04、E05、E10、E12 与边界用例；N4 只改工单文字时无需复验代码。

## lessons

`lessons.json` 记录 5 条本轮新确立的事实：引擎验收证据的真实字段、check-deps 的扫描范围与模块区限制、类型级断言的强制方式、服务配置接入点与失败语义、推理请求编号与模型 itemId 的关系。
