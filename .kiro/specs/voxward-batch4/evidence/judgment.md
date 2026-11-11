# 第 4 批判断（VOXWARD-STORY-006、STORY-008、STORY-012、STORY-016）

- 实际模型：kiro / claude-opus-5.5 / max。宿主报告的当前模型是 claude-opus-5.5，没有改用其它模型。
- 候选：本地 main `c67db24`（`bd0ad05` 之上依次合入 `voxward/s012-youtube-auth`、`voxward/s008-kiro-provider`、`voxward/s016-audit-log`、`voxward/s006-routing`，加集成证据提交）。
- 范围：10 张工单、115 行验收。satisfied 95 行，failed 20 行，unverified 0 行。逐条依据见 `.kiro/specs/voxward-batch4/evidence/acceptance.md`，证据草稿见 `evidence-records.json`。
- 判断人：独立验收兼判断子代理（main 档），未参与实现；本批验收只有一片，按小轮条件一次完成验收、判断与 lessons。

| Story | 判定 | 行数 | 阻断 | 归属 |
| --- | --- | --- | --- | --- |
| VOXWARD-STORY-006 | **打回** | 21 satisfied、2 failed（STORY INHERIT-003、SUB-012 INHERIT-003） | B1 | SUB-012 |
| VOXWARD-STORY-008 | **打回** | 17 satisfied、18 failed（STORY 6、SUB-015 5、SUB-016 7） | B2；另需 Owner 决定 D1 | SUB-016 |
| VOXWARD-STORY-012 | **通过** | 19/19 satisfied（STORY 9、SUB-023 10） | 无 | — |
| VOXWARD-STORY-016 | **通过** | 38/38 satisfied（STORY 12、SUB-029 13、SUB-030 13） | 无 | — |

- rejection 计数：实施包 P-S006 打回 1 次，记在 SUB-012；实施包 P-S008 打回 1 次，记在 SUB-016。SUB-015 的本单行（AC001、STORY）为 satisfied，它失败的 PARENT 与 INHERIT-009/010/012/017 五行原因都在 B2，不单独计 SUB-015。下次派工按 master A8 用 `--rejections 1` 解析模型。
- 本批整体门禁：`pnpm install --frozen-lockfile`、`pnpm build`、`pnpm typecheck`、`pnpm test`（770/770）、`pnpm check:deps`（123 个文件 0 违规）通过；默认配置下 `pnpm dev` 与 `node dist/main.js` 启动、`/healthz` 200、只绑 127.0.0.1；`drizzle-kit check` 通过；全量测试在外连拦截下对外部主机 0 次连接，真实 `kiro-cli` 0 次调用。门禁全绿，但有两个 Story 被打回，主线程汇报时不能写成「本批全部通过」。
- Spec：四份为 SPEC_CURRENT（rev 4）。设计与代码的不一致见 B1、B2、N1、N5、N9。

## 阻断发现

### B1 Q6 的默认归一化删掉全部组合标记，日文浊点与带重音字母的正则、转写随之失效（归属 SUB-012）

- 触发：规则集使用默认 `normalization`（`stripCombiningMarks` 未设或为 true），规则或正文含可分解字符：日文浊音与半浊音假名（が、ば、ぱ、ガ、バ…）、带重音的拉丁字母（é、á…）等（acceptance.md E20 §3、§2.1）。
- 当前行为（同一输入对照合并前的 `f4808fb` 与候选 `c67db24`）：
  - 正则规则 `ばか`、`バカ`、`café`：`f4808fb` 对原文 BLOCK，`c67db24` 默认 PASS。正则在归一化副本上匹配，副本里 ば 变成 は、é 变成 e，正则源串却不经归一化。
  - 归一化规则 `ばか` 命中「はかまいりにいく」（墓参り），`バカ` 命中「ハカセ」（博士）：`f4808fb` PASS，`c67db24` BLOCK，即明确违规并按规则扣分。
  - 转写表 `{が: ga}` 在 `c67db24` 构造时抛 `TypeError`，`f4808fb` 可用；用表 `{か: ka}` 时 `が` 被读成 `ka` 且标为完整。
  - 规则集关闭 `stripCombiningMarks` 后前两类恢复，但 Q6 的拉丁字母绕过重新出现；转写表的校验与读音始终用默认选项，不随规则集关闭。
- 契约：VW-R-003「基础检查覆盖昵称、正文和组合，包含精确、归一化、读音/转写及有界正则」，本组两行 INHERIT-003 的 expected 要求继续遵守；提案 §4.3「规则需区分语言与误报风险，不能用未经校准的同音相似性自动惩罚所有匹配文本」；提案 §1 把产品定位为跨语种 VTuber 直播，§9.1 把日文列为推荐依据语种；第 2 批已验收 S004 的正则与转写能力。
- 影响：日文 BLOCK 正则静默失效（漏拦）；日文归一化 BLOCK 规则把只差浊点的无辜词判为明确违规，并对观众扣分；日文转写表无法构建。S006 设计 §4.8 只评估了拉丁字母，测试只覆盖拉丁字母与韩文，所以自测与门禁都发现不了。
- 文件：`apps/server/src/modules/moderation-engine/rules/normalize.ts`（`normalizeUnit`、`DEFAULT_NORMALIZE_OPTIONS`）、`rules/groups.ts`（正则编译不归一化源串）、`rules/transliterate.ts`（键校验与读音用默认选项）、`apps/server/test/moderation-engine/rules/normalize.test.ts`；提交 `6b6cb86`。
- 修复方向（实现由 SUB-012 选择，验收只看结果）：只删除组合附加符号区块里的标记（U+0300–036F、U+1AB0–1AFF、U+1DC0–1DFF、U+20D0–20FF、U+FE20–FE2F），保留 U+3099/U+309A 等文字必需的标记，或按文字、语言启用；正则源串与匹配副本走同一归一化，或正则继续对 NFKC 副本匹配；转写表校验与读音使用规则集的同一选项。派工简报写的「先 NFKD，删除 \p{M}，再 NFKC」本身过宽，主线程下次派工时应按上面改写。
- 复验：E20 §3 的同一组对照输入：拉丁字母绕过仍被拦截；ば/は、バ/ハ 不再互相命中；正则 `ばか`、`café` 重新命中原文；含 が 键的转写表能构建并读出 ga；S004 规则测试与本组路由测试（`classification.ts` 也调用 `normalizeText`）；完整门禁。

### B2 服务进程异常退出后，CLI 已保存的会话无法清理（归属 SUB-016）

- 触发：服务进程在一批推理运行期间异常退出（SIGKILL、OOM、主机重启），且 CLI 已在 stream-json 运行流中输出会话 ID（acceptance.md E30 §6、§3.1）。
- 当前行为（假 CLI 先输出含 `sessionId` 的事件再挂起，扮演服务端的子进程被 SIGKILL）：`session.json` 停在 `state=running`、`pid=<CLI>`、`kiroSessionId=null`；CLI 进程组以 detached 启动，父进程死后继续运行；启动扫描遇到存活进程把目录计为 skipped，不终止进程；CLI 退出后再扫描才删除目录，`kiroSessions.notObserved=1`，删除请求 0 次。正常结束时适配器会发出 `chat --delete-session <ID>`（E30 §1），所以缺口只在异常路径。
- 契约：提案 §8.4「Kiro CLI 会话自动保存……需要专门处理」「模型会话与本地运行临时文件……完成、失败、取消后清理，恢复时清理孤儿任务」；VW-R-009「成功/失败/取消及异常恢复清理本地与 Crew 内容残留」；SUB-016 的 AC 与场景「成功、失败、取消、异常重启后观察运行目录与 Crew 存储」；本包自己的 `docs/security/ai-retention-boundary.md`「运行流中出现会话 ID 时，适配器会请求 kiro-cli chat --delete-session」。kiro-cli 3.1.0 的 `chat --help` 列出 `--list-sessions`（当前目录已保存的会话）与 `--delete-session`（E11），CLI 确实在本地保存会话。
- 影响：异常退出时，运行中批次的完整提示（含观众正文）留在运行账号的 CLI 会话存储里，没有删除请求，也没有可供运维定位的记录；孤儿 CLI 在服务重启后仍可能继续调用模型；扫描只在启动时运行，存活孤儿的目录要等下一次重启才清理。
- 文件：`apps/server/src/adapters/kiro-cli/provider.ts`（`runCli` 的 `close` 回调、`finishSession`）、`orphan-sweep.ts`、`session-lifecycle.ts`、`deploy/kiro-runtime/README.md`、`docs/security/ai-retention-boundary.md`、`apps/server/test/adapters/kiro-cleanup/`。
- 修复方向（实现由 SUB-016 选择）：stdout 增量解析，首次看到合法会话 ID 就 `recordKiroSession` 落盘；扫描对存活孤儿先确认身份（例如 `/proc/<pid>/cwd` 等于运行目录）再终止进程组，或改为周期扫描；没有记录会话 ID 的孤儿可在其运行目录下用 `chat --list-sessions -f json` 查找（需真实 CLI 实测，否则标待实测）；补崩溃演练用例；文档同步。
- 复验：E30 §6 崩溃演练，要求删除请求 1 次、notObserved 0、存活孤儿有确定去向；E30 其余各节；`kiro-cleanup` 与 `kiro-cli` 测试；完整门禁。

## 需 Owner 决定

### D1 STORY-008 的「固定版本真实 Kiro 调用」无法在现有授权下执行

- 现状：STORY-008 组中，方法写「固定版本真实 Kiro 调用、输入/文件观察与故障清理演练」且没有替身条款的行共 18 行：VW-S008-AC001、VW-S008-PARENT、VW-SUB015-PARENT、VW-SUB016-AC001、VW-SUB016-STORY、VW-SUB016-PARENT，以及三张单的 INHERIT-009、INHERIT-010、INHERIT-012、INHERIT-017。只有 SUB-015 的 AC001 与 STORY 写了「无可用环境时以替身测试并标明真实调用未验证」。
- 约束：简报与提案 §9.2 不允许用本机开发账号推理；运行时 agent 须用独立账号、独立工作目录与最小权限，这样的账号还不存在。连续推进授权（minutes:fd542a49a57a9e6526440dac）不含真实平台操作。
- 结果：B2 修好后，这 18 行也只能写 unverified，STORY-008 不能转 done。真实 CLI 的会话存放位置、`--delete-session` 的效果、未信任工具在无人值守下的处理，只有真实演练能证明。
- 选项：(a) Owner 提供独立的 Kiro 运行账号（独立系统用户、HOME 与 `KIRO_API_KEY`），授权用合成消息做固定版本 3.1.0 的真实演练；(b) Owner 以 changeDecision 把这些行的方法改为「替身测试并标明真实调用未验证」，真实演练移到部署 Story（STORY-029）；(c) 保持 STORY-008 为 active，等 STORY-029 部署时一并验证。建议 (a)：一次演练能同时验证 B2 的修复与 N3 的权限边界。

## 非阻断建议

| 编号 | 内容 | 依据 | 建议归属 |
| --- | --- | --- | --- |
| N1 | 真值表在 16 种「例外 ∧ 付费 ∧ 基础未拒绝」组合上与提案 §4 流程图的分支顺序不同：图中例外先于付费、走「AI 或人工审核」，真值表走 PAID_TEXT_REVIEW 并携带例外标记。行为满足 §4.2 第 3 条、§11.4、VW-R-003、VW-R-014 与本组 expected，但 S006 设计 §4.3 没有写明这是偏离。建议在设计中写明理由；若 Owner 要求严格按图，对调 R2 与 R3 即可。 | acceptance.md §2.0、E20 §1 | B1 返工时一并写入 S006 设计；STORY-026 核心闭环确认 |
| N2 | 流程图中「BLOCK 与复核记录」的复核记录、「校验与裁决提交」尚未接线：路由器只返回结果，不写 verdicts、deliveries 或复核列表。S006 设计 §6 列为不做。 | 提案 §4.2 第 5 条 | STORY-014（DecisionService） |
| N3 | `deploy/kiro-runtime` 只有部署要求，没有 agent 配置模板（工具白名单为空）与服务进程以独立账号启动 CLI 的方式。现在「无任意宿主权限」只靠 `--trust-tools=`，未信任工具在无人值守下的真实处理未验证。 | 提案 §9.2、§16；VW-R-012 | B2 返工时补模板与说明；真实验证见 D1；STORY-029 |
| N4 | 适配器结果每条只有 `correlationId` 与 `classification`，itemId 映射、理由码与命中区间不交给调用方，因此 S016 准备好的 `ITEM_ID_MAP`、`VALIDATED_JSON` 证据与「模型建议」写不进 Technical Log；SC 任务的译文字段也没有出口。路由器的 APPLIED 状态丢掉了 `ScoreChange.subjectRef`。 | 提案 §8.4、§12.1–12.2；VW-R-011；acceptance.md §1.3 | STORY-009（TaskCoordinator 接线）、STORY-010（SC）；STORY-026 验证 |
| N5 | 未采用 PKCE。RFC 9700 §2.1.1 要求客户端防止授权码注入，机密客户端推荐用 PKCE。实测：同一部署中另一频道的所有者用自己的 state 加主播尚未兑换的授权码完成回调，授权落到他的频道。触发需要拿到尚未兑换的授权码（回调会立即兑换，请求日志已去掉查询串），路由也未挂载，所以本轮判为非阻断。派工简报要求的「PKCE 负面用例」因此未满足；本批反正要返工 S006、S008，建议主线程把 S256 PKCE 与负面用例并入这一轮。 | acceptance.md §4.0、E40；RFC 9700 §2.1.1 | 主线程决定是否并入本轮（SUB-023）；最迟在挂载 OAuth 路由的 Story（STORY-013 或 STORY-022）之前 |
| N6 | 回调里他人账号的失败尝试会消耗 state，使主播自己的这次授权失败；重新授权时旧授权行不撤销，旧 refresh token 仍封存在保险箱，保险箱也没有删除接口。 | acceptance.md §4.0、E40 | 同 N5；保险箱持久化与删除归 STORY-029 |
| N7 | 删除索引只经「带主体的技术日志行 → 关联 ID」找到 Change Log：`correlationId` 为空或没有这类技术日志的主体级变更行（例如例外、名单、人工调分），摘要里的主体与历史分数在删除后原样保留；同链上 `subjectRef: null` 的行也留下（只含元数据）。`batch_id` 等标识字段不经脱敏。 | 提案 §11.3「删除完成后在 Change Log 中保留不含消息正文和历史分数的最小处理凭证」、§12.3；E50 §4 | STORY-019（删除编排）定规则；写入方 STORY-014 遵守（主体级变更带可定位的关联或主体字段，摘要不写分数） |
| N8 | SQLite 删除行后，被删正文仍在主数据库文件的空闲页里（`wal_checkpoint(TRUNCATE)` 后按字节可找到，`secure_delete=0`）。 | 提案 §12.4；E50 §4 | STORY-020（到期与删除可靠性） |
| N9 | 设计与代码的小差异：S006 §1、§5 仍写迁移 `0002_*` 与「从 0000、0001 升级」，§4.9 的提示文案为中文而代码为英文；S008 §3 写 `command.ts` 含环境变量白名单，实际环境由调用方完整给出；S012 §8 列出的 `auth-status.test.ts`、`oauth.test.ts` 不存在；S016 §3.2 把「一个房间即一个 channels 行」归给 S002，实际是 S003 的自定。 | acceptance.md §1.1 | S006、S008 在本轮返工时改；S012、S016 在下次修改时改 |
| N10 | 集成时把 S006 的迁移从 0002 改为 0003。drizzle 的 SQLite 迁移器只执行 `when` 大于库中最新 `created_at` 的条目，S006 工作树里按旧编号建的库升级时会跳过审计字段迁移并在 0003 报错回滚。没有部署受影响，但各工作树里的开发库应删除；以后改编号时保持 `when` 与 idx 同序，并用每个真实前驱状态的库做升级测试。 | acceptance.md §1.2、E60 | 主线程（集成步骤） |

## 复验范围

- 证据失效：B1 返工会改 `moderation-engine/rules/`（可能还有 `routing/classification.ts` 的结果），使 STORY-006 组全部 23 行失效；B2 返工会改 `adapters/kiro-cli/` 与 `deploy/`、`docs/security/`，使 STORY-008 组全部 35 行失效。引擎要求证据 codeVersion 等于完成候选，所以这两组都要在新候选上重新盖章。
- STORY-006 组：重跑 E20 全部（96 组合与流程图比对、路由器 17 项、Q6 对照表、Q12），外加 B1 复验输入；源码不在 `rules/`、`routing/` 的部分（例如 Q8 迁移，E60）若 diff 为空可以复用。
- STORY-008 组：重跑 E30 全部与 E31（拦截与 PATH 垫片），重点是 §6 崩溃演练；E11 在 kiro-cli 版本不变时可复用。D1 决定之前，方法要求真实调用的 18 行只能写 unverified。
- STORY-012、STORY-016：在 `c67db24` 上通过，可以按本轮证据以 `c67db24` 链写关单。若主线程改在返工后的新候选上关单，先确认 `apps/server/src/modules/platform-source/`、`apps/server/src/modules/audit-store/`、`apps/server/src/db/`、`packages/contracts/src/`、`docs/data-dictionary.md`、`docs/deployment/`、迁移目录与相应测试的 diff 为空，再复用 E40、E50、E60 并重新盖 codeVersion；有改动则重跑相应探针。N5 若并入本轮，STORY-012 组要在新候选上重跑 E40 并新增 PKCE 负面用例。
- 每个新候选都要重跑：install --frozen-lockfile、build、typecheck、test、check:deps（E02–E06）、默认配置冒烟（E07）、迁移链与数据字典（E60、E61）、跨包探针（E70）、四份 spec 的 check（E10）。
