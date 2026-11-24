import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

const PRINT_ROOT_ID = "certificate-print-root";
const PRINT_STYLE_ID = "certificate-scoped-print-style";

function sheetFrom(container: HTMLElement): HTMLElement | null {
  return container.querySelector<HTMLElement>("[data-cert-canvas]");
}

function sheetsFrom(containers: HTMLElement[]): HTMLElement[] {
  return containers
    .map(sheetFrom)
    .filter((sheet): sheet is HTMLElement => Boolean(sheet));
}

function cleanupPrint() {
  document.getElementById(PRINT_ROOT_ID)?.remove();
  document.getElementById(PRINT_STYLE_ID)?.remove();
}

export function printCertificates(containers: HTMLElement[]): boolean {
  const sheets = sheetsFrom(containers);
  if (!sheets.length) return false;

  cleanupPrint();

  const root = document.createElement("div");
  root.id = PRINT_ROOT_ID;
  sheets.forEach((sheet) => {
    const clone = sheet.cloneNode(true) as HTMLElement;
    clone.style.transform = "none";
    root.appendChild(clone);
  });
  document.body.appendChild(root);

  const style = document.createElement("style");
  style.id = PRINT_STYLE_ID;
  style.textContent = `
    @page { size: A4 landscape; margin: 0; }
    body > *:not(#${PRINT_ROOT_ID}) { visibility: hidden !important; }
    #${PRINT_ROOT_ID} {
      position: fixed;
      inset: 0;
      z-index: 2147483647;
      overflow: visible;
      background: #fff;
    }
    #${PRINT_ROOT_ID} .sheet {
      width: 297mm !important;
      height: 210mm !important;
      margin: 0 !important;
      transform: none !important;
      transform-origin: top left !important;
      box-shadow: none !important;
      border: 0 !important;
      break-after: page;
      page-break-after: always;
    }
    #${PRINT_ROOT_ID} .sheet:last-child {
      break-after: auto;
      page-break-after: auto;
    }
  `;
  document.head.appendChild(style);

  const done = () => window.setTimeout(cleanupPrint, 0);
  window.addEventListener("afterprint", done, { once: true });
  window.print();
  window.setTimeout(cleanupPrint, 1500);
  return true;
}

async function waitForCertificateAssets(root: HTMLElement) {
  const fontReady = (document as Document & { fonts?: FontFaceSet }).fonts?.ready;
  if (fontReady) await fontReady;
  const images = Array.from(root.querySelectorAll("img"));
  await Promise.all(
    images.map((img) => {
      if (img.complete) return Promise.resolve();
      return new Promise<void>((resolve) => {
        img.addEventListener("load", () => resolve(), { once: true });
        img.addEventListener("error", () => resolve(), { once: true });
      });
    })
  );
}

const CAPTURE_CSS = `
  .cert-capture .cert-sheet,
  .cert-capture [data-cert-canvas] {
    width: 1123px !important;
    height: 794px !important;
    transform: none !important;
    margin: 0 !important;
    box-shadow: none !important;
    position: static !important;
  }
  .cert-capture .cert-noir-bg {
    background: #14161A !important;
  }
  .cert-capture .cert-meridian-bg {
    background: #F4F8F6 !important;
  }
  .cert-capture .cert-regent-bg {
    background: #10224A !important;
  }
  .cert-capture .cert-deco-bg {
    background: #0A2B25 !important;
  }
  .cert-capture .cert-noir-title {
    background: none !important;
    background-image: none !important;
    color: #C9A96B !important;
    -webkit-text-fill-color: #C9A96B !important;
  }
`;

export async function exportCertificatesPdf(
  containers: HTMLElement[],
  fileName: string
): Promise<boolean> {
  const sheets = sheetsFrom(containers);
  if (!sheets.length) return false;

  await waitForCertificateAssets(sheets[0].ownerDocument.body);

  const pdf = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
    compress: true,
  });

  for (let index = 0; index < sheets.length; index += 1) {
    const sheet = sheets[index];
    if (index > 0) pdf.addPage("a4", "landscape");
    const canvas = await html2canvas(sheet, {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true,
      allowTaint: false,
      width: 1123,
      height: 794,
      windowWidth: 1123,
      windowHeight: 794,
      scrollX: 0,
      scrollY: 0,
      onclone: (doc) => {
        doc.body.classList.add("cert-capture");
        const injected = doc.createElement("style");
        injected.textContent = CAPTURE_CSS;
        doc.head.appendChild(injected);
      },
    });
    pdf.addImage(canvas.toDataURL("image/jpeg", 0.94), "JPEG", 0, 0, 297, 210);
  }

  pdf.save(fileName || "certificates.pdf");
  return true;
}
