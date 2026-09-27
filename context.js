(function(root,factory){
 const api=factory();
 if(typeof module==="object"&&module.exports) module.exports=api;
 root.NikkyContext=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
 function create(initial={}){
   const state={
     observations:Array.isArray(initial.observations)?initial.observations:[],
     learned:initial.learned&&typeof initial.learned==="object"?initial.learned:{},
     lastInference:initial.lastInference||null
   };
   function observe(type,payload={},source="app"){
     const item={id:String(Date.now())+"-"+Math.random().toString(36).slice(2,7),ts:new Date().toISOString(),type,payload,source};
     state.observations.unshift(item);
     state.observations=state.observations.slice(0,200);
     return item;
   }
   function median(values){
     const a=values.filter(Number.isFinite).sort((x,y)=>x-y);
     if(!a.length) return null;
     const m=Math.floor(a.length/2);
     return a.length%2?a[m]:(a[m-1]+a[m])/2;
   }
   function infer(){
     const dep=state.observations.filter(o=>o.type==="departure.actual").map(o=>Number(o.payload.minutesFromMidnight));
     const prep=state.observations.filter(o=>o.type==="prep.duration").map(o=>Number(o.payload.minutes));
     const commute=state.observations.filter(o=>o.type==="commute.duration").map(o=>Number(o.payload.minutes));
     const learned={...state.learned};
     const mDep=median(dep),mPrep=median(prep),mCommute=median(commute);
     if(mDep!==null) learned.preferredDepartureMinutes=Math.round(mDep);
     if(mPrep!==null) learned.typicalPrepMinutes=Math.round(mPrep);
     if(mCommute!==null) learned.typicalCommuteMinutes=Math.round(mCommute);
     learned.sampleCounts={departure:dep.length,prep:prep.length,commute:commute.length};
     state.learned=learned;
     state.lastInference=new Date().toISOString();
     return learned;
   }
   function snapshot(){return JSON.parse(JSON.stringify(state))}
   function reset(){state.observations=[];state.learned={};state.lastInference=null}
   return {observe,infer,snapshot,reset,state};
 }
 return {create};
});