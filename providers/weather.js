function weatherCodeLabel(code){
 const map={0:"clear",1:"mainly-clear",2:"partly-cloudy",3:"overcast",45:"fog",48:"rime-fog",51:"drizzle",53:"drizzle",55:"drizzle",61:"rain",63:"rain",65:"heavy-rain",71:"snow",80:"showers",81:"showers",82:"heavy-showers",95:"thunderstorm"};
 return map[code]||"unknown";
}
function createOpenMeteoAdapter({fetchFn}={}){
 const request=fetchFn||(typeof fetch==="function"?fetch.bind(globalThis):null);
 async function current({latitude,longitude}={}){
  if(!request)return {ok:false,live:false,reason:"Fetch API unavailable"};
  if(!Number.isFinite(latitude)||!Number.isFinite(longitude))return {ok:false,live:false,reason:"latitude and longitude are required"};
  const p=new URLSearchParams({
   latitude:String(latitude),longitude:String(longitude),
   current:"temperature_2m,precipitation,rain,weather_code,wind_speed_10m",
   timezone:"auto"
  });
  const r=await request("https://api.open-meteo.com/v1/forecast?"+p);
  if(!r.ok)return {ok:false,live:false,reason:"Open-Meteo returned HTTP "+r.status};
  const j=await r.json(),c=j.current||{};
  return {ok:true,live:true,source:"open-meteo",temperatureC:c.temperature_2m??null,precipitationMm:c.precipitation??0,rainMm:c.rain??0,condition:weatherCodeLabel(c.weather_code),windKph:c.wind_speed_10m??null};
 }
 return {current};
}
module.exports={weatherCodeLabel,createOpenMeteoAdapter};