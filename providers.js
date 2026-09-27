(function(root,factory){
 const api=factory();
 if(typeof module==="object"&&module.exports) module.exports=api;
 root.NikkyProviders=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
 function normalizeEvent(raw,source="mock-calendar"){
   if(!raw||!raw.id||!raw.start) return null;
   const start=new Date(raw.start);
   if(Number.isNaN(start.getTime())) return null;
   const hh=String(start.getHours()).padStart(2,"0");
   const mm=String(start.getMinutes()).padStart(2,"0");
   return {
     id:String(raw.id),
     title:String(raw.title||raw.summary||"Event"),
     time:hh+":"+mm,
     start:raw.start,
     end:raw.end||null,
     destination:raw.destination||raw.location||"",
     contact:raw.contact||"",
     source,
     raw
   };
 }
 function createCalendarAdapter({mode="mock",events=[]}={}){
   const state={mode,events:Array.isArray(events)?events:[]};
   async function listUpcoming({from=new Date(),limit=10}={}){
     if(state.mode!=="mock") return {ok:false,live:false,reason:"Live calendar provider not configured",events:[]};
     const start=from instanceof Date?from:new Date(from);
     const normalized=state.events.map(e=>normalizeEvent(e,"mock-calendar")).filter(Boolean)
       .filter(e=>new Date(e.start)>=start)
       .sort((a,b)=>new Date(a.start)-new Date(b.start))
       .slice(0,limit);
     return {ok:true,live:false,source:"mock-calendar",events:normalized};
   }
   function setEvents(events){state.events=Array.isArray(events)?events:[]}
   return {listUpcoming,setEvents,state};
 }
 return {normalizeEvent,createCalendarAdapter};
});