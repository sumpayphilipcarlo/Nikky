const assert=require("assert");
const {createFabric}=require("../core/fabric.js");
const {createAppController}=require("../core/app-controller.js");
const {createMissionPlanner}=require("../core/mission-planner.js");
const {createTransactionSafety}=require("../core/transaction-safety.js");
const {createSensorFusion}=require("../core/sensor-fusion.js");
const {createGuardian}=require("../core/guardian.js");
const {createCapabilityPermissions}=require("../core/app-permissions.js");
const {chooseParking}=require("../core/parking.js");
const {createBrowserAutomationAdapter}=require("../providers/browser-automation.js");
const {createMatterAdapter}=require("../providers/matter.js");
const {createMqttAdapter}=require("../providers/mqtt.js");
const Workout=require("../core/workout.js");
const Health=require("../core/health-signals.js");
const {assessResponsiveness}=require("../core/presence-responsiveness.js");
const {createEmergencyPolicyStore}=require("../core/emergency-policy.js");

(async()=>{
 let now=1000;
 const fabric=createFabric({now:()=>new Date(now)});
 fabric.register({id:"phone",kind:"device",name:"Phone",trusted:true,online:true,capabilities:["app.open","ride.book"],methods:["intent","browser"]});
 fabric.register({id:"browser",kind:"service",name:"Web",trusted:true,online:true,capabilities:["ride.book","food.order"],methods:["browser"]});
 assert.equal(fabric.resolve("ride.book").ok,true);
 assert.equal(fabric.candidates("ride.book").length,2);
 fabric.update("phone",{online:false});
 assert.equal(fabric.resolve("ride.book").endpoint.id,"browser");

 const calls=[];
 const controller=createAppController({
   fabric,
   executors:{browser:async({endpoint,capability})=>{calls.push({endpoint:endpoint.id,capability});return {ok:true,live:true}}},
   authority:async()=>({allowed:true}),
   verify:async({result})=>({ok:result.ok===true})
 });
 const executed=await controller.execute({capability:"ride.book",payload:{destination:"Airport"}});
 assert.equal(executed.ok,true);
 assert.equal(calls[0].endpoint,"browser");

 const perms=createCapabilityPermissions();
 perms.grant({subjectId:"browser",capability:"payment.submit",mode:"trusted",constraints:{maxAmount:5000}});
 assert.equal(perms.evaluate("browser","payment.submit",{context:{amount:3000}}).allowed,true);
 assert.equal(perms.evaluate("browser","payment.submit",{context:{amount:6000}}).allowed,false);

 const missions=createMissionPlanner({fabric,now:()=>new Date(now),idFactory:()=>"m1"});
 const mission=missions.create({goal:"Get me to the airport",steps:[{capability:"ride.book"},{capability:"navigation.start"}]});
 assert.equal(mission.state,"planned");
 missions.transition("m1","running");
 missions.completeStep("m1","step_1",{bookingId:"ride1"});
 assert.equal(missions.next("m1").capability,"navigation.start");
 missions.completeStep("m1","step_2",{ok:true});
 assert.equal(missions.get("m1").state,"completed");

 const safety=createTransactionSafety({now:()=>now});
 let eval1=safety.evaluate({type:"bill.pay",recipient:"PowerCo",amount:2500,currency:"PHP"},{mode:"trusted",maxAmount:3000,allowedRecipients:["PowerCo"]});
 assert.equal(eval1.ok,true);assert.equal(eval1.requiresReview,false);
 safety.record({type:"bill.pay",recipient:"PowerCo",amount:2500,currency:"PHP"},{status:"completed",providerReference:"ref1"});
 let eval2=safety.evaluate({type:"bill.pay",recipient:"PowerCo",amount:2500,currency:"PHP"},{mode:"trusted",maxAmount:3000,allowedRecipients:["PowerCo"]});
 assert.equal(eval2.ok,false);assert.ok(eval2.reasons.includes("possible duplicate transaction"));

 const parking=chooseParking([
   {id:"far",walkMinutes:12,price:50,available:true,open:true},
   {id:"near",walkMinutes:3,price:120,available:true,open:true,covered:true}
 ],{covered:true});
 assert.equal(parking.best.id,"near");

 const browserCalls=[];
 const browserAdapter=createBrowserAutomationAdapter({
   allowedOrigins:["https://shop.example"],
   driver:{open:async url=>browserCalls.push(["open",url]),click:async step=>browserCalls.push(["click",step.selector])}
 });
 assert.equal((await browserAdapter.run({url:"https://evil.example",steps:[]})).ok,false);
 assert.equal((await browserAdapter.run({url:"https://shop.example/cart",steps:[{type:"click",selector:"#checkout"}]})).ok,true);

 const matter=createMatterAdapter({controller:{discover:async()=>[{id:"ac1",capabilities:["climate.set"]}],command:async()=>({ok:true})}});
 const md=await matter.discover();assert.equal(md.devices[0].platform,"matter");
 assert.equal((await matter.command({deviceId:"ac1",capability:"climate.set",value:23})).ok,true);

 const mqttCalls=[];
 const mqtt=createMqttAdapter({client:{publish:async(t,p)=>mqttCalls.push([t,p])}});
 assert.equal((await mqtt.command({deviceId:"light1",capability:"power",value:"on"})).ok,true);
 assert.equal((await mqtt.command({deviceId:"../bad",capability:"power",value:"on"})).ok,false);

 const workout=Workout.buildWorkoutPlan({goal:"general-fitness",recovery:{sleepHours:5,readiness:.4}});
 assert.equal(workout.intensity,"light");
 assert.equal(Workout.adjustWorkout(workout,{timeMinutes:15}).minutes,15);

 const hr=Health.normalizeHealthReading({sourceId:"watch",type:"heartRate",value:200});
 assert.equal(Health.flagAnomaly(hr).abnormal,true);
 assert.equal(assessResponsiveness([{at:950,responsive:false,confidence:.8},{at:970,responsive:false,confidence:.9}],{now:1000}).responsive,false);

 const fusion=createSensorFusion({now:()=>now});
 fusion.ingest({sourceId:"smoke1",signal:"smoke",confidence:.95,at:now});
 fusion.ingest({sourceId:"heat1",signal:"heat",confidence:.9,at:now});
 assert.equal(fusion.correlate(["smoke","heat"],{minSources:2}).ok,true);

 const policyStore=createEmergencyPolicyStore();
 const gp=policyStore.upsert({id:"fire-home",type:"fire",trustedContacts:["+10000000000"],allowProfessionalHelpWhenUnresponsive:true});
 assert.equal(policyStore.evaluate("fire",{location:"home"}).matched,true);
 const events=[];
 const guardian=createGuardian({
   sensorFusion:fusion,now:()=>now,
   notify:async i=>events.push(["notify",i.id]),
   contactTrusted:async i=>events.push(["contact",i.id]),
   requestProfessionalHelp:async i=>{events.push(["help",i.id]);return {ok:true,channel:"configured-monitoring-service"}}
 });
 const incident=guardian.start({type:"fire",signals:["smoke","heat"],policy:gp,location:"home"});
 assert.equal(incident.level,"urgent");
 const escalated=await guardian.escalate(incident.id,{responsive:false});
 assert.equal(escalated.level,"professional_help");
 assert.deepEqual(events.map(x=>x[0]),["notify","contact","help"]);

 console.log("Nikky Fabric/Guardian tests passed");
})().catch(err=>{console.error(err);process.exit(1)});
