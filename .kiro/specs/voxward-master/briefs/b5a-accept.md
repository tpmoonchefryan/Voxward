你是 VoxWard 这一轮的独立验收兼判断子代理，属于 main 档。引擎 execution-policy-resolve 的结果是：kiro / claude-opus-5.5 / max。

这一轮合成一片做验收，内容分两部分：
- 第 4 批 S006、S008 返工后的复验；
- 第 5 批提前开工的 S017、S018 的新验收。

验收、判断和 lessons 都由你一次做完。你没有参与实现，也没有做过上一轮的验收。

## 授权
- Owner 授权：minutes:fd542a49a57a9e6526440dac。
- D1 决定：minutes:8fc0b8640384844e0b2a1787。STORY-008 组那 18 行验收的方法已经改成「假 CLI 替身测试，真实调用未验证，移到 STORY-029」，每行升了一个版本。请按引擎里的**当前版本**判定。
- 你只读代码、只在检出里跑命令。不改源码、不 commit、不写引擎工单。
- **不要用真实 Kiro 账号跑推理。** 只允许 `kiro-cli --version` 和 `kiro-cli chat --help`。

## 候选
本地 main `b1a1471`，是在 fa5dc19 系列 main 上依次合入四个分支得到的：
- voxward/s006-fix：B1 修复，以及 N1、N9、N10；
- voxward/s008-fix：B2 修复，以及 N3、N4、N9；
- voxward/s017-log-viewer；
- voxward/s018-data-panel：新增迁移 `0004_data_request_kinds`。

合并 S018 时，`apps/server/src/app.ts` 和 `apps/web/vite.config.ts` 两处有冲突。主线程把两边的 import、路由注册和代理都保留了。

检出在 `$KIROCREW_SCRATCH/vw-int-b5a`，detached at b1a1471，已经 install 过。主线程在这里跑过以下检查：
- install --frozen-lockfile、build、typecheck、test（941/941）、check:deps（162 个文件，0 违规），全部退出 0；
- 默认配置跑 `pnpm dev`，以及 `VOXWARD_ADAPTERS=synthetic node dist/main.js`，`/healthz` 都返回 200，停止后没有监听端口。冒烟脚本是 `/home/ryanlan/Code/Voxward/.kiro/specs/voxward-master/tools/smoke.sh`。

这些结果可以直接复用，也可以重跑。

上一轮的验收和判断在检出里的 `.kiro/specs/voxward-batch4/evidence/`。重点读 judgment.md 的 B1、B2、N1–N10 和「复验范围」，以及 acceptance.md 的 E20、E30。

## 工单
| 组 | 工单 | 范围 |
|---|---|---|
| S006 复验 | VOXWARD-STORY-006 work:685ad243ec946eb7f628c93e；VOXWARD-SUB-012 work:a52cf35dff7b3e04ede8e970 | 全部行在 b1a1471 上重新判定 |
| S008 复验 | VOXWARD-STORY-008 work:352ba5df1e0b354ede1a9af0；VOXWARD-SUB-015 work:fdd12cc554b859427cfbddaf；VOXWARD-SUB-016 work:7dc8701421a1a57ec095fe20 | 全部行在 b1a1471 上按当前版本重新判定 |
| S017 新验 | VOXWARD-STORY-017 work:df1b9e57f926fbd8f7302a95；VOXWARD-SUB-031 work:1421416d0610805b8483d333；VOXWARD-SUB-032 work:368314cf870c390afd70b256 | 全部行 |
| S018 新验 | VOXWARD-STORY-018 work:2d989e13eeb4a9b2a8bde05d；VOXWARD-SUB-033 work:79ef6b7182c577ea2316ebc0；VOXWARD-SUB-034 work:7b4dc2c9b2b4264108db88b2 | 全部行 |

一共 10 张单。实时内容用下面这条命令取：

`bash /home/ryanlan/Code/Voxward/.kiro/specs/voxward-master/tools/show-keys.sh $KIROCREW_SCRATCH/vw-accept-b5a-work <KEY>...`

## 必验项
1. **S006 B1**：用 E20 §3 那组对照输入复测。
   - 拉丁字母绕过仍然被拦；
   - ば/は、バ/ハ 不再互相命中；
   - 正则 `ばか`、`café` 能命中原文；
   - 含 が 键的转写表能构建，并读出 ga。
   
   另外自己再构造至少 3 种别的文字或标记组合，例如韩文、越南语声调、阿拉伯语附加符号、组合符号与零宽字符混用，确认既没有漏拦，也没有误伤。
   
   N1：真值表在「例外 ∧ 付费 ∧ 基础未拒绝」这种情况下和提案 §4 的流程图一致。
2. **S008 B2**：做 E30 §6 的崩溃演练。要求：
   - 删除请求发出 1 次；
   - notObserved 为 0；
   - 存活的孤儿进程有确定的去向；
   - 孤儿身份确认后才终止。另外构造一个「pid 被无关进程复用」的反例，确认不会误杀。
   
   N4：适配器返回 itemId 映射、理由码和命中区间，并且仍然不把 correlationId 发给模型。
   
   跑全量测试时把外连拦住，真实 kiro-cli 的推理调用要是 0 次。
3. **S017**：
   - 查看器只是受权限约束的内部查询，没有公开或下游 API，也没有原始日志批量下载。没权限的成员、跨频道请求都要拿不到数据，用负面用例证明；
   - 按 correlationId 展开关联条目，可以切换上一条、下一条；
   - 校验后的 JSON 能折叠；
   - 不可信文本有 bidi 隔离（Q15）；
   - 被删除的数据不出现在查看器里，缓存会失效。
4. **S018**：
   - 普通房管没有数据管理权限，服务端强制执行；
   - 核验不只看昵称；
   - 两种删除入口都只登记请求和显示状态，不宣称删除已经完成；
   - 「删除并加入记分例外」的界面写明要保留最小标记、以后发言仍会审核（提案 §11.2–§11.4）；
   - 迁移 0004 和数据字典一致，0000→0004 和旧库升级都通过。
5. **跨包**：
   - `app.ts` 合并后，日志查看器路由和数据路由都能注册、都能访问，互不影响；
   - vite 的三个代理都能用；
   - 四份 spec 跑 `kiro-specs.mjs check`。返工的两份如果因为链写变成 SPEC_STALE，属于预期，照实写。
6. **阻断判定**：阻断发现必须有当前行为、明确契约或可信的安全边界作依据，并写清触发条件和影响。没有实质发现也是有效结论。

临时文件放 `$KIROCREW_SCRATCH`。不派子代理。中途不发进度。

## 交付
写到 `$KIROCREW_SCRATCH/vw-accept-b5a-out/`：
- acceptance.md
- judgment.md：每个 Story 写通过或打回；如有阻断，写归属的 SUB；非阻断建议写归属的后续 Story；写复验范围。
- lessons.json：最多 5 条，不要和以往的重复。
- evidence-records.json：每行 8 个键，codeVersion 写 "b1a1471"，覆盖 10 张单的全部验收行；locator 指向 `.kiro/specs/voxward-batch5a/evidence/acceptance.md#<锚点>`。

报告开头写明实际用的模型。完成后一次性汇报。

停止条件：四个文件写完；或者遇到硬阻塞，说明阻点后停止。
