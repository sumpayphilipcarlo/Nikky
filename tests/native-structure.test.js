const assert=require("assert");
const fs=require("fs"),path=require("path");
const root=path.join(__dirname,"..","clients");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");

const androidManifest=read("android/app/src/main/AndroidManifest.xml");
const androidActivity=read("android/app/src/main/java/com/nikky/assistant/MainActivity.kt");
assert.ok(androidManifest.includes('android:usesCleartextTraffic="false"'));
assert.ok(androidManifest.includes('android.permission.POST_NOTIFICATIONS'));
assert.ok(androidManifest.includes('android.permission.RECORD_AUDIO'));
assert.ok(androidActivity.includes('u.scheme == "https"'));
assert.ok(androidActivity.includes('u.host == allowedOrigin'));
assert.ok(!androidActivity.includes("addJavascriptInterface"),"Android shell must not expose an unrestricted JS bridge");

const iosPlist=read("ios/Nikky/Info.plist");
const iosView=read("ios/Nikky/ContentView.swift");
assert.ok(iosPlist.includes("NSMicrophoneUsageDescription"));
assert.ok(iosPlist.includes("NSLocationWhenInUseUsageDescription"));
assert.ok(iosView.includes('url.scheme == "https"'));
assert.ok(iosView.includes("url.host == origin"));

const tauri=JSON.parse(read("desktop/src-tauri/tauri.conf.json"));
assert.ok(tauri.app.security.csp.includes("default-src 'self'"));
assert.equal(tauri.bundle.active,true);
assert.ok(fs.existsSync(path.join(root,"desktop/src-tauri/src/main.rs")));

for(const p of ["android/capabilities.json","ios/capabilities.json","desktop/capabilities.json"]){
  const m=JSON.parse(read(p));
  assert.ok(m.status,"capability manifest must have status");
}
console.log("Nikky native client structure checks passed");