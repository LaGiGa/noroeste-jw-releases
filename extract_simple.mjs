import * as pdfParse from 'pdf-parse';
import fs from 'fs';

console.log('Exports:', Object.keys(pdfParse));

const dataBuffer = fs.readFileSync('./Vida e Ministério agosto a janeiro.pdf');

// Try to find the function
const parse = pdfParse.default || pdfParse;

if (typeof parse === 'function') {
    parse(dataBuffer).then(data => console.log(data.text)).catch(console.error);
} else {
    console.log('Not a function:', parse);
}