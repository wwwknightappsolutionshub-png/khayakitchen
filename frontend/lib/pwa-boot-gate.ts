export const APP_BUILD_STORAGE_KEY = "khayaos_app_build";
export const PWA_CACHE_EPOCH = "3";
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
  root.style.visibility="hidden";

  function showPage(){
    root.style.visibility="";
  }

  function pinCurrentBuild(){
    try{localStorage.setItem(BUILD_KEY,pageBuild);}catch(e){}
    try{localStorage.setItem(EPOCH_KEY,CACHE_EPOCH);}catch(e){}
    try{sessionStorage.removeItem(RESET_COUNT_KEY);}catch(e){}
    showPage();
  }

  try{
    if(sessionStorage.getItem(RELOAD_KEY)==="1"){
      sessionStorage.removeItem(RELOAD_KEY);
      showPage();
      return;
    }
  }catch(e){}

  function hardReset(serverBuild){
    var count=0;
    try{count=parseInt(sessionStorage.getItem(RESET_COUNT_KEY)||"0",10)||0;}catch(e){}
    if(count>=MAX_RESETS){
      pinCurrentBuild();
      return;
    }
    try{sessionStorage.setItem(RESET_COUNT_KEY,String(count+1));}catch(e){}
    try{localStorage.setItem(BUILD_KEY,serverBuild||pageBuild);}catch(e){}
    try{localStorage.setItem(EPOCH_KEY,CACHE_EPOCH);}catch(e){}
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
      window.location.replace("/?_v="+Date.now());
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
    var staleEpoch=storedEpoch!==CACHE_EPOCH;
    if(stalePage||staleStorage||staleEpoch){
      hardReset(serverBuild);
      return;
    }
    try{localStorage.setItem(BUILD_KEY,serverBuild);}catch(e){}
    try{localStorage.setItem(EPOCH_KEY,CACHE_EPOCH);}catch(e){}
    try{sessionStorage.removeItem(RESET_COUNT_KEY);}catch(e){}
    showPage();
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
