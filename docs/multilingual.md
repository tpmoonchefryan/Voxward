# Multilingual operator guide

VoxWard's interface languages are English, Simplified Chinese, Japanese, Korean and French. All five use a left-to-right UI layout. Bidi isolation for messages is not support for a right-to-left interface.

## Super Chat

In **Settings → Scoring & Runtime**, configure a language tag for the source or enter `auto`, then enter one to five comma-separated target tags (for example `en, fr-CA, ja`). The setting belongs to the channel, not the viewer or the operator's interface. An empty source with a target is automatic; leaving both fields blank keeps legacy behavior. The provider is responsible for detecting the source when requested; `und` indicates it could not determine it. Providers may support only a subset of tags. The default server ships with synthetic bindings, not an active live YouTube or AI connection.

Dock and Moderation show the original and all available approved translations with separate slang, reply and pronunciation fields. OBS and blivechat keep a single translated text field: the first available translation in the channel's target order. Unavailable or rejected translations are not replaced with another channel's settings or the UI locale. Historical text-only evidence remains readable. Amounts come from numeric metadata, display in the interface locale, and do not imply a ticker when there is no reliable tier.

## Moderation and review

Rules may declare a language tag. `und` on a rule means unscoped; `mixed` marks code-switching. Without reliable message metadata, kana and Hangul can provide a script-based hint; Latin-only and Han-only text remain undetermined. These hints do not attest that the message is in a specific language. A scoped match in unknown or mixed content that does not meet the scope can request review, not a direct penalty.

Normalization folds width and case, composes Hangul Jamo and preserves kana voicing. Accent folding is optional on normalized rules; regex rules match the composed copy. There is no general Cyrillic/Latin homoglyph or leet folding. Use intentionally scoped rule variants when appropriate. Bounded regex supports Unicode script properties (for example `\p{Script=Han}`); JavaScript `\b` is not a CJK word boundary. Homophone rules are review-only and use local reading tables, not an automatic pinyin conversion; incomplete readings request review instead of producing a partial match.

## Import wordlists

Download a template or paste a file with columns `term,category,matchKind,language`. Both commas and semicolons are accepted, including quoted fields, escaped quotes and newlines inside quoted text. Select UTF-8 (BOM accepted), Shift_JIS, or EUC-KR before loading a file. Missing language uses `und`; accepted match types include EXACT, CONTAINS, NORMALIZED and admitted REGEX. Valid rows are imported and invalid rows are reported by their starting line.

Saving or importing terms publishes the channel's blacklist rule group for review. Use **Wordlist history and preview** to test a sample without saving the text. Enter a language tag to check a specific scope. Loading history and restoring a previous list publishes a new version; it leaves other rule groups unchanged.

In the local synthetic sandbox, select `synthetic-demo` for Super Chat and configure target languages to exercise the approved output path. The output contains clearly marked synthetic text, not a machine translation.

## Deployment guides

- [OBS Browser Source and Dock](./obs/setup.en.md)
- [YouTube credentials and authorization](./deployment/youtube-credentials.en.md)
- [Troubleshooting and quotas](./deployment/troubleshooting-and-quotas.en.md)
- [Integration support matrix](./integrations/support-matrix.en.md)
- [Native read-only output and grants](./protocol/output-native-v1.en.md)
