export const APP_BUILD_STORAGE_KEY = "khayaos_app_build";
export const PWA_CACHE_EPOCH = "16";
export const PWA_CACHE_EPOCH_KEY = "khayaos_cache_epoch";
export const BOOT_RELOAD_KEY = "khayaos_boot_reload";
export const RESET_COUNT_KEY = "khayaos_reset_count";
export const MAX_RESET_ATTEMPTS = 2;
export const CHUNK_RELOAD_KEY = "khayaos_chunk_reload";

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

  function showPage(){
    try{root.style.visibility="";}catch(e){}
  }

  function pinCurrentBuild(preferredBuild){
    try{localStorage.setItem(BUILD_KEY,preferredBuild||pageBuild);}catch(e){}
    try{localStorage.setItem(EPOCH_KEY,CACHE_EPOCH);}catch(e){}
    try{sessionStorage.removeItem(RESET_COUNT_KEY);}catch(e){}
    showPage();
  }

  // Always paint immediately — never leave auth/login blank.
  showPage();

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
      pinCurrentBuild(serverBuild);
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
      try{
        var url=new URL(window.location.href);
        // Never keep stacking cache-bust params (was: ?_v=a&_v=b).
        url.searchParams.delete("_v");
        url.searchParams.set("_v",String(Date.now()));
        window.location.replace(url.pathname+url.search+url.hash);
      }catch(e){
        window.location.replace(window.location.pathname+"?_v="+Date.now());
      }
    });
  }

  function isAuthSurface(){
    try{
      var p=window.location.pathname||"";
      return p==="/ops/login"
        ||p==="/ops/reset-app"
        ||p==="/ops/forgot-password"
        ||p==="/ops/reset-password"
        ||p.indexOf("/ops/verify-email")===0;
    }catch(e){
      return false;
    }
  }

  function evaluate(serverBuild){
    // Never hard-reload auth/login mid-session — it looks like Sign In "just refreshes"
    // and wipes form/navigation. Pin the serving build and continue.
    if(isAuthSurface()){
      try{
        if(serverBuild){localStorage.setItem(BUILD_KEY,serverBuild);}
        localStorage.setItem(EPOCH_KEY,CACHE_EPOCH);
      }catch(e){}
      pinCurrentBuild(serverBuild);
      return;
    }
    if(!serverBuild){
      pinCurrentBuild(null);
      return;
    }
    var storedBuild=null;
    var storedEpoch=null;
    try{storedBuild=localStorage.getItem(BUILD_KEY);}catch(e){}
    try{storedEpoch=localStorage.getItem(EPOCH_KEY);}catch(e){}
    // Fresh storage (e.g. after /reset-app): pin server build — do not hard-reset loops.
    if(!storedBuild&&!storedEpoch){
      pinCurrentBuild(serverBuild);
      return;
    }
    var stalePage=pageBuild!==serverBuild;
    var staleStorage=Boolean(storedBuild&&storedBuild!==serverBuild);
    var staleEpoch=Boolean(storedEpoch)&&storedEpoch!==CACHE_EPOCH;
    if(stalePage||staleStorage||staleEpoch){
      hardReset(serverBuild);
      return;
    }
    pinCurrentBuild(serverBuild);
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

  // Catch deleted /_next/static chunks from a previous deploy (before React boots).
  var chunkReloadKey=${JSON.stringify(CHUNK_RELOAD_KEY)};
  function canRecoverChunk(){
    var now=Date.now();
    try{
      var last=parseInt(sessionStorage.getItem(chunkReloadKey)||"0",10)||0;
      if(last&&now-last<10000)return false;
      sessionStorage.setItem(chunkReloadKey,String(now));
    }catch(e){}
    return true;
  }
  window.addEventListener("error",function(event){
    var target=event&&event.target;
    var src=target&&target.src?String(target.src):"";
    if(!src||src.indexOf("/_next/static/")<0)return;
    if(!canRecoverChunk())return;
    var tasks=[];
    if("serviceWorker" in navigator){
      tasks.push(navigator.serviceWorker.getRegistrations().then(function(regs){
        return Promise.all(regs.map(function(r){return r.unregister();}));
      }));
    }
    if("caches" in window){
      tasks.push(caches.keys().then(function(keys){
        return Promise.all(keys.map(function(key){return caches.delete(key);}));
      }));
    }
    Promise.all(tasks).finally(function(){
      try{
        var url=new URL(window.location.href);
        url.searchParams.delete("_v");
        url.searchParams.set("_v",String(Date.now()));
        window.location.replace(url.pathname+url.search+url.hash);
      }catch(e){
        window.location.replace(window.location.pathname+"?_v="+Date.now());
      }
    });
  },true);
})(${JSON.stringify(pageBuild)});
`.trim();
}
