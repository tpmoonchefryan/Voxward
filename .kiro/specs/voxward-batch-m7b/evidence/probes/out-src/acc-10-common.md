
## 1. 共同检查

<a id="recheck"></a>
### 1.1 复验范围：首次验收，没有可复用的探针证据

- 两组都是首次验收，四张单的 `content.evidence` 为空，没有上一轮的行可复用。依据方法规范「Acceptance evidence and recheck scope」第 3 条，主线程的集成日志（E00）只作复核：它没有逐条退出码与提交号，所以 E02–E07 都在 `7400f39` 上重跑。E08–E11 是每个新候选都要做的项目，都做了。
- 本批与第 m7 批第一部分（`cb822f0`，S011、S015）之间的代码差异就是这两个分支；S021 与 S027 都没有改 S011、S015 用到的路径（`task-coordinator/`、`moderation-engine/`、`decision-service/`、`platform-source/`、`db/schema/`、`db/decision-store.ts`），这两组的探针本轮没有重跑，全量测试在拦截下照常通过（E05、E08）。S015 设计 §0 登记的契约包冲突点（`index.ts` 导出）在合并提交 `b345e78` 中两边都保留了（E11）。
- S021 的端点与投递泵在 E60–E62 中用真实 `buildApp`、迁移后的临时 SQLite、真实 ws 客户端与手工握手的 TCP 消费者验证；改判与补发经 S014 的决策服务与真实存储。S 节与 E61 R2–R4 需要可设置的时钟，用的是与 `app.ts` 的 `startNativeOutput` 相同的四个部件（`attachNativeOutput`、`createSubscriptionRegistry`、三个 db 端口、`createDeliveryPump`），只把 `now` 换掉。SUB-049 的脚本按 README 的入口在拦截与垫片下复跑（E70、E71）。

<a id="spec"></a>
### 1.2 Spec 状态与设计、代码一致性

- 两份都是 `SPEC_CURRENT`（rev 4），受管段头部摘要与引擎一致（E10）。`tasks.md` 的本地段：S021 的 1.1–1.9、2.1–2.8、3.1–3.3 与 S027 的 2.1–2.7 都已勾选，受管段的正式任务未勾选，SUB-050 一项明确不做。
- S021 设计与代码一致的部分：§2 偏离表（模块名 `output-adapter`、没有模块内路由、端口放契约包、存储放 db 分区）；§3 分区（E06、E09）；§4 凭据格式、子协议交付、两表判定、撤销与权限（E60 G 节）；§5 帧与关闭码（C、D 节）；§6 读行条件、每轮 50 行、先过期再发、比较状态的 SENT、无消费者时保持 PENDING、3 次失败为 FAILED（S 节）；§7 补发（S5–S7）；§9 Q25（Q 节）；§13 偏离记录的九条都与代码相符。
- 不一致处：
  - §6 与协议文档 §6 写「只发送 PENDING、validUntil 未过、且属于当前裁决的行」。读行时成立；投递泵一轮只读一次，之后逐行等待发送，发送前不再核对，所以一轮之中被改判或被取消的行仍会发出（E61，B7）。
  - §8 写「`onClose` 时停止计时器并关闭连接」，§13 写「关闭应用时停止计时器并断开连接」。实测有消费者在线时 `app.close()` 一直不返回，投递泵继续发送，消费者自己断开后才完成（E60 Z1，judgment N1）。
  - §3 的分区表没有列新增的 `auth/output-grants.ts`（auth 分区，导入 db），只是遗漏。
- 协议文档与代码不一致处：§10 写 S003 的 Bearer 只读令牌「仍服务既有接口」，但没有任何路由要求 `output.feed`，这种令牌目前打不开任何接口（E60 G3、E11，judgment N4）；`examples/consumer-dedup/dedupe.mjs` 的注释写「The protocol promises at-least-once delivery」，协议文档没有这个承诺（SENT 只表示已交给发送时在线的连接，过期行从未发送）。
- S027 设计与代码一致的部分：§2 交付映射；§3 目录；§4 导入（E11）；§5 样本字段与校验（E71）；§8 质量块与未测项；§9 延迟参数；§11 清理场景；§12 不新增依赖；§13 质量输出可逐字节复现（E70）。
- 不一致处（文档措辞，judgment N5）：
  - §10 写「只给出其中之一时，脚本只运行替身」，README 写「只给出其中之一时，脚本同样拒绝运行」。实测只给 `--real-model` 时拒绝（退出 2），只给环境变量时照常只跑替身（E70）。两种行为都不会调用真实模型，两份文档各错一半。
  - §6 写 BLOCK 组「归一化两条」，`rule-set.json` 里是三条（禁词甲、bannedalpha、badword）加受约束正则一条。
  - §7 写替身声明的模型为 `bench-synthetic-model`，代码与 README 是 `bench-declared-model`。

<a id="gates"></a>
### 1.3 门禁与启动冒烟

install --frozen-lockfile、build、typecheck（含 bench）、test（144 个文件 1860 项）、check:deps（213 个文件 0 违规）均退出 0，锁文件不变（E02–E06）。默认配置下 `pnpm dev` 与打包产物都能启动，`/healthz` 200，只绑 127.0.0.1，停止后 3000、5173 无监听、无残留进程；`ws` 以 external 留在包外，dist 带数据库启动时原生端点已装配（E07）。与主线程的集成日志一致（E00）。

<a id="isolation"></a>
### 1.4 外连、真实 CLI、真实 Crew 与真实 YouTube

全量测试、E60–E62 与 E70–E71 都在拦截与垫片下运行，每次运行前在同一环境里确认拦截已加载（E08 与各次的 `selfcheck.txt`）。对外部主机 0 次连接，对本机运行前已在监听的 22 个端口 0 次连接，`kiro-cli`、`kirocrew`、`kiro` 0 次调用。E60–E62 的连接全部是回环、指向探针自己开的端口；E70–E71 只有 IPC。样例消费者的子进程也加载了拦截（E62）。基准的假 CLI 子进程由适配器以精简环境启动（只有 `PATH`、`FAKE_KIRO_LOG`、`FAKE_KIRO_MODE`），不带 `NODE_OPTIONS`，它只导入 `node:fs`（静态核对）。本轮没有启动 Kiro Crew 队列，没有连接本机网关，没有调用真实 YouTube 或 Google 的接口。

<a id="deps"></a>
### 1.5 依赖方向

check:deps 0 违规（E06）；同一规则在副本中对 adapter 导入模块或 db、output-adapter 模块导入 `ws` 或 db、契约包导入包外路径、db 导入模块都报违规（E09）。所以端点放在 adapter 分区、端口放契约包、存储放 db 分区是唯一能过规则的接法（设计 §2、§3）。契约包是新增导出，已有类型与 `CONTRACT_VERSION` 未改。bench 不在 check-deps 的扫描根中，只按相对路径调用已有导出（E11）。
