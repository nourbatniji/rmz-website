import { LOADER_ID, LOADER_SESSION_KEY } from "./loader-config";

/**
 * Server component, rendered right after the loader cover. Two jobs, both before hydration and before the first paint can show the wrong thing:
 *  - a tiny blocking script hides the (server-rendered, opaque) cover at once when this entry should not show a loader — reload / back-forward, anchor,
 *    already scrolled, already seen in this tab, or arriving from another page of the site. Same rules as `entryDecision` in loader-run.ts.
 *    Any failure hides the cover (the page must always be reachable).
 *  - <noscript> hides the cover when JavaScript is off: the page is the normal static page.
 * The cover only ever changes its own data-state attribute (suppressHydrationWarning on the element).
 */
const BOOT = `(function(){var e=document.getElementById("${LOADER_ID}");if(!e)return;try{var off=false,n=performance.getEntriesByType&&performance.getEntriesByType("navigation")[0];if(n&&n.type!=="navigate"&&n.type!=="prerender")off=true;if(location.hash)off=true;if((window.scrollY||window.pageYOffset||0)>8)off=true;try{if(sessionStorage.getItem("${LOADER_SESSION_KEY}"))off=true}catch(x){}try{if(document.referrer&&new URL(document.referrer).origin===location.origin)off=true}catch(x){}if(off)e.setAttribute("data-state","off")}catch(x){e.setAttribute("data-state","off")}})();`;

export function PageLoaderBoot() {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: BOOT }} />
      <noscript>
        <style>{`#${LOADER_ID}{display:none!important}`}</style>
      </noscript>
    </>
  );
}
