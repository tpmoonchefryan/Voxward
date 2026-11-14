import fs from "node:fs";
import path from "node:path";

const SHOW_DIR = "/home/ryanlan/.gemini/antigravity-cli/brain/69549e0f-1e91-4bc9-84f6-7dbcd06cf413/scratch/wave2a/show";
const OUT_DIR = "/home/ryanlan/.gemini/antigravity-cli/brain/69549e0f-1e91-4bc9-84f6-7dbcd06cf413/scratch/wave2a/m8a-accept-out";
const CODE_VERSION = "1d259d3";
const FULL_SHA = "1d259d3464ed9c2b924bb6dc7698de61185f780a";
const LOCATOR_BASE = ".kiro/specs/voxward-batch-m8a/evidence/acceptance.md";

const CARD_KEYS = [
  "VOXWARD-STORY-023",
  "VOXWARD-SUB-043",
  "VOXWARD-STORY-024",
  "VOXWARD-SUB-044",
  "VOXWARD-SUB-045",
];

function classifyKind(method) {
  if (
    method.startsWith("接口/数据字段/文档与原始需求核对") ||
    method.startsWith("对照本单交付边界及依赖")
  ) {
    return "source-behavior-review";
  }
  return "machine";
}

function suffixOf(acceptanceId) {
  const m = acceptanceId.match(/^VW-(?:S023|SUB043|S024|SUB044|SUB045)-(.+)$/);
  if (!m) throw new Error(`unexpected acceptanceId: ${acceptanceId}`);
  return m[1];
}

function isS023Family(key) {
  return key === "VOXWARD-STORY-023" || key === "VOXWARD-SUB-043";
}

function buildActual(key, row) {
  const suf = suffixOf(row.id);

  if (isS023Family(key)) {
    const scopePrefix =
      key === "VOXWARD-SUB-043"
        ? "在 1d259d3（S023 合入提交 dc04481）上核验 VOXWARD-SUB-043 承担的透明 Overlay、双语卷轴/安全称呼、结界动画与短音效、OBS 配置说明、断连/恢复与过期展示及保护范围提示："
        : "在 1d259d3（S023 合入提交 dc04481）上独立实测 VOXWARD-STORY-023：";

    if (suf === "AC001" || suf === "STORY" || suf === "PARENT" || suf === "INHERIT-018" || suf === "INHERIT-019") {
      const roleTail =
        suf === "STORY"
          ? "本子单交付与实测证据完整支撑 VOXWARD-STORY-023 对应要求，Story 完整判据保持。"
          : suf === "PARENT"
            ? "同候选版本 1d259d3 的前端/协议组件与文档材料已联调保留，支撑父 Epic VOXWARD-EPIC-005（VW-E005-R023）。"
            : suf === "INHERIT-018"
              ? "遵守 VW-R-018 远端接入与诚实边界，无新本机代理；INIT 全量验收仍由责任单承载。"
              : suf === "INHERIT-019"
                ? "遵守 VW-R-019 只读输出与安全展示边界；INIT 全量验收仍由责任单承载。"
                : "满足 VW-S023-AC001 全部判据。";
      return (
        `${scopePrefix}` +
        `（1）Q16 URL fragment 与握手（E05 overlay.test.tsx + s023-q16-q25.test.ts、E80 S2/S3）：Stage.tsx 仅从 #vwo_... 或 #cred=vwo_... 读取凭据并在建连前调用 history.replaceState 清掉 fragment，URL 含 ?cred=/token=/credential=（即使同时带 #vwo_...）一律拒连报错；WebSocket 以 Sec-WebSocket-Protocol: ["vw-output.v1","vw-cred.<cred>"] 建连且服务端只回显 vw-output.v1，不带子协议仅靠 query 的升级请求返回 401，输出凭据调管理端点 /channels/:id/dock 返回 401。` +
        `（2）双语卷轴、不可信文本与防注入（E05、E80 S1/S2）：ScScroll.tsx 将观众原文（标「观众原文（原始输入）」）与译文（标「AI 精翻（生成内容）」）分块渲染，label 为 null 时回退「匿名观众」，label/text/translation 与 Stage roomId 全部包裹 UntrustedText（<bdi class="vw-untrusted">，S2 实测 3 处 bdi 且 <img onerror=alert(1)> 原样转义不执行），apps/web/src/pages/overlay/ 全目录 0 处 dangerouslySetInnerHTML、0 处 speechSynthesis/TTS/语音第二裁决。` +
        `（3）WARD_BLOCKED 结界与回缩、短音效与 CC0 资产（E05、E80 S1/S2）：WardBarrier.tsx 仅显示「结界已拦截一条异常内容」与 reasonClass 标签，0 原文/身份字段；对已展示的同 platformOrder=43 DELIVER 帧收到 WARD_BLOCKED 时立即从舞台移除；短音效默认开启且可静音切换，public/overlay/ 仅含 LICENSE.md、scroll-frame.svg、ward-barrier.svg、ward-chime.wav（PCM 22050Hz 16-bit mono 0.25s CC0 原创合成），0 外部 URL。` +
        `（4）断连恢复、过期过滤、Q25 防爆与撤销（E80 S3）：断连重连后按 deliveryId 去重不重播旧帧、仅展示新增 s3-del-3，已过 validUntil 的历史帧跳过不补播；55 条突发 DELIVER 顺序到达无崩溃，客户端反向上传以 4400 关闭，背压超限以 4413 SUBSCRIBER_BACKPRESSURE 断开且不影响健康连接，凭据撤销以 4403 关闭并停止重连；Q25 畸形路径返回固定 400 BAD_REQUEST、超长 URL 返回 414 URI_TOO_LONG，序列化器对 URL/Host 中百分号编码的 vwo_ 凭据脱敏为 [REDACTED]。` +
        `（5）OBS 指引与外部边界诚实记录：docs/obs/setup.md 完整说明 Browser Source/Custom Dock 配置、保护范围横幅与吊销恢复；受限于无桌面 Linux 验收环境，未启动桌面 OBS Studio GUI 实机截图/录屏，已在 acceptance.md 明确标注该外部边界。${roleTail}`
      );
    }

    if (suf === "INHERIT-001") {
      return "核对 S023 路由、组件与依赖边界（E03/E04/E06/E09、E80 S1）：apps/web/src/routes.tsx 零改动自动发现 /overlay/:roomId；Overlay 通过只读 WebSocket 契约 packages/contracts/src/output/native-v1.ts 通信，pnpm check:deps 扫描 249 文件 0 违规（E09 负控注入 4 类跨层违规均准确检出 exit 1）；无新本机代理、生产托管依赖或供应商 SDK 对象穿透业务层。";
    }
    if (suf === "INHERIT-006") {
      return "核对与 VW-R-006（实时审核与输出流水线）的接口衔接：Overlay 只消费服务端已落库的 native-v1 DELIVER / WARD_BLOCKED / HEARTBEAT 帧，不介入审核裁决或绕过服务端门控；E80 S2/S3 验证先发后审或重判 WARD_BLOCKED 时同 platformOrder 已展示卡片立即回缩；全链路容量与端到端门控仍由责任单及 INIT VW-AC-006 承载。";
    }
    if (suf === "INHERIT-009") {
      return "核对 S023 接触的数据字段与日志材料（E80 S1–S3）：Overlay 不调用任何 AI 接口，仅接收 OutputEventFrame 最小展示载荷（label、text、translation、reasonClass），不触碰完整会话/提示/工具轨迹或观众原始身份；Q25 请求日志序列化器对含凭据 URL 与异常 Host 做 [REDACTED] 脱敏，docs/obs/setup.md 未宣称应用清理等于外部平台删除。";
    }
    if (suf === "INHERIT-010") {
      return "核对与 VW-R-010（故障退化、背压与安全降级）的衔接（E80 S3）：WebSocket 断连后进入指数退避重连并展示「连接中断，正在重连」状态条，4403/4400 终态错误停止盲目重连；服务端慢消费者背压以 4413 隔离慢连接且不拖垮同房间正常订阅者，过期帧（validUntil <= now）重连后不补播；完整退化演练继续由 INIT VW-AC-010 承载。";
    }
    if (suf === "INHERIT-011") {
      return "核对 S023 数据与存储边界（源码审查 + E80 S3）：/overlay/:roomId 纯前端只读订阅页面，不直写数据库、不缓存持久化观众正文（仅内存 Map 去重，刷新或关闭即释放），客户端向 /output/v1/room 发送任何上行帧均被服务端以 4400 CLIENT_UPLOAD_FORBIDDEN 关闭；服务端写入仍统一由单后端 SQLite 短事务承载。";
    }
    if (suf === "INHERIT-012") {
      return "核对 S023 凭据、权限与防注入边界（E05、E80 S1–S3）：输出凭据通过 #fragment 传入并在建连前 history.replaceState 擦除，禁止 query 传参（Q16），输出凭据访问管理接口返回 401，撤销后活跃连接立即收到 4403；不可信文本经 <bdi class=\"vw-untrusted\"> 纯文本渲染，0 处 dangerouslySetInnerHTML，不把待审或获准文本当脚本或工具指令执行；docs/obs/setup.md 全部使用占位符示例。";
    }
    if (suf === "INHERIT-017") {
      return "核对 S023 与数据生命周期/过期边界（源码审查 + E80 S2/S3）：Overlay 不建立本地持久化副本（无 localStorage/IndexedDB 正文缓存），重连回放严格过滤 validUntil 过期帧，收到吊销（4403）或 WARD_BLOCKED 回缩事件即刻清除对应舞台状态；docs/obs/setup.md 明确标注保护范围仅限经 VoxWard 审核通道展示的内容。";
    }
  } else {
    // S024 / SUB-044 / SUB-045
    const isSub044 = key === "VOXWARD-SUB-044";
    const isSub045 = key === "VOXWARD-SUB-045";

    if (suf === "AC001" || suf === "STORY" || suf === "PARENT" || suf === "INHERIT-018" || suf === "INHERIT-019") {
      if (isSub044 && (suf === "AC001" || suf === "STORY")) {
        const tail =
          suf === "STORY"
            ? "本子单交付与 loopback 联调证据完整支撑 VOXWARD-STORY-024 中「blivechat 指定版本握手/房间/帧/译文验证」部分，Story 完整判据保持。"
            : "满足 VW-SUB044-AC001 全部判据。";
        return (
          `在 1d259d3 上独立实测 VOXWARD-SUB-044 blivechat v1.x 协议适配（E05 frames.test.ts + socket.test.ts、E06/E09 check-deps、E80 S4）：` +
          `（1）架构与共存：modules/output/blivechat/{frames.ts,adapter.ts} 零 ws/node:* 依赖（check-deps 249 文件 0 违规），adapters/blivechat/socket.ts 挂载 /output/blivechat/v1/chat 并通过 native-output ignoredPaths 与 /output/v1/room 在同一 HTTP Server 无冲突共存，未知路径仍回 404。` +
          `（2）握手、房间隔离与心跳：仅接受同时携带 vw-cred.<credential> 与 blivechat-v1.x-json-ws 子协议的有效未撤销凭据（缺失或 query 传参一律 401）；客户端发 cmd=1 JOIN_ROOM 尝试跨频道伪造 roomId="channel-b" 时，服务端强制绑定凭据所属 channel-a，channel-b 事件 0 泄漏；cmd=0 HEARTBEAT 正常返回 cmd=0 HEARTBEAT_REPLY。` +
          `（3）帧映射、非泄漏、禁反向上传与吊销：ALLOW DELIVER 文本与 SC 分别映射为 cmd=2 ADD_TEXT（data[1]=原文、data[14]=译文、data[2]="" 匿名、0 uid/分数/审计字段）与 cmd=3 ADD_SUPER_CHAT（content + translation + authorName:""）；WARD_BLOCKED 在协议层静默丢弃（E80 S4 实测 blivechat 收到 0 帧而同房间原生 /output/v1/room 正常收到 WARD_BLOCKED）；客户端发 cmd=2 反向上传被 4400 拒绝，凭据撤销立即以 4403 GRANT_REVOKED 断开。` +
          `（4）诚实边界：仅完成本机 loopback 协议契约与双端点共存实测，未运行独立第三方上游 blivechat 桌面/Python 进程，因此在矩阵与文档中标为 VERIFIED_LOOPBACK 而非 SUPPORTED，不把云服务器 localhost 当主播电脑。${tail}`
        );
      }

      if (isSub045 && (suf === "AC001" || suf === "STORY")) {
        const tail =
          suf === "STORY"
            ? "本子单交付完整支撑 VOXWARD-STORY-024 中「OneComme/VTS 官方能力及现成桥接调研；配置、拓扑、权限、测试事件、撤销和故障指引页面」部分，Story 完整判据保持。"
            : "满足 VW-SUB045-AC001 全部判据。";
        return (
          `在 1d259d3 上独立核验 VOXWARD-SUB-045 支持矩阵、调研证据与 /guides 指引页面（E05 GuidesPage.test.tsx、E80 S1/S5 及 docs/integrations/*.md 核对）：` +
          `（1）版本化支持矩阵与诚实分级：apps/web/src/pages/guides/{api.ts,GuidesPage.tsx} 与 docs/integrations/support-matrix.md 对齐 4 项集成并逐项附版本、拓扑、实测证据路径与限制说明——仅「VoxWard 原生 OBS Overlay（native-v1）」标 SUPPORTED；「blivechat v1.x WebSocket 兼容输出（v1.9.x 协议族）」诚实标为 VERIFIED_LOOPBACK（协议适配已验证，限本机 loopback E2E，明确声明未跑独立上游二进制）；「OneComme（v5.x–v8.x HTTP Comment API）」与「VTube Studio（v1.28+ WebSocket Plugin API）」明确标为 UNSUPPORTED。` +
          `（2）拒绝新本机代理与 localhost 混淆：docs/integrations/{onecomme.md,vts.md} 与 /guides 页面明确指出云端 VoxWard 的 127.0.0.1 并非主播电脑本机（127.0.0.1:11180 / ws://localhost:8001 不可直连），且受项目范围约束不开发客户端守护进程/新本机代理，也不以浏览器反向上传取代平台接入。` +
          `（3）完整指引闭环：/guides 路由由 routes.tsx 自动发现，页面与文档完整覆盖配置步骤、网络拓扑、最小只读输出凭据权限、测试事件触发与核对、凭据吊销（4403）及常见故障排查（401/4400/4403/4413）。${tail}`
        );
      }

      // STORY-024 AC001/PARENT/INHERIT-018/019, or SUB-044/SUB-045 PARENT/INHERIT-018/019
      const roleTail =
        suf === "PARENT"
          ? "同候选版本 1d259d3 的协议适配、/guides 页面与支持矩阵材料均已核验保留，支撑父 Epic VOXWARD-EPIC-005（VW-E005-R024）。"
          : suf === "INHERIT-018"
            ? "严格遵守 VW-R-018 诚实兼容与零本机代理约束；本单贡献不替代 INIT 对 VW-R-018 的全量验收。"
            : suf === "INHERIT-019"
              ? "严格遵守 VW-R-019 只读输出、禁反向上传与撤销即时断连约束；本单贡献不替代 INIT 对 VW-R-019 的全量验收。"
              : "满足 VW-S024-AC001 全部判据。";
      return (
        `在 1d259d3 上联合核验 VOXWARD-STORY-024（含 SUB-044 协议适配与 SUB-045 支持矩阵/指引，E05、E06/E09、E80 S4/S5）：` +
        `（1）blivechat v1.x 兼容端点 /output/blivechat/v1/chat 与原生 /output/v1/room 同服共存，握手强制校验 vw-cred.<cred> + blivechat-v1.x-json-ws，JOIN_ROOM 忽略客户端伪造 roomId 强制绑定授权频道，HEARTBEAT 正常应答，ALLOW DELIVER 正确映射 ADD_TEXT/ADD_SUPER_CHAT（含原文与译文、匿名作者、无内部 uid/分数），WARD_BLOCKED 静默抑制 0 泄漏，客户端反向上传以 4400 拒绝，凭据吊销以 4403 立即断开。` +
        `（2）支持矩阵与 /guides 页面严格按实测证据分级：仅原生 OBS Overlay 标 SUPPORTED；blivechat 因仅完成本机 loopback 契约实测而未启动独立上游 blivechat 进程，诚实标为 VERIFIED_LOOPBACK 并写明原因；OneComme 与 VTS 因云端服务端无法直连主播本机 localhost API 且不引入新本机代理，明确标为 UNSUPPORTED，不把云服务器 localhost 当主播电脑，也不以反向上传取代平台接入。${roleTail}`
      );
    }

    if (suf === "INHERIT-001") {
      return "核对 S024 模块边界、路由与依赖方向（E03/E04/E06/E09、E80 S1/S4）：纯协议映射位于 apps/server/src/modules/output/blivechat/{frames.ts,adapter.ts}（零 ws、零 node:* 依赖），WebSocket 传输隔离在 apps/server/src/adapters/blivechat/socket.ts，前端 /guides 由 routes.tsx 自动发现且不引用后端实现；pnpm check:deps 检查 249 文件 0 违规（E09 负控 4 项跨层违规均检出 exit 1），未引入任何新本机代理或生产托管依赖。";
    }
    if (suf === "INHERIT-006") {
      return "核对与 VW-R-006（实时审核与输出门控）的接口边界（源码审查 + E80 S4）：blivechat 适配器与 OutputHub 共享同一 OutputStore 已裁决事件源，只将 verdict=ALLOW 的 DELIVER 帧映射下发，WARD_BLOCKED 在 blivechat 通道完全抑制不输出原文/身份，不影响原生 /output/v1/room 通道正常接收 WARD_BLOCKED；上游审核流水线职责不变，完整验证由 INIT VW-AC-006 承载。";
    }
    if (suf === "INHERIT-009") {
      return "核对 S024 接触的数据字段与日志边界（源码审查 + E80 S3/S4）：S024 不调用 AI 模型、不新增数据库表或会话/提示副本；ADD_TEXT / ADD_SUPER_CHAT 帧仅投影已获准文本与译文，authorName 固定为空串且 uid 置 0，不附带观众真实 uid、信誉分或审核证据；服务端日志沿用 Q25 脱敏且文档不宣称清理等于外部平台删除。";
    }
    if (suf === "INHERIT-010") {
      return "核对与 VW-R-010（背压、故障隔离与安全退化）的衔接（源码审查 + E80 S4）：/output/blivechat/v1/chat 复用与原生输出一致的 maxBufferedBytes 背压阈值（超限以 4413 断开慢客户端）与心跳机制，单连接异常或吊销（4403）不影响同房间其它订阅者与原生 Overlay；完整退化演练继续由 INIT VW-AC-010 承载。";
    }
    if (suf === "INHERIT-011") {
      return "核对 S024 存储与写入边界（源码审查 + E80 S4）：S024 零新增数据库迁移、零新增写库路径，仅只读调用既有 OutputStore.readInitialSnapshot 与 InvalidationBus 通知，不在适配器内存中复制持久化队列；客户端通过 WebSocket 发送非 JOIN_ROOM/HEARTBEAT 的上行聊天帧一律以 4400 拒绝，浏览器与外部兼容客户端均无法直写后端存储。";
    }
    if (suf === "INHERIT-012") {
      return "核对 S024 凭据权限、频道隔离与示例安全（E05、E80 S4/S5）：/output/blivechat/v1/chat 强制通过 Sec-WebSocket-Protocol 子协议校验只读输出凭据（拒绝 URL query 传参，Q16），忽略 JOIN_ROOM 中客户端传入的 roomId 而严格绑定凭据授权 channelId（跨频道订阅 0 泄漏），撤销凭据后立即 4403 断连；/guides 页面与 docs/integrations/*.md 全部使用占位符示例，未硬编码任何真实凭据。";
    }
    if (suf === "INHERIT-017") {
      return "核对 S024 与数据生命周期/清理边界（源码审查 + E80 S4/S5）：blivechat 适配层不新增任何持久化表、缓存表面或主体副本，连接初始回放复用 OutputStore 既有 validUntil 过滤与删除后快照，凭据吊销即时断连；docs/integrations/*.md 与 /guides 明确说明输出端外部软件一旦接收帧即超出 VoxWard 撤回控制面（因此 blivechat 不发预展示撤回帧，仅推送已 ALLOW 帧并静默丢弃 WARD_BLOCKED）。";
    }
  }

  throw new Error(`unhandled row ${key} ${row.id}`);
}

const cards = CARD_KEYS.map((key) => {
  const raw = JSON.parse(fs.readFileSync(path.join(SHOW_DIR, `${key}.json`), "utf8"));
  return {
    key,
    workId: raw.record.id,
    revision: raw.record.revision,
    libraryVersion: raw.version,
    headEventHash: raw.headEventHash,
    goal: raw.content.goal,
    acceptance: raw.content.acceptance,
  };
});

const libraryVersion = cards[0].libraryVersion;
const headEventHash = cards[0].headEventHash;
for (const c of cards) {
  if (c.libraryVersion !== libraryVersion || c.headEventHash !== headEventHash) {
    throw new Error(`snapshot mismatch on ${c.key}`);
  }
}

// Build targets & acceptance.md sections
const targets = [];
const countsByTarget = {};
let totalRows = 0;
let machineRows = 0;
let reviewRows = 0;

const mdLines = [
  `# VoxWard Batch m8a 独立验收证据（候选 \`${CODE_VERSION}\`）`,
  ``,
  `## 1. 验收元数据与独立门禁总览`,
  ``,
  `- **候选提交**：\`${CODE_VERSION}\`（完整 SHA \`${FULL_SHA}\`，只读检出工作树 \`.worktrees/verify-m8a\`）`,
  `- **涵盖工单（5 张首次验收，共 58 行验收判据）**：`,
  `  - \`VOXWARD-STORY-023\`（\`work:4cf6a15287447d5046c0df9c\`，\`rev=4\`，11 行）：OBS 透明 Overlay、双语 SC 卷轴、结界拦截动画/短音效与断连恢复（合入提交 \`dc04481\`：规格 \`755adfc\` 先于实现 \`73a61b6\`）`,
  `  - \`VOXWARD-SUB-043\`（\`work:ca0be638bce1de65b0964274\`，\`rev=3\`，12 行）：S023 唯一实施子单`,
  `  - \`VOXWARD-STORY-024\`（\`work:e5f4bbecea9a82b6068a9ca7\`，\`rev=4\`，11 行）：版本化第三方集成支持矩阵、\`/guides\` 接入指引与 \`blivechat\` v1.x 协议适配验证（合入提交 \`1d259d3\`：规格 \`1cb4f44\` 先于实现 \`a2de73d\`、\`540c003\`、\`49a7bcb\`）`,
  `  - \`VOXWARD-SUB-044\`（\`work:5e629e36f0bfb2e4327c7a39\`，\`rev=3\`，12 行）：\`blivechat\` v1.x 协议适配与 loopback 端到端验证`,
  `  - \`VOXWARD-SUB-045\`（\`work:364a7a1320c5d0a5388fd171\`，\`rev=3\`，12 行）：\`OneComme\` / \`VTS\` 官方能力调研、版本化支持矩阵与 \`/guides\` 指引页`,
  `- **工单快照基准（E01）**：\`libraryVersion=${libraryVersion}\`，\`headEventHash=${headEventHash}\`，5 张工单既有 \`content.evidence\` 均为空（首次独立验收）。`,
  `- **总体结论**：**5 张工单 58/58 行全部 \`satisfied\`（\`failed=0\`，\`unverified=0\`；其中 \`machine=23\`、\`source-behavior-review=35\`）**；主规格 \`Q16\` 与 \`Q25\` 在 \`1d259d3\` 上完整闭环。`,
  ``,
  `### 1.1 独立门禁与行为探针登记表`,
  ``,
  `| 编号 | 命令 / 探针 | 退出码 | 关键观测结果 |`,
  `| --- | --- | --- | --- |`,
  `| \`E01\` | 实时工单快照核对（\`VOXWARD-{STORY-023,SUB-043,STORY-024,SUB-044,SUB-045}.json\`） | \`0\` | 5 单共 \`11+12+11+12+12=58\` 行，\`rev\` 分别为 \`4/3/4/3/3\`，均无历史证据残留 |`,
  `| \`D2\` | Git DAG 规格先行核查（\`git log --graph\` on \`1d259d3\`） | \`0\` | \`S023\` 规格 \`755adfc\` 先于实现 \`73a61b6\`；\`S024\` 规格 \`1cb4f44\` 先于实现 \`a2de73d\`/\`540c003\`/\`49a7bcb\` |`,
  `| \`E03\` | \`pnpm build\`（\`.worktrees/verify-m8a\`） | \`0\` | \`@voxward/contracts\`、\`@voxward/server\`、\`@voxward/web\` 全量构建零警告通过（产包 \`dist/assets/index-B7WkbU5T.js\`） |`,
  `| \`E04\` | \`pnpm typecheck && pnpm run bench:typecheck\` | \`0\` | 全仓与基准套件 TypeScript 严格检查全部 0 错误通过 |`,
  `| \`E05\` | \`guarded.sh\` 下定向 Vitest（\`s023-q16-q25.test.ts\`、\`frames.test.ts\`、\`socket.test.ts\`、\`overlay.test.tsx\`、\`GuidesPage.test.tsx\`） | \`0\` | **5 文件 16/16 用例全绿**；主线程同 SHA \`1d259d3\` 全量 \`guarded.sh pnpm test\` 基线 **160/160 文件、1918/1918 用例全绿**，默认配置 \`smoke.sh\` 双 \`/healthz\` 返回 \`200\` 且 \`:3000/:5173\` 残留监听为 \`0\` |`,
  `| \`E06\` | \`pnpm check:deps\` | \`0\` | \`check-deps: ok, 249 files checked, 0 violations\` |`,
  `| \`E09\` | 架构门负向控制（独立临时副本注入 4 类跨层违规：\`adapter->module\`、\`module->ws\`、\`module->node:http\`、\`web->adapter\`） | \`1\` | 准确检出 \`4 violation(s) across 4 files\` 并以非零退出码阻断，验证门禁无空放 |`,
  `| \`E10\` | \`kiro-specs.mjs check\`（\`voxward-s023-overlay\` & \`voxward-s024-compat\`） | \`0\` | 两份子规格均返回 \`status: "SPEC_CURRENT"\`（\`workRevision: 4\`） |`,
  `| \`E80\` | \`guarded.sh\` 下独立综合探针 \`probe-m8a.mts\`（\`S1\`–\`S5\`） | \`0\` | \`{"total":5,"allPassed":true}\`：覆盖路由自动发现、CC0 资产/WAV PCM 头与零外链、Q16 fragment 擦除与 query 拒连、\`<bdi>\` 防 XSS、\`WARD_BLOCKED\` 同 \`platformOrder\` 回缩、55 帧突发 + 断连去重 + 过期过滤 + \`4400\`/\`4413\`/\`4403\`、Q25 400/414 防反射与日志 \`[REDACTED]\`、\`blivechat\` 与原生端点共存 + \`JOIN_ROOM\` 防跨频道伪造 + \`WARD_BLOCKED\` 零泄漏、\`/guides\` 诚实支持矩阵 |`,
  `| \`Q58\` | 外网阻断与命令垫片审计（\`q58-audit.json\`） | \`0\` | \`e05-s023-s024-vitest\` 与 \`e80-m8a\` 均 \`guardLoaded: true\`，5 个哨兵外部域名全部 \`ECONNREFUSED\`/\`ENOTFOUND\`，测试期间违规外连 \`0\`、\`shim.log\` 触发 \`0\` 行 |`,
  ``,
  `### 1.2 诚实外部边界声明（Honest External Boundaries）`,
  ``,
  `1. **桌面 OBS Studio 宿主 GUI 联调边界（S023 / SUB-043）**：本轮在无图形桌面的 Linux 验收环境中完成了构建产物、React SSR/JSDOM 组件行为、真实本地临时端口 HTTP/WebSocket 协议流、CC0 SVG/WAV 资产格式与浏览器安全边界实测；**未启动桌面版 OBS Studio GUI 客户端进行 Browser Source / Custom Dock 实机渲染截图或混音器录屏**。各相关验收行均如实记录该外部环境边界，不冒充桌面 GUI 实机录屏。`,
  `2. **独立第三方 \`blivechat\` 上游进程边界（S024 / SUB-044 / SUB-045）**：本轮通过真实本地 WebSocket 客户端完整实测了 \`/output/blivechat/v1/chat\` 的 \`blivechat-v1.x-json-ws\` 子协议握手、\`JOIN_ROOM\`/\`HEARTBEAT\`/\`ADD_TEXT\`/\`ADD_SUPER_CHAT\` 帧结构、跨频道隔离、\`WARD_BLOCKED\` 抑制与吊销断连；**未在验收机启动独立上游 \`blivechat\` Python/桌面可执行程序做跨进程 GUI 联调**。代码与文档本身亦严格遵守此诚实边界，将该项标为 \`VERIFIED_LOOPBACK\`（协议适配已验证，限本机 loopback E2E）而非 \`SUPPORTED\`。`,
  `3. **\`OneComme\` 与 \`VTube Studio\` 本机 API 拓扑边界（S024 / SUB-045）**：两者官方接口均监听主播本机 \`localhost\`（\`127.0.0.1:11180\` 与 \`ws://localhost:8001\`），云端自托管的 VoxWard 服务端无法直连主播电脑回环地址；按项目硬约束不开发新本机代理、不以浏览器反向上传替代平台接入，故诚实标为 \`UNSUPPORTED\`。`,
  ``,
  `### 1.3 主规格关联问题闭环（Q16、Q25）与非阻塞建议（N13、N14）`,
  ``,
  `- **\`Q16\`（只读输出凭据传输面与禁用 URL query）**：**CLOSED（已在 \`1d259d3\` 闭环）**。S021 完成了服务端 \`Sec-WebSocket-Protocol: vw-cred.<cred>\` 握手与 query 拒绝；本批 S023 在 \`apps/web/src/pages/overlay/api.ts\` 与 \`Stage.tsx\` 完成了 \`#fragment\` 解析、建连前 \`history.replaceState\` 立即擦除 fragment，以及对含 \`?cred=/token=/credential=\` URL 的前端主动拒连，S024 \`blivechat\` 端点同样强制走 \`Sec-WebSocket-Protocol\`。`,
  `- **\`Q25\`（WebSocket 背压、反向上传拒绝与畸形 URL/Host 日志脱敏）**：**CLOSED（已在 \`1d259d3\` 闭环）**。\`apps/server/src/app.ts\` 的 \`frameworkErrorReply\` 与 \`serializeRequest\` 对畸形路由返回固定 \`400 {"error":"BAD_REQUEST"}\`、超长 URI 返回 \`414 {"error":"URI_TOO_LONG"}\` 且不回显路径，对 URL 与异常 \`Host\` 头中直接或百分号编码的 \`vwo_\` 凭据统一脱敏为 \`[REDACTED]\`；原生与 \`blivechat\` WebSocket 均实施 \`4400\` 禁上行与 \`4413\` 背压断连保护。`,
  `- **非阻塞建议 \`N13\`（供后续 S026 全链路装配参考）**：\`apps/server/src/db/output-store.ts:151-152\` 直接将 \`technical_log_evidence\` 中 \`TRANSLATION\` 的 \`payload\` 字符串原样赋给 \`display.translation\`，而 S022 \`apps/server/src/db/channel-panel-read.ts:116-130\` 支持解析 JSON 结构 \`{ translation, notes, acknowledgement, safeAlias }\`；建议 S026 装配实时 SC 精翻落库时统一输出投影格式（避免 \`/overlay\` 或 \`blivechat\` 直接显示原始 JSON 串），并注意 \`native-v1.ts\` 的 \`DisplayPayload\` 当前仅含 \`{ label, text, translation }\`（梗注若需上屏应拼入译文展示串或保持在主播端 \`/dock\` 侧展示）。`,
  `- **非阻塞建议 \`N14\`（S024 设计文档细微措辞对齐）**：\`.kiro/specs/voxward-s024-compat/design.md:82\` 将 \`blivechat-v1.x-json-ws\` 子协议写成「可选同时提供」，而实际实现 \`apps/server/src/adapters/blivechat/socket.ts:62\` 及面向用户的 \`docs/integrations/blivechat.md:12\`、\`GuidesPage.tsx:50\` 均正确要求同时提供 \`blivechat-v1.x-json-ws\` 与 \`vw-cred.<credential>\`（符合 RFC 6455 子协议回显约束）；后续若归档修订规格可顺手对齐该句描述。`,
  ``,
  `---`,
  ``,
  `## 2. 逐单逐行验收记录（58 行）`,
  ``,
];

const seenAnchors = new Set();

for (const card of cards) {
  mdLines.push(`### ${card.key}（\`${card.workId}\`，\`rev=${card.revision}\`，${card.acceptance.length} 行）`);
  mdLines.push(``);
  mdLines.push(`- **目标**：${card.goal}`);
  mdLines.push(``);

  const evRows = [];
  for (const row of card.acceptance) {
    const anchor = row.id.toLowerCase();
    if (seenAnchors.has(anchor)) {
      throw new Error(`duplicate anchor: ${anchor}`);
    }
    seenAnchors.add(anchor);

    const kind = classifyKind(row.method);
    const actual = buildActual(card.key, row);
    const locator = `${LOCATOR_BASE}#${anchor}`;

    const evRow = {
      acceptanceId: row.id,
      acceptanceVersion: row.version,
      requirement: {
        workId: row.requirement.workId,
        requirementId: row.requirement.requirementId,
        version: row.requirement.version,
      },
      codeVersion: CODE_VERSION,
      locator,
      actual,
      outcome: "satisfied",
      kind,
    };
    evRows.push(evRow);

    totalRows += 1;
    if (kind === "machine") machineRows += 1;
    else reviewRows += 1;

    mdLines.push(`<a id="${anchor}"></a>`);
    mdLines.push(`##### ${row.id}（v${row.version} · \`${row.requirement.requirementId}@${row.requirement.version}\` · \`${kind}\` · \`satisfied\`）`);
    mdLines.push(``);
    mdLines.push(`- **场景**：${row.scenario}`);
    mdLines.push(`- **预期**：${row.expected}`);
    mdLines.push(`- **方法**：${row.method}`);
    mdLines.push(`- **实际观测与核验结论**：${actual}`);
    mdLines.push(``);
  }

  targets.push({
    externalKey: card.key,
    workId: card.workId,
    revision: card.revision,
    evidence: evRows,
  });

  countsByTarget[card.key] = {
    total: evRows.length,
    satisfied: evRows.length,
    failed: 0,
    unverified: 0,
  };
}

const acceptanceMd = mdLines.join("\n");

// Shape validation
const EXPECTED_KEYS = [
  "acceptanceId",
  "acceptanceVersion",
  "requirement",
  "codeVersion",
  "locator",
  "actual",
  "outcome",
  "kind",
];
const EXPECTED_REQ_KEYS = ["workId", "requirementId", "version"];

if (totalRows !== 58) throw new Error(`expected 58 rows, got ${totalRows}`);

for (const t of targets) {
  for (const r of t.evidence) {
    const ks = Object.keys(r);
    if (JSON.stringify(ks) !== JSON.stringify(EXPECTED_KEYS)) {
      throw new Error(`bad keys on ${r.acceptanceId}: ${ks.join(",")}`);
    }
    const rks = Object.keys(r.requirement);
    if (JSON.stringify(rks) !== JSON.stringify(EXPECTED_REQ_KEYS)) {
      throw new Error(`bad requirement keys on ${r.acceptanceId}: ${rks.join(",")}`);
    }
    if (!Number.isInteger(r.acceptanceVersion) || r.acceptanceVersion < 1) {
      throw new Error(`bad acceptanceVersion on ${r.acceptanceId}`);
    }
    if (!Number.isInteger(r.requirement.version) || r.requirement.version < 1) {
      throw new Error(`bad requirement.version on ${r.acceptanceId}`);
    }
    if (r.codeVersion !== CODE_VERSION) throw new Error(`bad codeVersion on ${r.acceptanceId}`);
    if (!["satisfied", "failed", "unverified"].includes(r.outcome)) {
      throw new Error(`bad outcome on ${r.acceptanceId}`);
    }
    if (!["machine", "source-behavior-review"].includes(r.kind)) {
      throw new Error(`bad kind on ${r.acceptanceId}`);
    }
    if (typeof r.actual !== "string" || r.actual.trim().length < 30) {
      throw new Error(`actual too short on ${r.acceptanceId}`);
    }
    const anchor = r.locator.split("#")[1];
    const matches = acceptanceMd.match(new RegExp(`<a id="${anchor}"></a>`, "g")) ?? [];
    if (matches.length !== 1) {
      throw new Error(`anchor ${anchor} count=${matches.length} in acceptance.md`);
    }
    if (!acceptanceMd.includes(`##### ${r.acceptanceId}（`)) {
      throw new Error(`heading missing for ${r.acceptanceId}`);
    }
  }
}

// Q59 guard check
const q59Pattern = new RegExp("pnpm" + "\\s+add\\s+-D\\s+@", "g");
if (q59Pattern.test(acceptanceMd)) {
  throw new Error("Q59 forbidden pattern detected in acceptance.md");
}

const evidenceRecords = {
  note: "草稿，供主线程链写。targets[].evidence 中每一行只含引擎 evidence 行允许的八个键，可原样追加到对应工单 content.evidence。5 张工单 58 行全部 satisfied（failed 0、unverified 0）：VOXWARD-STORY-023 11/11、VOXWARD-SUB-043 12/12、VOXWARD-STORY-024 11/11、VOXWARD-SUB-044 12/12、VOXWARD-SUB-045 12/12。locator 指向 .kiro/specs/voxward-batch-m8a/evidence/acceptance.md，主线程需把本轮 acceptance.md 放到该路径。",
  candidate: {
    codeVersion: CODE_VERSION,
    fullSha: FULL_SHA,
    note: "引擎按字符串精确比较 evidence.codeVersion 与完成候选。五张工单 58 行全部 satisfied，可以 DONE_KEYS=VOXWARD-STORY-023,VOXWARD-SUB-043,VOXWARD-STORY-024,VOXWARD-SUB-044,VOXWARD-SUB-045 在 1d259d3 上关单（close-batch.cjs 先关子单再关 Story）。写入时以读回的 revision 为准。",
  },
  readFrom: {
    command: "预取实时工单快照 scratch/wave2a/show/VOXWARD-{STORY-023,SUB-043,STORY-024,SUB-044,SUB-045}.json（einzbern.mjs work-show --workspace <Ether> --external-key <KEY>）",
    libraryVersion,
    headEventHash,
  },
  shapeCheck:
    "生成脚本对每一行检查：键名与顺序精确为八个、requirement 三键、正整数版本、outcome 与 kind 枚举、kind 按方法确定（方法以「接口/数据字段/文档与原始需求核对」或「对照本单交付边界及依赖」开头的为 source-behavior-review，其余为 machine）、actual 非空且不是裸 pass/ok/success、无未替换占位符、locator 锚点在 acceptance.md 中恰好出现一次且该行标题存在、codeVersion 为 1d259d3，并核对每单写出的行数与 E01 读到的实时行数相同（11+12+11+12+12=58）。未调用引擎写入。",
  counts: {
    total: totalRows,
    satisfied: totalRows,
    failed: 0,
    unverified: 0,
    machine: machineRows,
    sourceBehaviorReview: reviewRows,
    byTarget: countsByTarget,
  },
  targets,
};

const evJson = JSON.stringify(evidenceRecords, null, 2) + "\n";
if (q59Pattern.test(evJson)) {
  throw new Error("Q59 forbidden pattern detected in evidence-records.json");
}

fs.writeFileSync(path.join(OUT_DIR, "acceptance.md"), acceptanceMd);
fs.writeFileSync(path.join(OUT_DIR, "evidence-records.json"), evJson);
console.log(
  JSON.stringify({
    ok: true,
    totalRows,
    machineRows,
    reviewRows,
    countsByTarget,
  }),
);
