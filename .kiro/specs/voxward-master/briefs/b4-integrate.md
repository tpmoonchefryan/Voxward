你是 VoxWard 第 4 批的集成子代理（economy 档；引擎 execution-policy-resolve 结果：kiro / claude-haiku-5.5 / max，rejections=0）。你只负责合并，不加新功能。

## 授权
Owner 授权编号 minutes:fd542a49a57a9e6526440dac。只在本地分支提交，不推送，不写引擎工单。

## 现状
- 本地 main `f4808fb` 已经无冲突合入了第 4 批的三个包：S012、S008、S016。S016 加了迁移 `0002_audit_log_fields.sql`，以及 meta 下的 `0002_snapshot.json` 和 journal 条目。
- 还剩分支 `voxward/s006-routing`（S006，HEAD c0bd06a）没合。它也加了一个迁移 `0002_drop_subject_nickname_checks.sql`，用来删掉 `subject_nickname_checks` 表（问题清单 Q8），配套改了 `0002_snapshot.json`、`_journal.json`，以及 `apps/server/test/db/migrate.test.ts`。
- 合并时有冲突的文件：`apps/server/src/db/migrations/meta/0002_snapshot.json`（AA）、`meta/_journal.json`（UU）、`apps/server/test/db/migrate.test.ts`（UU）。
- 工作树 `/home/ryanlan/Code/Voxward/.worktrees/b4-integrate`，分支 voxward/b4-integrate，从 main f4808fb 开出。

## 要做的事
1. 在工作树里执行 `git merge --no-ff voxward/s006-routing`。
2. 迁移的处理：
   - S016 的 `0002_audit_log_fields` 保持 0002 不变。
   - S006 的删表迁移改编号为 `0003_drop_subject_nickname_checks.sql`。
   - journal 和 snapshot 链要和 drizzle-kit 的规则一致：0003 的 snapshot 以 0002（S016 版）为前驱，不能手写出两个 0002。
   - 推荐做法：保留 S016 的 0002；以 S006 的 schema 改动为准，用仓库自带的 `pnpm --filter <server 包名> db:generate`（或 drizzle-kit generate，看 apps/server/package.json 里的实际脚本）重新生成 0003，再确认生成出来的 SQL 只删 `subject_nickname_checks`。
   - 生成后跑 `drizzle-kit` 检查，确认 schema 和迁移之间没有差异。
3. `migrate.test.ts`：保留两边的用例。S006 的「从旧迁移升级、原有行保留、昵称表被删」用例要按新编号调整。
4. `docs/data-dictionary.md`：两边都改过的话，合并成和实际库一致的版本，也就是包含审计日志字段、不包含 subject_nickname_checks。
5. 其他冲突（如果还有）：只做语义合并，两边的行为都保留；拿不准的写进报告。
6. 每张单的 spec 只在 `.kiro/specs/` 下各自的目录里，正常情况下不会冲突。

## 自测（全部要退出 0）
- 在工作树根执行：`pnpm install --frozen-lockfile`（锁文件如果有变化，先 `pnpm install`，再说明原因）、`pnpm build`、`pnpm typecheck`、`pnpm test`、`pnpm check:deps`。
- 用空库从 0000 跑到 0003，确认迁移能执行完；再用只停在 0002 的旧库升级到 0003，确认能升上去。
- 不设任何 `VOXWARD_DATABASE_FILE`，执行 `pnpm dev`：要求 `/healthz` 返回 200，只绑 127.0.0.1。停掉后确认没有残留进程，再删掉这次生成的数据库文件。

把自测结果写到 `.kiro/specs/voxward-master/evidence/b4-integrate.md`，作为合并之后的单独一个 commit 提交。

## 约束
- 只改本工作树。不改主工作区。不派子代理，中途不发进度。临时文件不要放 /tmp。pnpm 版本 12.18.0，非交互运行。

## 交付报告
写明：实际使用的模型；merge commit 和后续 commit 的 hash；冲突是怎么解决的；迁移编号与 journal 的最终状态；自测命令及其退出码；未验证项。

停止条件：合并和证据都已提交，并且自测全部通过；或者遇到语义上无法判断的冲突，说明之后停止。
