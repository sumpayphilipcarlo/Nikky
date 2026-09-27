const fs=require("fs"),path=require("path");
const root=path.resolve(__dirname,"..");
const skip=new Set([".git","node_modules"]);
const risky=[
 {name:"private key",re:/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/},
 {name:"AWS access key",re:/\bAKIA[0-9A-Z]{16}\b/},
 {name:"GitHub token",re:/\bgh[pousr]_[A-Za-z0-9_]{30,}\b/},
 {name:"hardcoded bearer",re:/Authorization\s*:\s*["'`]Bearer\s+[A-Za-z0-9._-]{20,}/i}
];
const findings=[];
function walk(dir){
 for(const ent of fs.readdirSync(dir,{withFileTypes:true})){
  if(skip.has(ent.name))continue;
  const p=path.join(dir,ent.name);
  if(ent.isDirectory())walk(p);
  else if(/\.(js|json|md|yml|yaml|env|html|sql)$/i.test(ent.name)||ent.name===".env.example"){
   const text=fs.readFileSync(p,"utf8");
   for(const r of risky)if(r.re.test(text))findings.push({file:path.relative(root,p),rule:r.name});
  }
 }
}
walk(root);
if(findings.length){console.error("Security check failed",findings);process.exit(1)}
console.log("Nikky security checks passed");
