function loadConfig(env=process.env){
 const config={
  port:Number(env.PORT||3000),
  serviceToken:env.NIKKY_SERVICE_TOKEN||"",
  memoryKey:env.NIKKY_MEMORY_KEY||"",
  environment:env.NODE_ENV||"development"
 };
 const warnings=[];
 if(!config.serviceToken)warnings.push("NIKKY_SERVICE_TOKEN is not configured");
 if(!config.memoryKey)warnings.push("NIKKY_MEMORY_KEY is not configured");
 return {config,warnings};
}
module.exports={loadConfig};