'use strict';
// These are authored fictional scenarios. No files, input, AI requests, or user logging.
const scenarios = {
  labor: {
    title: '임금 상담 메모',
    source: '고객: 김민수\n연락처: 010-0000-0001\n월 기본급: 3,200,000원\n근무 기간: 2026.03.01 ~ 2026.10.31\n\n10월 연장근로수당이 지급되지 않았습니다.\n확인할 자료를 고객에게 요청하는 안내문을 작성해 주세요.',
    masked: '고객: [이름_1]\n연락처: [전화_1]\n월 기본급: 3,200,000원\n근무 기간: 2026.03.01 ~ 2026.10.31\n\n10월 연장근로수당이 지급되지 않았습니다.\n확인할 자료를 고객에게 요청하는 안내문을 작성해 주세요.',
    answer: '[이름_1]님, 10월 연장근로수당 확인을 위해\n근로계약서, 10월 급여명세서와 출퇴근 기록을\n준비해 주세요.\n\n월 기본급 3,200,000원과 실제 근무 내역을\n함께 확인하겠습니다.',
    restored: '김민수님, 10월 연장근로수당 확인을 위해\n근로계약서, 10월 급여명세서와 출퇴근 기록을\n준비해 주세요.\n\n월 기본급 3,200,000원과 실제 근무 내역을\n함께 확인하겠습니다.'
  },
  tax: {
    title: '거래 증빙 자료 요청',
    source: '고객: 이서연\n이메일: client@example.com\n사업자번호: 000-00-00001\n\n2026년 9월 거래 3건, 합계 5,500,000원의\n증빙이 누락되었습니다. 필요한 자료를 요청하는\n메일 초안을 작성해 주세요.',
    masked: '고객: [이름_1]\n이메일: [이메일_1]\n사업자번호: [사업자_1]\n\n2026년 9월 거래 3건, 합계 5,500,000원의\n증빙이 누락되었습니다. 필요한 자료를 요청하는\n메일 초안을 작성해 주세요.',
    answer: '받는 사람: [이메일_1]\n\n[이름_1]님, 2026년 9월 거래 3건에 대한\n세금계산서·영수증 등 거래 증빙과 이체 내역을\n보내주시기 바랍니다.\n\n현재 확인할 거래 합계는 5,500,000원입니다.',
    restored: '받는 사람: client@example.com\n\n이서연님, 2026년 9월 거래 3건에 대한\n세금계산서·영수증 등 거래 증빙과 이체 내역을\n보내주시기 바랍니다.\n\n현재 확인할 거래 합계는 5,500,000원입니다.'
  },
  law: {
    title: '보증금 반환 요청 메모',
    source: '의뢰인: 박지훈\n상대방: 최유나\n연락처: 010-0000-0002\n보증금: 10,000,000원\n계약 종료일: 2026.09.30\n\n계약이 종료되었으나 보증금이 반환되지 않았습니다.\n반환을 요청하는 안내문 초안을 작성해 주세요.',
    masked: '의뢰인: [이름_1]\n상대방: [이름_2]\n연락처: [전화_1]\n보증금: 10,000,000원\n계약 종료일: 2026.09.30\n\n계약이 종료되었으나 보증금이 반환되지 않았습니다.\n반환을 요청하는 안내문 초안을 작성해 주세요.',
    answer: '[이름_2]님께\n\n[이름_1]님과의 임대차계약은 2026.09.30에\n종료되었습니다. 미반환 보증금 10,000,000원의\n반환 일정과 방법을 회신해 주시기 바랍니다.\n\n발송 전 사실관계와 요청 내용을 검토해 주세요.',
    restored: '최유나님께\n\n박지훈님과의 임대차계약은 2026.09.30에\n종료되었습니다. 미반환 보증금 10,000,000원의\n반환 일정과 방법을 회신해 주시기 바랍니다.\n\n발송 전 사실관계와 요청 내용을 검토해 주세요.'
  }
};
const stages = [
  {label:'아직 외부로 보내지 않은 상태',badge:'시작',title:'먼저, 식별정보를 분리합니다.',field:null,foot:'다음 버튼으로 가명 처리된 내용이 어떻게 달라지는지 확인하세요.',button:'가명 처리 예시 보기'},
  {label:'AI에 전달할 내용 · 예시',badge:'식별정보 치환',title:'금액과 사실관계는 남깁니다.',field:'masked',foot:'설계상 이 단계까지 원문과 치환표는 사용자 기기에 둡니다. 아래 버튼은 실제 AI를 호출하지 않습니다.',button:'AI 초안 예시 보기'},
  {label:'가명으로 작성된 답변 · 예시',badge:'미리 작성한 초안',title:'AI는 가명을 기준으로 작성합니다.',field:'answer',foot:'이 답변은 흐름을 설명하기 위해 미리 작성했습니다. 실시간 AI 생성 결과가 아닙니다.',button:'원문 복원 예시 보기'},
  {label:'사용자 기기에서 복원할 결과 · 예시',badge:'복원 컨셉',title:'초안에는 원래 정보를 되돌립니다.',field:'restored',foot:'치환표를 이용한 자동 복원은 개발·검증 예정 기능입니다. 현재는 준비된 예시를 보여줍니다.',button:'다시 보기'}
];
let currentCase='labor', step=0;
const get=id=>document.getElementById(id);
function markedText(element,text){
  element.replaceChildren();
  for(const part of text.split(/(\[[^\]\n]+\])/g)){
    if(/^\[[^\]\n]+\]$/.test(part)){const mark=document.createElement('mark');mark.textContent=part;element.append(mark);}
    else element.append(document.createTextNode(part));
  }
}
function render(){
  const scenario=scenarios[currentCase], stage=stages[step];
  get('sourceTitle').textContent=scenario.title;
  get('sourceText').textContent=scenario.source;
  for(const [id,key] of [['stageLabel','label'],['stageBadge','badge'],['stageTitle','title'],['stageFoot','foot']])get(id).textContent=stage[key];
  markedText(get('stageText'),stage.field?scenario[stage.field]:'이름 · 연락처 · 식별번호는 가명으로\n금액 · 날짜 · 사실관계는 그대로\n\n원문 → 가명 처리 → AI 초안 → 원문 복원\n\n아래 버튼으로 각 단계를 확인하세요.');
  get('advance').textContent=stage.button;
  get('progress').textContent=`${step+1} / 4 단계 · 가상 자료 시연`;
  document.querySelectorAll('.steps li').forEach((item,i)=>{item.classList.toggle('active',i<=step);if(i===step)item.setAttribute('aria-current','step');else item.removeAttribute('aria-current');});
}
document.querySelectorAll('[data-case]').forEach(button=>button.addEventListener('click',()=>{
  currentCase=button.dataset.case;step=0;
  document.querySelectorAll('[data-case]').forEach(item=>{const active=item===button;item.classList.toggle('on',active);item.setAttribute('aria-pressed',String(active));});render();
}));
get('advance').addEventListener('click',()=>{step=(step+1)%stages.length;render();});
get('restart').addEventListener('click',()=>{step=0;render();});
render();
