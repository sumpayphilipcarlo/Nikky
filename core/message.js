function sanitizeHeader(value){return String(value||"").replace(/[\r\n]+/g," ").trim()}
function buildEmail({from,to,subject,body}={}){
 if(!to)throw new Error("recipient required");
 const lines=[];
 if(from)lines.push("From: "+sanitizeHeader(from));
 lines.push("To: "+sanitizeHeader(to));
 lines.push("Subject: "+sanitizeHeader(subject||""));
 lines.push("MIME-Version: 1.0","Content-Type: text/plain; charset=UTF-8","",String(body||""));
 return lines.join("\r\n");
}
function buildSms({to,body}={}){
 if(!to)throw new Error("recipient required");
 const text=String(body||"").trim();
 if(!text)throw new Error("message body required");
 return {to:String(to),body:text.slice(0,1600)};
}
module.exports={sanitizeHeader,buildEmail,buildSms};