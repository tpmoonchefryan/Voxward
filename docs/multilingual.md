# Multilingual Moderation & Super Chat Pipeline

VoxWard supports multilingual live-stream moderation and Super Chat translation across open BCP 47 content languages while keeping the operator interface localized across 5 UI locales (`en`, `zh-CN`, `ja`, `ko`, `fr`).

## 1. Two Distinct Language Models

- **UI Locale (`VoxWardLocale`)**: Controls operator interface chrome, navigation, and structured status rendering (`en`, `zh-CN`, `ja`, `ko`, `fr`). In `SHELL_LOCALES` (`apps/web/src/i18n/shell.ts`), `zh-CN` emits HTML attribute `lang="zh-Hans"` while keeping `"zh-CN"` as the storage preference key for backward compatibility.
- **Content & Rule Language (`packages/contracts/src/ai/languages.ts`)**: Uses open canonicalized BCP 47 tags (for example `ja`, `en`, `zh-Hans`, `zh-Hant`, `ko`, `fr`, `pt-BR`, `es`, plus `"und"` for language-agnostic rules and `"mixed"` for mixed-script content). Valid tags such as `pt-BR` or `zh-Hant` are never downgraded to `"und"`.

## 2. Language-Scoped Wordlists & Safe Reading Rules

In `apps/server/src/modules/moderation-engine/`:

- **Language Detection & Scoping (`rules/language.ts`)**: `detectMessageLanguage` inspects script runs (`Hiragana`/`Katakana` -> `ja`, `Hangul` -> `ko`, `Han` -> `zh`, `Latin` -> `en`) unless an explicit channel or rule context overrides it.
- **Scoped Matching (`rules/engine.ts`)**: A rule with `language: "und"` (or unset) applies to all messages; a rule with a specific tag only matches messages in that language.
- **Fail-Closed Reading Rules (`READING_UNAVAILABLE`)**: Homophone/reading rules require a complete transliteration table (`available === true`). When transliteration coverage is missing (`available === false`) and `!readingComplete`, any applicable `reading` rule emits `READING_UNAVAILABLE` and fails closed instead of silently bypassing.

## 3. Multilingual Super Chat Translation (`VoxWardScBatchV2`)

- **Channel Policy (`ScLanguagePolicy`)**: Channels configure up to `SC_MAX_TARGET_LANGUAGES = 5` translation targets alongside allowed source languages (`parseScLanguagePolicy` in `@voxward/contracts`).
- **v2 Schema & Validation**:
  - `SC_BATCH_SCHEMA` (`version: 1`) remains intact for single-target compatibility.
  - `SC_MULTILINGUAL_BATCH_SCHEMA` (`version: 2`, `validateScMultilingualBatchResult`) outputs `translations: ScTranslationEntry[]` ordered per configured target language, with optional `sourceLanguage`.
  - Generated text safety checks (`validateScMultilingualBatch`) apply moderation rules per translation entry using its target `language` and strip only rejected cues without aborting clean target languages.
- **Compact Storage (`TRANSLATION` evidence)**:
  - Stored as `{ version: 2, sourceLanguage, translations: [...] }` inside `technical_log_evidence` with `EVIDENCE_MAX_BYTES.TRANSLATION = 16384`.
  - Parsed via `parseScTranslationEvidence` (`apps/server/src/db/sc-translation-payload.ts`) alongside legacy JSON and plain-text payloads.
- **Downstream Frame (`output-native-v1`)**: `DELIVER.display` carries `translation` (primary display translation) and `translations?: DisplayTranslation[]` across `/dock`, live moderation, and `/overlay` (`Intl.DisplayNames` labels).

## 4. Structured Audit Summaries & Operator Formats

- Change Log rows (`change_logs`) carry `summary_code` and `summary_params_json` (migration `0010_structured_change_logs.sql`). Privacy certification (`removeSubjectLogs` and `certifySubjectChangeLogs`) overwrites `summary_code = 'DATA_REQUEST_CERTIFICATE'` and clears `summary_params_json` to `NULL`.
- Adapter status updates emit typed `lastStatusCode` + `lastStatusParams`, and seeded categories/roles mark `builtIn: true`.
- `apps/web/src/i18n/format.ts` renders summaries, adapter statuses, drivers, actions, and built-in labels across all 5 locales via strongly-typed dictionaries without reverse-parsing localized text.

## 5. RFC-4180 CSV Term Import

- Client (`apps/web/src/pages/admin/csv.ts`) supports explicit encoding selection (`utf-8`, `gb18030`, `shift_jis`, `euc-kr`), delimiter selection (`,`, `;`, `\t`), and a 5-row RFC-4180 preview before upload.
- Server (`apps/server/src/auth/term-csv.ts`) parses RFC-4180 quotes, escaped `""`, BOM, and embedded newlines, validates `language` via `parseTermLanguage`, and returns structured row error codes (`UNTERMINATED_QUOTE`, `EMPTY_TERM`, `INVALID_MATCH_KIND`, `INVALID_LANGUAGE`, `INVALID_ACTION`, `EMPTY_NORMALIZED`, `INVALID_REGEX`).
