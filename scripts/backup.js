const path=require("path");
const {backupPostgres}=require("../storage/backup.js");

(async()=>{
 const databaseUrl=process.env.DATABASE_URL;
 const dir=process.env.NIKKY_BACKUP_DIR||"./backups";
 const stamp=new Date().toISOString().replace(/[:.]/g,"-");
 const filePath=path.join(dir,"nikky-"+stamp+".dump");
 const result=await backupPostgres({databaseUrl,filePath});
 console.log(JSON.stringify({event:"backup_complete",filePath:result.filePath}));
})().catch(err=>{console.error(JSON.stringify({event:"backup_failed",error:err.message}));process.exit(1)});
