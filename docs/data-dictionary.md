# 数据字典（VoxWard SQLite）

范围：`apps/server/src/db/schema/` 中的 26 张表。其中 24 张由初始迁移 `apps/server/src/db/migrations/0000_initial.sql` 创建，页面账号与会话的 3 张由迁移 `apps/server/src/db/migrations/0001_auth_sessions.sql` 创建。迁移 `apps/server/src/db/migrations/0003_drop_subject_nickname_checks.sql` 删除了初始迁移创建的 `subject_nickname_checks`：昵称检查只保留进程内缓存（S006 Q8）。`apps/server/test/db/schema.test.ts` 会核对本文件：每张表的列名、可空性、索引与 CHECK 名称必须与 schema 一致。

约定：

- 时间为 ISO 8601 UTC 文本。分值、计数和序号为 INTEGER。布尔为 INTEGER，取值 0 或 1。
- 主键 `id` 为服务端生成的 UUID 文本。关联 ID（`correlation_id`）不含平台用户标识（提案 §12.2）。
- 内容分类：「无正文」表示不含消息正文；「受控内容」只允许出现在 `technical_log_evidence`；「凭据引用」只保存 `secretref:` 标识，不保存凭据明文。
- 保留期限是提案 §12.3 的初始建议。执行清理的作业属于后续 Story。

## 频道与权限

### `channels`

- 用途：某个主播在某个平台上的频道。
- 内容分类：无正文。
- 保留：与频道同寿命。

#### 列

| 列 | 类型 | 可空 | 说明 |
| --- | --- | --- | --- |
| `id` | TEXT | 否 | 主键。 |
| `platform` | TEXT | 否 | 平台标识，例如 `youtube`。 |
| `platform_channel_ref` | TEXT | 否 | 平台侧的频道标识。与 `platform` 组成唯一键。 |
| `display_name` | TEXT | 否 | 频道显示名。 |
| `created_at` | TEXT | 否 | 创建时间。 |
| `updated_at` | TEXT | 否 | 最后更新时间。 |

#### 索引与约束

| 名称 | 类别 | 说明 |
| --- | --- | --- |
| `channels_platform_ref_uq` | 唯一索引 | `(platform, platform_channel_ref)` 唯一。 |

### `deployment_settings`

- 用途：非密钥的部署配置。每个键保存一条 JSON 值。
- 内容分类：无正文。禁止写入密钥，凭据只能经 `credential_refs` 引用。
- 保留：随部署配置变更更新。

#### 列

| 列 | 类型 | 可空 | 说明 |
| --- | --- | --- | --- |
| `key` | TEXT | 否 | 主键，配置键名。 |
| `value_json` | TEXT | 否 | JSON 文本，必须通过 `json_valid`。 |
| `updated_at` | TEXT | 否 | 最后更新时间。 |

#### 索引与约束

| 名称 | 类别 | 说明 |
| --- | --- | --- |
| `ck_deployment_settings_json` | CHECK | `value_json` 必须是合法 JSON。 |

### `channel_members`

- 用途：VoxWard 页面账号在某个频道中的角色与日志查看权限。同一账号在同一频道只能有一条有效授权。
- 内容分类：无正文。`account_ref` 是 VoxWard 页面账号的内部引用，不是平台账号令牌。
- 保留：撤销后保留记录，用于审计。

#### 列

| 列 | 类型 | 可空 | 说明 |
| --- | --- | --- | --- |
| `id` | TEXT | 否 | 主键。 |
| `channel_id` | TEXT | 否 | 外键，指向 `channels.id`。 |
| `account_ref` | TEXT | 否 | VoxWard 页面账号的内部引用。 |
| `role` | TEXT | 否 | 取值 `CHANNEL_OWNER`、`MODERATOR`、`DATA_ADMIN`（提案 §2.1）。 |
| `log_access` | INTEGER | 否 | 默认 0。1 表示已单独授予日志查看器权限。 |
| `granted_at` | TEXT | 否 | 授权时间。 |
| `revoked_at` | TEXT | 是 | 撤销时间。为空表示有效。 |

#### 索引与约束

| 名称 | 类别 | 说明 |
| --- | --- | --- |
| `channel_members_active_uq` | 部分唯一索引 | `(channel_id, account_ref)` 在 `revoked_at IS NULL` 时唯一。 |
| `ck_channel_members_role` | CHECK | `role` 只能取上列三个值。 |
| `ck_channel_members_log_access` | CHECK | `log_access` 只能是 0 或 1。 |

### `credential_refs`

- 用途：指向加密保存的凭据。本表只保存引用。
- 内容分类：凭据引用。
- 保留：撤销后保留记录（`revoked_at`），便于审计。

#### 列

| 列 | 类型 | 可空 | 说明 |
| --- | --- | --- | --- |
| `id` | TEXT | 否 | 主键。 |
| `channel_id` | TEXT | 是 | 外键，指向 `channels.id`。为空表示部署级凭据。 |
| `purpose` | TEXT | 否 | 取值 `PLATFORM_OAUTH`、`PLATFORM_PROJECT_KEY`、`MODEL_ACCESS`、`OUTPUT_GRANT`。 |
| `secret_ref` | TEXT | 否 | 加密存储中的引用标识。必须以 `secretref:` 开头，长度 18 到 74，只含 `A-Z a-z 0-9 _ : -`。 |
| `created_at` | TEXT | 否 | 创建时间。 |
| `revoked_at` | TEXT | 是 | 撤销时间。 |

#### 索引与约束

| 名称 | 类别 | 说明 |
| --- | --- | --- |
| `credential_refs_secret_ref_uq` | 唯一索引 | `secret_ref` 唯一。 |
| `credential_refs_channel_idx` | 索引 | 按频道查询。 |
| `ck_credential_refs_purpose` | CHECK | `purpose` 只能取上列四个值。 |
| `ck_credential_refs_secret_ref` | CHECK | 检查 `secret_ref` 的前缀、长度与字符集，拒绝明文形式。 |

### `output_grants`

- 用途：下游输出端对某个频道的只读授权。每个授权持有自己的可撤销凭据引用。
- 内容分类：无正文。
- 保留：撤销后保留记录。

#### 列

| 列 | 类型 | 可空 | 说明 |
| --- | --- | --- | --- |
| `id` | TEXT | 否 | 主键。 |
| `channel_id` | TEXT | 否 | 外键，指向 `channels.id`。 |
| `output_kind` | TEXT | 否 | 输出协议标识，由版本化配置决定。 |
| `credential_ref_id` | TEXT | 否 | 外键，指向 `credential_refs.id`，且唯一。 |
| `scope` | TEXT | 否 | 取值 `ROOM_READ_ONLY`。 |
| `created_at` | TEXT | 否 | 创建时间。 |
| `revoked_at` | TEXT | 是 | 撤销时间。 |

#### 索引与约束

| 名称 | 类别 | 说明 |
| --- | --- | --- |
| `output_grants_credential_uq` | 唯一索引 | 每个凭据引用只属于一个输出端授权。 |
| `output_grants_channel_idx` | 索引 | 按频道查询。 |
| `ck_output_grants_scope` | CHECK | `scope` 只能是 `ROOM_READ_ONLY`。 |

## 主体与评分

### `subjects`

- 用途：频道内的观众主体。
- 内容分类：无正文。`platform_subject_key` 由服务端派生，不是平台用户 ID 原文。派生方式自定。
- 保留：由数据请求删除（后续 Story 实现）。

#### 列

| 列 | 类型 | 可空 | 说明 |
| --- | --- | --- | --- |
| `id` | TEXT | 否 | 主键。 |
| `channel_id` | TEXT | 否 | 外键，指向 `channels.id`。 |
| `platform_subject_key` | TEXT | 否 | 频道内的主体键，由服务端派生。 |
| `processing_generation` | INTEGER | 否 | 默认 0，不小于 0。删除或重算时递增，使旧代次的任务失效（提案 §7.2）。 |
| `created_at` | TEXT | 否 | 创建时间。 |

#### 索引与约束

| 名称 | 类别 | 说明 |
| --- | --- | --- |
| `subjects_channel_key_uq` | 唯一索引 | `(channel_id, platform_subject_key)` 唯一。 |
| `ck_subjects_generation` | CHECK | `processing_generation` 不小于 0。 |

### `subject_identities`

- 用途：平台提供的身份能力及其有效期（提案 §3.2）。同一身份事件只应用一次。
- 内容分类：无正文。
- 保留：随主体删除。

#### 列

| 列 | 类型 | 可空 | 说明 |
| --- | --- | --- | --- |
| `id` | TEXT | 否 | 主键。 |
| `subject_id` | TEXT | 否 | 外键，指向 `subjects.id`。 |
| `identity_kind` | TEXT | 否 | 取值 `CHANNEL_OWNER`、`MODERATOR`、`PAID_MEMBER`、`VERIFIED_ACCOUNT`、`UNKNOWN`。 |
| `source_event_ref` | TEXT | 否 | 身份事件的幂等引用，唯一。 |
| `effective_from` | TEXT | 否 | 生效时间。 |
| `effective_to` | TEXT | 是 | 失效时间。为空表示仍有效。 |
| `observed_at` | TEXT | 否 | 平台侧观测时间。 |

#### 索引与约束

| 名称 | 类别 | 说明 |
| --- | --- | --- |
| `subject_identities_source_uq` | 唯一索引 | `source_event_ref` 唯一，保证一次事件只应用一次。 |
| `subject_identities_subject_idx` | 索引 | 按主体查询。 |
| `ck_subject_identities_kind` | CHECK | `identity_kind` 只能取上列五个值。 |

### `subject_scores`

- 用途：主体当前分值。身份基准与行为调整分开记录，最终分值由服务端钳制后写入（提案 §5.2）。
- 内容分类：无正文。
- 保留：随主体删除。

#### 列

| 列 | 类型 | 可空 | 说明 |
| --- | --- | --- | --- |
| `subject_id` | TEXT | 否 | 主键，外键，指向 `subjects.id`。 |
| `identity_base_score` | INTEGER | 否 | 身份基准分，默认 0。 |
| `behavior_adjust_total` | INTEGER | 否 | 行为调整累计，默认 0。 |
| `current_score` | INTEGER | 否 | 钳制后的当前分值。 |
| `version` | INTEGER | 否 | 默认 0，不小于 0。乐观并发的版本号。 |
| `last_reward_at` | TEXT | 是 | 最近一次加分时间，用于冷却。 |
| `updated_at` | TEXT | 否 | 最后更新时间。 |

#### 索引与约束

| 名称 | 类别 | 说明 |
| --- | --- | --- |
| `ck_subject_scores_version` | CHECK | `version` 不小于 0。 |

### `score_ledger`

- 用途：每次实际计分的记录。幂等键保证同一裁决只计一次（提案 §5.1）。
- 内容分类：无正文。
- 保留：随主体删除（后续 Story 实现）。

#### 列

| 列 | 类型 | 可空 | 说明 |
| --- | --- | --- | --- |
| `id` | TEXT | 否 | 主键。 |
| `subject_id` | TEXT | 否 | 外键，指向 `subjects.id`。 |
| `idempotency_key` | TEXT | 否 | 幂等键，唯一。 |
| `reason_code` | TEXT | 否 | 取值 `COMPLIANT_REWARD`、`RULE_PENALTY`、`IDENTITY_BASE_CHANGE`、`MANUAL_CORRECTION`。 |
| `requested_delta` | INTEGER | 否 | 请求的分值变化。 |
| `actual_delta` | INTEGER | 否 | 钳制后实际生效的分值变化。 |
| `rule_version` | INTEGER | 是 | 产生本次计分的规则版本。 |
| `verdict_ref` | TEXT | 是 | 对应裁决的逻辑引用。无外键，见 design.md 第 7 节。 |
| `correlation_id` | TEXT | 是 | 关联 ID。 |
| `created_at` | TEXT | 否 | 记账时间。 |

#### 索引与约束

| 名称 | 类别 | 说明 |
| --- | --- | --- |
| `score_ledger_idempotency_uq` | 唯一索引 | `idempotency_key` 唯一。 |
| `score_ledger_subject_idx` | 索引 | `(subject_id, created_at)`。 |
| `ck_score_ledger_reason` | CHECK | `reason_code` 只能取上列四个值。 |

### `subject_nickname_changes`

- 用途：昵称变更记录，是数据删除索引的目标之一（提案 §11.3）。
- 内容分类：只保存摘要。
- 保留：随主体删除。

#### 列

| 列 | 类型 | 可空 | 说明 |
| --- | --- | --- | --- |
| `id` | TEXT | 否 | 主键。 |
| `subject_id` | TEXT | 否 | 外键，指向 `subjects.id`。 |
| `previous_nickname_hash` | TEXT | 是 | 变更前的摘要。首次记录时为空。 |
| `next_nickname_hash` | TEXT | 否 | 变更后的摘要，长度 64。 |
| `changed_at` | TEXT | 否 | 变更时间。 |

#### 索引与约束

| 名称 | 类别 | 说明 |
| --- | --- | --- |
| `subject_nickname_changes_subject_idx` | 索引 | 按主体查询。 |
| `ck_subject_nickname_changes_hash` | CHECK | 两个摘要的长度都为 64（前一个可为空）。 |

## 规则与名单

### `rule_versions`

- 用途：频道规则集的已发布版本。已发布的版本不原地修改。
- 内容分类：无正文。
- 保留：与频道同寿命。

#### 列

| 列 | 类型 | 可空 | 说明 |
| --- | --- | --- | --- |
| `id` | TEXT | 否 | 主键。 |
| `channel_id` | TEXT | 否 | 外键，指向 `channels.id`。 |
| `version` | INTEGER | 否 | 版本号，不小于 1。 |
| `rule_json` | TEXT | 否 | 规则集 JSON，必须通过 `json_valid`。 |
| `created_at` | TEXT | 否 | 发布时间。 |
| `created_by_ref` | TEXT | 否 | 发布者的内部引用。 |

#### 索引与约束

| 名称 | 类别 | 说明 |
| --- | --- | --- |
| `rule_versions_channel_version_uq` | 唯一索引 | `(channel_id, version)` 唯一。 |
| `ck_rule_versions_version` | CHECK | `version` 不小于 1。 |
| `ck_rule_versions_json` | CHECK | `rule_json` 必须是合法 JSON。 |

### `rule_terms`

- 用途：词条库（提案 §7.1「词条入库」）。撤销的词条保留行，并记录退役时间。
- 内容分类：无正文。词条本身是规则内容。
- 保留：与频道同寿命。

#### 列

| 列 | 类型 | 可空 | 说明 |
| --- | --- | --- | --- |
| `id` | TEXT | 否 | 主键。 |
| `channel_id` | TEXT | 否 | 外键，指向 `channels.id`。 |
| `term` | TEXT | 否 | 词条。 |
| `match_kind` | TEXT | 否 | 取值 `EXACT`、`NORMALIZED`、`CROSS_LANGUAGE_PHONETIC`、`CONSTRAINED_REGEX`（提案 §4.3）。 |
| `language` | TEXT | 否 | 适用语言。 |
| `group_code` | TEXT | 否 | 分组代码。 |
| `created_at` | TEXT | 否 | 入库时间。 |
| `created_by_ref` | TEXT | 否 | 入库者的内部引用。 |
| `retired_at` | TEXT | 是 | 退役时间。为空表示生效。 |

#### 索引与约束

| 名称 | 类别 | 说明 |
| --- | --- | --- |
| `rule_terms_active_uq` | 部分唯一索引 | `(channel_id, match_kind, language, term)` 在 `retired_at IS NULL` 时唯一。 |
| `ck_rule_terms_match_kind` | CHECK | `match_kind` 只能取上列四个值。 |

### `list_entries`

- 用途：频道内主体的黑名单或白名单（提案 §4.2、§7.1）。
- 约束（自定）：同一频道的同一主体，同时只有一条有效记录。
- 内容分类：无正文。
- 保留：与主体删除一起处理。

#### 列

| 列 | 类型 | 可空 | 说明 |
| --- | --- | --- | --- |
| `id` | TEXT | 否 | 主键。 |
| `channel_id` | TEXT | 否 | 外键，指向 `channels.id`。 |
| `subject_id` | TEXT | 否 | 外键，指向 `subjects.id`。 |
| `list_kind` | TEXT | 否 | 取值 `BLACKLIST` 或 `WHITELIST`。 |
| `created_at` | TEXT | 否 | 加入时间。 |
| `created_by_ref` | TEXT | 否 | 操作者的内部引用。 |
| `removed_at` | TEXT | 是 | 移除时间。为空表示有效。 |

#### 索引与约束

| 名称 | 类别 | 说明 |
| --- | --- | --- |
| `list_entries_active_uq` | 部分唯一索引 | `(channel_id, subject_id)` 在 `removed_at IS NULL` 时唯一。 |
| `ck_list_entries_kind` | CHECK | `list_kind` 只能取上列两个值。 |

### `score_exceptions`

- 用途：记分例外标记。它与黑名单相互独立，不是低分值（提案 §11.4）。
- 内容分类：最小偏好记录。
- 保留：仅为持续执行用户偏好而保留。

#### 列

| 列 | 类型 | 可空 | 说明 |
| --- | --- | --- | --- |
| `id` | TEXT | 否 | 主键。 |
| `channel_id` | TEXT | 否 | 外键，指向 `channels.id`。 |
| `subject_id` | TEXT | 否 | 外键，指向 `subjects.id`。 |
| `source_request_id` | TEXT | 是 | 外键，指向 `data_requests.id`。记录由哪个数据请求产生。 |
| `purpose_code` | TEXT | 否 | 取值 `SCORING_EXCEPTION_PREFERENCE`。 |
| `created_at` | TEXT | 否 | 设立时间。 |
| `removed_at` | TEXT | 是 | 取消时间。为空表示有效。 |
| `removed_reason_code` | TEXT | 是 | 取消原因的受控代码。 |

#### 索引与约束

| 名称 | 类别 | 说明 |
| --- | --- | --- |
| `score_exceptions_active_uq` | 部分唯一索引 | `(channel_id, subject_id)` 在 `removed_at IS NULL` 时唯一。重复请求不会产生第二条记录。 |
| `ck_score_exceptions_purpose` | CHECK | `purpose_code` 只能是 `SCORING_EXCEPTION_PREFERENCE`。 |

## 消息与任务状态

### `channel_events`

- 用途：平台消息的内部引用，记录去重、顺序和复盘状态（提案 §4.2、§5.4）。
- 内容分类：无正文。正文只存于 `technical_log_evidence`。
- 保留：随对应 Technical Log 证据的期限结束后清理（后续 Story 实现）。

#### 列

| 列 | 类型 | 可空 | 说明 |
| --- | --- | --- | --- |
| `id` | TEXT | 否 | 主键。 |
| `channel_id` | TEXT | 否 | 外键，指向 `channels.id`。 |
| `subject_id` | TEXT | 否 | 外键，指向 `subjects.id`（发送者）。 |
| `platform_message_ref` | TEXT | 否 | 平台消息标识，与频道一起构成去重键。 |
| `platform_order` | INTEGER | 否 | 平台顺序。 |
| `received_at` | TEXT | 否 | 接收时间。 |
| `correlation_id` | TEXT | 否 | 服务端生成的关联 ID，唯一。 |
| `event_version` | INTEGER | 否 | 默认 1，不小于 1。 |
| `settlement_state` | TEXT | 否 | 默认 `NONE`。取值 `NONE`、`UNSETTLED_FAST_PASS`、`SETTLED`、`UNSETTLED_EXPIRED`。 |
| `settlement_deadline_at` | TEXT | 是 | 复盘截止时间。 |
| `exception_marked` | INTEGER | 否 | 默认 0。1 表示处理时命中记分例外。 |
| `created_at` | TEXT | 否 | 登记时间。 |

#### 索引与约束

| 名称 | 类别 | 说明 |
| --- | --- | --- |
| `channel_events_dedupe_uq` | 唯一索引 | `(channel_id, platform_message_ref)` 唯一，用于去重。 |
| `channel_events_correlation_uq` | 唯一索引 | `correlation_id` 唯一。 |
| `channel_events_order_idx` | 索引 | `(channel_id, platform_order)`。 |
| `channel_events_settlement_idx` | 索引 | `(settlement_state, settlement_deadline_at)`，供复盘队列使用。 |
| `ck_channel_events_version` | CHECK | `event_version` 不小于 1。 |
| `ck_channel_events_settlement` | CHECK | `settlement_state` 只能取上列四个值。 |
| `ck_channel_events_exception` | CHECK | `exception_marked` 只能是 0 或 1。 |

### `tasks`

- 用途：绑定事件版本与数据处理代次的处理任务（提案 §7.2）。
- 内容分类：无正文。
- 保留：任务结束后清理（后续 Story 实现）。

#### 列

| 列 | 类型 | 可空 | 说明 |
| --- | --- | --- | --- |
| `id` | TEXT | 否 | 主键。 |
| `event_id` | TEXT | 否 | 外键，指向 `channel_events.id`。 |
| `channel_id` | TEXT | 否 | 外键，指向 `channels.id`。 |
| `kind` | TEXT | 否 | 取值 `REALTIME_REVIEW`、`PAID_TEXT_REVIEW`、`SETTLEMENT_REVIEW`。 |
| `status` | TEXT | 否 | 取值同 `TASK_STATUSES`：`QUEUED`、`RUNNING`、`PENDING_REVIEW`、`DONE`、`DISCARDED`。 |
| `event_version` | INTEGER | 否 | 创建任务时的事件版本，不小于 1。 |
| `processing_generation` | INTEGER | 否 | 创建任务时的主体代次，不小于 0。 |
| `deadline_at` | TEXT | 否 | 截止时间。 |
| `created_at` | TEXT | 否 | 创建时间。 |
| `updated_at` | TEXT | 否 | 最后状态变化的时间。 |

#### 索引与约束

| 名称 | 类别 | 说明 |
| --- | --- | --- |
| `tasks_event_kind_version_uq` | 唯一索引 | `(event_id, kind, event_version)` 唯一，保证任务创建幂等。 |
| `tasks_status_deadline_idx` | 索引 | `(status, deadline_at)`。 |
| `ck_tasks_kind` | CHECK | `kind` 只能取上列三个值。 |
| `ck_tasks_status` | CHECK | `status` 只能取 `TASK_STATUSES` 中的五个值。 |
| `ck_tasks_versions` | CHECK | `event_version` 不小于 1，`processing_generation` 不小于 0。 |

### `verdicts`

- 用途：事件的最终裁决。模型建议不在本表，只进入 Technical Log（提案 §8.4）。
- 内容分类：无正文。
- 保留：随事件删除。

#### 列

| 列 | 类型 | 可空 | 说明 |
| --- | --- | --- | --- |
| `id` | TEXT | 否 | 主键。 |
| `event_id` | TEXT | 否 | 外键，指向 `channel_events.id`。 |
| `task_id` | TEXT | 是 | 外键，指向 `tasks.id`。人工裁决可以没有任务。 |
| `seq` | INTEGER | 否 | 同一事件内的序号，不小于 1。 |
| `classification` | TEXT | 否 | 取值同 `INTERNAL_CLASSIFICATIONS`：`ALLOW_MEANINGFUL`、`ALLOW_NOISE`、`BLOCK`。 |
| `downstream` | TEXT | 否 | 取值同 `DOWNSTREAM_VERDICTS`：`ALLOW`、`BLOCK`。 |
| `source` | TEXT | 否 | 取值 `BASE_RULE`、`MODEL`、`FAST_PASS`、`MANUAL`。 |
| `is_current` | INTEGER | 否 | 默认 1。同一事件只允许一条为 1 的记录。 |
| `decided_at` | TEXT | 否 | 裁决时间。 |
| `decided_by_ref` | TEXT | 否 | `system` 或操作者的内部引用。 |

#### 索引与约束

| 名称 | 类别 | 说明 |
| --- | --- | --- |
| `verdicts_event_seq_uq` | 唯一索引 | `(event_id, seq)` 唯一。 |
| `verdicts_event_current_uq` | 部分唯一索引 | `event_id` 在 `is_current = 1` 时唯一。 |
| `ck_verdicts_seq` | CHECK | `seq` 不小于 1。 |
| `ck_verdicts_classification` | CHECK | `classification` 只能取内部分类的三个值。 |
| `ck_verdicts_downstream` | CHECK | `downstream` 只能取 `ALLOW` 或 `BLOCK`。 |
| `ck_verdicts_consistent` | CHECK | `classification` 为 `BLOCK` 时，`downstream` 必须为 `BLOCK`；否则为 `ALLOW`（提案 §4.1）。 |
| `ck_verdicts_source` | CHECK | `source` 只能取上列四个值。 |
| `ck_verdicts_current` | CHECK | `is_current` 只能是 0 或 1。 |

### `deliveries`

- 用途：裁决投递到输出端的意图与状态，按投递序号排列（提案 §6.3）。
- 内容分类：无正文。
- 保留：随事件删除。

#### 列

| 列 | 类型 | 可空 | 说明 |
| --- | --- | --- | --- |
| `id` | TEXT | 否 | 主键。 |
| `event_id` | TEXT | 否 | 外键，指向 `channel_events.id`。 |
| `verdict_id` | TEXT | 否 | 外键，指向 `verdicts.id`。 |
| `output_grant_id` | TEXT | 是 | 外键，指向 `output_grants.id`。 |
| `delivery_sequence` | INTEGER | 否 | 投递序号，不小于 1。 |
| `platform_order` | INTEGER | 否 | 平台顺序。 |
| `valid_until` | TEXT | 否 | 有效期限。超过后不再投递。 |
| `status` | TEXT | 否 | 取值 `PENDING`、`SENT`、`FAILED`、`EXPIRED`、`CANCELLED`。 |
| `attempts` | INTEGER | 否 | 投递尝试次数，默认 0。 |
| `updated_at` | TEXT | 否 | 最后状态变化的时间。 |

#### 索引与约束

| 名称 | 类别 | 说明 |
| --- | --- | --- |
| `deliveries_event_sequence_uq` | 唯一索引 | `(event_id, delivery_sequence)` 唯一。 |
| `deliveries_status_valid_idx` | 索引 | `(status, valid_until)`。 |
| `ck_deliveries_status` | CHECK | `status` 只能取上列五个值。 |
| `ck_deliveries_counters` | CHECK | `delivery_sequence` 不小于 1，`attempts` 不小于 0。 |

## 数据请求

### `data_requests`

- 用途：观众或操作者发起的数据请求，记录核验、执行和完成状态（提案 §11.2）。
- 内容分类：无正文。`scope_json` 只记录删除范围，不记录被删内容。
- 保留：完成后保留最小审计记录。

#### 列

| 列 | 类型 | 可空 | 说明 |
| --- | --- | --- | --- |
| `id` | TEXT | 否 | 主键。 |
| `channel_id` | TEXT | 否 | 外键，指向 `channels.id`。 |
| `subject_id` | TEXT | 是 | 外键，指向 `subjects.id`。核验前可能为空。 |
| `request_source` | TEXT | 否 | 取值 `VIEWER_REQUEST`、`OPERATOR_INITIATED`。 |
| `verification_state` | TEXT | 否 | 取值 `PENDING`、`VERIFIED`、`REJECTED`。 |
| `mode` | TEXT | 否 | 取值 `DELETE_DATA_ONLY`、`DELETE_AND_EXCEPT`（提案 §11.2 的两个选项）。 |
| `execution_state` | TEXT | 否 | 取值 `PENDING`、`RUNNING`、`COMPLETED`、`PARTIAL_FAILED`、`CANCELLED`。 |
| `scope_json` | TEXT | 否 | 删除范围的 JSON，必须通过 `json_valid`。 |
| `created_at` | TEXT | 否 | 提交时间。 |
| `verified_at` | TEXT | 是 | 核验时间。 |
| `completed_at` | TEXT | 是 | 完成时间。 |
| `updated_at` | TEXT | 否 | 最后更新时间。 |
| `handled_by_ref` | TEXT | 是 | 处理人的内部引用。 |

#### 索引与约束

| 名称 | 类别 | 说明 |
| --- | --- | --- |
| `data_requests_channel_state_idx` | 索引 | `(channel_id, execution_state)`。 |
| `ck_data_requests_source` | CHECK | `request_source` 只能取上列两个值。 |
| `ck_data_requests_verification` | CHECK | `verification_state` 只能取上列三个值。 |
| `ck_data_requests_mode` | CHECK | `mode` 只能取上列两个值。 |
| `ck_data_requests_execution` | CHECK | `execution_state` 只能取上列五个值。 |
| `ck_data_requests_scope_json` | CHECK | `scope_json` 必须是合法 JSON。 |

### `data_request_items`

- 用途：删除索引。每个删除目标一行。部分失败时保留明确状态，重试从待处理项继续（提案 §11.2、§12.4）。
- 内容分类：无正文。`target_ref` 是内部行标识。
- 保留：随数据请求。

#### 列

| 列 | 类型 | 可空 | 说明 |
| --- | --- | --- | --- |
| `id` | TEXT | 否 | 主键。 |
| `request_id` | TEXT | 否 | 外键，指向 `data_requests.id`。 |
| `target_kind` | TEXT | 否 | 删除目标类型，取值见下方 CHECK 约束。 |
| `target_ref` | TEXT | 否 | 目标行的内部标识。 |
| `item_state` | TEXT | 否 | 取值 `PENDING`、`DONE`、`FAILED`。 |
| `error_code` | TEXT | 是 | 失败原因的受控代码，不含内容。 |
| `attempted_at` | TEXT | 是 | 最近一次尝试的时间。 |
| `completed_at` | TEXT | 是 | 完成时间。 |

#### 索引与约束

| 名称 | 类别 | 说明 |
| --- | --- | --- |
| `data_request_items_target_uq` | 唯一索引 | `(request_id, target_kind, target_ref)` 唯一。 |
| `data_request_items_state_idx` | 索引 | `(request_id, item_state)`。 |
| `ck_data_request_items_kind` | CHECK | `target_kind` 取值：`SUBJECT`、`CHANNEL_EVENT`、`TASK`、`VERDICT`、`DELIVERY`、`SUBJECT_IDENTITY`、`SUBJECT_SCORE`、`SCORE_LEDGER`、`NICKNAME_CHECK`、`NICKNAME_CHANGE`、`LIST_ENTRY`、`SCORE_EXCEPTION`、`TECHNICAL_LOG`、`TECHNICAL_LOG_EVIDENCE`、`CHANGE_LOG`。 |
| `ck_data_request_items_state` | CHECK | `item_state` 只能取上列三个值。 |

## Change Log

### `change_logs`

- 用途：记录已发生的业务变更：配置、权限、名单、人工裁决、实际计分、数据删除和例外操作（提案 §12.1）。
- 内容分类：无正文，无密钥，不保存已删除数据的原值。
- 保留：初始建议 30 天（提案 §12.3）。

#### 列

| 列 | 类型 | 可空 | 说明 |
| --- | --- | --- | --- |
| `id` | TEXT | 否 | 主键。 |
| `channel_id` | TEXT | 是 | 外键，指向 `channels.id`。部署级变更为空。 |
| `occurred_at` | TEXT | 否 | 发生时间。 |
| `actor_kind` | TEXT | 否 | 取值 `ACCOUNT`、`SYSTEM`、`DEPLOYMENT_ADMIN`。 |
| `actor_ref` | TEXT | 否 | 操作者的内部引用，或 `system`。 |
| `change_kind` | TEXT | 否 | 变更类别，取值见下方 CHECK 约束。 |
| `summary` | TEXT | 否 | 必要的变更摘要，最多 500 个字符。 |
| `outcome` | TEXT | 否 | 取值 `SUCCEEDED`、`FAILED`、`PARTIAL`。 |
| `correlation_id` | TEXT | 是 | 关联 ID，用于跳转到同一处理链的 Technical Log。 |
| `expires_at` | TEXT | 否 | 到期时间。 |

#### 索引与约束

| 名称 | 类别 | 说明 |
| --- | --- | --- |
| `change_logs_channel_time_idx` | 索引 | `(channel_id, occurred_at)`。 |
| `change_logs_correlation_idx` | 索引 | `correlation_id`。 |
| `change_logs_expires_idx` | 索引 | `expires_at`，供清理作业使用。 |
| `ck_change_logs_actor` | CHECK | `actor_kind` 只能取上列三个值。 |
| `ck_change_logs_kind` | CHECK | `change_kind` 取值：`CONFIG_CHANGED`、`MEMBER_GRANTED`、`MEMBER_REVOKED`、`CREDENTIAL_CHANGED`、`OUTPUT_GRANT_CHANGED`、`LIST_CHANGED`、`TERM_CHANGED`、`RULE_VERSION_PUBLISHED`、`MANUAL_VERDICT`、`SCORE_CHANGED`、`SCORE_EXCEPTION_CHANGED`、`DATA_REQUEST_CHANGED`。 |
| `ck_change_logs_outcome` | CHECK | `outcome` 只能取上列三个值。 |
| `ck_change_logs_summary` | CHECK | `summary` 不超过 500 个字符。 |

## Technical Log

### `technical_logs`

- 用途：处理链中的每一步（提案 §12.2）。`id` 即 logId，`correlation_id` 串联同一消息或操作的全部步骤。
- 内容分类：元数据。消息内容只在 `technical_log_evidence` 中。
- 保留：初始建议 30 天。`subject_id` 使可关联用户的条目纳入数据请求。

#### 列

| 列 | 类型 | 可空 | 说明 |
| --- | --- | --- | --- |
| `id` | TEXT | 否 | 主键，即 logId。 |
| `channel_id` | TEXT | 否 | 外键，指向 `channels.id`。 |
| `correlation_id` | TEXT | 否 | 关联 ID。 |
| `sequence` | INTEGER | 否 | 同一关联 ID 内的顺序，不小于 0。 |
| `batch_id` | TEXT | 是 | 微批的共享执行标识。 |
| `task_id` | TEXT | 是 | 外键，指向 `tasks.id`。对应的处理任务。 |
| `attempt` | INTEGER | 是 | 重试序号，从 1 起。无重试时为空。 |
| `level` | TEXT | 否 | 日志级别，取值 `INFO`、`WARN`、`ERROR`，默认 `INFO`。 |
| `data_json` | TEXT | 是 | 有大小限制的阶段数据：合法 JSON，不超过 2000 字节。只含校验状态、失败字段位置等元数据，不含消息正文。 |
| `stage` | TEXT | 否 | 取值见下方 CHECK 约束（8 个阶段）。 |
| `status` | TEXT | 否 | 取值 `OK`、`FAILED`、`SKIPPED`、`TIMED_OUT`。 |
| `error_code` | TEXT | 是 | 错误代码。 |
| `provider_ref` | TEXT | 是 | 模型提供方标识。 |
| `model_ref` | TEXT | 是 | 模型名。 |
| `rule_template_version` | TEXT | 是 | 规则或提示模板版本。 |
| `latency_ms` | INTEGER | 是 | 耗时，毫秒，不小于 0。 |
| `subject_id` | TEXT | 是 | 外键，指向 `subjects.id`。可关联用户的条目。 |
| `created_at` | TEXT | 否 | 写入时间。 |
| `expires_at` | TEXT | 否 | 到期时间。 |

#### 索引与约束

| 名称 | 类别 | 说明 |
| --- | --- | --- |
| `technical_logs_chain_sequence_uq` | 唯一索引 | `(channel_id, correlation_id, sequence)` 唯一，支持按顺序展开关联条目。 |
| `technical_logs_subject_idx` | 索引 | `subject_id`，供数据请求定位。 |
| `technical_logs_task_idx` | 索引 | `task_id`，供按处理任务定位。 |
| `technical_logs_expires_idx` | 索引 | `expires_at`，供清理作业使用。 |
| `ck_technical_logs_stage` | CHECK | `stage` 取值：`INGEST`、`BASE_RULE`、`ROUTE`、`MODEL_CALL`、`JSON_VALIDATE`、`COMMIT`、`DELIVER`、`ERROR`。 |
| `ck_technical_logs_status` | CHECK | `status` 只能取上列四个值。 |
| `ck_technical_logs_numbers` | CHECK | `sequence` 不小于 0；`latency_ms` 为空或不小于 0。 |
| `ck_technical_logs_level` | CHECK | `level` 只能取上列三个值。 |
| `ck_technical_logs_attempt` | CHECK | `attempt` 为空或不小于 1。 |
| `ck_technical_logs_data` | CHECK | `data_json` 为空，或为合法 JSON 且字节数不超过 2000。 |

### `technical_log_evidence`

- 用途：必要的消息证据、译文、临时 itemId 映射和校验后的 JSON。全库中只有这张表保存消息内容。
- 内容分类：受控内容。
- 保留：初始建议最多 7 天。删除请求和用途终止优先于定时到期（提案 §12.3）。与元数据的期限分开，因此可以先删内容、保留元数据。

#### 列

| 列 | 类型 | 可空 | 说明 |
| --- | --- | --- | --- |
| `id` | TEXT | 否 | 主键。 |
| `log_id` | TEXT | 否 | 外键，指向 `technical_logs.id`。删除日志条目时级联删除。 |
| `evidence_kind` | TEXT | 否 | 取值 `MESSAGE_TEXT`、`TRANSLATION`、`ITEM_ID_MAP`、`VALIDATED_JSON`。 |
| `payload` | TEXT | 否 | 受控内容本身。 |
| `payload_bytes` | INTEGER | 否 | `payload` 的字节数，必须与内容一致。 |
| `expires_at` | TEXT | 否 | 到期时间。 |

#### 索引与约束

| 名称 | 类别 | 说明 |
| --- | --- | --- |
| `technical_log_evidence_log_idx` | 索引 | `log_id`。 |
| `technical_log_evidence_expires_idx` | 索引 | `expires_at`，供清理作业使用。 |
| `ck_technical_log_evidence_kind` | CHECK | `evidence_kind` 只能取上列四个值。 |
| `ck_technical_log_evidence_bytes` | CHECK | `payload_bytes` 等于 `payload` 的字节长度。 |
| `ck_technical_log_evidence_json` | CHECK | `VALIDATED_JSON` 的内容必须是合法 JSON。 |

## 页面账号与会话

### `auth_accounts`

- 用途：VoxWard 页面账号。频道成员授权通过 `channel_members.account_ref` 引用这里的 `id`。
- 内容分类：无正文。口令只以 scrypt 哈希保存，不保存明文。
- 保留：账号禁用后保留记录，用于审计。

#### 列

| 列 | 类型 | 可空 | 说明 |
| --- | --- | --- | --- |
| `id` | TEXT | 否 | 主键。 |
| `login_name` | TEXT | 否 | 登录名，唯一。 |
| `display_name` | TEXT | 否 | 显示名。 |
| `password_hash` | TEXT | 否 | scrypt 口令哈希，PHC 字符串 `$scrypt$ln=<log2 N>,r=<r>,p=<p>$盐$密钥`。新哈希为 `ln=17,r=8,p=1`，盐 16 字节，密钥 64 字节，均为无填充标准 base64。 |
| `created_at` | TEXT | 否 | 创建时间。 |
| `disabled_at` | TEXT | 是 | 禁用时间。为空表示可登录。 |

#### 索引与约束

| 名称 | 类别 | 说明 |
| --- | --- | --- |
| `auth_accounts_login_name_uq` | 唯一索引 | `login_name` 唯一。 |

### `auth_sessions`

- 用途：页面登录会话。
- 内容分类：无正文。`token_hash` 是会话令牌的 SHA-256，数据库不保存令牌原文，也不保存 CSRF 令牌（CSRF 令牌由会话令牌派生）。
- 保留：到期或撤销后保留记录，用于审计。

#### 列

| 列 | 类型 | 可空 | 说明 |
| --- | --- | --- | --- |
| `token_hash` | TEXT | 否 | 主键。会话令牌的 SHA-256 十六进制摘要。 |
| `account_id` | TEXT | 否 | 外键，指向 `auth_accounts.id`。 |
| `created_at` | TEXT | 否 | 创建时间。 |
| `expires_at` | TEXT | 否 | 到期时间。 |
| `revoked_at` | TEXT | 是 | 撤销时间。为空表示未撤销。 |

#### 索引与约束

| 名称 | 类别 | 说明 |
| --- | --- | --- |
| `auth_sessions_account_idx` | 索引 | `account_id`。 |

### `auth_output_tokens`

- 用途：下游只读输出凭据，每个令牌绑定一个频道。
- 内容分类：无正文。`token_hash` 是令牌的 SHA-256，原始令牌只在签发响应中返回一次。
- 保留：撤销后保留记录，用于审计。

#### 列

| 列 | 类型 | 可空 | 说明 |
| --- | --- | --- | --- |
| `id` | TEXT | 否 | 主键。撤销时使用。 |
| `channel_id` | TEXT | 否 | 外键，指向 `channels.id`。 |
| `scope` | TEXT | 否 | 取值 `ROOM_READ_ONLY`。 |
| `token_hash` | TEXT | 否 | 令牌的 SHA-256 十六进制摘要，唯一。 |
| `created_by_account_id` | TEXT | 否 | 签发人，指向 `auth_accounts.id`。 |
| `created_at` | TEXT | 否 | 签发时间。 |
| `revoked_at` | TEXT | 是 | 撤销时间。为空表示有效。 |

#### 索引与约束

| 名称 | 类别 | 说明 |
| --- | --- | --- |
| `auth_output_tokens_hash_uq` | 唯一索引 | `token_hash` 唯一。 |
| `auth_output_tokens_channel_idx` | 索引 | `channel_id`。 |
| `ck_auth_output_tokens_scope` | CHECK | `scope` 只能取上列一个值。 |
