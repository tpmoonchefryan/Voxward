# S019 接手说明（接着 b9-s019.md 做 SUB-036）

先全文读同目录的 `b9-s019.md`，所有要求照旧。再读上一个子代理的报告 `/home/ryanlan/.kiro/crew/subagents/fe48a9ae9ccf8788/result.txt`，以及工作树里的 spec 和 `.kiro/specs/voxward-s019-delete-exception/evidence/`。下面只写不一样的地方。

## 为什么换人
上一个子代理完成了 SUB-035，但担心上下文不够，停在了 SUB-036 之前。这不是阻塞，你接着做 SUB-036。

## 当前状态
- 工作树 `/home/ryanlan/Code/Voxward/.worktrees/s019-delete-exception`，分支 `voxward/s019-delete-exception`。已提交：
  - `83823d8`：spec；
  - `eedd0f9`：SUB-035，同事务删除并加入例外，迁移 0006；
  - `0b3a6bd`：部分证据。
- main 之后又合入了 S021 和 S027。**先** `git merge main`。如果冲突，按两边都保留的方式解决，单独提交，再开工。

## 要完成的部分
- SUB-036：按存储面逐个清理，部分失败能续作，两部分都完成才报告成功。存储面包括：评分账本、`score_outcomes`、证据、映射、缓存、日志索引、任务与 AI 内容、候选词卡片。
  - 交付清单在工单里。端口、数据库清理、执行器、路由、组合接线和测试，都按 spec 走。
- 简报里的问题清单项：
  - Q7、Q35、Q42：按主体让缓存失效，并共用一条失效总线；
  - Q29：主体级 Change Log 的删除索引；
  - Q51：`score_outcomes` 和候选词卡片的删除覆盖。
  - 每一项都要能找到实现和测试。SUB-035 已经做掉的项，在报告里注明。
- 收尾：全量门禁、smoke.sh 冒烟、证据文件 `self-check.md` 写完整，tasks.md 本地段打勾。

## 注意
- 命令行里不要出现 SQL 语句文本，比如表删除语句，宿主规则会拦。写迁移或 SQL 文件时，用文件编辑工具。
- 并行调用里不要同时删除和写同一个文件。上一个子代理就是这样把迁移文件弄丢的。
- 如果返回 `User denied tool execution`，停下来报告，写明被拦的命令。不要换写法绕过。
