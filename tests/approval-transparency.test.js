const assert=require("assert");
const Orchestrator=require("../orchestrator.js");
const Authority=require("../authority.js");

(async()=>{
 global.NikkyAuthority=Authority;
 const queue=[],audit=[];
 const o=Orchestrator.create({approvalQueue:queue,auditLog:audit});
 const proposed=await o.propose({
   type:"bill.pay",
   title:"Pay electricity bill",
   summary:"Pay the current bill",
   payload:{
     biller:"PowerCo",
     recipient:"Account 123",
     amount:2500,
     currency:"PHP",
     reference:"INV-1",
     pin:"1234",
     nested:{password:"secret",token:"abc"}
   },
   meta:{authorization:"should-hide"}
 });
 assert.equal(proposed.status,"approval_required");
 const preview=proposed.item.preview;
 assert.equal(preview.payload.biller,"PowerCo");
 assert.equal(preview.payload.amount,2500);
 assert.equal(preview.payload.pin,"[REDACTED]");
 assert.equal(preview.payload.nested.password,"[REDACTED]");
 assert.equal(preview.payload.nested.token,"[REDACTED]");
 assert.equal(preview.meta.authorization,"[REDACTED]");
 assert.equal(JSON.stringify(preview).includes("1234"),false);
 assert.equal(JSON.stringify(preview).includes("secret"),false);
 console.log("Nikky approval transparency tests passed");
})().catch(err=>{console.error(err);process.exit(1)});
