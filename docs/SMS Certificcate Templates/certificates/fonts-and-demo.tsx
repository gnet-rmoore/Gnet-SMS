/* ---------- app/fonts.ts ---------- */
import {
  Cormorant_Garamond, Inter, DM_Serif_Display, DM_Sans,
  Playfair_Display, Manrope, Instrument_Serif, Allura,
  Cinzel, Bodoni_Moda, Italiana, Josefin_Sans, Marcellus,
} from "next/font/google";

export const cormorant = Cormorant_Garamond({ subsets: ["latin"], weight: ["400", "500", "600"], style: ["normal", "italic"], variable: "--font-cormorant" });
export const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
export const dmSerif = DM_Serif_Display({ subsets: ["latin"], weight: "400", variable: "--font-dm-serif" });
export const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans" });
export const playfair = Playfair_Display({ subsets: ["latin"], style: ["normal", "italic"], variable: "--font-playfair" });
export const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope" });
export const instrument = Instrument_Serif({ subsets: ["latin"], weight: "400", variable: "--font-instrument" });

export const signature = Allura({ subsets: ["latin"], weight: "400", variable: "--font-signature" });

export const cinzel = Cinzel({ subsets: ["latin"], weight: ["400", "600"], variable: "--font-cinzel" });
export const bodoni = Bodoni_Moda({ subsets: ["latin"], style: ["normal", "italic"], variable: "--font-bodoni" });
export const italiana = Italiana({ subsets: ["latin"], weight: "400", variable: "--font-italiana" });
export const josefin = Josefin_Sans({ subsets: ["latin"], weight: ["300", "400", "600"], variable: "--font-josefin" });
export const marcellus = Marcellus({ subsets: ["latin"], weight: "400", variable: "--font-marcellus" });

export const fontVars = [cormorant, inter, dmSerif, dmSans, playfair, manrope, instrument, signature, cinzel, bodoni, italiana, josefin, marcellus]
  .map((x) => x.variable)
  .join(" ");

/* ---------- app/layout.tsx (apply the variables to <body>) ----------
import { fontVars } from "./fonts";
import { certificatePrintCss } from "@/components/certificates";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head><style>{certificatePrintCss}</style></head>
      <body className={fontVars}>{children}</body>
    </html>
  );
}
*/

/* ---------- app/certificates/page.tsx (preview all four) ---------- */
import { Certificate, certificateTemplates, type CertificateTemplateId } from "@/components/certificates";

const sample = {
  recipient: "Amara Johnson",
  description:
    "For outstanding academic performance and leadership throughout the 2026 school year, setting a standard for fellow learners.",
  issuer: "Greenfield Academy",
  date: "24 November 2026",
  certificateId: "GA-2026-04172",
  verifyUrl: "verify.greenfield.edu/GA-2026-04172",
  signatories: [
    { name: "Dr. Helen Mensah", title: "Principal", signatureText: "Helen Mensah" },
    { name: "Samuel Cole", title: "Head of Academics", signatureText: "Samuel Cole" },
  ],
};

export default function CertificatesPreview() {
  return (
    <main style={{ display: "grid", gap: 40, padding: 32, background: "#e9e9ec", justifyContent: "center" }}>
      {(Object.keys(certificateTemplates) as CertificateTemplateId[]).map((id) => (
        <Certificate key={id} template={id} scale={0.8} showLogoPlaceholder {...sample} />
      ))}
    </main>
  );
}
