'use strict';
(() => {
  const config=window.MASKIT_CONFIG||{};
  const key=String(config.publishableKey||'');
  const validUrl=/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(config.supabaseUrl||'');
  const connected=config.enabled===true&&validUrl&&key.startsWith('sb_publishable_');
  const enabled=connected&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(config.privacyContact||'');
  const uuid=()=>crypto.randomUUID();
  let sessionId=uuid();
  try {const saved=sessionStorage.getItem('maskit_session');if(saved&&/^[a-f0-9-]{36}$/.test(saved))sessionId=saved;else sessionStorage.setItem('maskit_session',sessionId);}catch{}
  const params=new URLSearchParams(location.search);
  const tag=value=>String(value||'').replace(/[^\p{L}\p{N}_ .:/-]/gu,'').slice(0,100);
  const source=tag(params.get('utm_source')||params.get('from')||'direct');
  const campaign=tag(params.get('utm_campaign')||'');
  const isTest=params.get('test')==='1';
  const dialog=document.getElementById('lead-dialog');
  const unavailable=document.getElementById('lead-unavailable');
  const started=new Set();
  let opener=null;
  const common={p_session_id:sessionId,p_source:source,p_campaign:campaign,p_is_test:isTest};
  async function rpc(name,body){
    if(!connected)throw new Error('not_configured');
    const response=await fetch(`${config.supabaseUrl}/rest/v1/rpc/${name}`,{
      method:'POST',headers:{'Content-Type':'application/json','apikey':key},
      body:JSON.stringify(body),keepalive:true,signal:AbortSignal.timeout(15000)
    });
    if(!response.ok)throw new Error('request_failed');
    return response.json();
  }
  function track(event,kind=null,placement='page'){
    if(!connected)return;
    void rpc('maskit_track_event',{...common,p_event_id:uuid(),p_event_name:event,p_lead_kind:kind,p_placement:placement}).catch(()=>{});
  }
  function openLead(kind,button){
    opener=button;
    track('cta_click',kind,button.dataset.placement||'page');
    document.querySelectorAll('.lead-form').forEach(form=>{form.hidden=form.dataset.kind!==kind;});
    document.getElementById('lead-dialog-title').textContent=kind==='preregistration'?'마스키 사전예약':'기업 도입 문의';
    document.getElementById('lead-dialog-intro').textContent=kind==='preregistration'?'출시 안내와 초기 사용 기회를 이메일로 받아보세요. 사전예약은 무료이며 결제가 발생하지 않습니다.':'도입을 검토 중인 업무와 조직 정보를 남겨주세요. 확인 후 이메일로 연락드리겠습니다.';
    if(!dialog.open)dialog.showModal();
    const first=dialog.querySelector('.lead-form:not([hidden]) input:not([type=hidden])');
    if(enabled)first?.focus();
  }
  document.querySelectorAll('[data-lead-type]').forEach(button=>button.addEventListener('click',()=>openLead(button.dataset.leadType,button)));
  document.getElementById('close-lead').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',event=>{if(event.target===dialog){const rect=dialog.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)dialog.close();}});
  dialog.addEventListener('close',()=>opener?.focus());
  unavailable.hidden=enabled;
  if(connected&&!enabled)unavailable.textContent='신청 안내 연락처를 설정하고 있습니다. 현재 제출은 비활성화되어 있으며, 입력 정보는 수집하지 않습니다.';
  if(!connected)document.querySelector('.measurement-note').textContent='신청 저장소 연결 전에는 접수와 행동 측정이 실행되지 않습니다. 고객 업무자료는 수집하지 않습니다.';
  if(isTest)unavailable.textContent=enabled?'테스트 모드입니다. 이 페이지의 제출과 클릭은 본 집계에서 제외됩니다.':connected?'테스트 모드 · 문의 연락처 설정 전에는 제출할 수 없습니다. 클릭은 테스트 기록으로 저장됩니다.':'테스트 모드 · 저장소 연결 전이므로 아직 접수·측정되지 않습니다.';
  if(isTest)unavailable.hidden=false;
  document.querySelectorAll('[data-privacy-contact]').forEach(el=>{if(config.privacyContact)el.textContent=config.privacyContact;});
  document.querySelectorAll('.lead-form').forEach(form=>{
    const fieldset=form.querySelector('fieldset');
    fieldset.disabled=!enabled;
    const status=form.querySelector('.lead-status');
    const button=form.querySelector('[type=submit]');
    if(!enabled)button.textContent='접수 준비 중';
    form.addEventListener('input',()=>{
      if(!started.has(form.dataset.kind)){started.add(form.dataset.kind);track('form_start',form.dataset.kind,'form');}
      status.textContent='';
    });
    form.addEventListener('submit',async event=>{
      event.preventDefault();
      if(!enabled||button.disabled)return;
      if(!form.reportValidity())return;
      const data=new FormData(form);
      if(String(data.get('website')||'')){status.textContent='입력 내용을 확인한 뒤 다시 시도해 주세요.';return;}
      const phone=String(data.get('phone')||'').trim().replace(/[\s()-]/g,'');
      if(phone&&!/^\+?[0-9]{8,15}$/.test(phone)){status.textContent='전화번호를 확인해 주세요. 숫자 8~15자리로 입력할 수 있습니다.';return;}
      if((phone||String(data.get('profession')||'unknown')!=='unknown')&&data.get('optional_consent')!=='on'){status.textContent='전화번호·직군을 남기려면 선택 항목 수집에 동의해 주세요. 선택 항목 없이도 신청할 수 있습니다.';return;}
      button.disabled=true;status.textContent='신청 내용을 저장하고 있습니다…';status.classList.remove('success');
      track('form_submit_attempt',form.dataset.kind,'form');
      try{
        const result=await rpc('maskit_submit_lead',{
          ...common,p_request_id:form.dataset.requestId||(form.dataset.requestId=uuid()),
          p_lead_kind:form.dataset.kind,p_name:String(data.get('name')||'').trim(),
          p_email:String(data.get('email')||'').trim().toLowerCase(),p_phone:phone,
          p_company:String(data.get('company')||'').trim(),p_company_size:String(data.get('company_size')||''),
          p_profession:String(data.get('profession')||'unknown'),p_consent:data.get('consent')==='on',
          p_optional_consent:data.get('optional_consent')==='on',p_consent_version:'2026-11-06-v1'
        });
        if(result?.ok!==true)throw new Error('not_saved');
        status.classList.add('success');status.textContent=form.dataset.kind==='preregistration'?'사전예약이 접수되었습니다. 출시 안내는 남겨주신 이메일로 드리겠습니다.':'기업 도입 문의가 접수되었습니다. 확인 후 이메일로 연락드리겠습니다.';
        form.reset();fieldset.disabled=true;button.textContent='접수 완료';
      }catch{
        status.classList.remove('success');status.textContent='저장 여부를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요. 같은 이메일의 중복 신청은 합산하지 않습니다.';
        button.disabled=false;
      }
    });
  });
  window.addEventListener('maskit:workflow',event=>{const step=Number(event.detail?.step);if(Number.isInteger(step)&&step>=0&&step<=3)track('workflow_step',null,`step_${step+1}`);});
  track('page_view');
})();
