const assert=require("assert");
process.env.NIKKY_SERVICE_TOKEN="fabric-api-test-token";
process.env.NIKKY_MEMORY_KEY="m".repeat(48);
process.env.NIKKY_SESSION_SECRET="s".repeat(48);
const {createRuntime}=require("../server/runtime.js");
const {createServer}=require("../server/index.js");

(async()=>{
 const fabricExecutions=[];
 const runtime=createRuntime({providers:{
   requestProfessionalHelp:async()=>({ok:true,live:true,channel:"test-monitoring"}),
   fabricExecutors:{
     intent:async({endpoint,capability,payload})=>{fabricExecutions.push({endpoint:endpoint.id,capability,payload});return {ok:true,live:true,bookingId:"ride-1"}}
   }
 }});
 const server=createServer({runtime});
 await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
 const base="http://127.0.0.1:"+server.address().port;
 const authToken=process.env.NIKKY_SERVICE_TOKEN;
 const headers={authorization:["Bearer",authToken].join(" "),"content-type":"application/json"};

 let res=await fetch(base+"/v1/fabric",{headers});
 assert.equal(res.status,200);

 res=await fetch(base+"/v1/fabric/endpoints",{method:"POST",headers,body:JSON.stringify({id:"phone",kind:"device",trusted:true,capabilities:["ride.book"],methods:["intent"]})});
 assert.equal(res.status,201);

 res=await fetch(base+"/v1/fabric/resolve",{method:"POST",headers,body:JSON.stringify({capability:"ride.book"})});
 assert.equal(res.status,200);
 let body=await res.json();assert.equal(body.endpoint.id,"phone");

 res=await fetch(base+"/v1/permissions",{method:"POST",headers,body:JSON.stringify({subjectId:"phone",capability:"ride.book",mode:"trusted"})});
 assert.equal(res.status,201);

 res=await fetch(base+"/v1/actions/propose",{method:"POST",headers,body:JSON.stringify({type:"ride.book",payload:{destination:"Airport"},meta:{useFabric:true,endpointId:"phone"},idempotencyKey:"ride-book-1"})});
 assert.equal(res.status,200);body=await res.json();assert.equal(body.result.status,"approval_required");
 const approvalId=body.result.item.id;
 res=await fetch(base+"/v1/approvals/"+encodeURIComponent(approvalId)+"/approve",{method:"POST",headers});
 assert.equal(res.status,200);body=await res.json();assert.equal(body.status,"executed");
 assert.equal(fabricExecutions.length,1);
 assert.equal(fabricExecutions[0].endpoint,"phone");

 res=await fetch(base+"/v1/missions",{method:"POST",headers,body:JSON.stringify({goal:"Book a ride",steps:[{capability:"ride.book",payload:{destination:"Airport"}}]})});
 assert.equal(res.status,201);body=await res.json();assert.equal(body.goal,"Book a ride");
 const missionId=body.id;
 res=await fetch(base+"/v1/missions/"+encodeURIComponent(missionId)+"/run",{method:"POST",headers});
 assert.equal(res.status,200);body=await res.json();assert.equal(body.state,"waiting_user");assert.ok(body.approvalId);
 res=await fetch(base+"/v1/approvals/"+encodeURIComponent(body.approvalId)+"/approve",{method:"POST",headers});
 assert.equal(res.status,200);
 res=await fetch(base+"/v1/missions/"+encodeURIComponent(missionId),{headers});
 assert.equal(res.status,200);body=await res.json();assert.equal(body.state,"completed");

 res=await fetch(base+"/v1/transactions/evaluate",{method:"POST",headers,body:JSON.stringify({transaction:{type:"bill.pay",recipient:"PowerCo",amount:2000},policy:{mode:"trusted",maxAmount:3000,allowedRecipients:["PowerCo"]}})});
 assert.equal(res.status,200);body=await res.json();assert.equal(body.requiresReview,false);

 await fetch(base+"/v1/sensors",{method:"POST",headers,body:JSON.stringify({sourceId:"smoke",signal:"smoke",confidence:.95,at:Date.now()})});
 await fetch(base+"/v1/sensors",{method:"POST",headers,body:JSON.stringify({sourceId:"heat",signal:"heat",confidence:.95,at:Date.now()})});
 res=await fetch(base+"/v1/guardian/incidents",{method:"POST",headers,body:JSON.stringify({type:"fire",signals:["smoke","heat"],policy:{minSources:2,minConfidence:.8,allowProfessionalHelpWhenUnresponsive:true,trustedContacts:[]},location:"home"})});
 assert.equal(res.status,201);body=await res.json();assert.equal(body.level,"urgent");

 res=await fetch(base+"/v1/status",{headers});
 assert.equal(res.status,200);body=await res.json();
 assert.equal(body.fabric.endpoints,1);
 assert.equal(body.missions.total,1);
 assert.equal(body.guardian.openIncidents,1);
 assert.equal(body.sensors.sources,2);

 await new Promise(resolve=>server.close(resolve));
 console.log("Nikky Fabric API tests passed");
})().catch(err=>{console.error(err);process.exit(1)});
