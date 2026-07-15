import Script from "next/script";

export const dynamic = "force-dynamic";

/**
 * Nuclear client reset — clears SW/caches/storage then goes to /login.
 * Inline script runs even if a prior deploy’s React chunks are broken.
 */
export default function ResetAppPage() {
  const inline = `
(function(){
  function go(){
    try{location.replace("/login?reset=1");}catch(e){location.href="/login";}
  }
  var tasks=[];
  try{localStorage.clear();}catch(e){}
  try{sessionStorage.clear();}catch(e){}
  if("serviceWorker" in navigator){
    tasks.push(navigator.serviceWorker.getRegistrations().then(function(regs){
      return Promise.all(regs.map(function(r){return r.unregister();}));
    }));
  }
  if("caches" in window){
    tasks.push(caches.keys().then(function(keys){
      return Promise.all(keys.map(function(k){return caches.delete(k);}));
    }));
  }
  Promise.all(tasks).then(go).catch(go);
  setTimeout(go,2500);
})();
`.trim();

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0F0F10] px-6 text-center text-white">
      <Script id="khayaos-reset-app" strategy="beforeInteractive">
        {inline}
      </Script>
      <div>
        <p className="text-lg font-semibold">Resetting KhayaOS cache…</p>
        <p className="mt-2 text-sm text-zinc-400">
          Clearing service workers and cached bundles. You will be sent to sign in.
        </p>
        <p className="mt-6 text-sm">
          <a className="text-[#E07A5F] underline" href="/login?reset=1">
            Continue to sign in
          </a>
        </p>
      </div>
    </div>
  );
}
