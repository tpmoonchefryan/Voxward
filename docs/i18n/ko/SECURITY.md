> 참고: 이 문서는 [영문 원본](../../../SECURITY.md)을 정본으로 합니다 · `synced-to: a4604fcd310a91971ac82f36677957567ee67d70eaeac9942a499063d82e6d65`

# 보안 정책

[English](../../../SECURITY.md) · [简体中文](../zh-CN/SECURITY.md) · [日本語](../ja/SECURITY.md) · **한국어** · [Français](../fr/SECURITY.md)

## 지원 버전

보안 패치는 현재 `main` 브랜치와 최신 태그 릴리스(1.0 미만 개발 단계에서는 최신 `rc0.1.0` 계열)를 대상으로 제공합니다. 과거 프리릴리스 스냅샷에 대한 별도 백포트는 제공되지 않으므로 최신 커밋 또는 릴리스로 업그레이드하세요.

## 취약점 제보

보안 이슈는 반드시 **GitHub Private Vulnerability Reporting** 을 통해 비공개로 제보해 주세요:

- 제보 링크: https://github.com/tpmoonchefryan/Voxward/security/advisories/new

악용 코드, 자격 증명, 비공개 서버 로그 또는 패치되지 않은 취약점 세부 정보를 공개 Issues, Pull Requests 또는 Discussions 에 올리지 **마세요**.

신속한 분석을 위해 다음 정보를 포함해 주세요:

1. 영향을 받는 컴포넌트, 라우트 또는 WebSocket / API 계약.
2. 재현 단계 또는 최소한의 개념 증명(PoC).
3. 보안 영향(예: RBAC 우회, 비밀 노출, XSS/HTML 인젝션, CSRF 우회, 경로 순회).

관리자(`tpmoonchefryan`)는 완료된 제보에 대해 **72시간 이내** 최초 확인을 목표로 최선의 노력을 다합니다(독립 오픈소스 프로젝트이므로 공식 SLA 를 보장하지 않습니다). 유효한 제보는 비공개 임시 포크에서 수정한 뒤 조율하여 공개합니다.

## 보안 아키텍처 및 신뢰 경계

| 경계 | VoxWard 적용 사항 | 참고 문서 |
| --- | --- | --- |
| **세션 및 상태 변경 인증** | 운영 환경 `HttpOnly; Secure; SameSite=Strict` 세션 쿠키, 모든 변경 요청에 `x-csrf-token` 검증, 채널별 3상태 RBAC(`Deny > Grant > Not Set`). | [`docs/deployment/remote-deploy.md`](../../deployment/remote-deploy.md) |
| **하위 출력 읽기 전용 격리** | `/overlay/:channelId` 는 `vwo_*` 자격 증명을 URL 프래그먼트(`#cred=...`)에서만 읽고 쿼리 매개변수는 거부합니다. `output.feed` 권한만 허용되며 클라이언트 쓰기 프레임은 차단됩니다. | [`docs/protocol/output-native-v1.md`](../../protocol/output-native-v1.md) |
| **신뢰할 수 없는 텍스트 격리** | 시청자 메시지와 로그 문자열은 HTML 이스케이프 처리 후 `<bdi>` 래퍼 내부에 렌더링되어 양방향 제어 문자를 안전하게 격리합니다. | [`UntrustedText.tsx`](../../../apps/web/src/components/untrusted-text/UntrustedText.tsx) |
| **AI 작업자 데이터 최소화** | AI 프롬프트에는 임시 항목 ID(`item-*`)와 필요한 본문만 전달하며 OAuth 토큰, 서버 키, 고정 사용자 ID, 점수 원장은 절대 전달하지 않습니다. | [`runtime-ai-least-privilege.md`](../../security/runtime-ai-least-privilege.md), [`ai-retention-boundary.md`](../../security/ai-retention-boundary.md) |
| **샌드박스 Fail-Closed 가드** | `deploy/sandbox/start-sandbox.mjs` 는 실제 운영 비밀이 감지되면 시작을 거부하며, 운영 진입점 `main.ts` 는 `VOXWARD_SANDBOX_ENABLED` 를 거부합니다. | [`deploy/sandbox/README.md`](../../../deploy/sandbox/README.md), [`deploy/server/README.md`](../../../deploy/server/README.md) |
| **배포 운영자 책임** | TLS 종료, 루프백 리버스 프록시(`127.0.0.1:3000`), 외부 AI CLI 용 OS 계정 분리 및 호스트 NTP 시간 동기화는 셀프 호스팅 운영자가 관리합니다. | [`troubleshooting-and-quotas.md`](../../deployment/troubleshooting-and-quotas.md) |
