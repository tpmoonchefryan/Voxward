# Requirements: VoxWard Frontend v2 (`VOXWARD-INIT-002`)

- **Initiative**: `VOXWARD-INIT-002` (`work:b69e606333be9c1238238ba2`)
- **Design Authority**: `TCRN-Design-System@4.1.0` (`ca4e98d8eea401e9175913ab10d2444567ec3cff`, `sourceDigest: 0585cb69ca3ac1e6e5549443a1e16d4db80968a15e4b4ea660110f68588f3bf1`)
- **Basis**: 9 份 Owner 目视验收通过的 Penpot 设计稿（`VW-Draft-00`..`VW-Draft-08`）及全部 19 份已登记 VoxWard 设计裁定纪要。

## 1. 全站设计与架构需求（`VW-Draft-00` + `ProductShell`）

1. **纯净消费 Design System `4.1.0`**：
   - `apps/web/package.json` 固定声明 `@tcrn/ui-tokens: "4.1.0"`, `@tcrn/ui-copy-state: "4.1.0"`, `@tcrn/ui-react: "4.1.0"`；根目录安装 `@tcrn/ds-consumer-tools: "4.1.0"` 与离线 `vendor/tcrn-ds/4.1.0/producer/ai/` 规则树；`.tcrn-ds.json` 完整锁定 `identity` 并通过 `tcrn-ds-check`（静态与 `--layout-url`）。
   - 所有 UI 组件统一从 `@tcrn/ui-react/approved` 导入；严禁覆盖 `.tcrn-*` 样式、传递组件 inline `style` 或引入裸设计色值。
   - Banner / Notice（`BannerNotice`）保持产品级共享组合（消费 `--tcrn-*` Token 与原生语义 ARIA）。
2. **统一 `VoxWardShell`（`ProductShell` + `useProductShellController`）**：
   - 品牌标志使用正式采纳的 `brandProductId="voxward"`（Option C 结界声纹 V 标）；
   - 左侧业务导航组固定包含：`审核后台`（`/moderation/:channelId`）、`拦截管理`（`/channels/:channelId/blocked`）、`数据请求`（`/data/:channelId`）、`纯净副屏弹幕姬 ↗`（`/dock/:roomId`，外链新开）；
   - 右侧后台导航组通过 `1×16` 竖分隔线与 `28×28` 圆形头像区隔，固定包含：`日志查看器`（`/logs/:channelId`）、`集成管理`（`/integrations/:channelId`）、`用户管理`（`/users/:channelId`）、`系统设置`（`/admin/:channelId`）；
   - 完整菜单同时包含 `服务首页`（`/`）、`下游接入指引`（`/guides`）、`隔离演示沙盒`（`/sandbox`）；
   - 支持浅色 / 深色 / 可选万圣节（`seasonalThemes={["halloween"]}`, `[data-tcrn-theme="halloween"]`）三主题切换；
   - `PageHeader` 频道选择下拉仅按需要出现在特定频道页面（「系统设置 › 常规与外观」、`/`、`/guides` 不显示），选项动态源自已接入平台适配器/授权频道；
   - 用户顶栏 pinned 顺序经 `/auth/shell-preferences` 持久化至服务端 SQLite（零匿名 `localStorage` 降级替代）。
3. **文本安全隔离（Q15）**：
   - 全部观众昵称、弹幕正文、AI 译文/梗注、词条、主体引用及外部日志字段必须经 `<UntrustedText>`（`<bdi>` 隔离、剥离 C0 控制符、零脚本/链接解释）渲染。

## 2. 全 12 条页面路由需求映射（`VW-Draft-01`..`08`）

| 路由 | 对应草稿与纪要 | 核心需求 |
| --- | --- | --- |
| `/overlay/:roomId` | Draft 01 (`minutes:9e93ffb0`, `35d3f3f6`) | 400×800 竖屏透明 OBS 源；BLOCK 消息后端静默丢弃、前端彻底移除 `WardBarrier` / 拦截音效 / 静音开关；仅控制 VoxWard 自有气泡/SC 样式；快速通道追回消息静默移除无提示。 |
| `/dock/:roomId` | Draft 02 (`minutes:73541fe2`, `33e47135`, `db88b159`, `2f64de06`) | 独立纯净双列弹幕姬（无顶栏、无审核队列、无系统设置开关）；对齐 YouTube 官方 7 档 SC 颜色与 `$5+` Ticker 置顶倒计时条；彻底禁止 SC 关闭与退款控件。 |
| `/moderation/:channelId` | Draft 03 (`minutes:33e47135`, `db88b159`, `2f64de06`, `15668408`, `85405dd0`) | 双列等高工作台，左列待审核拦截队列支持多选批量与半角括号文案 **`重判放行 (恢复积分)`** / **`放行 (不加分)`** / `确认拦截` / 可选 **`删平台消息 (不退款)`**、409 冲突提示与正文默认折叠；右列审核前实时流与 SC Ticker 监控；新增 `AI 候选词待确认` 页签（选择目标黑名单归类后确认/忽略）；页头仅展示只读 SC 精翻状态徽章。 |
| `/channels/:channelId/blocked` | Draft 03B (`minutes:73541fe2`, `15668408`, `85405dd0`, `a744fc50`) | `已确认拦截记录`（多维搜索筛选，重判**仅修正 VoxWard 积分、绝不向 OBS/blivechat 补发**）与 `黑名单用户管理`（仅 VoxWard 手动拉黑，取消 0 分自动拉黑与 YouTube 反向同步；可选勾选「同步至 YouTube 直播间」保存 `banId` 并在解黑时联动解除）。 |
| `/admin/:channelId?`, `/settings/:channelId?` | Draft 04 (`minutes:b95eb9d6`, `317b10e7`, `61a23f82`, `2c2a0b8e`) | 单分类 `SettingsLayout`：常规与外观（无频道选择）；规则与词库（子项缩进 28px；归类表只增不删不禁用；黑/白词条合并容器 + `REGEX` 正则 + Q12 提示 + `Switch` 启停 + 底端对齐 `⋯` 菜单，**移除语种与更新时间列**，CSV 模板 `term,category,matchKind`）；计分与运行策略（**唯一归口 SC 精翻开关** + 从已启用 AI 适配器模型池选择模型）；数据保留策略。 |
| `/integrations/:channelId?` | Draft 04B (`minutes:b95eb9d6`, `61a23f82`, `2c2a0b8e`, `f0f48f9e`, `c1ee1bbd`, `e3e856c4`) | 适配器列表首页 + 右上角自适应 **`+ 接入新适配器 ▾`** 下拉（直播平台 / AI 供应商）+ 添加页首步仅显系统词典单一下拉（选中后常驻保留，编辑态锁定只读）+ 统一 `基础配置` / `控制` 两页签 + YouTube Live / Kiro CLI / OpenAI / Anthropic 字段与 AI 可用模型池（远端拉取/手动维护）+ 统一归口 `/outputs` 下游输出凭据管理。 |
| `/users/:channelId?` | Draft 04C (`minutes:61a23f82#D3-D4`) | 用户列表（创建/启停/编辑/删除）、用户编辑（多角色分配 + 生效权限实时预览）、角色管理列表、角色权限编辑矩阵；严格执行 **`Deny > Grant > Not Set`** 合成优先级。 |
| `/logs/:channelId` | Draft 05 (`minutes:a14066e3`, `49bc3e11`) | `Technical Log` / `Change Log` / `Integration Log` 三页签 + 关联链处理链 `StagePipeline` 双向跳转；Integration Log 仅结构化拆解 HTTP 请求行/状态码/脱敏 Headers，外部 Request/Response Body 用 `RawPayloadBox` 原样保留；无内部路径或组件名泄漏。 |
| `/data/:channelId` | Draft 06 (`minutes:177741bb`) | 主体稳定 ID 查找（无 `data.handle` 仅显示拒绝态）、保留概况、待核验请求审批、两阶段删除登记确认（`InlineConfirmBar` / `ConfirmActionDialog`），清晰保留外部副本不受控与未删除完成语义。 |
| `/sandbox` | Draft 07 (`minutes:fe749147`) | 摒弃调试拼盘；直接复用正式 02/03/06 业务 UI，在 `ProductShell` `topBanner` 挂载常驻合成演示标识与角色切换/6 场景注入/一键重置控制条，按角色能力联动顶栏与视图及越权拒绝态。 |
| `/guides` & `/` | Draft 08 (`minutes:4c500848`) | 接入统一 `ProductShell` + 2px 结界线 + 纸张容器；`/guides` 展示支持矩阵（零代码枚举）、云端-主播拓扑、自检流程（输出凭据归口至集成管理）与故障排查；`/` 实时探测 `/healthz` 并展示正常/检查中/异常/离线四态与全工作台入口。 |
