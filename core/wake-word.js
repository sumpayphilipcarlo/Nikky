function createWakeWordController({engine,permissionCheck=async()=>false,onDetection=()=>{},onState=()=>{}}={}){
 let running=false,lastDetectionAt=0;
 async function start(){
  if(running)return {ok:true,alreadyRunning:true};
  const allowed=await permissionCheck();
  if(!allowed)return {ok:false,reason:"microphone permission not granted"};
  if(!engine?.start)return {ok:false,reason:"wake-word engine unavailable"};
  await engine.start(async event=>{
   lastDetectionAt=Date.now();
   onDetection({phrase:event?.phrase||"hey nikky",confidence:Number(event?.confidence)||0,at:lastDetectionAt});
  });
  running=true;onState({running:true});return {ok:true};
 }
 async function stop(){
  if(!running)return {ok:true,alreadyStopped:true};
  await engine?.stop?.();running=false;onState({running:false});return {ok:true};
 }
 function status(){return {running,lastDetectionAt}}
 return {start,stop,status};
}
module.exports={createWakeWordController};