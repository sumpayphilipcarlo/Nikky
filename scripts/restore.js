const {restorePostgres}=require("../storage/backup.js");

(async()=>{
 if(process.env.NIKKY_ALLOW_RESTORE!=="true")throw new Error("Set NIKKY_ALLOW_RESTORE=true for an intentional restore");
 const filePath=process.env.NIKKY_RESTORE_FILE;
 if(!filePath)throw new Error("NIKKY_RESTORE_FILE is required");
 const result=await restorePostgres({databaseUrl:process.env.DATABASE_URL,filePath,confirm:true});
 console.log(JSON.stringify({event:"restore_complete",filePath:result.filePath}));
})().catch(err=>{console.error(JSON.stringify({event:"restore_failed",error:err.message}));process.exit(1)});
