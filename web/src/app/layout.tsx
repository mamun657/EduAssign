import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import { AuthProvider } from "@/components/auth/AuthProvider";

/**
 * Pre-hydration script that strips browser-extension-injected HTML
 * attributes (e.g. `bis_skin_checked="1"` from Bitdefender and various
 * privacy / anti-tracking / accessibility extensions) BEFORE React
 * hydrates. Without this, React prints a hydration-mismatch warning for
 * any element that an extension mutated.
 *
 * Reference: https://react.dev/link/hydration-mismatch
 *  "It can also happen if the client has a browser extension installed
 *   which messes with the HTML before React loaded."
 *
 * The script is emitted here as a literal <script> in server-rendered
 * HTML (because the root layout is a Server Component) so it executes
 * synchronously in <head> before any client React code runs. A
 * MutationObserver covers any attribute that appears later on existing
 * elements.
 */
// Comprehensive list of attribute prefixes/values known to be injected by
// browser extensions (Bitdefender, Avast, Norton, Grammarly, anti-tracking
// extensions, accessibility add-ons, etc.). Conservative: only matches
// unambiguous extension patterns. Real EduAssign Pro application
// attributes are never matched.
const HYDRATION_SCRUBBER_SCRIPT = `(function(){var P=["bis_skin_","bis_register","__processed_","data-extension-","data-bis-","data-avast-","data-grammarly-","data-avira-","data-norton-","data-malwarebytes-","data-mcafee-"];var E=["cz-shortcut-listen"];function isBad(n){n=String(n).toLowerCase();if(E.indexOf(n)!==-1)return true;for(var i=0;i<E.length;i++){if(n.indexOf(E[i])===0)return true;}for(var j=0;j<P.length;j++){if(n.indexOf(P[j])===0)return true;}return false;}function scrub(root){if(!root||!root.querySelectorAll)return;var nodes=root.querySelectorAll("*");for(var i=0;i<nodes.length;i++){var el=nodes[i];var attrs=el.attributes;var rm=[];for(var k=0;k<attrs.length;k++){if(isBad(attrs[k].name))rm.push(attrs[k].name);}for(var m=0;m<rm.length;m++)el.removeAttribute(rm[m]);}}scrub(document);document.addEventListener("DOMContentLoaded",function(){scrub(document);});try{var obs=new MutationObserver(function(muts){for(var i=0;i<muts.length;i++){var mu=muts[i];if(mu.type==="attributes"&&mu.target&&isBad(mu.attributeName)){mu.target.removeAttribute(mu.attributeName);}}});obs.observe(document.documentElement,{attributes:true,subtree:true,childList:false});}catch(e){}})();`;

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
          This is a literal server-rendered <script>. Because RootLayout is
          a Server Component, dangerouslySetInnerHTML here outputs the script
          verbatim in the SSR HTML — it runs synchronously in <head>
          before any React code, which is exactly when extensions mutate
          the DOM. This is the only place in the React tree where this
          pattern is safe; emitting a <script> from a Client Component
          would produce the "Encountered a script tag while rendering
          React component" warning and the script would not execute.
        */}
        <script dangerouslySetInnerHTML={{ __html: HYDRATION_SCRUBBER_SCRIPT }} />
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
