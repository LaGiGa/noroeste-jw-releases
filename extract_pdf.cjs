const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');
const fs = require('fs');

const pdfPath = './Vida e Ministério agosto a janeiro.pdf';

async function extractText() {
    try {
        const data = new Uint8Array(fs.readFileSync(pdfPath));
        const loadingTask = pdfjsLib.getDocument({ data });
        const doc = await loadingTask.promise;
        console.log(`Pages: ${doc.numPages}`);
        
        let fullText = '';
        for (let i = 1; i <= doc.numPages; i++) {
            const page = await doc.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map(item => item.str).join('\n');
            fullText += `--- Page ${i} ---\n${pageText}\n`;
        }
        console.log(fullText);
    } catch (error) {
        console.error('Error:', error);
    }
}

extractText();