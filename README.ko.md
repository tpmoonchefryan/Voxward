> 참고: 이 문서는 [영문 원본](./README.md)을 정본으로 합니다 · `synced-to: 457d240e8b0837101b230a1a54ac606b7500ddc3c4766c964c43a1e533c66360`

<div align="center">

# VoxWard

다국어 VTuber 방송을 위한 실시간 탄막·채팅 검토, 채널 내 신뢰 점수 관리 및 Super Chat 번역 미들웨어.

[English](./README.md) · [简体中文](./README.zh-CN.md) · [日本語](./README.ja.md) · **한국어** · [Français](./README.fr.md)

[![release](https://img.shields.io/badge/release-rc0.1.0-orange?style=flat-square)](https://github.com/tpmoonchefryan/Voxward/releases/tag/rc0.1.0)
[![license](https://img.shields.io/badge/license-Apache--2.0-lightgrey?style=flat-square)](./LICENSE)
[![kiroween](https://img.shields.io/badge/Kiroween%202026-Frankenstein-6f42c1?style=flat-square)](./docs/KIROWEEN.md)

[심사위원 빠른 시작](#kiroween-2026-심사위원-빠른-시작) · [아키텍처](#frankenstein-아키텍처) · [핵심 기능](#핵심-기능) · [셀프 호스팅](#셀프-호스팅-배포) · [문서 안내](#문서-안내)

</div>

> [!NOTE]
> **tpmoonchefryan** 이 **Apache-2.0** 라이선스로 **Kiroween 2026(Frankenstein 트랙)** 출품을 위해 개발했습니다. 초기 화면은 **Halloween 테마 + 영어(`en`)** 로 시작하며 UI에서 **5개 언어**(`English`, `简体中文`, `日本語`, `한국어`, `Français`)를 즉시 전환할 수 있습니다.

---

## 왜 VoxWard 인가요

다국어 VTuber 라이브 방송은 빠르게 흐르는 일반 채팅과 스트리머가 놓쳐서는 안 되는 유료 메시지(Super Chat)가 동시에 몰립니다. 기존 도구들은 단순 키워드 차단기나 무거운 CRM 봇 중 하나를 선택해야 했습니다.

VoxWard는 역할을 명확히 나눈 셀프 호스팅 미들웨어입니다:

- **신뢰 기반 고속 경로**: 결정적 규칙 엔진(일치, 부분 문자열, 정규화, 유사 발음 힌트, 제한된 정규식)과 채널 전용 SQLite WAL 신뢰 점수 원장으로 일반 채팅을 즉시 처리합니다.
- **격리된 AI 에스컬레이션**: 경계성 채팅과 유료 Super Chat은 임시 항목 ID(`item-*`)와 구조화된 JSON 스키마 검증만 사용하는 일회성 AI 작업으로 라우팅되며, OAuth 비밀 키나 고정 플랫폼 사용자 ID를 프롬프트로 전달하지 않습니다.
- **읽기 전용 출력 대상**: Pure Danmaku Dock(`/dock/:channelId`)과 투명 OBS 오버레이(`/overlay/:channelId#cred=vwo_...`)는 `ALLOW` / `WARD_BLOCKED` 프레임만 수신하며 내부 점수나 관리 제어 UI를 노출하지 않습니다.

---

## Kiroween 2026 심사위원 빠른 시작

심사위원은 Google Cloud 자격 증명, YouTube OAuth 토큰 또는 외부 AI API 키 없이 **무비밀(Zero-Secret) 샌드박스**를 실행할 수 있습니다(운영 비밀 값이 감지되면 fail-closed로 시작을 거부합니다):

```bash
pnpm install --frozen-lockfile
pnpm build
node deploy/sandbox/start-sandbox.mjs
```

브라우저에서 **`http://127.0.0.1:3100/sandbox`** 를 여세요:

1. 기본 **Halloween 테마 + 영어(`en`)** 로 열리며, 오른쪽 상단 메뉴에서 **5개 언어**(`en`, `zh-CN`, `ja`, `ko`, `fr`)와 **3가지 테마**(`halloween`, `light`, `dark`)를 전환할 수 있습니다.
2. **Live Stream Simulator** 로 연속 채팅 흐름과 카운트다운 SC 알약을 확인하거나 **`+ Push SC Now`** 를 눌러 즉시 테스트할 수 있습니다.
3. 6가지 사전 시나리오를 실행하고 4가지 데모 역할(**`Streamer View`, `Moderator View`, `Data Auditor`, `Stage Visitor`**)을 오가며 검토 워크벤치, Pure Dock, OBS 스테이지, 데이터 규정 준수 패널, 스냅샷 로그를 검증할 수 있습니다.

자세한 내용은 [Kiroween 2026 제출 가이드](./docs/KIROWEEN.md)를 참고하세요.

---

## Frankenstein 아키텍처

```mermaid
flowchart LR
    YT["YouTube Live Chat v3 / 합성 스트림"] --> IN["채널 수집 및 중복 제거"]
    IN --> BASE["결정적 규칙 (일치 / 포함 / 정규화 / 제한 정규식)"]
    BASE -->|차단| STORE["SQLite WAL 원장 및 검토 대기열"]
    BASE -->|통과| ROUTE{"점수 임계값 / 예외 / 유료 SC"}
    ROUTE -->|고속 허용| OUT["읽기 전용 출력 포트 (output-native-v1)"]
    ROUTE -->|AI 분류 및 번역| AI["격리 AI 어댑터 (Synthetic / Kiro CLI / OpenAI / Anthropic)"]
    AI -->|검증된 JSON 스키마만| STORE
    STORE -->|DELIVER / WARD_BLOCKED| OUT
    UI["다중 운영자 웹 콘솔"] <-->|세션 + CSRF + RBAC| STORE
    OUT -->|읽기 전용 WS / SSE| DOCK["Pure Danmaku Dock & OBS 투명 오버레이"]
```

---

## 핵심 기능

| 영역 | 주요 기능 | 핵심 경로 |
| --- | --- | --- |
| **5개 언어 및 테마 UI** | `/login`, `/sandbox`, 신규 계정 기본값 `halloween` + `en`; `/auth/shell-preferences` 연동 | [`apps/web/src/i18n/`](./apps/web/src/i18n/), [`VoxWardShell.tsx`](./apps/web/src/shell/VoxWardShell.tsx) |
| **실시간 검토 워크벤치** | 분할 대기열 검토, 일괄 판정, AI 후보 키워드 승격, 신뢰 점수 재판정 | [`ModerationPage.tsx`](./apps/web/src/pages/moderation/ModerationPage.tsx) |
| **Pure Dock & OBS 스테이지** | 관리 UI가 제거된 `/dock/:channelId` 와 URL 프래그먼트 `#cred=vwo_...` 기반 `/overlay/:channelId` | [`DockPage.tsx`](./apps/web/src/pages/dock/DockPage.tsx), [`Stage.tsx`](./apps/web/src/pages/overlay/Stage.tsx), [`output-native-v1.md`](./docs/protocol/output-native-v1.md) |
| **단어장 및 CSV 일괄 처리** | 추가 전용 분류 사전, 안전 정규식 검증, CSV 템플릿 다운로드 및 가져오기 | [`AdminPage.tsx`](./apps/web/src/pages/admin/AdminPage.tsx) |
| **3상태 RBAC 및 감사 로그** | `Deny > Grant > Not Set` 권한 합성 미리보기, 상관관계 체인 추적 및 `<bdi>` 텍스트 격리 | [`UsersPage.tsx`](./apps/web/src/pages/users/UsersPage.tsx), [`LogViewer.tsx`](./apps/web/src/pages/logs/LogViewer.tsx) |
| **데이터 규정 준수 및 삭제** | 시청자 조회, `DELETE_DATA_ONLY` / `DELETE_AND_EXCEPT` 요청 등록·검증·비동기 정리 실행 | [`DataPanel.tsx`](./apps/web/src/pages/data/DataPanel.tsx) |

---

## Built with Kiro

이 저장소에는 개발에 사용된 Kiro 산출물이 함께 포함되어 있습니다:

- **Steering 규칙**: [`.kiro/steering/`](./.kiro/steering/)
- **단계별 Specs 및 인수 기록**: [`.kiro/specs/`](./.kiro/specs/)
- **프로젝트 Skill 및 로컬 하네스**: [`.kiro/skills/mana-orchestrate/`](./.kiro/skills/mana-orchestrate/), [`.kiro/README.md`](./.kiro/README.md)

---

## 셀프 호스팅 배포

운영 배포는 HTTPS 리버스 프록시(Caddy 등) 뒤의 Linux 서버(`127.0.0.1:3000` 루프백 바인딩, `HttpOnly; Secure; SameSite=Strict` 쿠키, 일회성 소유자 부트스트랩 CLI)를 기준으로 합니다.

- 배포 템플릿: [`deploy/server/README.md`](./deploy/server/README.md)
- 원격 배포 매뉴얼: [`docs/deployment/remote-deploy.md`](./docs/deployment/remote-deploy.md)
- OBS 및 YouTube 연동: [`docs/obs/setup.md`](./docs/obs/setup.md), [`docs/deployment/youtube-credentials.md`](./docs/deployment/youtube-credentials.md)

### 검증 범위 및 외부 미검증 경계

`rc0.1.0` 기준 로컬에서 `pnpm check:deps`, `pnpm check:ds`, `pnpm typecheck`, `pnpm build`, `node scripts/deploy-check.mjs --env-file deploy/server/server.env.example`, `pnpm test -- --run`(187개 파일, 2,019개 테스트) 및 Playwright E2E 검증을 통과했습니다.

실제 외부 자격 증명이 필요하여 합성 검증 범위에 포함되지 않는 경계([`docs/deployment/troubleshooting-and-quotas.md`](./docs/deployment/troubleshooting-and-quotas.md), [`deploy/kiro-runtime/README.md`](./deploy/kiro-runtime/README.md) 참고):

- 격리된 Linux 계정에서 실제 `kiro-cli` 런타임 실행(`VW-S029-KIRO-REAL`) 및 실제 모델 지연·비용 벤치마크(`VOXWARD-SUB-050`).
- 운영자의 Google Cloud 프로젝트 OAuth 앱 검증 및 YouTube API 할당량·정책 확인.

---

## 문서 안내

| 문서 | 범위 | 언어 |
| --- | --- | --- |
| [`docs/KIROWEEN.md`](./docs/KIROWEEN.md) | Kiroween 2026 제출 개요, 아키텍처 및 Kiro 매핑 | English |
| [`SECURITY.md`](./SECURITY.md) | 지원 버전, GitHub Private Vulnerability Reporting 및 보안 경계 | [EN](./SECURITY.md) · [zh-CN](./docs/i18n/zh-CN/SECURITY.md) · [JA](./docs/i18n/ja/SECURITY.md) · [KO](./docs/i18n/ko/SECURITY.md) · [FR](./docs/i18n/fr/SECURITY.md) |
| [`PRIVACY.md`](./PRIVACY.md) | 셀프 호스팅 데이터 처리, AI 최소화 및 플랫폼 원본 경계 | [EN](./PRIVACY.md) · [zh-CN](./docs/i18n/zh-CN/PRIVACY.md) · [JA](./docs/i18n/ja/PRIVACY.md) · [KO](./docs/i18n/ko/PRIVACY.md) · [FR](./docs/i18n/fr/PRIVACY.md) |
| [`CONTRIBUTING.md`](./CONTRIBUTING.md) | 개발 환경, 검증 게이트 및 5개 언어 문서 동기화 규칙 | [EN](./CONTRIBUTING.md) · [zh-CN](./docs/i18n/zh-CN/CONTRIBUTING.md) · [JA](./docs/i18n/ja/CONTRIBUTING.md) · [KO](./docs/i18n/ko/CONTRIBUTING.md) · [FR](./docs/i18n/fr/CONTRIBUTING.md) |
| [`CODE_OF_CONDUCT.md`](./CODE_OF_CONDUCT.md) | 커뮤니티 행동 강령 및 비공개 신고 안내 | [EN](./CODE_OF_CONDUCT.md) · [zh-CN](./docs/i18n/zh-CN/CODE_OF_CONDUCT.md) · [JA](./docs/i18n/ja/CODE_OF_CONDUCT.md) · [KO](./docs/i18n/ko/CODE_OF_CONDUCT.md) · [FR](./docs/i18n/fr/CODE_OF_CONDUCT.md) |
| [`CHANGELOG.md`](./CHANGELOG.md) | 릴리스 변경 이력 (`rc0.1.0`) | English |
| [`LICENSE`](./LICENSE) & [`NOTICE`](./NOTICE) | Apache-2.0 라이선스 및 SIL OFL 1.1 폰트를 포함한 제3자 고지 | English (authoritative) |
