(function(root,factory){
 const api=factory(root.NikkyProviders);
 if(typeof module==="object"&&module.exports) module.exports=api;
 root.NikkyGoogleCalendar=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(Providers){
 function extractStart(raw){
   if(!raw) return null;
   if(typeof raw.start==="string") return raw.start;
   if(raw.start&&typeof raw.start.dateTime==="string") return raw.start.dateTime;
   if(raw.start&&typeof raw.start.date==="string") return raw.start.date+"T00:00:00";
   return null;
 }
 function normalizeGoogleEvent(raw){
   const start=extractStart(raw);
   if(!raw||!raw.id||!start) return null;
   const attendees=Array.isArray(raw.attendees)?raw.attendees:[];
   const contact=(attendees.find(a=>!a.self&&a.email)||{}).email||"";
   const base={
     id:raw.id,
     title:raw.summary||"Event",
     start,
     end:raw.end?.dateTime||raw.end?.date||null,
     location:raw.location||"",
     contact
   };
   if(Providers&&typeof Providers.normalizeEvent==="function"){
     return Providers.normalizeEvent(base,"google-calendar");
   }
   const d=new Date(start);
   if(Number.isNaN(d.getTime())) return null;
   return {
     id:String(raw.id),
     title:String(raw.summary||"Event"),
     time:String(d.getHours()).padStart(2,"0")+":"+String(d.getMinutes()).padStart(2,"0"),
     start,
     end:base.end,
     destination:base.location,
     contact,
     source:"google-calendar",
     raw
   };
 }
 function createGoogleOAuthTokenProvider({clientId,googleRoot}={}){
   let token=null;
   let expiresAt=0;
   function rootObj(){return googleRoot||(typeof globalThis!=="undefined"?globalThis.google:null)}
   function hasValidToken(){return !!token&&Date.now()<expiresAt-60000}
   function clear(){token=null;expiresAt=0}
   async function getToken({interactive=true}={}){
     if(hasValidToken()) return {ok:true,accessToken:token,cached:true};
     if(!clientId) return {ok:false,reason:"Google OAuth client ID is not configured"};
     const g=rootObj();
     if(!g?.accounts?.oauth2?.initTokenClient) return {ok:false,reason:"Google Identity Services is not loaded"};
     if(!interactive) return {ok:false,reason:"Google authorization is required"};
     return await new Promise(resolve=>{
       try{
         const client=g.accounts.oauth2.initTokenClient({
           client_id:clientId,
           scope:"https://www.googleapis.com/auth/calendar.readonly",
           callback:(response)=>{
             if(response?.error){clear();resolve({ok:false,reason:response.error_description||response.error});return}
             token=response.access_token||null;
             expiresAt=Date.now()+(Number(response.expires_in)||3600)*1000;
             resolve(token?{ok:true,accessToken:token,cached:false}:{ok:false,reason:"Google did not return an access token"});
           }
         });
         client.requestAccessToken({prompt:"consent"});
       }catch(err){
         resolve({ok:false,reason:err?.message||"Google authorization failed"});
       }
     });
   }
   return {getToken,clear,isConnected:hasValidToken};
 }
 function createGoogleCalendarAdapter({tokenProvider,fetchFn,calendarId="primary"}={}){
   const request=fetchFn||(typeof fetch==="function"?fetch.bind(globalThis):null);
   async function listUpcoming({from=new Date(),limit=10,interactive=true}={}){
     if(!request) return {ok:false,live:false,reason:"Fetch API unavailable",events:[]};
     if(!tokenProvider||typeof tokenProvider.getToken!=="function") return {ok:false,live:false,reason:"Google OAuth token provider is not configured",events:[]};
     const auth=await tokenProvider.getToken({interactive});
     if(!auth.ok) return {ok:false,live:false,reason:auth.reason||"Google authorization failed",events:[]};
     const params=new URLSearchParams({
       timeMin:(from instanceof Date?from:new Date(from)).toISOString(),
       singleEvents:"true",
       orderBy:"startTime",
       maxResults:String(Math.max(1,Math.min(50,Number(limit)||10)))
     });
     const url="https://www.googleapis.com/calendar/v3/calendars/"+encodeURIComponent(calendarId)+"/events?"+params.toString();
     let response;
     try{
       response=await request(url,{headers:{Authorization:"Bearer "+auth.accessToken}});
     }catch(err){
       return {ok:false,live:false,reason:err?.message||"Google Calendar request failed",events:[]};
     }
     if(!response.ok){
       if(response.status===401&&typeof tokenProvider.clear==="function") tokenProvider.clear();
       let detail="";
       try{const body=await response.json();detail=body?.error?.message||""}catch{}
       return {ok:false,live:false,reason:detail||("Google Calendar returned HTTP "+response.status),events:[]};
     }
     const body=await response.json();
     const events=(body.items||[]).map(normalizeGoogleEvent).filter(Boolean);
     return {ok:true,live:true,source:"google-calendar",events};
   }
   return {listUpcoming};
 }
 return {extractStart,normalizeGoogleEvent,createGoogleOAuthTokenProvider,createGoogleCalendarAdapter};
});