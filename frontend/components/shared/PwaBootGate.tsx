import Script from "next/script";
import { APP_BUILD_STORAGE_KEY } from "@/lib/pwa";

const BOOT_RELOAD_KEY = "khayaos_boot_reload";

function bootGateScript(pageBuild: string): string {
  return `
(function(pageBuild){
  var BUILD_KEY=${JSON.stringify(APP_BUILD_STORAGE_KEY)};
  var RELOAD_KEY=${JSON.stringify(BOOT_RELOAD_KEY)};
  try{
    if(sessionStorage.getItem(RELOAD_KEY)==="1"){
      sessionStorage.removeItem(RELOAD_KEY);
      return;
    }
  }catch(e){}

  function hardReset(serverBuild){
    try{localStorage.setItem(BUILD_KEY,serverBuild);}catch(e){}
    try{sessionStorage.setItem(RELOAD_KEY,"1");}catch(e){}
    var tasks=[];
    if("serviceWorker" in navigator){
      tasks.push(
        navigator.serviceWorker.getRegistrations().then(function(regs){
          return Promise.all(regs.map(function(r){return r.unregister();}));
        })
      );
    }
    if("caches" in window){
      tasks.push(
        caches.keys().then(function(keys){
          return Promise.all(keys.map(function(key){return caches.delete(key);}));
        })
      );
    }
    Promise.all(tasks).finally(function(){
      var url=new URL(window.location.href);
      url.searchParams.set("_v",String(Date.now()));
      window.location.replace(url.toString());
    });
  }

  fetch("/app-version.json",{cache:"no-store"})
    .then(function(res){return res.ok?res.json():null;})
    .then(function(data){
      var serverBuild=data&&data.build;
      if(!serverBuild)return;
      var stored=null;
      try{stored=localStorage.getItem(BUILD_KEY);}catch(e){}
      if(pageBuild!==serverBuild||(stored&&stored!==serverBuild)){
        hardReset(serverBuild);
        return;
      }
      try{localStorage.setItem(BUILD_KEY,serverBuild);}catch(e){}
    })
    .catch(function(){});
})(${JSON.stringify(pageBuild)});
`.trim();
}

export function PwaBootGate({ buildId }: { buildId: string }) {
  return (
    <Script
      id="pwa-boot-gate"
      strategy="beforeInteractive"
      dangerouslySetInnerHTML={{ __html: bootGateScript(buildId) }}
    />
  );
}
