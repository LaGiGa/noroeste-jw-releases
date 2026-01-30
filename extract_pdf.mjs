import * as pdfjsLib from 'pdfjs-dist/build/pdf.mjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configure worker
pdfjsLib.GlobalWorkerOptions.workerSrc = path.join(__dirname, 'node_modules/pdfjs-dist/build/pdf.worker.mjs');

const pdfPath = './Vida e Ministério agosto a janeiro.pdf';

async function extractText() {
    try {
        const data = new Uint8Array(fs.readFileSync(pdfPath));
        const loadingTask = pdfjsLib.getDocument({ 
            data,
            useSystemFonts: true,
            disableFontFace: true
        });
        const doc = await loadingTask.promise;
        console.log(`Pages: ${doc.numPages}`);
        
        let fullText = '';
        for (let i = 1; i <= doc.numPages; i++) {
            const page = await doc.getPage(i);
            const textContent = await page.getTextContent();
            // Join with newline to preserve some structure
            const pageText = textContent.items.map(item => item.str).join('\n'); 
            fullText += `--- Page ${i} ---\n${pageText}\n`;
        }
        console.log(fullText);
    } catch (error) {
        console.error('Error:', error);
    }
}

extractText();