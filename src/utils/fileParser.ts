import JSZip from "jszip";

/**
 * Loads a JS script dynamically from a CDN and returns a promise when loaded.
 */
function loadScript(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${url}"]`);
    if (existing) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = url;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load dependency script ${url}`));
    document.head.appendChild(script);
  });
}

/**
 * Normalizes relative paths inside the EPUB zip container (e.g. OEBPS/../text/ch1.xhtml -> text/ch1.xhtml)
 */
function pathNormalize(p: string): string {
  const parts = p.split("/");
  const stack: string[] = [];
  for (const part of parts) {
    if (part === "." || part === "") continue;
    if (part === "..") {
      stack.pop();
    } else {
      stack.push(part);
    }
  }
  return stack.join("/");
}

/**
 * Extracts plain text from a PDF file using Mozilla's PDF.js
 */
export async function parsePdf(file: File): Promise<string> {
  try {
    // Load PDF.js from cdnjs
    await loadScript("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js");
    
    const pdfjsLib = (window as any)["pdfjs-dist/build/pdf"];
    pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js";
    
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
    const pdf = await loadingTask.promise;
    
    let text = "";
    // Restrict parsing to maximum of first 200 pages to avoid memory/performance issues on big PDFs
    const numPages = Math.min(pdf.numPages, 200);
    
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(" ");
      text += pageText + "\n\n";
    }
    
    return text.trim();
  } catch (error: any) {
    console.error("PDF extraction failed: ", error);
    throw new Error(`PDF Extraction failed: ${error.message || error}`);
  }
}

/**
 * Extracts plain text from an EPUB file using JSZip and browser DOMParser XML traversal
 */
export async function parseEpub(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);
    const files = Object.keys(zip.files);
    
    // Find container.xml to locate root manifest .opf file
    let opfPath = "";
    const containerEntry = zip.file("META-INF/container.xml");
    if (containerEntry) {
      const containerXml = await containerEntry.async("string");
      const parser = new DOMParser();
      const doc = parser.parseFromString(containerXml, "application/xml");
      const rootfile = doc.querySelector("rootfile");
      if (rootfile) {
        opfPath = rootfile.getAttribute("full-path") || "";
      }
    }
    
    let htmlFilesToRead: string[] = [];
    
    if (opfPath) {
      const opfEntry = zip.file(opfPath);
      if (opfEntry) {
        const opfXml = await opfEntry.async("string");
        const parser = new DOMParser();
        const doc = parser.parseFromString(opfXml, "application/xml");
        
        // Directory location of content.opf
        const opfDir = opfPath.includes("/") 
          ? opfPath.substring(0, opfPath.lastIndexOf("/") + 1) 
          : "";
        
        // Extract items from manifest
        const manifestMap: Record<string, string> = {};
        const items = doc.querySelectorAll("manifest > item");
        items.forEach((item) => {
          const id = item.getAttribute("id");
          const href = item.getAttribute("href");
          if (id && href) {
            manifestMap[id] = href;
          }
        });
        
        // Trace spinal order of reading sequence
        const spineItems = doc.querySelectorAll("spine > itemref");
        spineItems.forEach((itemref) => {
          const idref = itemref.getAttribute("idref");
          if (idref && manifestMap[idref]) {
            const rawPath = manifestMap[idref];
            // Decode path spaces / escape characters
            const relativePath = decodeURIComponent(rawPath);
            const resolvedPath = pathNormalize(opfDir + relativePath);
            htmlFilesToRead.push(resolvedPath);
          }
        });
      }
    }
    
    // Normalize matching keys against the actual keys inside ZIP file list
    let matchedRealPaths: string[] = [];
    htmlFilesToRead.forEach(p => {
      const key = files.find(f => f.toLowerCase() === p.toLowerCase() || f.replace(/^\//, "").toLowerCase() === p.replace(/^\//, "").toLowerCase());
      if (key) matchedRealPaths.push(key);
    });
    
    // Fallback: If no OPF container is traced, load all HTML/XHTML nodes sorted alphabetically
    if (matchedRealPaths.length === 0) {
      const htmlKeys = files.filter(
        (key) => key.endsWith(".html") || key.endsWith(".xhtml") || key.endsWith(".htm")
      );
      htmlKeys.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }));
      matchedRealPaths = htmlKeys;
    }
    
    let combinedText = "";
    
    for (const path of matchedRealPaths) {
      const entry = zip.file(path);
      if (entry) {
        const rawContent = await entry.async("string");
        const doc = new DOMParser().parseFromString(rawContent, "text/html");
        
        // Collect in-order paragraphs to keep spacing intact
        const paragraphs = doc.querySelectorAll("p, div, h1, h2, h3, h4, li");
        if (paragraphs.length > 0) {
          paragraphs.forEach((p) => {
            const txt = (p.textContent || "").trim();
            if (txt) {
              combinedText += txt + "\n\n";
            }
          });
        } else {
          const bodyText = doc.body?.textContent || doc.body?.innerText || rawContent.replace(/<[^>]*>/g, " ");
          combinedText += bodyText.trim() + "\n\n";
        }
      }
    }
    
    return combinedText.trim();
  } catch (error: any) {
    console.error("EPUB parsing failed: ", error);
    throw new Error(`EPUB Extraction failed: ${error.message || error}`);
  }
}
