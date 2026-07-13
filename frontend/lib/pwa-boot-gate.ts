export const APP_BUILD_STORAGE_KEY = "khayaos_app_build";
export const PWA_CACHE_EPOCH = "7";
export const PWA_CACHE_EPOCH_KEY = "khayaos_cache_epoch";
export const BOOT_RELOAD_KEY = "khayaos_boot_reload";
export const RESET_COUNT_KEY = "khayaos_reset_count";
export const MAX_RESET_ATTEMPTS = 2;

export function getPwaBootGateScript(pageBuild: string): string {
  return `
(function(pageBuild){
  var BUILD_KEY=${JSON.stringify(APP_BUILD_STORAGE_KEY)};
  var EPOCH_KEY=${JSON.stringify(PWA_CACHE_EPOCH_KEY)};
  var RELOAD_KEY=${JSON.stringify(BOOT_RELOAD_KEY)};
  var RESET_COUNT_KEY=${JSON.stringify(RESET_COUNT_KEY)};
  var CACHE_EPOCH=${JSON.stringify(PWA_CACHE_EPOCH)};
  var MAX_RESETS=${MAX_RESET_ATTEMPTS};
  var root=document.documentElement;
  var path=(location.pathname||"");
  var isAuthPath=path==="/login")||path.indexOf("/login/")===0||path==="/forgot-password")||path==="/reset-password"||path==="/verify-email"||path==="/verify-email-pending"||path==="/get-started";

  function showPage(){
    try{root.style.visibility="";}catch(e){}
  }

  function pinCurrentBuild(){
    try{localStorage.setItem(BUILD_KEY,pageBuild);}catch(e){}
    try{localStorage.setItem(EPOCH_KEY,CACHE_EPOCH);}catch(e){}
    try{sessionStorage.removeItem(RESET_COUNT_KEY);}catch(e){}
    showPage();
  }

  // Auth pages must never enter a reset/reload loop — paint immediately.
  if(isAuthPath){
    pinCurrentBuild();
    return;
  }

  try{
    if(sessionStorage.getItem(RELOAD_KEY)==="1"){
      sessionStorage.removeItem(RELOAD_KEY);
      pinCurrentBuild();
      return;
    }
  }catch(e){
    pinCurrentBuild();
    return;
  }

  function hardReset(serverBuild){
    var count=0;
    try{count=parseInt(sessionStorage.getItem(RESET_COUNT_KEY)||"0",10)||0;}catch(e){
      pinCurrentBuild();
      return;
    }
    if(count>=MAX_RESETS){
      pinCurrentBuild();
      return;
    }
    try{sessionStorage.setItem(RESET_COUNT_KEY,String(count+1));}catch(e){
      pinCurrentBuild();
      return;
    }
    try{localStorage.setItem(BUILD_KEY,serverBuild||pageBuild);}catch(e){}
    try{localStorage.setItem(EPOCH_KEY,CACHE_EPOCH);}catch(e){}
    try{sessionStorage.setItem(RELOAD_KEY,"1");}catch(e){
      pinCurrentBuild();
      return;
    }
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
      var target=window.location.pathname+window.location.search;
      var sep=target.indexOf("?")>=0?"&":"?";
      window.location.replace(target+sep+"_v="+Date.now());
    });
  }

  function evaluate(serverBuild){
    if(!serverBuild){
      showPage();
      return;
    }
    var storedBuild=null;
    var storedEpoch=null;
    try{storedBuild=localStorage.getItem(BUILD_KEY);}catch(e){}
    try{storedEpoch=localStorage.getItem(EPOCH_KEY);}catch(e){}
    var stalePage=pageBuild!==serverBuild;
    var staleStorage=Boolean(storedBuild&&storedBuild!==serverBuild);
    var staleEpoch=Boolean(storedEpoch)&&storedEpoch!==CACHE_EPOCH;
    if(stalePage||staleStorage||staleEpoch){
      hardReset(serverBuild);
      return;
    }
    pinCurrentBuild();
  }

  var finished=false;
  function finish(serverBuild){
    if(finished)return;
    finished=true;
    evaluate(serverBuild);
  }

  window.setTimeout(function(){finish(null);},4000);

  fetch("/app-version.json",{cache:"no-store"})
    .then(function(res){return res.ok?res.json():null;})
    .then(function(data){finish(data&&data.build);})
    .catch(function(){finish(null);});
})(${JSON.stringify(pageBuild)});
`.trim();
}
