# 마스키 사전예약·기업 문의 측정

## 관리 화면

- 프로젝트: [maskit-validation](https://supabase.com/dashboard/project/iizulggosuijcygfbivp)
- [Table Editor](https://supabase.com/dashboard/project/iizulggosuijcygfbivp/editor): public 스키마의 테이블·뷰 선택
- [SQL Editor](https://supabase.com/dashboard/project/iizulggosuijcygfbivp/sql/new): supabase/metrics.sql의 쿼리를 실행할 수 있음

| 테이블·뷰 | 확인할 내용 |
|---|---|
| maskit_leads | 신청 시각, 사전예약/기업 문의 구분, 이름·이메일·전화번호, 선택 직군, 회사·규모, 동의 버전, 유입 경로 |
| maskit_events | 페이지 방문, 버튼 클릭, 입력 시작, 제출 시도, 서버가 확인한 신규 제출 완료, 사용 흐름 단계 |
| maskit_funnel_report | 유입 경로·캠페인별 방문 세션, 버튼 클릭, 입력 시작, 신규 신청, 전환율 |
| maskit_cta_report | 한국 날짜·버튼 종류·위치별 클릭 횟수와 클릭 세션 수 |
| maskit_profession_report | 직군별 신규 신청 수(직군 미선택은 unknown) |

기본 집계 뷰는 is_test=true 행을 제외합니다. 신청자 테이블은 테스트 행도 보이므로 is_test=false로 필터하세요. 위 관리 화면은 Supabase 로그인 권한이 있는 사람만 사용합니다. 관리 권한을 팀원에게 줄 때는 필요한 범위만 초대하고, 개인정보가 들어 있는 신청 테이블의 CSV를 공개 링크나 GitHub에 올리지 마세요.

## 광고와 팀 테스트 링크

메타 광고 연결 URL:

https://hamchaelim.github.io/garigo-demo/?utm_source=meta&utm_campaign=maskit_launch

카카오 링크:

https://hamchaelim.github.io/garigo-demo/?utm_source=kakao&utm_campaign=maskit_launch

팀 테스트 링크(본 집계 제외):

https://hamchaelim.github.io/garigo-demo/?test=1&utm_source=team&utm_campaign=qa

현재 저장하는 UTM은 source와 campaign입니다. 광고 소재를 구분하려면 campaign 값을 maskit_labor_a, maskit_labor_b 등으로 다르게 지정하세요. URL에는 이름·이메일·전화번호를 넣지 않습니다. Meta Pixel은 연결하지 않았으며, 메타 광고 관리자에서 보는 광고 클릭 수와 이 사이트의 CTA 클릭 수는 서로 다른 지표입니다.

## 지표 해석

- page_views: 새로고침을 포함한 페이지 열림 횟수. visit_sessions: 브라우저 탭에 저장한 세션 ID 기준. 실제 사람 수가 아닙니다.
- cta_clicks: 사전예약 또는 기업 문의 버튼을 누른 전체 횟수. click_sessions: 해당 버튼을 누른 세션 수.
- form_start_sessions: 폼 필드 입력·선택이 시작된 세션 수. 폼을 열기만 하면 포함하지 않습니다.
- new_leads: 서버 저장에 성공한 신규 신청. 유형+소문자로 정리한 이메일 기준 중복을 제외합니다. 같은 이메일로 사전예약과 기업 문의를 하면 유형별 1건씩입니다.
- visit_to_submit_percent: 같은 유입 경로의 신청 완료 세션 / 방문 세션.
- click_to_submit_percent: 같은 유형·유입 경로의 신청 완료 세션 / 버튼 클릭 세션.
- 네트워크 오류·차단 프로그램·봇·브라우저 저장소 제한 등에 따라 측정이 누락되거나 부정확할 수 있습니다. 비정상 수치를 100%로 강제로 보정하지 않습니다.
- 신청은 수요·연락 의향 지표입니다. 이메일 소유를 검증하지 않으며 실제 제품 사용·지불 의향·유료 구매를 증명하지 않습니다.

## 저장·접근 구조

GitHub Pages(HTML/JS) → Supabase의 검증된 쓰기 함수 → 신청/측정 테이블.

브라우저에는 공개용 Publishable key만 들어 있습니다. Secret key/service_role 키는 사용하지 않습니다. 공개 방문자는 테이블과 보고서 뷰를 읽거나 직접 수정할 수 없고, 허용된 제출 함수만 호출할 수 있습니다. 이름·이메일·전화번호·회사명은 행동 이벤트에 넣지 않습니다. 필수 동의·선택 동의·필드 길이·유형·기본 제출 빈도 제한은 서버에서 다시 검사합니다.

현재 기본 빈도 제한은 세션 기준이므로 전문적인 봇 방어를 보장하지 않습니다. 스팸 문제가 발생하거나 광고 규모를 키울 때는 Edge Function과 CAPTCHA 등을 추가하고, 검증되지 않은 신청을 별도 정리하세요.

## 연결 상태와 개인정보 문의 이메일

config.js의 supabaseUrl과 publishableKey는 연결되어 있습니다. enabled가 true이면 행동 측정이 실행됩니다. privacyContact에 팀 문의 이메일이 설정되어야 일반 방문자의 신청 폼이 활성화됩니다. 문의 이메일이 없으면 제출은 비활성화되고 성공 메시지를 표시하지 않습니다. 문의 이메일은 공개 웹페이지에 표시됩니다.

신청 정보와 이벤트는 6개월이 지나면 maskit-retention 일일 Cron 작업으로 삭제합니다(사용자 승인 반영). 동의 버전은 2026-11-06-v1입니다. 동의 문구·수집 항목을 바꾸면 버전과 서버 검사를 함께 업데이트하세요.

## 실제로 검증한 항목

- 신규 사전예약·기업 문의가 각각 테스트 행으로 저장됨
- 동의 없는 제출·선택 동의 없는 전화번호·필수 회사 정보 없는 기업 문의가 서버에서 거부됨
- 동일 신청 재전송이 신규 신청 수를 늘리지 않음
- 공개 키로 신청 테이블·측정 테이블을 조회하거나 직접 쓰기 불가
- 브라우저에서 lead_submitted 성공 이벤트 위조 불가(서버 저장 트랜잭션에서만 생성)
- Cron 활성화 및 보고서 뷰의 공개 조회 권한 차단 확인
