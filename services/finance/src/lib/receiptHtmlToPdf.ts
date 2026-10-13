import puppeteer from "puppeteer-core";

let browserPromise: ReturnType<typeof puppeteer.launch> | null = null;

function chromiumPath(): string | undefined {
  const candidates = [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    process.env.CHROMIUM_PATH,
    process.platform === "darwin"
      ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
      : null,
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/usr/bin/google-chrome-stable",
  ].filter(Boolean) as string[];
  return candidates[0];
}

function htmlPdfEnabled(): boolean {
  return process.env.RECEIPT_HTML_PDF !== "0";
}

async function getBrowser() {
  if (!browserPromise) {
    const executablePath = chromiumPath();
    if (!executablePath) {
      throw new Error("Chromium executable not configured for receipt HTML PDF");
    }
    browserPromise = puppeteer.launch({
      headless: true,
      executablePath,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    });
  }
  return browserPromise;
}

export async function htmlToPdf(html: string): Promise<Buffer> {
  if (!htmlPdfEnabled()) {
    throw new Error("Receipt HTML PDF disabled");
  }
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setContent(html, { waitUntil: "networkidle0", timeout: 20_000 });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    });
    return Buffer.from(pdf);
  } finally {
    await page.close();
  }
}

export function resetReceiptPdfBrowserForTests() {
  browserPromise = null;
}
