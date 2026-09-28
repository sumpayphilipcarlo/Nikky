const assert=require("assert");
const {createMonitor}=require("../server/monitoring.js");
const {installGracefulShutdown}=require("../server/lifecycle.js");
const {parseDatabaseUrl,backupPostgres,restorePostgres}=require("../storage/backup.js");
const {createRuntime}=require("../server/runtime.js");
const {createPostgresPool}=require("../storage/db.js");
const {createServer}=require("../server/index.js");

(async()=>{
 const entries=[];
 const monitor=createMonitor({sink:e=>entries.push(e),now:()=>new Date("2026-09-28T00:00:00Z")});
 monitor.info("started",{component:"test"});
 monitor.error("failed",new Error("boom"));
 assert.equal(entries.length,2);
 assert.equal(entries[1].level,"error");

 const parsed=parseDatabaseUrl("postgres://user:p%40ss@db.example:5433/nikky");
 assert.equal(parsed.host,"db.example");
 assert.equal(parsed.port,"5433");
 assert.equal(parsed.password,"p@ss");

 const tlsPool=createPostgresPool({connectionString:"postgres://user:pass@localhost/nikky",ssl:true,sslCa:"TEST-CA"});
 assert.equal(tlsPool.options.ssl.rejectUnauthorized,true);
 assert.equal(tlsPool.options.ssl.ca,"TEST-CA");
 await tlsPool.end();

 const calls=[];
 const runner=async(command,args,{env})=>{calls.push({command,args,env});return {ok:true}};
 const backed=await backupPostgres({databaseUrl:"postgres://user:pass@localhost:5432/nikky",filePath:"./tmp/test.dump",runner});
 assert.equal(backed.ok,true);
 assert.equal(calls[0].command,"pg_dump");
 assert.ok(calls[0].args.includes("--format=custom"));
 assert.equal(calls[0].env.PGPASSWORD,"pass");
 await assert.rejects(()=>restorePostgres({databaseUrl:"postgres://user:pass@localhost/nikky",filePath:"./tmp/test.dump",runner}),/confirm=true/);
 const restored=await restorePostgres({databaseUrl:"postgres://user:pass@localhost/nikky",filePath:"./tmp/test.dump",runner,confirm:true});
 assert.equal(restored.ok,true);
 assert.equal(calls[1].command,"pg_restore");

 let closed=false,resourceClosed=false,exitCode=null;
 const fakeServer={close:cb=>{closed=true;cb()}};
 const lifecycle=installGracefulShutdown({
   server:fakeServer,
   closeables:[async()=>{resourceClosed=true}],
   timeoutMs:1000,
   exit:code=>{exitCode=code},
   signals:[]
 });
 await lifecycle.shutdown("TEST");
 assert.equal(closed,true);
 assert.equal(resourceClosed,true);
 assert.equal(exitCode,0);

 const runtime=createRuntime();
 runtime.readiness=async()=>({ok:true,checks:{database:{ok:true}}});
 const server=createServer({runtime});
 await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
 const base="http://127.0.0.1:"+server.address().port;
 let res=await fetch(base+"/health/live");
 assert.equal(res.status,200);
 let body=await res.json();
 assert.equal(body.status,"live");
 res=await fetch(base+"/health/ready");
 assert.equal(res.status,200);
 body=await res.json();
 assert.equal(body.status,"ready");
 runtime.readiness=async()=>({ok:false,checks:{database:{ok:false}}});
 res=await fetch(base+"/health/ready");
 assert.equal(res.status,503);
 await new Promise(resolve=>server.close(resolve));

 console.log("Nikky operations tests passed");
})().catch(err=>{console.error(err);process.exit(1)});
