// Per-row acceptance verdicts and actual observations for Batch m7c (VOXWARD-STORY-019, VOXWARD-SUB-035, VOXWARD-SUB-036)
// on candidate commit d047636 (d04763689803accabc09a37d2d21ec8e7bb9a3eb).

export const rows = {
  // ==========================================================================
  // VOXWARD-STORY-019 (12 rows: 8 satisfied, 4 failed)
  // ==========================================================================
  "VW-S019-AC001": {
    outcome: "failed",
    actual:
      "候选 d047636 检出：install --frozen-lockfile、build、typecheck、check:deps（219 文件 0 违规）及拦截下全量测试（149 文件 1882 项，S019 相关 9 文件 92 项）均退出 0（E02–E06、E08），默认配置冒烟 dev/dist 均 200 且停止后无监听（E07）。SUB-035 部分成立（E60 B1–B5）：startDeletion 在单短事务内写入例外、提升代次并登记删除项，中途异常全部回滚（B1）；启动返回即刻拒绝实时/身份/人工三类计分入口（EXCEPTION_ACTIVE，无记分窗口）且重复启动幂等（B2）；代次 0 的在途任务提交返回 STALE_GENERATION 丢弃（B3）；例外主体新消息在路由真值表恒进 REALTIME_REVIEW（不走噪声/白名单/高分快通），提交裁决成功但不写账本（B4）；DELETE_DATA_ONLY 不新增也不撤销已有例外，偏好标记不含旧分与昵称，仅已验证 RESUME_SCORING 可解除例外（B5）。但 SUB-036 的清理与续作存在两项实测缺陷，使「双部分完成才成功，不保存隐藏分或原值凭证」及「清理部分失败」续作不成立：（1）B8（E60 R1、R2）：db/subject-cleanup.ts 的 readCleanupFacts 只转交 audit-log.ts locateScope 的 correlationIds（仅含 technical_logs，漏掉 channel_events.correlation_id）；当技术日志按 7 天保留期已清除（R1），或第 1 轮在步骤 3 删完技术日志后于步骤 4 CANDIDATE_CARD 失败（PARTIAL_FAILED）并在第 2 轮续作时（R2），readCleanupFacts 返回空数组，CANDIDATE_CARD 删 0 张卡却标 DONE，整单返回 COMPLETED，观众消息派生的候选词卡片（含 term、note、sourceCorrelationId）仍留在 CandidateStore；（2）B9（E60 R3）：第 1 轮在步骤 10 DELIVERY 标 DONE 后于步骤 11 VERDICT 失败（PARTIAL_FAILED），重试前例外观众按提案 §11.4 发 1 条新消息并完成常规审核投递，后续重试因跳过已 DONE 的 DELIVERY 而触发 SQLITE_CONSTRAINT_FOREIGNKEY，请求永久卡在 PARTIAL_FAILED。",
  },
  "VW-S019-PARENT": {
    outcome: "failed",
    actual:
      "复用 VW-S019-AC001 在候选 d047636 上的同次门禁与探针证据（E02–E08、E60 A1–A4、B1–B5、C1–C3、R1–R4）。单事务确认例外/提升代次/登记删除、零记分窗口、旧代次晚到结果丢弃、例外新消息继续审核不计分、明确 RESUME_SCORING 恢复计分、15 个数据库表面与 3 个进程内表面的常规单轮清理（含 Q7 昵称缓存、Q29 主体级 Change Log 证书化、Q35 共用失效总线、Q42 身份缓存、Q51 score_outcomes）以及执行期间例外被解除时拒绝标 COMPLETED（EXCEPTION_NOT_CONFIRMED，C3）均已实测成立；但因 B8（技术日志已清理或步骤 4 续作时漏删候选词卡片仍标 COMPLETED，E60 R1、R2）与 B9（PARTIAL_FAILED 待续作期间新审核消息使后续重试永久触发外键失败，E60 R3），本行判为 failed。",
  },
  "VW-S019-INHERIT-001": {
    outcome: "satisfied",
    actual:
      "审查与门禁核对（E06、E07、E09、E11）：modules/data-lifecycle-service 全部文件只导入 @voxward/contracts 与本模块文件，无 process.env、定时器、网络或数据库直连；端口扩展位于 packages/contracts/src/ports/{data-request.ts,audit-log.ts}，CONTRACT_VERSION 仍为 \"1\"；db/{data-request-store.ts,subject-cleanup.ts,audit-log.ts} 只导入 contracts、drizzle-orm 与 db 分区；auth/data-routes.ts 与 app.ts 在组合层完成 HTTP 与端口装配。pnpm check:deps 检查 219 个文件 0 违规（E06），临时副本负面对照注入 4 处跨区导入全部检出（E09）。未引入新运行时依赖、托管服务或本机代理；远端部署演练由对应责任单承接。",
  },
  "VW-S019-INHERIT-009": {
    outcome: "satisfied",
    actual:
      "实测本单对 VW-R-009 的贡献（E05、E60 B3、C1、R2）：步骤 2 按 MESSAGE_TEXT、TRANSLATION、VALIDATED_JSON、ITEM_ID_MAP 四类证据逐项清理 technical_log_evidence，步骤 3 清理主体自有及仅经 task_id 关联的 technical_logs 行（C1），代次提升后旧 AI 任务的晚到提交在 DecisionService.commit 被 STALE_GENERATION 拒绝、不落库（B3）。本单不触及 Kiro/Crew 会话目录（归 S008/S009），提供方留存披露归政策单。SUB-036 在进程内候选词卡片续作与外键续作上的缺陷（B8、B9）属删除范围与生命周期状态问题，已判在 VW-S019-AC001、PARENT、INHERIT-013 与 INHERIT-017。",
  },
  "VW-S019-INHERIT-011": {
    outcome: "satisfied",
    actual:
      "审查与行为核对（E05、E11、E60 A4、B1、C1）：所有数据库写入均经 db/{data-request-store.ts,subject-cleanup.ts,audit-log.ts} 的 runShortTransaction 在服务器本地 SQLite（WAL、foreign_keys=ON）内同步完成，浏览器与 AI 无直写通道；迁移 0006 仅扩充 data_requests.request_kind（含 RESUME_SCORING）与 data_request_items.target_kind（含 SCORE_OUTCOME、CANDIDATE_CARD、CACHE）的 CHECK 约束，与 docs/data-dictionary.md 一致（schema.test.ts 33 项通过）。data_request_items 失败只记录固定错误码，Change Log 只写模板摘要或 DATA_REQUEST_CERTIFICATE，不复制待审正文。",
  },
  "VW-S019-INHERIT-012": {
    outcome: "satisfied",
    actual:
      "审查与 HTTP 实测（E11、E60 A1–A4）：POST /channels/:channelId/data/requests 与 POST .../execute 强制会话鉴权、CSRF 校验、同频道有效成员与 data.handle 能力；实测未登录 401、缺 CSRF 403、S003 Bearer 输出令牌 403、同频道 MODERATOR 403、同频道 CHANNEL_OWNER 403、跨频道 DATA_ADMIN 403，仅本频道 DATA_ADMIN 返回 200（A2、A4）；非法枚举与模式组合返回 400 INVALID_REQUEST，未验证 DELETE 返回 409 NOT_VERIFIED，ACCESS 请求调用 execute 返回 409 NOT_EXECUTABLE（A1、A3）；响应均带 cache-control: no-store，不回显凭据或观众原文。",
  },
  "VW-S019-INHERIT-013": {
    outcome: "failed",
    actual:
      "实测本单对 VW-R-013 的贡献（E60 A1–A4、B1–B5、C1–C3、R1–R4）：DATA_ADMIN 权限隔离、DELETE_DATA_ONLY 与 DELETE_AND_EXCEPT 区分、启动事务原子性、零重新记分窗口、DELETE_DATA_ONLY 不新增或撤销已有例外、Change Log 证书化不保存已删原值、例外中途解除时拒绝报 COMPLETED（EXCEPTION_NOT_CONFIRMED）均成立；但 B8 在技术日志已过期（R1）或步骤 4 续作（R2）时漏删 CandidateStore 中的观众来源候选词卡片却将删除标为 COMPLETED，B9 在 PARTIAL_FAILED 待续作期间遇到例外观众新消息审核落库后触发外键错误使续作永久失败（R3），违反「双部分完成才成功」「删适用全范围」与中断恢复要求。",
  },
  "VW-S019-INHERIT-014": {
    outcome: "satisfied",
    actual:
      "实测本单对 VW-R-014 的贡献（E60 B2–B5）：DELETE_AND_EXCEPT 在启动事务内即写入 score_exceptions（purpose_code=SCORING_EXCEPTION_PREFERENCE）并提升代次（B2）；例外生效期间 ScoringEngine 的实时裁决、身份跃迁、人工调分三类入口均抛 ScoringRefusedError(EXCEPTION_ACTIVE)，DecisionService.commit 落库裁决与投递但计分结果为 refused、score_ledger 零新增（B2、B4）；planRoute 对例外主体在白名单、噪声、高分并存时仍返回 REALTIME_REVIEW(reason=EXCEPTION)，基础规则 BLOCK 仍直接拦截（B4）；偏好标记不含旧分与昵称，名单编辑与普通删除不解除例外，仅已验证 RESUME_SCORING 请求可解除且不可重放（A4、B5）。清理续作缺陷 B8、B9 已判在 AC001、PARENT、INHERIT-013 与 INHERIT-017。",
  },
  "VW-S019-INHERIT-015": {
    outcome: "satisfied",
    actual:
      "对照交付边界与连接实测（E11、E60 A4、C1）：本单通过 AuditLogPort 的 certifySubjectChangeLogs、removeSubjectEvidence、removeSubjectTechnicalRows 操作两类日志，不改变 S016 日志分层职责；DATA_REQUEST_CHANGED 与 SCORE_EXCEPTION_CHANGED 摘要均由固定枚举与不透明 ID 构造，不含正文、昵称或分数；locateScope 纳入 subject:<subjectId> 链使无技术日志的主体级变更日志也被证书化（Q29，A4、C1）。完整跨模块验证仍由 VOXWARD-EPIC-006 承接。",
  },
  "VW-S019-INHERIT-016": {
    outcome: "satisfied",
    actual:
      "对照交付边界与 HTTP 实测（E11、E60 A4）：buildApp 仅创建一条 InvalidationBus 同时注入 createViewerCache 与数据删除路径（Q35，app.ts:81–101）；实测删除前经 /internal/channels/:id/logs/{technical/:logId,chains/:correlationId,change} 预热查看器缓存，执行 DELETE 后立即再次 GET：技术日志详情返回 404 NOT_FOUND，关联链技术步骤为空，主体链与事件链变更日志立即返回 DATA_REQUEST_CERTIFICATE（A4）。不新增公开或下游通用日志查询接口；完整验证由 VOXWARD-EPIC-006 承接。",
  },
  "VW-S019-INHERIT-017": {
    outcome: "failed",
    actual:
      "实测本单对 VW-R-017 的贡献（E60 B3、C1–C3、R1–R4）：代次提升阻止旧任务结果写回（B3），Q7 昵称缓存 forget、Q42 身份缓存 forget、Q51 score_outcomes 删除与查看器缓存同步失效在单轮常规路径成立（A4、C1），未挂载的表面返回 SURFACE_NOT_REGISTERED 置 PARTIAL_FAILED（executor.test.ts）；但 B8 因 readCleanupFacts 漏读 channel_events.correlation_id，在技术日志 7 天到期后（R1）或步骤 4 续作时（R2）保留了 CandidateStore 中的候选词副本却报告 COMPLETED，违反「未清完不报成功」与衍生结构清理要求；B9 在 PARTIAL_FAILED 续作时因未先扫子表而永久触发外键冲突无法完成清理（R3）。（生产组合根暂未实例化三类进程内缓存，默认 NO_SUBJECT_CACHES 不虚报已清理，接线归后续组合单，见 judgment.md N7。）",
  },
  "VW-S019-INHERIT-019": {
    outcome: "satisfied",
    actual:
      "对照交付边界审查与探针核对（E11、E60 C1）：本单通过 SubjectStore.id 精确按 (channelId, subjectId) 定位目标主体，不按昵称摘要匹配；实测同频道共享相同 64 位昵称哈希（SHARED_NICKNAME_HASH）的 SUBJECT 与 TWIN 中，删除 SUBJECT 后 TWIN 的事件、任务、裁决、投递、账本、score_outcomes、昵称变更、变更日志原文、候选词卡片与昵称缓存全部完好保留（C1）。跨模块隔离演示与完整验证由 VOXWARD-EPIC-006 承接。",
  },

  // ==========================================================================
  // VOXWARD-SUB-035 (13 rows: 13 satisfied, 0 failed)
  // ==========================================================================
  "VW-SUB035-AC001": {
    outcome: "satisfied",
    actual:
      "候选 d047636 实测（E02–E08、E60 B1–B5）：（1）单事务原子性：db/data-request-store.ts startDeletion 在同一 runShortTransaction 内依次执行 ScoreExceptionStore.ensureActive、SubjectStore.bumpGeneration、data_request_items 插入、RUNNING 状态更新与 Change Log 写入；注入重复项 ID 触发约束失败时，score_exceptions、processing_generation、data_request_items 与请求状态全部回滚为启动前（B1）；（2）零记分窗口与幂等：startDeletionRequest 返回同一同步段内，实时裁决、身份跃迁、人工调分均以 EXCEPTION_ACTIVE 被拒，重复调用返回 200 且代次保持 1、例外行不重复（B2）；（3）晚到结果丢弃与新消息继续审核：代次 0 旧任务提交返回 STALE_GENERATION 丢弃（B3），例外主体新消息在路由真值表走 REALTIME_REVIEW(EXCEPTION)、提交裁决落库且零计分（B4）；（4）普通删除与最小标记：DELETE_DATA_ONLY 不新增也不撤销已有例外，preferenceMarkerOf 仅含 purpose/subjectId/createdAt，仅已验证 RESUME_SCORING 能移除例外（B5）。",
  },
  "VW-SUB035-STORY": {
    outcome: "satisfied",
    actual:
      "实测 SUB-035 所承担部分（同事务确认例外/提升代次/登记删除、偏好最小标记、明确恢复计分请求）在 d047636 上全部成立（E05 transaction.test.ts 6 项、preference-marker.test.ts 5 项；E60 A1–A4、B1–B5）。偏好最小标记未在 data-lifecycle-service 内做二次 HMAC（主体键派生位于平台接入层 senderRefOf，仓库尚无 HMAC 密钥配置，见 judgment.md N8），不保存旧分数、昵称或正文。B8 与 B9 出在 SUB-036 交付的 db/subject-cleanup.ts 与 cleanup-executor.ts，不在 SUB-035 交付范围内；VOXWARD-STORY-019 的完整判据 VW-S019-AC001 另判为 failed。",
  },
  "VW-SUB035-PARENT": {
    outcome: "satisfied",
    actual:
      "复用 VW-SUB035-AC001 在 d047636 上的实测结果（E02–E08、E60 B1–B5）：SUB-035 承担的事务原子性、零记分窗口、代次拒绝晚到回调、例外路由与全计分入口阻断、偏好最小标记与 RESUME_SCORING 恢复路径全部成立。清理执行器与删除索引上的缺陷 B8、B9 出在 SUB-036（提交 cc8f101），SUB-035（提交 eedd0f9）未触及这些文件；Story 与 SUB-036 的 PARENT 行已据此判为 failed（同第 m6r1 批与第 m7b 批子单归责口径）。",
  },
  "VW-SUB035-INHERIT-001": {
    outcome: "satisfied",
    actual:
      "审查 SUB-035 交付文件（E06、E09、E11）：delete-with-exception.ts、preference-marker.ts、resume-scoring.ts、cleanup-targets.ts、requests.ts 只导入 @voxward/contracts 与本模块文件；DataRequestPort 扩展位于 packages/contracts/src/ports/data-request.ts；db/data-request-store.ts 只导入 contracts、drizzle-orm 与 db 分区。check:deps 219 文件 0 违规（E06），负面对照有效（E09）。",
  },
  "VW-SUB035-INHERIT-009": {
    outcome: "satisfied",
    actual:
      "实测 SUB-035 对 VW-R-009 的贡献（E60 B1–B3）：startDeletion 原子提升 subjects.processing_generation 并登记包括 4 类 TECHNICAL_LOG_EVIDENCE 与 TECHNICAL_LOG 在内的清理目标项；代次 0 的在途 AI 审核任务晚到提交返回 STALE_GENERATION 丢弃、不产生隐含结果副本。Kiro/Crew 会话清理归 S008/S009。",
  },
  "VW-SUB035-INHERIT-011": {
    outcome: "satisfied",
    actual:
      "审查与测试核对（E05、E11、E60 B1）：startDeletion、markItem、finishExecution、resumeException 均经 db/data-request-store.ts 的 runShortTransaction 在本地 SQLite 内执行；迁移 0006 与 docs/data-dictionary.md 同步扩充 CHECK 枚举（schema.test.ts 33 项通过）；故障注入回滚验证无半写入（B1），Change Log 不含待审正文。",
  },
  "VW-SUB035-INHERIT-012": {
    outcome: "satisfied",
    actual:
      "审查与实测（E11、E60 A1–A4）：delete-with-exception.ts、resume-scoring.ts 与 requests.ts 均先经 mayHandleData(actor) 校验 data.handle 能力并按 actor.channelId 限定查询，跨频道主体与请求一律返回 404，MODERATOR 与 CHANNEL_OWNER 返回 403 FORBIDDEN；RESUME_SCORING 禁止携带删除 mode（400 INVALID_REQUEST），未验证请求返回 409。",
  },
  "VW-SUB035-INHERIT-013": {
    outcome: "satisfied",
    actual:
      "实测 SUB-035 对 VW-R-013 的贡献（E60 B1、B2、B5）：DELETE_AND_EXCEPT 启动无记分窗口、单事务落库例外+代次+登记项、重复启动幂等；DELETE_DATA_ONLY 不自动新增也不撤销已有生效例外；Change Log 与偏好标记不保存旧分或原值。清理执行阶段的 B8、B9 归 SUB-036，本单未触及。",
  },
  "VW-SUB035-INHERIT-014": {
    outcome: "satisfied",
    actual:
      "实测 SUB-035 对 VW-R-014 的贡献（E60 A4、B2、B4、B5）：例外建立后实时/身份/人工计分入口与决策内联计分全部以 EXCEPTION_ACTIVE 拒绝，新消息仍经 REALTIME_REVIEW 正常审核投递；preferenceMarkerOf 保留固定用途码 SCORING_EXCEPTION_PREFERENCE；名单变更、身份事件、普通删除均不解除例外，仅已验证 RESUME_SCORING 请求可解除且单次有效。",
  },
  "VW-SUB035-INHERIT-015": {
    outcome: "satisfied",
    actual:
      "对照交付边界审查（E11、E60 B1、B5）：SUB-035 通过 change-row.ts 生成 DATA_REQUEST_CHANGED 与 SCORE_EXCEPTION_CHANGED（correlationId 为 null 或 subject:<subjectId>），摘要仅含固定枚举和请求 ID，不含观众原文、昵称或分数，保持两类日志契约与保留期策略。完整验证由 VOXWARD-EPIC-006 承接。",
  },
  "VW-SUB035-INHERIT-016": {
    outcome: "satisfied",
    actual:
      "对照交付边界审查（E11）：SUB-035 不改动日志查看器路由或查询权限，其写入的 subject:<subjectId> 与请求变更日志遵循既有 AuditLogPort 结构供查看器读取。完整跨模块验证由 VOXWARD-EPIC-006 承接。",
  },
  "VW-SUB035-INHERIT-017": {
    outcome: "satisfied",
    actual:
      "实测 SUB-035 对 VW-R-017 的贡献（E60 B1–B3）：删除启动先在同一事务提升主体代次使在途旧任务失效（STALE_GENERATION），并按注册表如实生成待清理存储面清单（未注册的进程内表面不伪造登记项）。SUB-036 在清理续作上的 B8、B9 不在本单交付范围。",
  },
  "VW-SUB035-INHERIT-019": {
    outcome: "satisfied",
    actual:
      "对照交付边界与实测（E11、E60 B1–B5）：SUB-035 全部状态读写均绑定 (channelId, subjectId) 主键而非昵称，对 TWIN 启动删除或建立例外不影响同频道共享昵称哈希的 SUBJECT，也不影响其它频道主体。完整验证由 VOXWARD-EPIC-006 承接。",
  },

  // ==========================================================================
  // VOXWARD-SUB-036 (13 rows: 8 satisfied, 5 failed)
  // ==========================================================================
  "VW-SUB036-AC001": {
    outcome: "failed",
    actual:
      "候选 d047636 实测（E05 executor.test.ts 5 项、execute-routes.test.ts 2 项；E60 A4、C1–C3、R1–R4）：常规单轮清理 18 个存储面、SCORE_LEDGER 注入失败置 PARTIAL_FAILED 后续作 COMPLETED、重复调用幂等、以及中途解除例外时以 EXCEPTION_NOT_CONFIRMED 保持 PARTIAL_FAILED（C1–C3）虽然通过，但两项实测缺陷直接违反本行 expected「双部分完成才成功；续作幂等；未清完不报告完成」：（1）B8（E60 R1、R2）：db/subject-cleanup.ts readCleanupFacts 仅读取 locateSubjectLogs(subjectId).correlationIds（只来自 technical_logs，漏掉 channel_events.correlation_id）；当技术日志已按 7 天保留期清理（R1），或第 1 轮在步骤 3 删完 technical_logs 后于步骤 4 CANDIDATE_CARD 失败并在第 2 轮续作时（R2），readCleanupFacts 返回 []，CANDIDATE_CARD 未清理观众消息派生的候选词卡片却标为 DONE，请求返回 COMPLETED（未清完却报告完成）；（2）B9（E60 R3）：第 1 轮在步骤 10 DELIVERY 标 DONE 后于步骤 11 VERDICT 失败（PARTIAL_FAILED），待续作期间例外观众发 1 条新消息经审核生成新 verdict 与 delivery，后续重试跳过已 DONE 的 DELIVERY，DELETE FROM verdicts 持续抛 SQLITE_CONSTRAINT_FOREIGNKEY，续作永久失败。探针内补齐事件 correlationId 与子表前扫（R4）后三项均恢复正常。",
  },
  "VW-SUB036-STORY": {
    outcome: "failed",
    actual:
      "SUB-036 承担 VW-S019-R001 中「清理评分账本/证据/映射/缓存/日志索引/任务/AI 内容；失败续作」。虽然 Q7（NicknameVerdictCache.forget）、Q29（subject:<id> 变更日志证书化）、Q35（buildApp 共用 InvalidationBus 即时淘汰查看器缓存）、Q42（IdentityTracker.forget）与 Q51 的 score_outcomes 删除均实测成立（E60 A4、C1），但 Q51 的候选词卡片清理与失败续作因 B8（漏读 channel_events.correlation_id 致到期或续作后漏删卡片仍标 COMPLETED，E60 R1、R2）和 B9（PARTIAL_FAILED 期间新审核消息致续作永久外键冲突，E60 R3）不成立，故本行与 VW-S019-AC001 均判为 failed。",
  },
  "VW-SUB036-PARENT": {
    outcome: "failed",
    actual:
      "复用 VW-S019-AC001 与 VW-SUB036-AC001 在候选 d047636 上的同次门禁与探针证据（E02–E08、E60 A1–A4、C1–C3、R1–R4）。因本单交付的 db/subject-cleanup.ts、db/audit-log.ts 与 modules/data-lifecycle-service/cleanup-executor.ts 存在 B8（未清完候选词卡片即报 COMPLETED）与 B9（PARTIAL_FAILED 续作触发外键死锁无法完成），违反 expected「双部分完成才成功，不保存隐藏分或原值凭证」及清理部分失败恢复要求，判为 failed。",
  },
  "VW-SUB036-INHERIT-001": {
    outcome: "satisfied",
    actual:
      "审查 SUB-036 交付文件（E06、E09、E11）：cleanup-executor.ts、cleanup-targets.ts、routes.ts 只导入 @voxward/contracts 与本模块文件；SubjectCacheHub 与 AuditLogPort 新方法定义在契约包；db/subject-cleanup.ts 与 db/audit-log.ts 留在 db 分区；进程内缓存失效方法各自留在 moderation-engine 与 platform-source 模块内，由组合层注入。check:deps 219 文件 0 违规（E06），负面对照检出全部 4 处违规（E09）。",
  },
  "VW-SUB036-INHERIT-009": {
    outcome: "satisfied",
    actual:
      "实测 SUB-036 对 VW-R-009 的贡献（E60 C1、R2）：cleanup-executor 按顺序先逐类删除 MESSAGE_TEXT、TRANSLATION、VALIDATED_JSON、ITEM_ID_MAP 四种 technical_log_evidence，再删除主体自有及经 task_id 关联的 technical_logs 行，并在步骤 12 TASK 前幂等补扫晚到的技术日志行，不留已删消息的获准 JSON 或映射证据。B8、B9 已判在 AC001、STORY、PARENT、INHERIT-013 与 INHERIT-017。",
  },
  "VW-SUB036-INHERIT-011": {
    outcome: "satisfied",
    actual:
      "审查与实测（E05、E11、E60 C1）：db/subject-cleanup.ts 的 cleanSurface 与 db/audit-log.ts 的三项删除/证书化方法均在独立 runShortTransaction 内操作本地 SQLite；失败步骤在 cleanup-executor.ts codeOf() 中仅提取大写错误码写入 data_request_items.error_code，驱动原始报错文本不落库也不写入日志。",
  },
  "VW-SUB036-INHERIT-012": {
    outcome: "satisfied",
    actual:
      "审查与 HTTP 实测（E11、E60 A2–A4）：auth/data-routes.ts 的 POST /channels/:channelId/data/requests/:requestId/execute 复用会话+CSRF+同频道成员鉴权，cleanup-executor.ts 入口再次执行 mayHandleData(actor) 校验；实测未登录 401、无 CSRF 403、输出令牌 403、MODERATOR 403、CHANNEL_OWNER 403、跨频道 DATA_ADMIN 403，响应头带 no-store 且 statusView 不回显内部主体主键。",
  },
  "VW-SUB036-INHERIT-013": {
    outcome: "failed",
    actual:
      "实测 SUB-036 对 VW-R-013 的贡献（E60 A4、C1–C3、R1–R4）：虽然常规单轮 18 面清理、TWIN 隔离、Change Log 证书化与 EXCEPTION_NOT_CONFIRMED 双部分判定（C1–C3）成立，但 B8 在技术日志到期后（R1）或步骤 4 续作时（R2）漏删 CandidateStore 中的候选词卡片仍返回 COMPLETED，B9 在 PARTIAL_FAILED 待续作期间遇到例外观众新消息审核落库后因外键约束永久卡在 PARTIAL_FAILED（R3），违反「双部分完成才成功」「删适用全范围」与中断恢复要求。",
  },
  "VW-SUB036-INHERIT-014": {
    outcome: "satisfied",
    actual:
      "实测 SUB-036 对 VW-R-014 的贡献（E60 A4、C1、C3）：清理完成后保留 score_exceptions 最小偏好标记并将 subject_scores 重置为 0（version+1），不保留历史高分或身份加成；DELETE_AND_EXCEPT 若在清理完成前例外已被解除，exceptionInEffect 返回 false 并置 PARTIAL_FAILED（EXCEPTION_NOT_CONFIRMED，C3）；execute 路由正确转发已验证的 RESUME_SCORING 请求（A4）。清理续作缺陷 B8、B9 已判在 AC001、STORY、PARENT、INHERIT-013 与 INHERIT-017。",
  },
  "VW-SUB036-INHERIT-015": {
    outcome: "satisfied",
    actual:
      "实测 SUB-036 对 VW-R-015 的贡献（E05 subject-chain.test.ts、E60 A4、C1）：db/audit-log.ts locateScope 同时检索技术日志链、channel_events 关联链与 subject:<subjectId> 主体链（Q29），certifySubjectChangeLogs 将命中行更新为 DATA_REQUEST_CERTIFICATE 且对已证书化行幂等跳过（重复执行不发多余失效事件）。完整验证由 VOXWARD-EPIC-006 承接。",
  },
  "VW-SUB036-INHERIT-016": {
    outcome: "satisfied",
    actual:
      "实测 SUB-036 对 VW-R-016 的贡献（E05 execute-routes.test.ts、E60 A4）：app.ts 将同一条 InvalidationBus 同时绑定到日志查看器缓存与删除依赖（Q35），每个删除/证书化步骤按实际变更发布 DELETED 事件（仅含 ID 列表）；HTTP 实测预热缓存后执行删除，技术日志详情即刻变 404、关联链技术行清空、变更日志即刻显示证书文本（A4）。完整验证由 VOXWARD-EPIC-006 承接。",
  },
  "VW-SUB036-INHERIT-017": {
    outcome: "failed",
    actual:
      "实测 SUB-036 对 VW-R-017 的贡献（E60 A4、C1–C3、R1–R4）：虽然 Q7 NicknameVerdictCache.forget、Q42 IdentityTracker.forget、Q51 score_outcomes 删除、Q35 查看器缓存失效及未注册表面报 SURFACE_NOT_REGISTERED 成立，但 B8 因 readCleanupFacts 漏读 channel_events.correlation_id，在技术日志到期后（R1）或步骤 4 续作时（R2）遗留 CandidateStore 候选词副本并虚报 COMPLETED，违反「未清完不报成功」；B9 在 PARTIAL_FAILED 续作时因缺少 VERDICT/CHANNEL_EVENT 的子表前扫而永久触发 SQLITE_CONSTRAINT_FOREIGNKEY（R3）。",
  },
  "VW-SUB036-INHERIT-019": {
    outcome: "satisfied",
    actual:
      "实测 SUB-036 对 VW-R-019 的贡献（E60 C1）：全部 15 个数据库存储面与 3 个进程内表面均按 (channelId, subjectId / platformSubjectKey / subject correlations) 精确隔离；同频道共享相同昵称哈希的 TWIN 在 SUBJECT 清理后保留全部数据库行、原文变更日志、候选词卡片与昵称缓存条目，且发布的失效事件不含任何 TWIN 标识（C1）。完整验证由 VOXWARD-EPIC-006 承接。",
  },
};
