// Render batch-4 implementer briefs from impl-template.md into the master briefs directory.
const fs = require("fs");
const path = require("path");
const tpl = fs.readFileSync(path.join(__dirname, "impl-template.md"), "utf8");
const outDir = "/home/ryanlan/Code/Voxward/.kiro/specs/voxward-master/briefs";
const common = { BATCH: "4", REJ: "0", BASE: "0590dec", PRIOR_NOTE: "问题清单在主工作区 `/home/ryanlan/Code/Voxward/.kiro/specs/voxward-master/tasks.md` 末尾（只读），下面点名的条目归本包处理。" };
const pkgs = [
  {
    file: "b4-s006.md", PKG: "P-S006", WT: "s006-routing", SPEC: "voxward-s006-routing",
    STORY_KEY: "VOXWARD-STORY-006", STORY_ID: "work:685ad243ec946eb7f628c93e",
    TICKETS: "- 父 Story：VOXWARD-STORY-006（work:685ad243ec946eb7f628c93e）「实现统一审核路由与快速通道」\n- VOXWARD-SUB-012（work:a52cf35dff7b3e04ede8e970）「实现统一审核路由真值表、快速通道与处理状态」",
    SECTIONS: " §4（审核路由，约第 100–160 行，含 mermaid 流程图与快速通道）",
    EXTRA: "\n## 本包要顺带处理的问题清单项\n- Q6：可组合的组合标记（例如 `a` 加 U+0301）能绕过归一化规则。按提案 §4.3 的范围处理：在规则的归一化选项里提供「去除组合标记」（先 NFKD，删除 \\p{M}，再 NFKC），默认开不开写进 spec，标「自定」，并加测试。\n- Q8：昵称检查有两套存放方式：S002 的持久表 `subject_nickname_checks` 和 S004 的进程内缓存。接入审核路由时只保留一种。如果用进程内缓存，就加一个迁移删掉这张表，同时同步数据字典；如果用持久表，要写明保存什么、保存多久。\n- Q12：正则准入收紧后，`(a|b)` 这种分组内分支会被拒绝。在规则准入的错误码或说明里，提示改写成顶层分支，或者拆成多条规则。现在还没有规则配置界面，只需要在错误信息里给出可操作的提示。\n- Q22：现在的 Verdict 不带规则命中列表。路由要把命中列表传给计分，让 `selectPenalty` 在实际路径上生效。\n",
  },
  {
    file: "b4-s008.md", PKG: "P-S008", WT: "s008-kiro-provider", SPEC: "voxward-s008-kiro-provider",
    STORY_KEY: "VOXWARD-STORY-008", STORY_ID: "work:352ba5df1e0b354ede1a9af0",
    TICKETS: "- 父 Story：VOXWARD-STORY-008（work:352ba5df1e0b354ede1a9af0）「实现 Kiro 适配与一次性会话清理」\n- VOXWARD-SUB-015（work:fdd12cc554b859427cfbddaf）「实现 Kiro CLI InferenceProvider 适配与受限输入」\n- VOXWARD-SUB-016（work:7dc8701421a1a57ec095fe20）「实现一次性会话生命周期、清理与独立受限运行环境」\n顺序：先 SUB-015，再 SUB-016。",
    SECTIONS: " §8（AI JSON、一次性会话与清理，约第 240–350 行）、§9.2（第 363–369 行）、§16（最小权限）",
    EXTRA: "\n## 本包要顺带处理的问题清单项\n- Q3：由适配器生成每批唯一的临时 `itemId`，并记录 itemId 和内部引用的映射。发给模型的输入只带 itemId 和必要的正文，不带 correlationId、平台用户 ID 或昵称历史。用 S007 已有的 `AiBatchInput` 和 `AiItemIdMap`。`InferenceRequest` 要改成符合这个要求的形状，跨模块调用的地方要同步改。\n- Q24：逐条校验之前，先按输入条数限制输出长度，并截断错误列表。`checkInput` 要检查 itemId 不超过 64 个码点。JSON Schema 文档导出（N16）不做，在 spec 里标「后续」。\n\n## 安全与运行约束（本包特有）\n- **不要用真实 Kiro 账号或本机开发用的 Kiro 会话跑推理**。这台机器上的 kiro-cli 属于开发 agent，提案 §9.2 要求运行时 agent 使用独立账号、独立工作目录和最小权限。测试一律用可替换的命令路径，指向本包写的假 kiro-cli 脚本（放在 test fixtures 里，输出合成的 stream-json）。只允许运行 `kiro-cli --version` 和 `kiro-cli chat --help` 来核对参数名，并把核对结果写进 spec。\n- CLI 参数以 `kiro-cli chat --help` 的实际输出和 [Kiro CLI headless 文档](https://kiro.dev/docs/cli/headless/)（用 web_fetch 的 full 模式）为准；不确定的参数标「待实测」。\n- 一次性会话的临时目录必须在测试结束后清掉，并加一个测试证明清理确实发生；不能宣称应用侧清理就等于提供方删除了数据。\n- `deploy/kiro-runtime/` 只写受限运行环境的说明和配置模板，不安装、不创建系统用户、不改本机任何系统配置。\n",
  },
  {
    file: "b4-s012.md", PKG: "P-S012", WT: "s012-youtube-auth", SPEC: "voxward-s012-youtube-auth",
    STORY_KEY: "VOXWARD-STORY-012", STORY_ID: "work:c3303265b2af4669b243c34b",
    TICKETS: "- 父 Story：VOXWARD-STORY-012（work:c3303265b2af4669b243c34b）「实现 YouTube 凭据配置与授权状态」\n- VOXWARD-SUB-023（work:4bdb2022d6883f9f262eb6ed）「实现 YouTube 凭据配置、OAuth 授权与失效状态」",
    SECTIONS: "（YouTube 接入、OAuth、凭据相关章节；先用 grep 搜「OAuth」「YouTube」「凭据」定位）以及 docs/policy/ 下 S031 的政策草案",
    EXTRA: "\n## 安全与运行约束（本包特有）\n- **不做任何真实平台操作**：不创建 Google Cloud 项目，不申请或使用真实 client_id/secret，不访问真实 YouTube 或 Google OAuth 端点。OAuth 流程用本地假授权服务器或注入的 HTTP 客户端来测；凭据只用合成值，并通过 S003 的 secretref / credential_refs 机制保存，不明文入库、不进日志。\n- 读 Google OAuth 或 YouTube API 文档时，web_fetch 用 full 模式；scope、端点、令牌刷新和撤销的行为以官方文档为准，并在 spec 里附上链接。\n- `docs/deployment/youtube-credentials.md` 写部署方自己配置凭据的步骤。凡是需要平台审核或申请的步骤，都标「需部署方 / Owner 向平台申请」，不写成已完成。\n",
  },
  {
    file: "b4-s016.md", PKG: "P-S016", WT: "s016-audit-log", SPEC: "voxward-s016-audit-log",
    STORY_KEY: "VOXWARD-STORY-016", STORY_ID: "work:4c1238d3c3d98f2cc2f7d756",
    TICKETS: "- 父 Story：VOXWARD-STORY-016（work:4c1238d3c3d98f2cc2f7d756）「实现 Change Log 与 Technical Log 数据层」\n- VOXWARD-SUB-029（work:d2a9653d30297ce71924a1a2）「实现 Change Log 与 Technical Log 写入接口和关联字段」\n- VOXWARD-SUB-030（work:627762790cd401f266c46100）「实现日志内容字段权限、长度限制与主体删除索引」\n顺序：先 SUB-029，再 SUB-030。",
    SECTIONS: " §10 数据组（第 387–405 行）、§12（日志、保留期限与恢复，约第 462–500 行）、§11.3（删除执行范围）",
    EXTRA: "\n## 注意\n- 日志表要用 S002/S003 已有的 db 层与迁移机制。本批可能还有别的包也在加迁移：你新加的迁移按下一个序号写，并在报告里写明序号，方便合并时统一调整。\n- Technical Log 的受控内容（必要原文、临时 itemId 映射、校验后的 JSON）要按提案 §12 只保存必要部分；不要复制已删除的数据，也不要保存密钥。日志写入要经过 S003 的 `redactText`。\n",
  },
];
for (const { file, ...vars } of pkgs) {
  const all = { ...common, ...vars };
  const text = tpl.replace(/\{([A-Z_]+)\}/g, (m, k) => (k in all ? all[k] : m));
  const left = text.match(/\{[A-Z][A-Z_]{2,}\}/g);
  if (left) throw new Error(`${file}: unfilled ${left.join(",")}`);
  fs.writeFileSync(path.join(outDir, file), text);
  console.log(file, text.length);
}
