const {requestJson,bearer}=require("./http.js");
function createSpotifyAdapter({tokenProvider,fetchFn}={}){
 async function token(){return tokenProvider?.getToken?tokenProvider.getToken({interactive:true}):{ok:false,reason:"Spotify OAuth not configured"}}
 async function search({query,type="track",limit=5}={}){
  const t=await token();if(!t.ok)return {ok:false,live:false,reason:t.reason};
  const p=new URLSearchParams({q:query,type,limit:String(limit)});
  const r=await requestJson(fetchFn,"https://api.spotify.com/v1/search?"+p,{headers:bearer(t.accessToken)});
  return r.ok?{ok:true,live:true,source:"spotify",data:r.data}:{ok:false,live:false,reason:r.reason};
 }
 async function play({deviceId,uris,contextUri}={}){
  const t=await token();if(!t.ok)return {ok:false,live:false,reason:t.reason};
  const suffix=deviceId?"?device_id="+encodeURIComponent(deviceId):"";
  const body=contextUri?{context_uri:contextUri}:{uris};
  const r=await requestJson(fetchFn,"https://api.spotify.com/v1/me/player/play"+suffix,{method:"PUT",headers:bearer(t.accessToken),body});
  return r.ok?{ok:true,live:true,source:"spotify"}:{ok:false,live:false,reason:r.reason};
 }
 return {search,play};
}
module.exports={createSpotifyAdapter};