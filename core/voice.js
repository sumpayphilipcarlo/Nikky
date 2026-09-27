function createVoiceSession({speakerVerifier,transcriber,synthesizer}={}){
 const turns=[];let verified=false;
 async function verify(sample){
  if(!speakerVerifier){verified=false;return {ok:false,reason:"speaker verifier not configured"}}
  const r=await speakerVerifier(sample);verified=!!r?.verified;return r;
 }
 async function transcribe(audio){
  if(!transcriber)return {ok:false,reason:"transcriber not configured"};
  const r=await transcriber(audio);if(r?.text)turns.push({role:"user",text:r.text,at:new Date().toISOString()});return r;
 }
 async function speak(text){
  turns.push({role:"assistant",text:String(text),at:new Date().toISOString()});
  if(!synthesizer)return {ok:false,reason:"speech synthesizer not configured"};
  return synthesizer(String(text));
 }
 return {verify,transcribe,speak,isVerified:()=>verified,turns};
}
function createWakeWordController({detector}={}){
 let listening=false;
 async function start(){if(!detector?.start)return {ok:false,reason:"native wake-word detector not configured"};const r=await detector.start();listening=!!r?.ok;return r}
 async function stop(){if(detector?.stop)await detector.stop();listening=false;return {ok:true}}
 return {start,stop,isListening:()=>listening};
}
module.exports={createVoiceSession,createWakeWordController};