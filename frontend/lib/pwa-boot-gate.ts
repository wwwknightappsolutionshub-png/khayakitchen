export const APP_BUILD_STORAGE_KEY = "khayaos_app_build";
export const PWA_CACHE_EPOCH = "2";
export const PWA_CACHE_EPOCH_KEY = "khayaos_cache_epoch";
export const BOOT_RELOAD_KEY = "khayaos_boot_reload";

export function getPwaBootGateScript(pageBuild: string): string {
  return `
(function(pageBuild){
  var BUILD_KEY=${JSON.stringify(APP_BUILD_STORAGE_KEY)};
  var EPOCH_KEY=${JSON.stringify(PWA_CACHE_EPOCH_KEY)};
  var RELOAD_KEY=${JSON.stringify(BOOT_RELOAD_KEY)};
  var CACHE_EPOCH=${JSON.stringify(PWA_CACHE_EPOCH)};
  var root=document.documentElement;
  root.style.visibility="hidden";

  function showPage(){
    root.style.visibility="";
  }

  try{
    if(sessionStorage.getItem(RELOAD_KEY)==="1"){
      sessionStorage.removeItem(RELOAD_KEY);
      showPage();
      return;
    }
  }catch(e){}

  function hardReset(serverBuild){
    try{localStorage.setItem(BUILD_KEY,serverBuild);}catch(e){}
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
      var url=new URL(window.location.href);
      url.searchParams.set("_v",String(Date.now()));
      window.location.replace(url.toString());
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
