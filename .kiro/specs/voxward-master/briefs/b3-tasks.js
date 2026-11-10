// Render batch-3 implementer prompts from impl-template.md into b3-tasks.json.
const fs = require("fs");
const path = require("path");
const tpl = fs.readFileSync(path.join(__dirname, "impl-template.md"), "utf8");
const common = { BATCH: "3", REJ: "0", BASE: "9a508e0" };
const pkgs = [
  {
    label: "VoxWard 第 3 批 P-S003：SUB-006→007",
    PKG: "P-S003", WT: "s003-auth", SPEC: "voxward-s003-auth",
    STORY_KEY: "VOXWARD-STORY-003", STORY_ID: "work:fd4f81864ddb33703517e12f",
    TICKETS: "- 父 Story：VOXWARD-STORY-003（work:fd4f81864ddb33703517e12f）「实现频道身份、角色权限与凭据隔离」\n- VOXWARD-SUB-006（work:dbbe21c0e4a859e27b5da62f）「实现登录会话、频道成员角色与服务端鉴权」\n- VOXWARD-SUB-007（work:5039a470eef52b78249aa255）「实现凭据隔离、不可信文本渲染边界与运行时 AI 最小权限契约」\n顺序：先 SUB-006，再 SUB-007。",
    SECTIONS: "（权限、凭据、不可信文本、运行时 AI 最小权限相关章节；可以先用 grep 找「权限」「凭据」「不可信」「最小权限」定位）",
    EXTRA: "\n## 本包要顺带处理的问题清单项\n- Q9：如果本包把数据库接进了 `apps/server/src/main.ts` 或 `app.ts`（比如会话存储），就要同时修好打包：现在 esbuild 的打包参数加上 better-sqlite3 后运行时会报 `Dynamic require of \"fs\" is not supported`；迁移目录按 `import.meta.url` 解析，打包后会指向不存在的 `dist/migrations`。修法：在 apps/server 的 build 脚本里把 `better-sqlite3` 和 `drizzle-orm` 设为 external，迁移目录随产物一起发布或者显式传入，再用 `node dist/main.js` 实测能打开数据库。如果本包没有把 db 接入 main，就不用处理 Q9，在报告里写明即可。\n- 登录方式来源里没有规定（拆单时登记为来源缺口）：选满足子单验收的最小做法，标「自定」，写进 spec。\n",
  },
  {
    label: "VoxWard 第 3 批 P-S005：SUB-010→011",
    PKG: "P-S005", WT: "s005-scoring", SPEC: "voxward-s005-scoring",
    STORY_KEY: "VOXWARD-STORY-005", STORY_ID: "work:c07537a238d62efa3b9779f6",
    TICKETS: "- 父 Story：VOXWARD-STORY-005（work:c07537a238d62efa3b9779f6）「实现频道评分、身份差额与幂等账本」\n- VOXWARD-SUB-010（work:79904ea195c17f06936ea1d2）「实现频道评分计算：基础/行为分、冷却与钳制」\n- VOXWARD-SUB-011（work:13b64d514c91bde7897af361）「实现 actualDelta 幂等账本、例外守卫与人工补偿接口」\n顺序：先 SUB-010，再 SUB-011。改动集中在 `apps/server/src/modules/scoring-engine/`（以实际目录为准）。",
    SECTIONS: " §5（第 158–200 行，评分）、§11.4（记分例外）",
    EXTRA: "\n## 注意\n- 计分上下限和冷却数值来源里没有规定：做成配置项或常量，并标「自定 / 待定」，不要编造具体数字当成产品决定。\n- 账本要用 S002 已有的表和仓储接口；模块不能直接导入 db 或 drizzle，要通过 contracts 里的端口接入（参考 S002 spec 的依赖方向表）。\n",
  },
  {
    label: "VoxWard 第 3 批 P-S007：SUB-013→014",
    PKG: "P-S007", WT: "s007-ai-contracts", SPEC: "voxward-s007-ai-contracts",
    STORY_KEY: "VOXWARD-STORY-007", STORY_ID: "work:05e6184a65712b369d65bba7",
    TICKETS: "- 父 Story：VOXWARD-STORY-007（work:05e6184a65712b369d65bba7）「定义并验证三类 AI 业务 JSON」\n- VOXWARD-SUB-013（work:fe2c775626ed8abc85bb27e6）「定义普通审核、SC 与复盘三类 AI 业务 JSON Schema」\n- VOXWARD-SUB-014（work:db458b164383624b55c9c875）「实现 AI 批结果业务校验、生成文本检查与错误定位」\n顺序：先 SUB-013，再 SUB-014。",
    SECTIONS: " §8（AI JSON 与校验，约第 240–350 行；第 297 行附近有 enum，第 333 行附近有校验规则）",
    EXTRA: "\n## 本包要顺带处理的问题清单项\n- Q3：现在 `packages/contracts/src/modules/inference-provider.ts` 的 `InferenceRequest` 用 `correlationId` 当唯一编号，但提案 §8.1 要求模型输入只带本批的临时 `itemId`。在本包的 AI 业务 JSON 契约里加上 `itemId`（每批唯一），并定义 itemId 和内部引用之间的映射类型；校验时要检查「itemId 属于本批且不重复、每个必需项目都有返回」（提案第 333 行）。真正生成 itemId 和记录映射的是后面的 Kiro 适配器（S008），本包只定契约和校验，不实现适配器。改 contracts 的 index.ts 时注意和同批其它包的合并。\n",
  },
];
const tasks = pkgs.map(({ label, ...vars }) => {
  const all = { ...common, ...vars };
  const task = tpl.replace(/\{([A-Z_]+)\}/g, (m, k) => (k in all ? all[k] : m));
  const left = task.match(/\{[A-Z_]+\}/g);
  if (left) throw new Error(`${label}: unfilled ${left.join(",")}`);
  return { label, task };
});
fs.writeFileSync(path.join(__dirname, "b3-tasks.json"), JSON.stringify(tasks));
console.log(tasks.map((t) => `${t.label}: ${t.task.length}`).join("\n"));
