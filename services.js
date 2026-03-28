/* ── SERVICES ──────────────────────────────────────────────────────────────── */
/* Extracted from var code string. Plain JS only — no JSX, no React.            */
/* Loaded before the Babel-compiled code block.                                  */

function fmtK(v,cur){
  if(!v&&v!==0)return"—";
  if(v>=1000000)return(cur||"")+Math.round(v/100000)/10+"M";
  if(v>=1000)return(cur||"")+Math.round(v/1000)+"k";
  return(cur||"")+v.toString();
}

function encodeRfc822(to,subject,body){
  var lines=["To: "+to,"Subject: "+subject,"Content-Type: text/plain; charset=UTF-8","MIME-Version: 1.0","",""].concat(body.split("\
"));
  var raw=lines.join("\r\
");
  try{return btoa(unescape(encodeURIComponent(raw))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");}catch(e){return btoa(raw).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");}
}
/* ── GOOGLE DRIVE SYNC ──────────────────────────────────── */
var DRIVE_FILE_NAME="pcrm_sync.json";
async function driveFindFile(tok){
  var url="https://www.googleapis.com/drive/v3/files?q=name%3D%27"+DRIVE_FILE_NAME+"%27+and+trashed%3Dfalse&fields=files(id,name,modifiedTime)";
  console.log("Drive search URL:",url);
  var res=await fetch(url,{headers:{"Authorization":"Bearer "+tok}});
  if(!res.ok){var errTxt=await res.text();console.log("Drive search failed:",res.status,errTxt);return null;}
  var data=await res.json();
  console.log("Drive search result:",JSON.stringify(data));
  return(data.files&&data.files.length>0)?data.files[0]:null;
}
async function driveLoad(tok){
  var file=await driveFindFile(tok);
  if(!file)return null;
  var res=await fetch("https://www.googleapis.com/drive/v3/files/"+file.id+"?alt=media",{headers:{"Authorization":"Bearer "+tok}});
  if(!res.ok)return null;
  var data=await res.json();
  data._driveFileId=file.id;
  data._driveModified=file.modifiedTime;
  return data;
}
async function driveSave(tok,payload){
  var file=await driveFindFile(tok);
  var body=JSON.stringify(payload);
  var boundary="pcrm_boundary_"+Date.now();
  var metadata=JSON.stringify({name:DRIVE_FILE_NAME,mimeType:"application/json"});
  var multipart="--"+boundary+"\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n"+metadata+"\r\n--"+boundary+"\r\nContent-Type: application/json\r\n\r\n"+body+"\r\n--"+boundary+"--";
  if(file){
    var res=await fetch("https://www.googleapis.com/upload/drive/v3/files/"+file.id+"?uploadType=multipart",{method:"PATCH",headers:{"Authorization":"Bearer "+tok,"Content-Type":"multipart/related; boundary="+boundary},body:multipart});
    if(!res.ok){var err=await res.text();console.log("Drive PATCH failed:",res.status,err);}
    return res.ok;
  }else{
    var res2=await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",{method:"POST",headers:{"Authorization":"Bearer "+tok,"Content-Type":"multipart/related; boundary="+boundary},body:multipart});
    if(!res2.ok){var err2=await res2.text();console.log("Drive POST failed:",res2.status,err2);}
    else{var created=await res2.clone().json();console.log("Drive file created:",created);}
    return res2.ok;
  }
}

function sendViaGmail(tok,to,subject,body){
  var raw=encodeRfc822(to,subject,body);
  return fetch("https://www.googleapis.com/gmail/v1/users/me/messages/send",{method:"POST",headers:{"Authorization":"Bearer "+tok,"Content-Type":"application/json"},body:JSON.stringify({raw:raw})}).then(function(r){if(!r.ok){return r.json().then(function(err){var msg=err&&err.error&&err.error.message||"";if(r.status===403)throw new Error("403 Forbidden — reconnect Google (click G) to grant send permission. "+msg);if(r.status===401)throw new Error("401 Token expired — reconnect Google (click G). "+msg);throw new Error("Gmail error "+r.status+": "+msg);}).catch(function(e){if(e.message.indexOf("403")>=0||e.message.indexOf("401")>=0)throw e;throw new Error("Gmail send failed: "+r.status+" — try reconnecting Google");});}return r.json();});
}
function parseEmailFromPitch(pitch){
  if(!pitch)return{subject:"",body:pitch||""};
  var lines=pitch.split("\
");
  var subj="";
  var bodyStart=0;
  for(var i=0;i<Math.min(lines.length,5);i++){
    var m=lines[i].match(/^Subject:\s*(.+)/i);
    if(m){subj=m[1].trim();bodyStart=i+1;while(bodyStart<lines.length&&!lines[bodyStart].trim())bodyStart++;break;}
  }
  return{subject:subj,body:lines.slice(bodyStart).join("\
").trim()};
}
function getWeekStart(){var d=new Date();d.setHours(0,0,0,0);d.setDate(d.getDate()-d.getDay()+1);if(d.getDay()===0)d.setDate(d.getDate()-6);return d;}

function detectBlocker(txt){
  const lo=txt.toLowerCase();
  return lo.indexOf("blocker")>=0;
}
function extractBlockerType(txt){
  const lo=txt.toLowerCase();
  if(lo.indexOf("external")>=0||lo.indexOf("client")>=0||lo.indexOf("waiting on")>=0)return"external";
  return"internal";
}
