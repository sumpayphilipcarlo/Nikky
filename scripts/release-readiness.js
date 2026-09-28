const fs=require("fs"),path=require("path");

const root=path.join(__dirname,"..");
function exists(p){return fs.existsSync(path.join(root,p))}
function read(p){return fs.readFileSync(path.join(root,p),"utf8")}
function envNames(text){return [...text.matchAll(/^([A-Z0-9_]+)=/gm)].map(m=>m[1])}

function evaluate({env=process.env}={}){
 const checks=[];
 const add=(id,category,ok,detail,blocking=true)=>checks.push({id,category,ok:!!ok,detail,blocking});
 const packageJson=JSON.parse(read("package.json"));
 const envExample=read(".env.example");
 const requiredEnv=["NIKKY_SERVICE_TOKEN","NIKKY_MEMORY_KEY","NIKKY_SESSION_SECRET","DATABASE_URL"];
 const providerEnv=["GOOGLE_ROUTES_API_KEY","GOOGLE_OAUTH_CLIENT_ID","TWILIO_ACCOUNT_SID","TWILIO_AUTH_TOKEN","TWILIO_FROM_NUMBER","FCM_PROJECT_ID"];
 const defined=envNames(envExample);

 add("core-tests","quality",packageJson.scripts?.test?.includes("security-check.js"),"Full test command includes security gate");
 add("backend","architecture",exists("server/production.js"),"Production backend entrypoint exists");
 add("worker","architecture",exists("server/worker-entry.js"),"Background worker entrypoint exists");
 add("postgres","persistence",exists("storage/postgres.js")&&exists("storage/schema.sql"),"PostgreSQL repository and schema exist");
 add("auth","security",exists("server/auth.js")&&exists("server/oidc.js"),"Session and OIDC auth modules exist");
 add("secrets","security",exists("core/provider-credentials.js")&&exists("core/secrets.js"),"Encrypted provider credential modules exist");
 add("audit","security",exists("core/audit-ledger.js")||exists("core/audit-chain.js"),"Tamper-evident audit module exists");
 add("threat-model","security",exists("docs/THREAT_MODEL.md"),"Threat model exists");
 add("operations-runbook","operations",exists("docs/OPERATIONS.md"),"Operations runbook exists");
 add("backup-restore","operations",exists("storage/backup.js")&&exists("scripts/backup.js")&&exists("scripts/restore.js"),"Backup/restore tooling exists");
 add("liveness-readiness","operations",exists("server/monitoring.js")&&exists("server/lifecycle.js"),"Monitoring and graceful lifecycle modules exist");
 add("wake-word-core","native",exists("core/wake-word.js"),"Wake-word lifecycle boundary exists");
 add("speaker-verification","native",exists("core/speaker-verification.js"),"Optional speaker verification policy exists");
 add("active-context","native",exists("core/active-context.js"),"Permission-gated active context model exists");
 add("fabric","orchestration",exists("core/fabric.js")&&exists("core/app-controller.js")&&exists("core/discovery.js"),"Universal Fabric discovery and controller exist");
 add("missions","orchestration",exists("core/mission-planner.js")&&exists("core/mission-runner.js"),"Resumable mission engine exists");
 add("transaction-safety","security",exists("core/transaction-safety.js")&&exists("core/fabric-policy.js"),"Financial and Fabric execution safeguards exist");
 add("guardian","safety",exists("core/guardian.js")&&exists("core/sensor-fusion.js")&&exists("core/emergency-policy.js"),"Guardian sensor fusion and policy engine exist");
 add("iot-contracts","native",exists("providers/matter.js")&&exists("providers/mqtt.js"),"Matter and MQTT adapter contracts exist");
 add("android-source","native",exists("clients/android/app/src/main/AndroidManifest.xml")&&exists("clients/android/app/src/main/java/com/nikky/assistant/MainActivity.kt"),"Android source shell exists");
 add("ios-source","native",exists("clients/ios/Package.swift")&&exists("clients/ios/Sources/NikkyIOS/NikkyClient.swift"),"iOS Swift source shell exists");
 add("desktop-source","native",exists("clients/desktop/src-tauri/Cargo.toml")&&exists("clients/desktop/src-tauri/src/lib.rs"),"Tauri/Rust source shell exists");
 add("docker","deployment",exists("deploy/Dockerfile")&&exists("deploy/docker-compose.yml"),"Container deployment files exist");
 for(const name of requiredEnv)add("env-example-"+name,"configuration",defined.includes(name),name+" documented in .env.example");
 for(const name of providerEnv)add("provider-env-"+name,"configuration",defined.includes(name),name+" documented for provider activation",false);

 const external=[
  ["oauth-registrations",!!env.GOOGLE_OAUTH_CLIENT_ID,"Production OAuth app registration configured"],
  ["database-live",!!env.DATABASE_URL,"Production database configured"],
  ["domain-tls",!!env.NIKKY_PUBLIC_URL,"Public domain/TLS endpoint configured"],
  ["push-credentials",!!env.FCM_PROJECT_ID,"Push service configured"],
  ["mobile-signing",!!env.ANDROID_KEYSTORE_PATH&&!!env.IOS_SIGNING_TEAM,"Mobile signing configured"],
  ["monitoring",!!env.NIKKY_MONITORING_DSN,"Production monitoring configured"]
 ];
 for(const [id,ok,detail] of external)add(id,"external",ok,detail,false);

 const codeBlocking=checks.filter(x=>x.blocking&&!x.ok);
 const externalPending=checks.filter(x=>x.category==="external"&&!x.ok);
 return {
  generatedAt:new Date().toISOString(),
  codeReady:codeBlocking.length===0,
  externallyReady:externalPending.length===0,
  productionReady:codeBlocking.length===0&&externalPending.length===0,
  summary:{
   passed:checks.filter(x=>x.ok).length,
   failed:checks.filter(x=>!x.ok).length,
   codeBlocking:codeBlocking.length,
   externalPending:externalPending.length
  },
  checks
 };
}
if(require.main===module){
 const result=evaluate();
 console.log(JSON.stringify(result,null,2));
 process.exit(result.codeReady?0:1);
}
module.exports={evaluate};