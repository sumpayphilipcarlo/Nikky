function createDocumentWorkflow({files,intelligence,resolveRecipient,proposeAction}={}){
 if(!files?.current||!intelligence?.analyze)throw new Error("file context and intelligence required");
 async function summarizeSelected({instruction}={}){
  const file=files.current();if(!file)return {ok:false,reason:"no file selected"};
  const analysis=await intelligence.analyze(file,{instruction});
  return analysis.ok?{ok:true,file,analysis}:{ok:false,...analysis};
 }
 async function summarizeAndPrepareEmail({recipientQuery,subject,instruction}={}){
  const summary=await summarizeSelected({instruction});if(!summary.ok)return summary;
  const recipient=typeof resolveRecipient==="function"?await resolveRecipient(recipientQuery):recipientQuery;
  if(!recipient)return {ok:false,reason:"recipient could not be resolved"};
  const text=summary.analysis.result?.summary||JSON.stringify(summary.analysis.result);
  const action={
   type:"email.send",
   title:"Email document summary",
   summary:`Send summary of ${summary.file.name} to ${recipient}`,
   payload:{recipient,subject:subject||("Summary: "+summary.file.name),body:text,fileId:summary.file.id},
   meta:{externalImpact:true,sensitiveData:true},
   provenance:{source:"document-workflow",fileHash:summary.file.hash}
  };
  const proposal=typeof proposeAction==="function"?await proposeAction(action):{status:"not_proposed"};
  return {ok:true,file:summary.file,analysis:summary.analysis,recipient,action,proposal};
 }
 return {summarizeSelected,summarizeAndPrepareEmail};
}
module.exports={createDocumentWorkflow};