function loadConfig(env=process.env){
 const config={
  port:Number(env.PORT||3000),
  serviceToken:env.NIKKY_SERVICE_TOKEN||"",
  memoryKey:env.NIKKY_MEMORY_KEY||"",
  environment:env.NODE_ENV||"development",
  dataDir:env.NIKKY_DATA_DIR||"./data",
  databaseUrl:env.DATABASE_URL||"",
  allowedOrigins:(env.NIKKY_ALLOWED_ORIGINS||"").split(",").map(x=>x.trim()).filter(Boolean),
  sessionSecret:env.NIKKY_SESSION_SECRET||"",
  oidcIssuer:env.NIKKY_OIDC_ISSUER||"",
  oidcClientId:env.NIKKY_OIDC_CLIENT_ID||"",
  allowDevLogin:String(env.NIKKY_ALLOW_DEV_LOGIN||"false").toLowerCase()==="true",
  defaultUserId:env.NIKKY_DEFAULT_USER_ID||""
 };
 const warnings=[],errors=[];
 if(!Number.isFinite(config.port)||config.port<1||config.port>65535)errors.push("PORT must be a valid TCP port");
 if(!config.serviceToken)warnings.push("NIKKY_SERVICE_TOKEN is not configured");
 else if(config.serviceToken.length<32)warnings.push("NIKKY_SERVICE_TOKEN should be at least 32 characters");
 if(!config.memoryKey)warnings.push("NIKKY_MEMORY_KEY is not configured");
 if(!config.sessionSecret)warnings.push("NIKKY_SESSION_SECRET is not configured");
 else if(config.sessionSecret.length<32)warnings.push("NIKKY_SESSION_SECRET should be at least 32 characters");
 else if(config.memoryKey.length<32)warnings.push("NIKKY_MEMORY_KEY should be at least 32 characters");
 if(config.environment==="production"){
  if(!config.serviceToken)errors.push("NIKKY_SERVICE_TOKEN is required in production");
  if(!config.memoryKey)errors.push("NIKKY_MEMORY_KEY is required in production");
  if(!config.sessionSecret)errors.push("NIKKY_SESSION_SECRET is required in production");
  if(config.allowDevLogin)errors.push("NIKKY_ALLOW_DEV_LOGIN must be false in production");
  if(!config.oidcIssuer||!config.oidcClientId)warnings.push("OIDC is not fully configured; interactive user login will be unavailable");
  if(config.oidcIssuer&&config.oidcClientId&&!config.defaultUserId)warnings.push("NIKKY_DEFAULT_USER_ID should match the authorized OIDC subject for single-user production login");
  if(!config.databaseUrl)warnings.push("DATABASE_URL is not configured; production persistence will not use PostgreSQL");
 }
 return {config,warnings,errors,valid:errors.length===0};
}
function assertValidConfig(env=process.env){
 const loaded=loadConfig(env);
 if(!loaded.valid)throw new Error("Invalid Nikky configuration: "+loaded.errors.join("; "));
 return loaded;
}
module.exports={loadConfig,assertValidConfig};