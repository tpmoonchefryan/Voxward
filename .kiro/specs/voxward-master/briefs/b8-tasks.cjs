// Render master batch 7 implementer briefs: S015, S021 (S019, S027 wait for S011).
const fs = require("fs");
const path = require("path");
const dir = __dirname;
const tpl = fs.readFileSync(path.join(dir, "impl-template.md"), "utf8");
const common = "- 已完成：S006、S008、S009、S010（SC 精翻与模型设置）、S012（YouTube 凭据与 PKCE）、S013（streamList、身份、配额、ChannelEvent）、S014（DecisionService：人工接管、改判纠分、显式补发、名单词条权限）、S016、S017、S018。S011（复盘）正在 `.worktrees/s011-fix2` 返工，**不要改 `task-coordinator/` 和 `moderation-engine/review/`**。\n- 工单 deliverables 里的路径用的是拆单时的旧模块名。实际模块名以 `apps/server/src/modules/` 为准：`decision` → `decision-service`，`output` → `output-adapter`。测试目录同理。把映射写进 spec 的偏离表。\n- 被拒时：如果返回 `User denied tool execution`，可能是批准框超时。不要换写法绕过，停下来报告。\n问题清单在主工作区 `/home/ryanlan/Code/Voxward/.kiro/specs/voxward-master/tasks.md` 末尾（只读）。";
const pkgs = [
  {
    file: "b8-s015.md", PKG: "P-S015", WT: "s015-platform-delete", SPEC: "voxward-s015-platform-delete",
    STORY_KEY: "VOXWARD-STORY-015", STORY_ID: "work:83d8e6716c550b3fa7d657ba",
    TICKETS: "- 父 Story：VOXWARD-STORY-015（work:83d8e6716c550b3fa7d657ba）「实现可选原生聊天室删除」\n- VOXWARD-SUB-028（work:31b9d4884fab6b3886f36539）「实现可选原生聊天室删除与双动作状态」",
    SECTIONS: " §7.3（第 253–260 行）、§3.1（第 74–81 行）、§16（第 617–628 行）",
    OTHERS: "同批还有 S011 返工（`.worktrees/s011-fix2`）和 S021（`.worktrees/s021-output`，改 output-adapter）。",
    EXTRA: "\n## 注意\n- 删除前校验本地权限（房管/房主）和 OAuth 写权限。等待、成功、失败、未知四种平台状态和本地拦截分开记录。\n- 结果未知时先核实（例如读回消息是否还在），不盲目重试；重试有上限。\n- **不连真实 YouTube 或 Google**。平台删除用替身端口测试，真实调用在 spec 里标「待部署实测（S029）」。\n- 用 S014 的 DecisionService 接口记本地拦截；需要改它时只做最小改动，写进冲突清单。\n",
  },
  {
    file: "b8-s021.md", PKG: "P-S021", WT: "s021-output", SPEC: "voxward-s021-output",
    STORY_KEY: "VOXWARD-STORY-021", STORY_ID: "work:26274628cbb8f691b6cf430c",
    TICKETS: "- 父 Story：VOXWARD-STORY-021（work:26274628cbb8f691b6cf430c）「实现只读输出协议与投递状态」\n- VOXWARD-SUB-039（work:ac327b9a81a9326b33711ffb）「实现只读原生输出协议、订阅鉴权与 WARD_BLOCKED 事件」\n- VOXWARD-SUB-040（work:a86848777f015b0c0a1d9611）「实现投递 ID 与状态、有限发送与补发契约及协议文档」\n顺序：先 SUB-039，再 SUB-040。",
    SECTIONS: " §13（第 522–557 行）、§6.3（第 221–228 行）、§16（第 617–628 行）",
    OTHERS: "同批还有 S011 返工（`.worktrees/s011-fix2`）和 S015（`.worktrees/s015-platform-delete`，改 platform-source 和 decision-service）。",
    EXTRA: "\n## 注意\n- **Q16**：浏览器类下游（OBS Browser Source、WebSocket）没法带 Authorization 头。令牌交付不能走查询串，换一种方式（例如短期一次性票据换会话、子协议头或 Cookie），写进 spec 和协议文档。\n- **Q18**：`output_grants` 和 `credential_refs` 里的输出用途要真正用起来：订阅鉴权按它们判定，凭据可撤销，撤销后连接断开。\n- **Q25**：400/414 这类 Fastify 框架错误的响应不回显 URL；日志里百分号编码的令牌和 Host 头要脱敏。加测试。\n- **m6 复验 N2**：输出端发送后，在同一短事务里把投递标为 SENT（比较状态）；只读取 PENDING 且 `valid_until` 未过的行，EXPIRED 行不发送。测试覆盖「SENT 后补发被拒（ALREADY_SENT）」「EXPIRED 行不被发送」。\n- 拦截事件只发不含原文、不含身份的 `WARD_BLOCKED`。过期 SC 不自动补播。\n- 协议文档写到 `docs/protocol/output-native-v1.md`，消费者去重样例放 `examples/consumer-dedup/`，要能在本机复现（只连本机 127.0.0.1）。\n",
  },
];
for (const p of pkgs) {
  const vars = { BATCH: "7", REJ: "0", BASE: "main（本批简报提交之后的 HEAD）", PRIOR_NOTE: `- ${p.OTHERS}不要碰它们的工作树。\n${common}`, ...p };
  const text = tpl.replace(/\{([A-Z_]+)\}/g, (m, k) => (k in vars ? vars[k] : m));
  const left = text.match(/\{[A-Z][A-Z_]{2,}\}/g);
  if (left) throw new Error(`${p.file} unfilled ${left.join(",")}`);
  fs.writeFileSync(path.join(dir, p.file), text);
  console.log(p.file, text.length);
}
