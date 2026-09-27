const {requestJson,bearer}=require("./http.js");
function createGoogleDriveAdapter({tokenProvider,fetchFn}={}){
 async function listFiles({query="trashed = false",pageSize=20}={}){
  const t=await tokenProvider?.getToken?.({interactive:true});if(!t?.ok)return {ok:false,live:false,reason:t?.reason||"Google OAuth not configured",files:[]};
  const p=new URLSearchParams({q:query,pageSize:String(pageSize),fields:"files(id,name,mimeType,modifiedTime,size,webViewLink)"});
  const r=await requestJson(fetchFn,"https://www.googleapis.com/drive/v3/files?"+p,{headers:bearer(t.accessToken)});
  return r.ok?{ok:true,live:true,source:"google-drive",files:r.data.files||[]}:{ok:false,live:false,reason:r.reason,files:[]};
 }
 async function getFileMetadata(id){
  const t=await tokenProvider?.getToken?.({interactive:true});if(!t?.ok)return {ok:false,live:false,reason:t?.reason||"Google OAuth not configured"};
  const r=await requestJson(fetchFn,"https://www.googleapis.com/drive/v3/files/"+encodeURIComponent(id)+"?fields=id,name,mimeType,modifiedTime,size,webViewLink",{headers:bearer(t.accessToken)});
  return r.ok?{ok:true,live:true,source:"google-drive",file:r.data}:{ok:false,live:false,reason:r.reason};
 }
 return {listFiles,getFileMetadata};
}
module.exports={createGoogleDriveAdapter};