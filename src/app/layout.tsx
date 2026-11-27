import type { Metadata } from "next";
import { Outfit, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AparienciaFlotante, { SCRIPT_APARIENCIA } from "@/components/Apariencia";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Firplak Servicios",
  description: "Sistema de gestión de servicios Firplak",
};

// Red de seguridad si un traductor o extension del navegador modifica el DOM
// igualmente: evita que React tumbe la pagina cuando el nodo que intenta
// quitar/insertar ya no es hijo directo del padre (facebook/react#11538).
const SCRIPT_GUARDA_DOM = `(function(){if(typeof Node!=='function'||!Node.prototype)return;
var rc=Node.prototype.removeChild;Node.prototype.removeChild=function(c){if(c.parentNode!==this){return c;}return rc.apply(this,arguments);};
var ib=Node.prototype.insertBefore;Node.prototype.insertBefore=function(n,r){if(r&&r.parentNode!==this){return ib.call(this,n,null);}return ib.apply(this,arguments);};})();`;

// Disable caching to prevent loading state issues
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // lang="es" + translate="no": la app ya esta en espanol. Con lang="en" Chrome
    // la traducia automaticamente; el traductor reemplaza nodos de texto y React
    // revienta (NotFoundError en removeChild/insertBefore) al re-renderizar.
    <html lang="es" translate="no" className="notranslate" suppressHydrationWarning>
      <head>
        <meta name="google" content="notranslate" />
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_GUARDA_DOM }} />
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_APARIENCIA }} />
      </head>
      <body
        className={`${outfit.variable} ${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <div className="fondo-liquido" aria-hidden="true"><span /><span /><span /><span /></div>
        {children}
        <AparienciaFlotante />
      </body>
    </html>
  );
}
