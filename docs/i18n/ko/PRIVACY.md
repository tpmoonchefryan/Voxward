> 참고: 이 문서는 [영문 원본](../../../PRIVACY.md)을 정본으로 합니다 · `synced-to: 81667441df0d5f9ca92af42e0016261642eb30c1d3e06543031c14cff091bc58`

# 개인정보 처리 및 데이터 경계

[English](../../../PRIVACY.md) · [简体中文](../zh-CN/PRIVACY.md) · [日本語](../ja/PRIVACY.md) · **한국어** · [Français](../fr/PRIVACY.md)

> VoxWard 는 프로젝트 작성자가 운영하는 SaaS 가 아니라 셀프 호스팅 미들웨어입니다. 인스턴스를 배포하는 방송인 또는 서버 관리자가 해당 인스턴스의 운영 주체가 됩니다.

## 1. 공식 텔레메트리 및 채널 간 추적 없음

- **프로젝트 텔레메트리 없음**: VoxWard 는 분석 통계, 사용량, 오류 보고 또는 채팅 로그를 프로젝트 작성자에게 전송하지 않습니다.
- **채널 단위 신뢰 점수**: 시청자 신뢰 점수와 점수 예외 플래그는 해당 셀프 호스팅 인스턴스 내 단일 플랫폼 채널에만 적용되며 채널·스트리머 간 평판 네트워크를 구축하지 않습니다.
- **브라우저 민감 데이터 미저장**: 테마 및 언어 설정은 계정별 서버 레코드(`/auth/shell-preferences`) 또는 게스트 React 메모리에만 유지되며 `localStorage` / `sessionStorage` 를 사용하지 않습니다.

## 2. 인스턴스가 처리하는 데이터

운영자 설정에 따라 서버 로컬 SQLite WAL 데이터베이스에는 검토와 감사에 필요한 최소 기록만 저장됩니다:

1. **검토 및 채널 설정**: 채널 ID, 단어장 카테고리·규칙, 수동 차단 목록, RBAC 역할 및 세션 해시.
2. **범위가 지정된 증거 및 로그**: 기술 파이프라인 로그(`Technical Log`), 변경 감사 로그(`Change Log`), 마스킹된 HTTP 연동 요약. 설정된 보존 기간(`changeLogDays`, `technicalLogDays`, `evidenceDays`)에 따라 관리됩니다.
3. **AI 데이터 최소화**: 모델 요청은 임시 ID(`item-*`)와 필요한 본문만 전송하며 고정 YouTube 사용자 ID, OAuth 비밀 키 또는 신뢰 점수 원장은 전송하지 않습니다.

세부 항목은 [`docs/policy/data-processing.md`](../../policy/data-processing.md) 및 [`docs/security/ai-retention-boundary.md`](../../security/ai-retention-boundary.md) 를 참고하세요.

## 3. 데이터 삭제 및 점수 예외 요청

권한이 있는 데이터 관리자는 대상을 조회(`GET /channels/:channelId/data/subjects`)하고 다음 중 하나를 등록·검증·실행할 수 있습니다:

- **`DELETE_DATA_ONLY`**: 로컬에 저장된 점수, 원장 기록, 캐시 및 관련 증거를 비동기 삭제 대상으로 등록합니다(향후 점수 규칙은 변경하지 않음).
- **`DELETE_AND_EXCEPT`**: 로컬 데이터 삭제와 함께 최소 **채널 내 점수 예외 표식**(채널 범위 + 식별 마커 + 플래그, 이전 점수나 닉네임 이력 미보존)을 기록하여 이후 채팅을 채점 없이 검토 큐로 보냅니다.

> [!IMPORTANT]
> **외부 사본 경계**: VoxWard 인스턴스 내 데이터 삭제는 YouTube 에 게시된 원본 메시지나 외부 AI 모델 제공업체의 보관 로그를 **삭제하지 않습니다**. 실제 자격 증명을 연결하기 전에 [`docs/policy/self-hosting-responsibilities.md`](../../policy/self-hosting-responsibilities.md) 를 검토하세요.

## 4. Kiroween 샌드박스 모드

`node deploy/sandbox/start-sandbox.mjs`(또는 `/sandbox`) 실행 시 저장소 내 합성 데모 데이터만 사용하며 실제 시청자 신원이나 외부 API 연결을 사용하지 않습니다.
