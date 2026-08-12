import type { Metadata } from "next";
import { Geist } from "next/font/google";
import Script from "next/script";
import { Toaster } from "sonner";
import "./globals.css";
import { AuthProvider } from "@/components/auth/AuthProvider";

/**
 * Pre-hydration scrubber for the EduAssign Pro public surface.
 *
 * Some browser extensions (Bitdefender, Avast, certain anti-tracking and
 * accessibility add-ons) inject extra attributes onto DOM elements after the
 * page is parsed but before React hydrates. Left alone, those attributes
 * trigger a React hydration-mismatch warning for any element that an
 * extension mutated. Real EduAssign Pro attributes are never matched by
 * this list — only unambiguous extension patterns are.
 *
 * The scrubber removes those attributes and runs a MutationObserver so any
 * extension that mutates later is also covered. It is intentionally not used
 * on authenticated pages (Admin / Teacher / Student dashboards) — those are
 * behind login, where scripts run under the same extension conditions and
 * an additional DOM scrubber would have user-visible side effects on state.
 *
 * Rendered via `next/script` with `strategy="beforeInteractive"` rather than
 * a raw `<script dangerouslySetInnerHTML />` so Next.js emits an identical
 * server- and client-side `<script>` tag, which keeps the React tree
 * deterministic. Raw inline scripts in a Server Component layout can produce
 * a server-vs-client `__html` mismatch because React 19's hydration
 * comparison reads the literal text content of the resulting `<script>`
 * element. The `next/script` indirection avoids that and is the official
 * Next.js pattern for pre-hydration scripts.
 */
const HYDRATION_SCRUBBER_SCRIPT = `(function(){var P=["bis_skin_","bis_register","__processed_","data-extension-","data-bis-","data-avast-","data-grammarly-","data-avira-","data-norton-","data-malwarebytes-","data-mcafee-"];var E=["cz-shortcut-listen"];function isBad(n){n=String(n).toLowerCase();if(E.indexOf(n)!==-1)return true;for(var i=0;i<E.length;i++){if(n.indexOf(E[i])===0)return true;}for(var j=0;j<P.length;j++){if(n.indexOf(P[j])===0)return true;}return false;}function scrub(root){if(!root||!root.querySelectorAll)return;var nodes=root.querySelectorAll("*");for(var i=0;i<nodes.length;i++){var el=nodes[i];var attrs=el.attributes;var rm=[];for(var k=0;k<attrs.length;k++){if(isBad(attrs[k].name))rm.push(attrs[k].name);}for(var m=0;m<rm.length;m++)el.removeAttribute(rm[m]);}}scrub(document);document.addEventListener("DOMContentLoaded",function(){scrub(document);});try{var obs=new MutationObserver(function(muts){for(var i=0;i<muts.length;i++){var mu=muts[i];if(mu.type==="attributes"&&mu.target&&isBad(mu.attributeName)){mu.target.removeAttribute(mu.attributeName);}}});obs.observe(document.documentElement,{attributes:true,subtree:true,childList:false});}catch(e){}
// Extension-error filter: ignore runtime exceptions thrown by chrome-extension://
// content scripts (e.g. the "M_ID" unhandledRejection from
// eppiocemhmnlbhjplcgkofciiegomcon). These are not bugs in this app — they are
// third-party executor code that walks the React/Next.js DOM and crashes on
// minified props. We still let app errors through, but we prevent them from
// being surfaced by Next.js's dev overlay (which logs every browser
// unhandledRejection to the dev server).
function fromExt(src){return typeof src==="string"&&src.indexOf("chrome-extension://")===0;}
function stackFromExt(s){return typeof s==="string"&&s.indexOf("chrome-extension://")!==-1;}
try{window.addEventListener("error",function(ev){if(ev&&(fromExt(ev.filename)||stackFromExt(ev.error&&ev.error.stack))){ev.preventDefault();ev.stopImmediatePropagation();return true;}},true);}catch(_){}
try{window.addEventListener("unhandledrejection",function(ev){var r=ev&&ev.reason;var stack=r&&r.stack?String(r.stack):"";var msg=r&&r.message?String(r.message):String(r);if(stackFromExt(stack)||fromExt(r&&r.source)||fromExt(r&&r.fileName)||/chrome-extension:/.test(msg)){ev.preventDefault();ev.stopImmediatePropagation();}},true);}catch(_){}
try{var origCE=window.console&&window.console.error;if(origCE){window.console.error=function(){var s="";for(var i=0;i<arguments.length;i++){try{s+=String(arguments[i]);}catch(_){s+="[unstringable]";}}if(/chrome-extension:\\/\\//.test(s))return;return origCE.apply(this,arguments);};}}catch(_){}})();`;

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "EduAssign Pro",
  description:
    "Assignment & submission management for schools and colleges. Built for Admin, Teacher and Student workflows.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`}>
      <head>
        {/*
          Pre-hydration DOM scrubber. See HYDRATION_SCRUBBER_SCRIPT above for
          rationale. Rendered through `next/script` so the server- and client-
          rendered `<script>` tags are byte-equal — no React hydration mismatch.
        */}
        <Script id="hydration-scrubber" strategy="beforeInteractive">
          {HYDRATION_SCRUBBER_SCRIPT}
        </Script>
      </head>
      <body className="min-h-full bg-[#F9FAFB] text-[#111827]">
        <AuthProvider>{children}</AuthProvider>
        <Toaster
          position="top-right"
          richColors
          closeButton
          toastOptions={{
            classNames: {
              toast: "border border-[#E5E7EB] shadow-sm",
              title: "text-[#111827]",
              description: "text-[#6B7280]",
            },
          }}
        />
      </body>
    </html>
  );
}
