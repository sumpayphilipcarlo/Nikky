const {requestJson,bearer}=require("./http.js");
function createGoogleCalendarApiAdapter({tokenProvider,fetchFn,calendarId="primary"}={}){
 async function token(){return tokenProvider?.getToken?tokenProvider.getToken({interactive:false}):{ok:false,reason:"Google Calendar OAuth not configured"}}
 async function call(path,options={}){
  const t=await token();if(!t?.ok)return {ok:false,live:false,reason:t?.reason||"Google Calendar OAuth unavailable"};
  const r=await requestJson(fetchFn,"https://www.googleapis.com/calendar/v3/calendars/"+encodeURIComponent(calendarId)+path,{...options,headers:{...bearer(t.accessToken),...(options.headers||{})}});
  if(!r.ok){if(r.status===401)tokenProvider.clear?.();return {ok:false,live:false,reason:r.reason||"Google Calendar API error"}}
  return {ok:true,live:true,source:"google-calendar",data:r.data};
 }
 async function listUpcoming({from=new Date(),limit=10}={}){
  const p=new URLSearchParams({timeMin:new Date(from).toISOString(),singleEvents:"true",orderBy:"startTime",maxResults:String(Math.max(1,Math.min(50,limit)))});
  const r=await call("/events?"+p);
  return r.ok?{...r,events:r.data?.items||[]}:{...r,events:[]};
 }
 async function createEvent({event}={}){if(!event)return {ok:false,live:false,reason:"event required"};return call("/events",{method:"POST",body:event})}
 async function updateEvent({eventId,event}={}){if(!eventId||!event)return {ok:false,live:false,reason:"eventId and event required"};return call("/events/"+encodeURIComponent(eventId),{method:"PUT",body:event})}
 async function deleteEvent({eventId}={}){if(!eventId)return {ok:false,live:false,reason:"eventId required"};return call("/events/"+encodeURIComponent(eventId),{method:"DELETE"})}
 return {listUpcoming,createEvent,updateEvent,deleteEvent};
}
module.exports={createGoogleCalendarApiAdapter};