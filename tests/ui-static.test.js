const assert=require("assert");
const fs=require("fs"),path=require("path");
const html=fs.readFileSync(path.join(__dirname,"..","index.html"),"utf8");

assert.ok(html.includes('script src="api-client.js"'),"PWA must load Nikky API client");
assert.ok(html.includes('id="coreStatus"'),"PWA must surface backend connection state");
assert.ok(html.includes('data-view="system"'),"PWA must expose the System control center");
assert.ok(html.includes('id="systemProviders"'),"System view must expose provider state");
assert.ok(html.includes('id="systemFabric"'),"System view must expose Fabric state");
assert.ok(html.includes('id="systemGuardian"'),"System view must expose Guardian state");
assert.ok(!html.includes("Prototype live"),"UI must not claim adapters are live merely because code exists");
assert.ok(!html.includes("Live Calendar, Maps, and SMS providers are not connected yet."),"Journey copy must not use stale hardcoded provider status");
assert.ok(html.includes('aria-label="Talk to Nikky"'),"top microphone needs an accessible name");
assert.ok(html.includes('aria-label="Start voice input"'),"voice microphone needs an accessible name");
assert.ok(html.includes(':focus-visible'),"keyboard focus must be visible");
assert.ok(!/NIKKY_SERVICE_TOKEN|serviceToken\s*=/.test(html),"service tokens must never appear in browser HTML");

const ids=[...html.matchAll(/\sid="([^"]+)"/g)].map(m=>m[1]);
const duplicates=ids.filter((id,i)=>ids.indexOf(id)!==i);
assert.deepEqual([...new Set(duplicates)],[],"HTML IDs must be unique");

const inline=[...html.matchAll(/<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]).filter(x=>x.trim());
for(const script of inline){
  assert.doesNotThrow(()=>new Function(script),"inline browser JavaScript must parse");
}

const api=require("../api-client.js");
assert.equal(typeof api.createClient,"function");

console.log("Nikky UI static checks passed");