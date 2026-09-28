const assert=require("assert");
const fs=require("fs"),path=require("path");
const root=path.join(__dirname,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");

const manifest=read("clients/android/app/src/main/AndroidManifest.xml");
assert.ok(manifest.includes("android.permission.INTERNET"));
assert.ok(manifest.includes("android.permission.RECORD_AUDIO"));
assert.ok(manifest.includes('android:exported="false"'),"background service must not be exported");
assert.ok(manifest.includes('android:usesCleartextTraffic="false"'),"Android must disable cleartext traffic");

const androidMain=read("clients/android/app/src/main/java/com/nikky/assistant/MainActivity.kt");
assert.ok(androidMain.includes("Privileged actions must be proposed to Nikky Core"));

const ios=read("clients/ios/Sources/NikkyIOS/NikkyClient.swift");
assert.ok(ios.includes("v1/actions/propose"));
assert.ok(!ios.includes("email.send")&&!ios.includes("sms.send"),"iOS shell must not directly execute privileged providers");

const rust=read("clients/desktop/src-tauri/src/lib.rs");
assert.ok(rust.includes("may_execute_privileged_action_locally"));
assert.ok(rust.includes("false"));

const tauri=JSON.parse(read("clients/desktop/src-tauri/tauri.conf.json"));
assert.ok(tauri.app.security.csp.includes("default-src 'self'"));

const readiness=require("../scripts/release-readiness.js").evaluate({env:{}});
assert.equal(readiness.codeReady,true,"source-level release readiness checks must pass");
assert.equal(readiness.productionReady,false,"production readiness must remain false without external configuration");

console.log("Nikky native/release static checks passed");