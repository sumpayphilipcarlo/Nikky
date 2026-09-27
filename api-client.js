(function(root,factory){
 const api=factory();if(typeof module==="object"&&module.exports)module.exports=api;root.NikkyApi=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
 function cookie(name){
  if(typeof document==="undefined")return "";
  const p=document.cookie.split(";").map(x=>x.trim()).find(x=>x.startsWith(name+"="));
  return p?decodeURIComponent(p.slice(name.length+1)):"";
 }
 function createClient({baseUrl=""}={}){
  async function request(path,{method="GET",body,headers={}}={}){
   const h={accept:"application/json",...headers};
   if(body!==undefined)h["content-type"]="application/json";
   const csrf=cookie("nikky_csrf");if(!["GET","HEAD","OPTIONS"].includes(method)&&csrf)h["x-nikky-csrf"]=csrf;
   const res=await fetch(baseUrl+path,{method,headers:h,credentials:"include",body:body===undefined?undefined:JSON.stringify(body)});
   let data=null;try{data=await res.json()}catch{}
   if(!res.ok){const e=new Error(data?.message||data?.error||("HTTP "+res.status));e.status=res.status;e.data=data;throw e}
   return data;
  }
  return {
   health:()=>request("/health"),
   session:()=>request("/auth/session"),
   login:idToken=>request("/auth/session",{method:"POST",body:{idToken}}),
   devLogin:devUserId=>request("/auth/session",{method:"POST",body:{devUserId}}),
   logout:()=>request("/auth/session",{method:"DELETE"}),
   status:()=>request("/v1/status"),
   providers:()=>request("/v1/providers"),
   approvals:()=>request("/v1/approvals"),
   audit:()=>request("/v1/audit"),
   workflows:()=>request("/v1/workflows"),
   memory:()=>request("/v1/memory"),
   addMemory:m=>request("/v1/memory",{method:"POST",body:m}),
   deleteMemory:id=>request("/v1/memory/"+encodeURIComponent(id),{method:"DELETE"}),
   propose:a=>request("/v1/actions/propose",{method:"POST",body:a}),
   approve:id=>request("/v1/approvals/"+encodeURIComponent(id)+"/approve",{method:"POST"}),
   reject:id=>request("/v1/approvals/"+encodeURIComponent(id)+"/reject",{method:"POST"})
  };
 }
 return {createClient};
});