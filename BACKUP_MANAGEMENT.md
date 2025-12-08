# 백업 및 복구 관리 프로세스 (Backup & Recovery Management)

이 문서는 시스템 데이터의 안전한 보관과 비상시 복구를 위한 절차를 정의합니다.

## 1. 백업 전략 (Backup Strategy)

이 프로젝트는 **GitHub(코드)**와 **Supabase(데이터)**, 그리고 **Vercel(배포)**을 사용하고 있습니다. 각 계층별 백업 전략은 다음과 같습니다.

### 1.1 소스 코드 (Source Code)
*   **저장소:** GitHub
*   **백업 방식:** Git을 통한 버전 관리. 모든 변경 사항은 커밋 기록으로 남습니다.
*   **관리 방법:** `main` 브랜치는 항상 프로덕션(배포) 상태를 유지하며, 개발은 별도 브랜치에서 진행 후 병합(Merge)합니다.

### 1.2 데이터베이스 (Database)
Supabase는 PostgreSQL 기반이며 두 가지 백업 방식을 사용합니다.

#### A. 자동 백업 (Point-in-Time Recovery)
*   Supabase Pro 플랜 이상 사용 시, Supabase는 자동으로 매일 백업을 수행하며, 특정 시점으로 데이터를 복구할 수 있는 PITR(Point-in-Time Recovery) 기능을 제공합니다.
*   **복구 가능 기간:** 플랜에 따라 다름 (보통 7일~30일)
*   **관리 위치:** [Supabase Dashboard](https://supabase.com/dashboard) -> Project -> Database -> Backups

#### B. 수동 데이터 내보내기 (Manual Export) - 권장
중요한 데이터(설문 결과, 강사 정보 등)는 정기적으로 관리자가 직접 다운로드하여 별도 보관하는 것을 권장합니다.
*   **도구:** 관리자 대시보드 내 "데이터 백업" 기능 (`/dashboard/backup`)
*   **주기:** 매 교육 과정 종료 후 또는 월 1회
*   **형식:** JSON 또는 CSV

## 2. 복구 절차 (Recovery Process)

### 2.1 데이터 손실 시 (Data Loss)
1.  **경미한 손실 (실수로 삭제한 경우):** 
    *   관리자 대시보드의 백업 기능으로 받아둔 JSON 파일이 있다면, 이를 참조하여 수동으로 데이터를 다시 입력합니다.
    *   또는 Supabase 대시보드의 SQL Editor를 통해 `INSERT` 쿼리로 복구합니다.
2.  **치명적 손실 (DB 전체 오류):**
    *   Supabase의 'Restore' 기능을 사용하여 문제가 발생하기 전 시점으로 데이터베이스를 되돌립니다. (주의: 복구 시점 이후의 데이터는 사라질 수 있음)

### 2.2 서비스 접속 불가 시 (Service Down)
1.  **Vercel 배포 문제:**
    *   Vercel 대시보드에서 이전 배포(Deployment) 버전으로 'Rollback' 또는 'Redeploy'를 실행합니다.
2.  **소스 코드 문제:**
    *   GitHub에서 문제가 없던 마지막 커밋으로 코드를 되돌리고(`git revert` 또는 `git reset`), Vercel에 다시 푸시합니다.

## 3. 정기 점검 체크리스트
- [ ] Supabase 백업 설정이 활성화되어 있는지 확인 (월 1회)
- [ ] 관리자 대시보드에서 주요 테이블(설문, 응답)을 다운로드하여 로컬 PC나 안전한 클라우드(Google Drive 등)에 저장 (과정 종료 시)
- [ ] GitHub 저장소가 최신 상태인지 확인
