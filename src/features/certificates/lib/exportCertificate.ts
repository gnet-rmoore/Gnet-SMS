import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

const PRINT_ROOT_ID = "certificate-print-root";
const PRINT_STYLE_ID = "certificate-scoped-print-style";
const PDF_CAPTURE_HOLDER_ID = "certificate-pdf-capture-holder";
const CERT_W = 1123;
const CERT_H = 794;
const PDF_W_MM = 297;
const PDF_H_MM = 210;

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
  html, body { background: #ffffff !important; }
  .cert-capture,
  .cert-capture .cert-sheet {
    width: 1123px !important;
    height: 794px !important;
    max-width: none !important;
    margin: 0 !important;
    padding: 0 !important;
    transform: none !important;
    transform-origin: top left !important;
    box-shadow: none !important;
    overflow: hidden !important;
  }
  .cert-capture {
    position: relative !important;
    background: #ffffff !important;
  }
  .cert-capture .cert-sheet {
    position: relative !important;
  }
  .cert-capture .cert-meridian-bg {
    background: #ffffff !important;
  }
  .cert-capture .cert-noir-bg {
    background: radial-gradient(ellipse at 50% 40%, #3A3B3F 0%, #14161A 75%) !important;
  }
  .cert-capture .cert-regent-bg {
    background: #10224A !important;
  }
  .cert-capture .cert-deco-bg {
    background: radial-gradient(ellipse at 50% 35%, #3B5551 0%, #0A2B25 80%) !important;
  }
  .cert-capture .cert-noir-title {
    background: none !important;
    background-image: none !important;
    color: #C9A96B !important;
    -webkit-text-fill-color: #C9A96B !important;
  }
`;

function createCaptureSheet(sheet: HTMLElement) {
  document.getElementById(PDF_CAPTURE_HOLDER_ID)?.remove();

  const clone = sheet.cloneNode(true) as HTMLElement;
  clone.classList.add("cert-capture");
  clone.setAttribute("data-cert-pdf-capture", "true");
  clone.style.setProperty("position", "relative", "important");
  clone.style.setProperty("width", `${CERT_W}px`, "important");
  clone.style.setProperty("height", `${CERT_H}px`, "important");
  clone.style.setProperty("max-width", "none", "important");
  clone.style.setProperty("margin", "0", "important");
  clone.style.setProperty("padding", "0", "important");
  clone.style.setProperty("overflow", "hidden", "important");
  clone.style.setProperty("background", "#ffffff", "important");
  clone.style.setProperty("transform", "none", "important");
  clone.style.setProperty("transform-origin", "top left", "important");

  const inner = clone.querySelector<HTMLElement>(".cert-sheet");
  if (inner) {
    inner.style.setProperty("position", "relative", "important");
    inner.style.setProperty("width", `${CERT_W}px`, "important");
    inner.style.setProperty("height", `${CERT_H}px`, "important");
    inner.style.setProperty("margin", "0", "important");
    inner.style.setProperty("padding", "0", "important");
    inner.style.setProperty("overflow", "hidden", "important");
    inner.style.setProperty("transform", "none", "important");
    inner.style.setProperty("transform-origin", "top left", "important");
    inner.style.setProperty("box-shadow", "none", "important");
  }

  const holder = document.createElement("div");
  holder.id = PDF_CAPTURE_HOLDER_ID;
  holder.style.cssText = `position:fixed;left:0;top:0;width:${CERT_W}px;height:${CERT_H}px;background:#ffffff;overflow:hidden;pointer-events:none;z-index:-1;`;
  holder.appendChild(clone);
  document.body.appendChild(holder);
  return { clone, holder };
}

export async function exportCertificatesPdf(
  containers: HTMLElement[],
  fileName: string
): Promise<boolean> {
  const sheets = sheetsFrom(containers);
  if (!sheets.length) return false;

  const pdf = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
    compress: true,
  });

  for (let index = 0; index < sheets.length; index += 1) {
    if (index > 0) pdf.addPage("a4", "landscape");
    pdf.setFillColor(255, 255, 255);
    pdf.rect(0, 0, PDF_W_MM, PDF_H_MM, "F");

    const { clone, holder } = createCaptureSheet(sheets[index]);
    try {
      await waitForCertificateAssets(clone);
      const canvas = await html2canvas(clone, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
        allowTaint: false,
        width: CERT_W,
        height: CERT_H,
        windowWidth: CERT_W,
        windowHeight: CERT_H,
        scrollX: 0,
        scrollY: 0,
        onclone: (doc) => {
          const injected = doc.createElement("style");
          injected.textContent = CAPTURE_CSS;
          doc.head.appendChild(injected);
        },
      });
      pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, PDF_W_MM, PDF_H_MM);
    } finally {
      holder.remove();
    }
  }

  pdf.save(fileName || "certificates.pdf");
  return true;
}
