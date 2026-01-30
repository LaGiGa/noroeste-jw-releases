const fs = require('fs');
const pdf = require('pdf-parse');

const dataBuffer = fs.readFileSync('./Vida e Ministério agosto a janeiro.pdf');

pdf(dataBuffer).then(function(data) {
    fs.writeFileSync('debug_text.txt', data.text);
    console.log('Text saved to debug_text.txt');
}).catch(err => {
    console.error(err);
});