> 참고: 이 문서는 [영문 원본](../../../CONTRIBUTING.md)을 정본으로 합니다 · `synced-to: 8109d13380bfcc2400e4bb2c6a5afe0d6d90121db45af63018d6e1b5070be1b9`

# 기여 가이드

[English](../../../CONTRIBUTING.md) · [简体中文](../zh-CN/CONTRIBUTING.md) · [日本語](../ja/CONTRIBUTING.md) · **한국어** · [Français](../fr/CONTRIBUTING.md)

VoxWard 개선에 관심을 가져주셔서 감사합니다! 모든 기여는 [Apache-2.0 라이선스](../../../LICENSE) 조건에 따라 제출됩니다.

## 1. 사전 요구 사항

- **Node.js**: `>= 24.0.0`
- **pnpm**: `12.x` (루트 `package.json` 의 `packageManager` 에 명시됨)

커밋된 락파일과 내장 `@tcrn/*@4.2.0` 아카이브를 사용해 오프라인으로 의존성을 설치합니다:

```bash
pnpm install --frozen-lockfile
```

## 2. 워크스페이스 구조

- `packages/contracts` (`@voxward/contracts`): 공유 타입, Zod 스키마 및 출력 프로토콜 정의(`output-native-v1`).
- `apps/server` (`@voxward/server`): Fastify API, WebSocket 출력 어댑터, SQLite WAL + Drizzle 스토리지, 채점·검토·생명주기 엔진 및 합성 샌드박스.
- `apps/web` (`@voxward/web`): React + Vite 프론트엔드(`@tcrn/ui-react` 4.2.0 컴포넌트, Halloween/Light/Dark 테마, 5개 언어 사전 `en` / `zh-CN` / `ja` / `ko` / `fr`).
- `vendor/tcrn-ds/4.2.0/`: 고정된 디자인 시스템 패키지 및 오프라인 검증 인덱스.

[`scripts/check-deps.mjs`](../../../scripts/check-deps.mjs) 경계 규칙은 도메인 모듈이 HTTP 조합 계층을 가져오거나 `@voxward/web` 이 서버 내부 구현을 참조하는 것을 금지합니다.

## 3. 코드 및 디자인 시스템 규칙

1. **Web Storage(`localStorage` / `sessionStorage`) 금지**: 인증된 UI 상태는 `/auth/shell-preferences` 를 통해 서버에 저장하고 비인증 상태는 React 메모리(`guest-prefs-context.tsx`)로 유지합니다.
2. **디자인 토큰만 사용**: `apps/web/src/styles/voxward.css` 에 raw hex/rgb/hsl 색상을 직접 쓰지 말고 `@tcrn/ui-tokens` CSS 변수를 사용하세요.
3. **하위 출력 순수성**: `/dock` 및 `/overlay` 화면에 내부 분류(`ALLOW_MEANINGFUL`, `ALLOW_NOISE`), 관리 버튼 또는 원본 사용자 ID 를 렌더링하지 마세요.
4. **실제 비밀 및 로컬 경로 커밋 금지**: OAuth 토큰, API 키, 이메일, 실제 시청자 데이터 또는 개발자 로컬 경로(`/home/...`)를 커밋하지 마세요.

## 4. PR 전 검증 게이트

PR 제출 전 아래 명령이 모두 종료 코드 `0` 으로 통과해야 합니다:

```bash
pnpm check:deps
pnpm check:ds
pnpm typecheck
pnpm build
node scripts/deploy-check.mjs --env-file deploy/server/server.env.example
pnpm test -- --run
```

라우트나 셸 UI 레이아웃을 변경한 경우 로컬 프리뷰 서버를 대상으로 `tcrn-ds-check --layout-url` 도 함께 실행하세요.

## 5. 5개 언어 문서 동기화 정책

루트 디렉터리의 **영문 문서**가 정본입니다:

- `README.md` -> `README.{zh-CN,ja,ko,fr}.md`
- `SECURITY.md` -> `docs/i18n/{zh-CN,ja,ko,fr}/SECURITY.md`
- `PRIVACY.md` -> `docs/i18n/{zh-CN,ja,ko,fr}/PRIVACY.md`
- `CONTRIBUTING.md` -> `docs/i18n/{zh-CN,ja,ko,fr}/CONTRIBUTING.md`
- `CODE_OF_CONDUCT.md` -> `docs/i18n/{zh-CN,ja,ko,fr}/CODE_OF_CONDUCT.md`

모든 번역 문서 상단에는 영문 원본이 정본임을 명시하고 영문 파일의 `synced-to: <sha256>` 을 기록해야 합니다. 위 영문 문서 5종을 수정할 때는 같은 PR 안에서 4개 번역본과 `synced-to` SHA-256 값을 함께 갱신하세요.

## 6. 커뮤니티 및 보안 채널

- 행동 강령: [`CODE_OF_CONDUCT.md`](../../../CODE_OF_CONDUCT.md)
- 취약점 제보: [`SECURITY.md`](../../../SECURITY.md) (GitHub Private Vulnerability Reporting 전용)
