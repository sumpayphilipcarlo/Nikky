const {createProviderCredentialVault}=require("../core/provider-credentials.js");
const {createRefreshTokenProvider}=require("../providers/oauth-refresh.js");
const {createGoogleCalendarApiAdapter}=require("../providers/google-calendar-api.js");
const {createGmailAdapter}=require("../providers/gmail.js");
const {createMicrosoft365Adapter}=require("../providers/microsoft365.js");
const {createSpotifyAdapter}=require("../providers/spotify.js");

function refreshProvider(creds,fetchFn){
 if(!creds)return null;
 return createRefreshTokenProvider({
  clientId:creds.clientId,clientSecret:creds.clientSecret,refreshToken:creds.refreshToken,
  tokenUrl:creds.tokenUrl,scope:creds.scope,fetchFn
 });
}
async function buildStoredProviders({repository,userId,keyMaterial,fetchFn}={}){
 if(!repository?.getProviderConnection)return {};
 const vault=createProviderCredentialVault({repository,userId,keyMaterial});
 const [google,microsoft,spotify]=await Promise.all([
  vault.load("google").catch(()=>null),
  vault.load("microsoft365").catch(()=>null),
  vault.load("spotify").catch(()=>null)
 ]);
 const googleTokenProvider=refreshProvider(google?.credentials,fetchFn);
 const microsoftTokenProvider=refreshProvider(microsoft?.credentials,fetchFn);
 const spotifyTokenProvider=refreshProvider(spotify?.credentials,fetchFn);
 return {
  credentialVault:vault,
  googleTokenProvider,
  gmailTokenProvider:googleTokenProvider,
  calendar:googleTokenProvider?createGoogleCalendarApiAdapter({tokenProvider:googleTokenProvider,fetchFn}):undefined,
  gmail:googleTokenProvider?createGmailAdapter({tokenProvider:googleTokenProvider,fetchFn}):undefined,
  microsoftTokenProvider,
  microsoft365:microsoftTokenProvider?createMicrosoft365Adapter({tokenProvider:microsoftTokenProvider,fetchFn}):undefined,
  spotifyTokenProvider,
  spotify:spotifyTokenProvider?createSpotifyAdapter({tokenProvider:spotifyTokenProvider,fetchFn}):undefined
 };
}
module.exports={buildStoredProviders,refreshProvider};