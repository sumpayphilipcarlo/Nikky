const assert=require("assert");
const {createDepartureService}=require("../core/departure-service.js");
const LifeEvents=require("../core/life-events.js");
const {detectCommitments}=require("../core/commitments.js");
const {createTaskManager}=require("../core/tasks.js");
const Files=require("../core/files.js");
const Documents=require("../core/document-intelligence.js");
const {createDocumentWorkflow}=require("../core/document-workflow.js");
const Brief=require("../core/brief.js");
const {buildTravelPlan}=require("../core/travel.js");

(async()=>{
 // Morning Intelligence / Late Meeting
 const proposals=[];
 const departure=createDepartureService({
  calendar:{listUpcoming:async()=>({ok:true,live:true,events:[{id:"meet",title:"Client meeting",time:"09:00",start:"2026-09-27T09:00:00Z",destination:"Office",source:"calendar"}]})},
  maps:{travelTime:async()=>({ok:true,live:true,durationMinutes:90,trafficDelayMinutes:30})},
  weather:{current:async()=>({ok:true,live:true,rainMm:1,precipitationMm:1})},
  proposeAction:async a=>{proposals.push(a);return {status:"executed"}},
  getContext:()=>({routine:{prep:45,commute:60,buffer:15},learned:{}}),
  now:()=>new Date("2026-09-27T07:30:00Z")
 });
 const tripScan=await departure.scan({origin:"Home",coordinates:{latitude:14.5,longitude:121}});
 assert.equal(tripScan.results[0].journey.status,"late-risk");
 assert.equal(proposals[0].type,"proactive.notify");

 const morning=Brief.morningBrief({events:tripScan.results.map(r=>r.event),weather:tripScan.results[0].weather,traffic:tripScan.results[0].traffic});
 assert.equal(morning.type,"morning");

 // Anniversary preparation
 const ann=LifeEvents.preparation({id:"ann",type:"Anniversary",date:"2026-10-04"},new Date("2026-09-27T08:00:00"));
 assert.equal(ann.stage,"finalize");

 // Travel Day
 const travel=buildTravelPlan({trip:{id:"flight",start:"2026-09-27T12:00:00Z"},weather:{rainMm:2},route:{trafficDelayMinutes:20},now:new Date("2026-09-27T08:30:00Z")});
 assert.ok(travel.tasks.some(t=>t.stage==="travel-day"));

 // Email Commitment
 const commitments=detectCommitments("I'll send the assessment tomorrow.",{source:"gmail",now:new Date("2026-09-27T08:00:00Z")});
 const tasks=createTaskManager();tasks.fromCommitment(commitments[0]);
 assert.equal(tasks.open().length,1);

 // Document -> Email
 const files=Files.createFileContext();files.ingest({id:"doc",name:"report.txt",text:"Security review is complete. One item requires follow-up."});files.select("doc");
 const intelligence=Documents.createDocumentIntelligence();
 const actions=[];
 const docFlow=createDocumentWorkflow({files,intelligence,resolveRecipient:async()=>"tim@example.com",proposeAction:async a=>{actions.push(a);return {status:"approval_required"}}});
 const dr=await docFlow.summarizeAndPrepareEmail({recipientQuery:"Tim"});
 assert.equal(dr.proposal.status,"approval_required");
 assert.equal(actions[0].type,"email.send");

 console.log("Nikky end-to-end scenarios passed");
})().catch(e=>{console.error(e);process.exit(1)});
