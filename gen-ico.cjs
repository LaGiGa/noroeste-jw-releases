const fs = require('fs');
const mod = require('png-to-ico');
console.log('Module type:', typeof mod);
console.log('Module keys:', Object.keys(mod));
const pngToIco = typeof mod === 'function' ? mod : mod.default;

if (typeof pngToIco !== 'function') {
    console.error('Still not a function');
    process.exit(1);
}

pngToIco('public/icon.png')
    .then(buf => {
        fs.writeFileSync('public/icon.ico', buf);
        console.log('Icon generated successfully');
    })
    .catch(err => {
        console.error('PROMISE ERROR:', err);
        process.exit(1);
    });
