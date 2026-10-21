// Offline preparation helper; no production dependency. Supports RFC-style CSV.
export function parseCsv(text) {
  const rows = []; let row = [], value = '', quoted = false;
  text = text.replace(/^\uFEFF/, '');
  for (let i=0;i<text.length;i++) {
    const c=text[i];
    if(c==='"') {
      if(quoted && text[i+1]==='"'){value+='"';i++;}else quoted=!quoted;
    } else if(c===',' && !quoted){row.push(value);value='';}
    else if((c==='\n'||c==='\r')&&!quoted){
      if(c==='\r'&&text[i+1]==='\n')i++;
      row.push(value);if(row.some(Boolean))rows.push(row);row=[];value='';
    }else value+=c;
  }
  if(quoted)throw Error('Unclosed CSV quote');
  if(value||row.length){row.push(value);rows.push(row);}
  return rows;
}

export const csvCell = value => '"'+String(value??'').replaceAll('"','""')+'"';
