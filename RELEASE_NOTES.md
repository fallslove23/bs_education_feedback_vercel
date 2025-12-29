# Release Notes

## v1.1.0 - 권한 및 사용성 개선 (2025-12-29)

설문 관리 권한을 확장하고, 프로그램 삭제 시 데이터 정합성을 보장하며 사용자 UI의 명확성을 높였습니다.

### 🛡 권한 및 보안 (Permissions & Security)
- **팀장(director) 권한 확대:** 기존 관리자(admin, operator)만 가능했던 **설문 생성, 수정, 삭제** 권한을 **팀장(director)** 역할에도 부여하여 운영 효율을 높였습니다.
- **RLS 정책 업데이트:** `surveys`, `survey_questions`, `survey_sections` 테이블에 대한 Row Level Security 정책을 갱신했습니다.

### 🛠 데이터베이스 및 로직 (Database & Logic)
- **과정 삭제 시 세션 자동 삭제 (Cascade Delete):**
    - 과정(Program) 삭제 시 연결된 세션(Session) 데이터가 남아있어 삭제가 불가능했던 문제를 해결했습니다.
    - 이제 과정을 삭제하면 하위 세션 데이터도 안전하게 함께 삭제됩니다.

### 🎨 UI/UX 개선 (Interface Improvements)
- **삭제 경고 메시지 강화:** 과정 삭제 시 연결된 모든 데이터가 영구 삭제됨을 알리는 명확한 경고 문구를 추가했습니다.
- **설문 빌더 텍스트 수정:**
    - 템플릿 적용 버튼에서 세션명이 없을 경우 "null에 적용"으로 뜨던 오류를 수정했습니다. ("선택된 세션에 적용"으로 표시)
    - 세션 목록 등에서 이름이 비어있을 경우 "세션명 없음"으로 표기되도록 개선했습니다.

---

## v1.0.0 - Vercel Migration & Stability Update (2025-12-08)

이 릴리즈는 기존 Lovable 환경에서 Vercel로의 배포 환경 이관과 안정성/성능 강화를 위한 주요 업데이트를 포함합니다.

### 🚀 배포 및 인프라 (Deployment & Infrastructure)
- **Vercel 이관 완료:** Lovable에서 생성된 코드를 GitHub 리포지토리(`fallslove23/bs_education_feedback_vercel`)로 가져와 Vercel 배포 파이프라인을 구축했습니다.
- **도메인 연결:** 메인 도메인(`sseducationfeedback.info`)을 Vercel 프로젝트에 정식 연결했습니다.
- **동적 Base URL 적용:** 하드코딩된 도메인 주소를 제거하고, 접속 환경(`window.location.origin`)에 따라 동적으로 API 및 리다이렉트 URL이 생성되도록 수정했습니다.

### ✨ 새로운 기능 (New Features)
- **데이터 백업 도구 추가:** 관리자 대시보드에 **[데이터 백업]** 메뉴를 신설했습니다.
    - 주요 테이블(프로필, 설문, 응답 등)을 JSON 파일로 즉시 다운로드할 수 있습니다.
- **백업 가이드 문서:** 시스템 데이터 보호를 위한 `BACKUP_MANAGEMENT.md` 문서를 추가했습니다.

### ⚡ 성능 및 최적화 (Performance & Optimization)
- **Code Splitting (Lazy Loading) 적용:**
    - `React.lazy`와 `Suspense`를 도입하여 초기 로딩 시 모든 페이지 리소스를 다운로드하던 방식을 개선했습니다.
    - 이제 사용자가 페이지에 접근할 때 필요한 파일만 분할 로딩하여 앱 초기 구동 속도가 대폭 빨라졌습니다.

### 🛡 안정성 강화 (Stability)
- **TypeScript 타입 정의 개선:**
    - `dashboardRepository.ts` 등 주요 데이터 통신부에서 불안정한 `any` 타입을 제거했습니다.
    - Supabase가 자동 생성한 `Database` 타입을 적용하여 데이터 구조 변경 시 컴파일 에러를 바로 감지할 수 있도록 했습니다.

### 🐛 버그 수정 (Bug Fixes)
- **의존성 충돌 해결:** `tailwind-scrollbar`와 `tailwindcss` 버전 간의 피어 의존성(Peer Dependency) 충돌 문제를 해결하기 위해 라이브러리 버전을 조정했습니다. (`v4.0.2` -> `v3.1.0`)

---

### 📝 향후 권장 사항
- ** Supabase 리다이렉트 URL 관리:** 도메인 변경이나 로컬 테스트 환경 변경 시 Supabase 대시보드에서 `Redirect URLs`를 최신화해야 합니다.
- **정기 백업:** 새로 추가된 백업 도구를 활용하여 매 과목/과정 종료 시 데이터를 백업받는 것을 권장합니다.
