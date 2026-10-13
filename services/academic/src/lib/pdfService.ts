import { execSync } from "node:child_process";
import path from "node:path";
import fs from "node:fs";

const CACHE_DIR = path.join(process.cwd(), ".puppeteer-cache");

function ensurePuppeteer() {
  try {
    require.resolve("puppeteer");
    return;
  } catch {
    console.log("[pdf] Puppeteer not found, installing...");
    try {
      execSync("npm install puppeteer@24.40.0 --omit=dev", {
        stdio: "inherit",
        cwd: process.cwd(),
      });
      console.log("[pdf] Puppeteer installed");
    } catch (err: any) {
      console.error("[pdf] Failed to install puppeteer:", err.message);
      throw new Error("Puppeteer installation failed");
    }
  }
}

let cachedBrowser: any = null;
let browserPromise: Promise<any> | null = null;

export async function getBrowser() {
  if (cachedBrowser?.connected) return cachedBrowser;

  if (browserPromise) return browserPromise;

  browserPromise = (async () => {
    ensurePuppeteer();
    const puppeteer = require("puppeteer");
    const launchOptions = {
      headless: "new",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--no-first-run",
        "--no-zygote",
        "--single-process",
      ],
      cacheDir: CACHE_DIR,
      env: {
        PUPPETEER_CACHE_DIR: CACHE_DIR,
        PUPPETEER_EXECUTABLE_PATH: process.env.PUPPETEER_EXECUTABLE_PATH,
      },
    };
    cachedBrowser = await puppeteer.launch(launchOptions);
    cachedBrowser.on("disconnected", () => {
      cachedBrowser = null;
      browserPromise = null;
    });
    return cachedBrowser;
  })();

  return browserPromise;
}

export async function closeBrowser() {
  if (cachedBrowser) {
    await cachedBrowser.close();
    cachedBrowser = null;
    browserPromise = null;
  }
}

interface PDFOptions {
  html: string;
  format?: "A4" | "Legal";
  margin?: { top: string; bottom: string; left: string; right: string };
  printBackground?: boolean;
  scale?: number;
  landscape?: boolean;
}

export async function generatePDF(options: PDFOptions): Promise<Buffer> {
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    const format = options.format || "A4";
    const margin = options.margin || { top: "10mm", bottom: "10mm", left: "10mm", right: "10mm" };

    await page.setContent(options.html, { waitUntil: "networkidle0", timeout: 30000 });

    // Inject print styles
    await page.addStyleTag({
      content: `
        @page {
          size: ${options.format};
          margin: ${margin.top} ${margin.right} ${margin.bottom} ${margin.left};
        }
        * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
        }
      `,
    });

    const pdfBuffer = await page.pdf({
      format,
      margin,
      printBackground: options.printBackground !== false,
      scale: options.scale || 1,
      landscape: options.landscape || false,
    });

    return Buffer.from(pdfBuffer);
  } finally {
    await page.close();
  }
}

export async function generatePDFFromURL(url: string, options: Omit<PDFOptions, "html">): Promise<Buffer> {
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    const format = options.format || "A4";
    const margin = options.margin || { top: "10mm", bottom: "10mm", left: "10mm", right: "10mm" };

    await page.goto(url, { waitUntil: "networkidle0", timeout: 30000 });

    await page.addStyleTag({
      content: `
        @page {
          size: ${options.format};
          margin: ${margin.top} ${margin.right} ${margin.bottom} ${margin.left};
        }
        * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
        }
      `,
    });

    const pdfBuffer = await page.pdf({
      format,
      margin,
      printBackground: options.printBackground !== false,
      scale: options.scale || 1,
      landscape: options.landscape || false,
    });

    return Buffer.from(pdfBuffer);
  } finally {
    await page.close();
  }
}

// Graceful shutdown
process.on("SIGTERM", async () => {
  await closeBrowser();
  process.exit(0);
});

process.on("SIGINT", async () => {
  await closeBrowser();
  process.exit(0);
});