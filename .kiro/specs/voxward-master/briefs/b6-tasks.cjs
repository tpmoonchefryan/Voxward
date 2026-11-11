// Render the S013 implementer brief from impl-template.md.
const fs = require("fs");
const path = require("path");
const dir = __dirname;
const tpl = fs.readFileSync(path.join(dir, "impl-template.md"), "utf8");
const vars = {
  BATCH: "6", REJ: "0", BASE: "f94b425",
  PRIOR_NOTE: "- 第 4、5 批已完成：S006（审核路由、归一化与浊点修复）、S008（Kiro CLI 适配器）、S012（YouTube 凭据与 OAuth，代码在 `apps/server/src/modules/platform-source/youtube/`，路由尚未挂载）、S016（两类日志）、S017（日志查看器）、S018（数据面板）。\n- S009（task-coordinator）正在另一个工作树 `.worktrees/s009-fix` 返工。**本包不要改 `apps/server/src/modules/task-coordinator/`**；需要调度时只用它已导出的接口，接线点写进 spec。\n问题清单在主工作区 `/home/ryanlan/Code/Voxward/.kiro/specs/voxward-master/tasks.md` 末尾（只读）。",
  PKG: "P-S013", WT: "s013-livestream", SPEC: "voxward-s013-livestream",
  STORY_KEY: "VOXWARD-STORY-013", STORY_ID: "work:5fd9e2a6d536e627b7e4bf13",
  TICKETS: "- 父 Story：VOXWARD-STORY-013（work:5fd9e2a6d536e627b7e4bf13）「实现官方直播流、身份能力与重连」\n- VOXWARD-SUB-024（work:51b064d4e4de6db30a47de8b）「实现 YouTube streamList 连接、恢复与补发去重」\n- VOXWARD-SUB-025（work:238d2a9a1ca4a1486d6f8091）「实现平台身份能力映射、配额监控与核心流水线接入」\n顺序：先修 Q28（见注意），再 SUB-024，再 SUB-025。",
  SECTIONS: " §3.1–§3.3（第 72–105 行）、§5.2（第 180–185 行）、§6.3（第 221–228 行）、§16（第 617–628 行）",
  EXTRA: "\n## 注意\n- **先修 Q28（安全，在接线之前）**：S012 的 OAuth 没用 PKCE。同一部署里另一个频道的所有者，可以拿主播还没兑换的授权码完成回调。要求：\n  - 授权请求用 S256 PKCE：每次授权生成 code_verifier，和 state 一起绑定发起人与频道，回调兑换时带上；\n  - 回调里他人的失败尝试不能消耗主播自己的 state；\n  - 重新授权成功后，旧授权行要撤销，旧 refresh token 要从保险箱删掉（给 `apps/server/src/security/credential-vault.ts` 加删除接口）；\n  - 加负面用例：别人的 state 加主播的授权码必须失败；缺 verifier 或 verifier 不对必须失败；重新授权后旧凭据不可用。\n  - 参考第 4 批判断 `.kiro/specs/voxward-batch4/evidence/judgment.md` 的 N5、N6。Q28 修复单独 commit，提交信息含 `VOXWARD-STORY-013 Q28`。\n- **Q20（照提案 §5.2，不用 Owner 决定）**：身份基准分和行为调整分分开记录，最终分数再钳制。这样分数顶到上限时，会员升级后再到期，不会凭空扣分。身份事件走 S005 的 ScoringLedgerPort；如果要改 scoring-engine，只做最小改动，并加测试：上限处升级再到期，行为分不变。\n- 只接官方上游：测试用替身代替 YouTube API，**不连真实 YouTube**，也不用真实 OAuth 凭据。真实接入在 spec 里标「待部署实测（S029）」。\n- 重连和补发：按平台消息 ID 去重；初连时平台补发的近期 Super Chat 不能当新消息重复计分、重复投递或重播过时卡片；缺失的订阅标记不伪造；未知身份按无身份处理。直播结束、配额不足、权限失效都要有明确状态和测试。\n- 配额监控的阈值来源没规定就标「自定」，放进配置。\n",
};
const text = tpl.replace(/\{([A-Z_]+)\}/g, (m, k) => (k in vars ? vars[k] : m));
const left = text.match(/\{[A-Z][A-Z_]{2,}\}/g);
if (left) throw new Error(`unfilled ${left.join(",")}`);
fs.writeFileSync(path.join(dir, "b6-s013.md"), text);
console.log("b6-s013.md", text.length);
