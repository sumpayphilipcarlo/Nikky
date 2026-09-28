const {spawn}=require("child_process");
const path=require("path");

function validatePath(filePath){
 if(!filePath||typeof filePath!=="string")throw new Error("backup path required");
 const resolved=path.resolve(filePath);
 if(resolved.includes("\0"))throw new Error("invalid backup path");
 return resolved;
}
function parseDatabaseUrl(databaseUrl){
 if(!databaseUrl)throw new Error("DATABASE_URL required");
 const u=new URL(databaseUrl);
 if(!["postgres:","postgresql:"].includes(u.protocol))throw new Error("PostgreSQL DATABASE_URL required");
 return {
  host:u.hostname,port:u.port||"5432",database:u.pathname.replace(/^\//,""),
  user:decodeURIComponent(u.username||""),password:decodeURIComponent(u.password||"")
 };
}
function runCommand(command,args,{env=process.env,runner}={}){
 if(runner)return runner(command,args,{env});
 return new Promise((resolve,reject)=>{
  const child=spawn(command,args,{env,stdio:["ignore","pipe","pipe"]});
  let stderr="";
  child.stderr.on("data",d=>stderr+=d);
  child.on("error",reject);
  child.on("close",code=>code===0?resolve({ok:true,code}):reject(new Error(command+" exited "+code+": "+stderr.slice(-1000))));
 });
}
async function backupPostgres({databaseUrl,filePath,runner}={}){
 const db=parseDatabaseUrl(databaseUrl),out=validatePath(filePath);
 const args=["--format=custom","--no-owner","--no-privileges","--host",db.host,"--port",db.port,"--username",db.user,"--file",out,db.database];
 await runCommand("pg_dump",args,{runner,env:{...process.env,PGPASSWORD:db.password}});
 return {ok:true,filePath:out,format:"custom"};
}
async function restorePostgres({databaseUrl,filePath,runner,confirm=false}={}){
 if(confirm!==true)throw new Error("restore requires explicit confirm=true");
 const db=parseDatabaseUrl(databaseUrl),input=validatePath(filePath);
 const args=["--clean","--if-exists","--no-owner","--no-privileges","--host",db.host,"--port",db.port,"--username",db.user,"--dbname",db.database,input];
 await runCommand("pg_restore",args,{runner,env:{...process.env,PGPASSWORD:db.password}});
 return {ok:true,filePath:input};
}
module.exports={parseDatabaseUrl,backupPostgres,restorePostgres,validatePath};