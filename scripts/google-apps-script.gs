// Paste into a bound Apps Script project. Configure Script Properties:
// SHEET_ID, INTEGRATION_SECRET. Deploy Web App: execute as owner, access Anyone.
const COLUMNS = ['lead_id','submitted_at','name','phone','email','city','postal_code','homeowner','property_type','insulation_need','project_timeline','intent','qualification_status','qualification_pending','consent','utm_source','utm_medium','utm_campaign','utm_content','utm_term','fbclid','gclid','landing_path','referrer','source','campaign','ad','creative','utm_id','call_status','notes'];
const QUALIFICATION_STATUSES = ['qualified','pending','low_intent','rejected'];
function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    const b = JSON.parse(e.postData.contents), props = PropertiesService.getScriptProperties();
    if (!props.getProperty('INTEGRATION_SECRET') || b.token !== props.getProperty('INTEGRATION_SECRET')) throw Error('Unauthorized');
    lock.waitLock(10000);
    if (b.action === 'loginAttempt') {
      if(typeof b.key!=='string'||!/^[a-f0-9]{64}$/.test(b.key))throw Error('Invalid key');
      const bucket=Math.floor(Date.now()/900000);
      let state=JSON.parse(props.getProperty('LOGIN_WINDOW')||'null');
      if(!state||state.bucket!==bucket)state={bucket,total:0,ips:{}};
      state.total++;
      if(state.total>100){props.setProperty('LOGIN_WINDOW',JSON.stringify(state));return json({ok:true,allowed:false});}
      state.ips[b.key]=(state.ips[b.key]||0)+1;
      props.setProperty('LOGIN_WINDOW',JSON.stringify(state));
      return json({ok:true,allowed:state.ips[b.key]<=5});
    }
    const book=SpreadsheetApp.openById(props.getProperty('SHEET_ID'));
    const sheet=book.getSheetByName('Leads')||book.insertSheet('Leads');
    if(sheet.getLastRow()===0)sheet.appendRow(COLUMNS);
    const values=sheet.getDataRange().getDisplayValues();
    if(JSON.stringify(values[0])!==JSON.stringify(COLUMNS))throw Error('Column mismatch');
    const rows=values.slice(1).map(row=>Object.fromEntries(COLUMNS.map((k,i)=>[k,row[i]||''])));
    if(b.action==='list')return json({ok:true,leads:rows});
    if(b.action==='append'){
      const lead=b.lead;
      if(!lead||!COLUMNS.every(k=>typeof lead[k]==='string'&&lead[k].length<=1000)||!/^[0-9a-f-]{36}$/i.test(lead.lead_id)||!QUALIFICATION_STATUSES.includes(lead.qualification_status)||!['true','false'].includes(lead.qualification_pending)||(lead.qualification_status==='pending'&&lead.qualification_pending!=='true')||(lead.qualification_status==='qualified'&&lead.qualification_pending!=='false')||lead.consent!=='true'||lead.call_status!=='new')throw Error('Invalid lead');
      const prior=rows.find(r=>r.lead_id===lead.lead_id);
      if(prior)return json({ok:true,lead:prior});
      const row=sheet.getLastRow()+1;
      // Plain-text cells plus escaped formula prefixes. Never overwrite existing rows.
      const range=sheet.getRange(row,1,1,COLUMNS.length);range.setNumberFormat('@');range.setValues([COLUMNS.map(k=>safe(lead[k]))]);
      SpreadsheetApp.flush();return json({ok:true,lead});
    }
    if(b.action==='update'){
      if(!['new','contacted','appointment','unreachable','refused'].includes(b.call_status)||typeof b.notes!=='string'||b.notes.length>1000)throw Error('Invalid update');
      const matches=rows.map((r,i)=>r.lead_id===b.lead_id?i+2:0).filter(Boolean);
      if(matches.length!==1)throw Error('Lead not found or ambiguous');
      sheet.getRange(matches[0],COLUMNS.indexOf('call_status')+1,1,2).setNumberFormat('@').setValues([[b.call_status,safe(b.notes)]]);
      SpreadsheetApp.flush();return json({ok:true});
    }
    throw Error('Invalid action');
  }catch(err){return json({ok:false});}finally{if(lock.hasLock())lock.releaseLock();}
}
function safe(v){return /^[\s]*[=+@\-\t\r]/.test(v)?"'"+v:v;}
function json(v){return ContentService.createTextOutput(JSON.stringify(v)).setMimeType(ContentService.MimeType.JSON);}
