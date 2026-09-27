const DEFAULT_CATEGORIES={
 routines:{retentionDays:null,learn:true},
 communications:{retentionDays:90,learn:true},
 location:{retentionDays:30,learn:false},
 health:{retentionDays:0,learn:false},
 files:{retentionDays:30,learn:false},
 relationships:{retentionDays:365,learn:true}
};
function createPrivacyController(initial={}){
 const categories=JSON.parse(JSON.stringify({...DEFAULT_CATEGORIES,...initial}));
 const neverLearn=new Set();
 function setCategory(name,patch){categories[name]={...(categories[name]||{}),...patch};return categories[name]}
 function canLearn(category,key){return categories[category]?.learn!==false&&!neverLearn.has(category+":"+key)}
 function blockLearning(category,key="*"){neverLearn.add(category+":"+key)}
 function unblockLearning(category,key="*"){neverLearn.delete(category+":"+key)}
 function retentionFor(category){return categories[category]?.retentionDays??null}
 function exportSettings(){return {categories:JSON.parse(JSON.stringify(categories)),neverLearn:[...neverLearn]}}
 return {setCategory,canLearn,blockLearning,unblockLearning,retentionFor,exportSettings,categories};
}
module.exports={DEFAULT_CATEGORIES,createPrivacyController};