# 이메일 발송 시스템 점검 및 개선안

## 1. 현황 점검 (Status Check)

### ✅ 정상 작동 기능
1.  **수신자 확장 로직 (Recipient Expansion)**
    *   `director`, `manager`, `instructor` 등의 역할(Role)을 실제 사용자 이메일 목록으로 변환하는 로직이 정상적으로 구현되어 있습니다.
    *   `user_roles`와 `profiles` 테이블을 조인하여 정확한 대상을 추출합니다.
    *   강사(`instructor`) 역할의 경우, 해당 설문과 연관된 강사들만 필터링하는 로직이 포함되어 있어 불필요한 발송을 방지합니다.

2.  **데이터 범위 제한 (Data Scoping)**
    *   **관리자/운영자 (Director/Manager)**: 모든 강사와 세션의 데이터를 포함한 '전체 요약(Full Scope)' 보고서를 받습니다.
    *   **강사 (Instructor)**: 본인이 담당한 세션(Session)의 데이터만 포함된 '개별 요약(Filtered Scope)' 보고서를 받습니다.
    *   이 로직은 `buildContent` 함수 내에서 `instructorId` 유무에 따라 응답(Response)을 필터링하여 안전하게 처리되고 있습니다.

3.  **중복 발송 방지 (Duplicate Prevention)**
    *   `sentEmails` Set을 사용하여 동일한 이메일 주소로 중복 발송되는 것을 차단하고 있습니다.
    *   중복 시도 발생 시 로그에 `duplicate_blocked` 상태로 기록됩니다.

4.  **이메일 콘텐츠 (Content Generation)**
    *   HTML 테이블 기반의 레이아웃으로, 세션별 만족도 요약과 문항별 상세 분석을 시각적으로 잘 표현하고 있습니다.
    *   점수가 낮은 항목(6점 이하)에 대해 빨간색 헤더로 경고(Warning) 표시를 하는 조건부 스타일링이 적용되어 있습니다.

5.  **로깅 (Logging)**
    *   발송 결과, 성공/실패 수, 역할별 통계 등을 `email_logs` 테이블에 상세히 기록하고 있어 추적 관리가 용이합니다.

### ⚠️ 주의 및 위험 요소 (Risks)
1.  **성능 이슈 (Performance)**
    *   현재 발송 로직은 **순차적(Sequential)**으로 처리되며, 각 발송마다 **600ms의 강제 대기(Sleep)** 시간이 있습니다.
    *   예: 수신자가 50명일 경우, 최소 30초 이상 소요됩니다. 100명이 넘어가면 Edge Function의 실행 시간 제한(Timeout)에 걸릴 위험이 매우 높습니다.
    *   API Rate Limit(초당 2건)을 준수하기 위한 조치이나, 대량 발송 시 확장성이 부족합니다.

2.  **코드 유지보수성 (Maintainability)**
    *   단일 파일(`index.ts`)이 900줄을 넘어 비대합니다.
    *   데이터 조회, 비즈니스 로직(점수 계산), HTML 생성, 이메일 발송 로직이 혼재되어 있습니다.

3.  **타입 안전성 (Type Safety)**
    *   `any` 타입이 광범위하게 사용되고 있어, 데이터 구조 변경 시 런타임 에러 발생 가능성이 있습니다.

---

## 2. 개선 제안 (Improvement Plan)

### 🚀 1단계: 성능 최적화 (가장 시급)

**대상**: `director`, `manager` 등 동일한 내용을 받는 수신자 그룹
**제안**:
*   **일괄 발송(Batch Sending)**: 관리자 그룹은 내용이 모두 동일하므로, 개별 발송 대신 **숨은 참조(BCC)** 또는 Resend의 다중 수신자 기능을 활용하여 한 번의 API 호출로 처리합니다.
    *   *효과*: 관리자가 10명이면 10번의 호출 -> 1번의 호출로 감소 (시간 6초 단축).

**대상**: `instructor` (개별 내용 수신자)
**제안**:
*   **병렬 처리(Concurrency)**: 순차 대기 대신, `Promise.all`과 청크(Chunk) 방식을 사용하여 병렬로 발송합니다.
    *   예: 3~5개씩 묶어서 동시에 발송하고, 묶음 간에만 1초 대기.
    *   *효과*: 전체 발송 시간을 1/3 ~ 1/5 수준으로 단축.

### 🛠 2단계: 코드 리팩토링 (유지보수성)

**제안**:
1.  **HTML 생성 로직 분리**:
    *   `buildContent` 함수 내부의 거대한 HTML 템플릿 문자열을 별도 파일(예: `email-template.ts`)로 분리합니다.
    *   `generateSurveyEmailHtml(data)` 형태의 순수 함수로 만들어 테스트 용이성을 확보합니다.
2.  **데이터 처리 로직 분리**:
    *   설문 통계 계산(평균, 분포 등) 로직을 별도 함수로 분리하여 재사용성을 높입니다.

### 👤 3단계: 사용자 경험(UX) 및 기능 확장

**제안**:
1.  **"나에게 테스트 발송" 기능 고도화**:
    *   현재 미리보기는 "첫 번째 강사"의 데이터만 보여줍니다.
    *   특정 강사를 선택하여 "그 강사의 시점에서 어떻게 보이는지" 관리자가 자신의 이메일로 받아볼 수 있는 기능 추가.
2.  **발송 실패 시 재시도(Retry) 메커니즘**:
    *   일시적인 네트워크 오류나 API 제한으로 실패한 건에 대해, 로그에만 남기지 않고 1~2회 재시도하는 로직 추가.

### 📝 적용 예시 (성능 최적화 로직)

```typescript
// 기존: 순차 처리
for (const email of targets) {
  await sendEmail(email);
  await sleep(600);
}

// 개선: 청크 단위 병렬 처리 (Batch/Chunking)
const CHUNK_SIZE = 5;
for (let i = 0; i < targets.length; i += CHUNK_SIZE) {
  const chunk = targets.slice(i, i + CHUNK_SIZE);
  // 5개를 동시에 발송 시작
  await Promise.all(chunk.map(email => sendEmail(email)));
  // 청크 간격 대기
  await sleep(1000); 
}
```
