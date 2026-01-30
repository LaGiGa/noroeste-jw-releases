const { app, BrowserWindow, ipcMain, net, session, shell } = require('electron');
const { autoUpdater } = require('electron-updater');
const fs = require('fs');
const { spawn } = require('child_process');
const path = require('path');
const url = require('url');


// Handler robusto para requisições usando fetch nativo do Node.js (Main Process)
// Isso alinha o comportamento com scripts de teste que funcionam.
ipcMain.handle('fetch-text', async (event, targetUrl) => {
    console.log(`🌐 Buscando URL via Main Process (fetch): ${targetUrl}`);
    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
    };
    const maxRetries = 3;
    for (let i = 0; i < maxRetries; i++) {
        try {
            const response = await fetch(targetUrl, { headers });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const text = await response.text();
            console.log(`✅ Sucesso! Recebidos ${text.length} bytes`);
            return text;
        } catch (error) {
            const delay = 500 * Math.pow(2, i);
            console.warn(`⚠️ fetch-text tentativa ${i + 1} falhou (${error?.code || error?.message}). Retentando em ${delay}ms...`);
            await new Promise(r => setTimeout(r, delay));
        }
    }
    try {
        const req = net.request({ url: targetUrl, followRedirect: true, session: session.fromPartition('persist:noroeste-jw') });
        req.setHeader('User-Agent', headers['User-Agent']);
        req.setHeader('Accept', headers['Accept']);
        req.setHeader('Accept-Language', headers['Accept-Language']);
        req.setHeader('Cache-Control', headers['Cache-Control']);
        req.setHeader('Pragma', headers['Pragma']);
        const chunks = [];
        const body = await new Promise((resolve, reject) => {
            req.on('response', (res) => {
                res.on('data', (c) => chunks.push(Buffer.from(c)));
                res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
                res.on('error', reject);
            });
            req.on('error', reject);
            req.end();
        });
        if (typeof body === 'string' && body.length > 0) return body;
    } catch (e) { }

    // IMPORTANTE: Não abrir janelas de navegador para scraping
    // Isso evita que o JW.org seja aberto múltiplas vezes
    console.warn('⚠️ Todas as tentativas de fetch falharam. Scraping via janela invisível foi desabilitado para evitar aberturas indesejadas do navegador.');
    throw new Error('Fetch failed after all retries. Browser scraping disabled.');

    /* CÓDIGO DE SCRAPING DESABILITADO - Causava abertura de múltiplas janelas
    try {
        const win = new BrowserWindow({
            width: 1000,
            height: 800,
            show: false,
            webPreferences: {
                offscreen: true,
                partition: 'persist:noroeste-jw',
                contextIsolation: true,
                sandbox: false
            }
        });
        const timeoutMs = 12000;
        const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), timeoutMs));
        try {
            const op = (async () => {
                await win.loadURL(targetUrl, {
                    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                });
                await win.webContents.executeJavaScript('new Promise(r => { if(document.body) r(); else window.addEventListener("DOMContentLoaded", r); })');
                await win.webContents.executeJavaScript(`(function(){try{var clickers=[].slice.call(document.querySelectorAll('button,[role=\"button\"],a'));for(var i=0;i<clickers.length;i++){var t=(clickers[i].textContent||'').toLowerCase();if(/aceitar|accept|permitir|concordo|agree|accept all/.test(t)){try{clickers[i].click();}catch(e){}}}var overlays=[].slice.call(document.querySelectorAll('[id*=\"privacy\"],[class*=\"privacy\"],[class*=\"consent\"],[id*=\"consent\"],[aria-modal=\"true\"]'));for(var j=0;j<overlays.length;j++){try{overlays[j].style.display='none';overlays[j].setAttribute('hidden','true');}catch(e){}}setTimeout(function(){try{var clickers2=[].slice.call(document.querySelectorAll('button,[role=\"button\"],a'));for(var i2=0;i2<clickers2.length;i2++){var t2=(clickers2[i2].textContent||'').toLowerCase();if(/aceitar|accept|permitir|concordo|agree|accept all/.test(t2)){try{clickers2[i2].click();}catch(e){}}}var overlays2=[].slice.call(document.querySelectorAll('[id*=\"privacy\"],[class*=\"privacy\"],[class*=\"consent\"],[id*=\"consent\"],[aria-modal=\"true\"]'));for(var j2=0;j2<overlays2.length;j2++){try{overlays2[j2].style.display='none';overlays2[j2].setAttribute('hidden','true');}catch(e){}}}catch(e){}} ,500);}catch(e){}})();`);
                await new Promise(r => setTimeout(r, 2000));
                const html = await win.webContents.executeJavaScript('document.documentElement.outerHTML');
                return html;
            })();
            const html = await Promise.race([op, timeout]);
            return html;
        } finally {
            try { win.destroy(); } catch { }
        }
    } catch (e) {
        console.error('❌ Fallback scrape-html também falhou:', e);
        throw e;
    }
    */
});

// Handler para baixar conteúdo binário (PDF, RTF) via Main Process
ipcMain.handle('fetch-binary', async (event, targetUrl) => {
    console.log(`🌐 Baixando BINÁRIO via Main Process (fetch): ${targetUrl}`);
    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
    };
    const maxRetries = 3;
    for (let i = 0; i < maxRetries; i++) {
        try {
            const response = await fetch(targetUrl, { headers });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const arrayBuffer = await response.arrayBuffer();
            console.log(`✅ Sucesso BINÁRIO! Recebidos ${arrayBuffer.byteLength} bytes`);
            return Array.from(new Uint8Array(arrayBuffer));
        } catch (error) {
            const delay = 500 * Math.pow(2, i);
            console.warn(`⚠️ fetch-binary tentativa ${i + 1} falhou (${error?.code || error?.message}). Retentando em ${delay}ms...`);
            await new Promise(r => setTimeout(r, delay));
        }
    }
    const req = net.request({ url: targetUrl, followRedirect: true, session: session.fromPartition('persist:noroeste-jw') });
    req.setHeader('User-Agent', headers['User-Agent']);
    req.setHeader('Accept', headers['Accept']);
    req.setHeader('Cache-Control', headers['Cache-Control']);
    req.setHeader('Pragma', headers['Pragma']);
    const chunks = [];
    const buf = await new Promise((resolve, reject) => {
        req.on('response', (res) => {
            res.on('data', (c) => chunks.push(Buffer.from(c)));
            res.on('end', () => resolve(Buffer.concat(chunks)));
            res.on('error', reject);
        });
        req.on('error', reject);
        req.end();
    });
    return Array.from(new Uint8Array(buf));
});

// Handler para fazer scrape de HTML usando uma janela oculta (Bypassa Cloudflare/403)
ipcMain.handle('scrape-html', async (event, url) => {
    console.log(`🕵️ Scraping (Hidden Window): ${url}`);
    const win = new BrowserWindow({
        width: 1000,
        height: 800,
        show: false, // Hidden
        webPreferences: {
            offscreen: true, // Render offscreen
            partition: 'persist:noroeste-jw',
            contextIsolation: true,
            sandbox: false
        }
    });

    try {
        const timeoutMs = 12000;
        const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), timeoutMs));
        const op = (async () => {
            await win.loadURL(url, {
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            });
            await win.webContents.executeJavaScript('new Promise(r => { if(document.body) r(); else window.addEventListener("DOMContentLoaded", r); })');
            await win.webContents.executeJavaScript(`(function(){try{var clickers=[].slice.call(document.querySelectorAll('button,[role=\"button\"],a'));for(var i=0;i<clickers.length;i++){var t=(clickers[i].textContent||'').toLowerCase();if(/aceitar|accept|permitir|concordo|agree|accept all/.test(t)){try{clickers[i].click();}catch(e){}}}var overlays=[].slice.call(document.querySelectorAll('[id*=\"privacy\"],[class*=\"privacy\"],[class*=\"consent\"],[id*=\"consent\"],[aria-modal=\"true\"]'));for(var j=0;j<overlays.length;j++){try{overlays[j].style.display='none';overlays[j].setAttribute('hidden','true');}catch(e){}}setTimeout(function(){try{var clickers2=[].slice.call(document.querySelectorAll('button,[role=\"button\"],a'));for(var i2=0;i2<clickers2.length;i2++){var t2=(clickers2[i2].textContent||'').toLowerCase();if(/aceitar|accept|permitir|concordo|agree|accept all/.test(t2)){try{clickers2[i2].click();}catch(e){}}}var overlays2=[].slice.call(document.querySelectorAll('[id*=\"privacy\"],[class*=\"privacy\"],[class*=\"consent\"],[id*=\"consent\"],[aria-modal=\"true\"]'));for(var j2=0;j2<overlays2.length;j2++){try{overlays2[j2].style.display='none';overlays2[j2].setAttribute('hidden','true');}catch(e){}}}catch(e){}} ,500);}catch(e){}})();`);
            await new Promise(r => setTimeout(r, 2000));
            const html = await win.webContents.executeJavaScript('document.documentElement.outerHTML');
            return html;
        })();
        const html = await Promise.race([op, timeout]);
        console.log(`✅ Scraped ${html.length} chars via Window`);
        return html;
    } catch (e) {
        console.error('❌ Scraping failed:', e);
        throw e;
    } finally {
        try { win.destroy(); } catch { }
    }
});

function createWindow() {
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.cjs'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false,
            // Garantir que o localStorage funcione em produção
            partition: 'persist:noroeste-jw'
        },
        show: false, // Não mostrar até carregar
        backgroundColor: '#667eea', // Cor de fundo enquanto carrega
        icon: path.join(__dirname, '../public/icon.png') // Ícone da aplicação
    });

    // Mostrar quando estiver pronto
    win.once('ready-to-show', () => {
        console.log('✅ Window ready to show');
        win.show();
    });

    // Interceptar navegação para links externos e abrir no navegador padrão
    win.webContents.setWindowOpenHandler(({ url }) => {
        if (url.startsWith('http:') || url.startsWith('https:')) {
            shell.openExternal(url);
            return { action: 'deny' };
        }
        return { action: 'allow' };
    });

    // Impedir navegação da janela principal para sites externos
    win.webContents.on('will-navigate', (event, url) => {
        const isDev = process.env.ELECTRON_IS_DEV === 'true';
        const isLocal = url.startsWith('file://') || (isDev && url.includes('localhost'));

        if (!isLocal) {
            event.preventDefault();
            shell.openExternal(url);
        }
    });

    // Verifica se estamos em modo de desenvolvimento
    const isDev = process.env.ELECTRON_IS_DEV === 'true';

    if (isDev) {
        console.log('🔧 Running in development mode');
        const ports = [5173, 5174, 5175];
        const tryLoad = async (idx = 0) => {
            const port = ports[idx];
            const urlToLoad = `http://localhost:${port}`;
            console.log(`🔗 Trying dev server at ${urlToLoad}`);
            await win.loadURL(urlToLoad);
            try {
                const hasRoot = await win.webContents.executeJavaScript('!!document.getElementById("root")', true);
                if (!hasRoot && idx < ports.length - 1) {
                    console.warn(`⚠️ No #root detected at ${urlToLoad}. Trying next port...`);
                    return tryLoad(idx + 1);
                }
            } catch (e) {
                console.warn(`⚠️ Failed check at ${urlToLoad}:`, e?.message);
                if (idx < ports.length - 1) return tryLoad(idx + 1);
            }
            console.log(`✅ Dev server loaded from ${urlToLoad}`);
        };
        tryLoad();
        // win.webContents.openDevTools(); // Descomente se precisar do DevTools
    } else {
        console.log('🚀 Running in production mode');
        console.log('📁 __dirname:', __dirname);
        console.log('📁 app.getAppPath():', app.getAppPath());
        console.log('📁 process.resourcesPath:', process.resourcesPath);

        // Em produção, o index.html está em dist/index.html relativo ao diretório electron
        const indexPath = path.join(__dirname, '../dist/index.html');
        console.log('📄 Loading index.html from:', indexPath);

        // Carrega usando file:// protocol
        win.loadFile(indexPath);

        // Log de erros detalhados
        win.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
            console.error('❌ Failed to load:', {
                errorCode,
                errorDescription,
                validatedURL
            });
        });

        win.webContents.on('console-message', (event, level, message, line, sourceId) => {
            console.log(`[Renderer Console] Level ${level}: ${message}`);
            if (sourceId) {
                console.log(`  Source: ${sourceId}:${line}`);
            }
        });

        win.webContents.on('crashed', (event, killed) => {
            console.error('💥 Renderer process crashed!', { killed });
        });

        win.webContents.on('did-finish-load', () => {
            console.log('✅ Page finished loading');
        });

        win.webContents.on('dom-ready', () => {
            console.log('✅ DOM is ready');
        });
    }

    // Log de erros gerais
    win.on('unresponsive', () => {
        console.error('⚠️ Window became unresponsive');
    });

    win.on('responsive', () => {
        console.log('✅ Window became responsive again');
    });
}

// Configurar um caminho de User Data separado para o modo DEV para evitar conflitos de permissão e lock com a versão instalada
if (process.env.ELECTRON_IS_DEV === 'true') {
    const devUserDataPath = path.join(app.getPath('appData'), 'noroeste-dev');
    app.setPath('userData', devUserDataPath);
    console.log('🔧 DEV MODE: Usando pasta de dados isolada:', devUserDataPath);
}

app.whenReady().then(() => {
    console.log('========================================');
    console.log('🚀 Noroeste - Iniciando aplicação...');
    console.log('========================================');
    console.log('📁 App path:', app.getAppPath());
    console.log('📁 Resources path:', process.resourcesPath);
    console.log('📁 Exe path:', app.getPath('exe'));
    console.log('📁 User data:', app.getPath('userData'));
    console.log('========================================');

    createWindow();


    // Iniciar verificação de atualizações
    autoUpdater.checkForUpdatesAndNotify();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// Log de erros não capturados
process.on('uncaughtException', (error) => {
    console.error('Uncaught exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled rejection at:', promise, 'reason:', reason);
});
// Variável global para rastrear a janela de consentimento
let consentWindow = null;

// Abrir janela para aceitar cookies/privacidade no jw.org
ipcMain.handle('open-consent', async () => {
    if (consentWindow && !consentWindow.isDestroyed()) {
        consentWindow.focus();
        return true;
    }

    consentWindow = new BrowserWindow({
        width: 900,
        height: 700,
        webPreferences: {
            preload: path.join(__dirname, 'preload.cjs'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false,
            partition: 'persist:noroeste-jw'
        }
    });

    consentWindow.on('closed', () => {
        consentWindow = null;
    });

    const tryLoad = async (urls, idx = 0) => {
        if (idx >= urls.length) return;
        if (consentWindow && !consentWindow.isDestroyed()) {
            await consentWindow.loadURL(urls[idx]);
            consentWindow.webContents.once('did-fail-load', () => tryLoad(urls, idx + 1));
        }
    };
    await tryLoad([
        'https://www.jw.org/pt/',
        'https://www.jw.org/pt/politica-privacidade/politica-global-cookies/'
    ]);

    if (consentWindow && !consentWindow.isDestroyed()) {
        consentWindow.focus();
    }
    return true;
});

// Abrir uma URL em nova janela com a mesma sessão
ipcMain.handle('open-url', async (event, toUrl) => {
    const win = new BrowserWindow({
        width: 1000,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.cjs'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false,
            partition: 'persist:noroeste-jw'
        }
    });
    await win.loadURL(toUrl);
    win.focus();
    return true;
});

// Usar Python (jwlib_fetch.py) para baixar PDF; se indisponível ou timeout, cair para fetch nativo
ipcMain.handle('jwlib-fetch-pdf', async (event, urlOrParams) => {
    const args = [];
    let targetUrl = null;
    if (urlOrParams && typeof urlOrParams === 'string') {
        targetUrl = urlOrParams;
        args.push('--url', urlOrParams);
    } else if (urlOrParams && typeof urlOrParams === 'object') {
        if (urlOrParams.url) { targetUrl = urlOrParams.url; args.push('--url', urlOrParams.url); }
        if (urlOrParams.year) { args.push('--year', String(urlOrParams.year)); }
        if (urlOrParams.month) { args.push('--month', String(urlOrParams.month)); }
    }
    const script = path.join(__dirname, '../python/jwlib_fetch.py');
    const run = (cmd, cmdArgs) => new Promise((resolve, reject) => {
        const child = spawn(cmd, cmdArgs, { stdio: ['ignore', 'pipe', 'pipe'] });
        let out = '';
        let err = '';
        child.stdout.on('data', (d) => { out += d.toString(); });
        child.stderr.on('data', (d) => { err += d.toString(); });
        child.on('error', (e) => reject(e));
        child.on('close', (code) => {
            if (code !== 0) return reject(new Error(err || out || (cmd + ' exit code ' + code)));
            try {
                const j = JSON.parse(out.trim());
                if (!j.ok) return reject(new Error(j.error || 'jwlib_fetch failed'));
                const buf = Buffer.from(j.base64, 'base64');
                resolve(Array.from(buf));
            } catch (e) {
                reject(e);
            }
        });
    });
    try {
        return await run('py', ['-3', script, ...args]);
    } catch (e1) {
        try {
            return await run('python', [script, ...args]);
        } catch (e2) {
            try {
                return await run('python3', [script, ...args]);
            } catch (e3) {
                if (!targetUrl) throw new Error('jwlib-fetch-pdf sem URL');
                const headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'application/pdf,*/*',
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                };
                const maxRetries = 3;
                for (let i = 0; i < maxRetries; i++) {
                    try {
                        const response = await fetch(targetUrl, { headers });
                        if (!response.ok) throw new Error('HTTP ' + response.status);
                        const buf = Buffer.from(await response.arrayBuffer());
                        return Array.from(buf);
                    } catch (e) {
                        const delay = 500 * Math.pow(2, i);
                        await new Promise(r => setTimeout(r, delay));
                    }
                }
                const req = net.request({ url: targetUrl, followRedirect: true, session: session.fromPartition('persist:noroeste-jw') });
                req.setHeader('User-Agent', headers['User-Agent']);
                req.setHeader('Accept', headers['Accept']);
                req.setHeader('Cache-Control', headers['Cache-Control']);
                req.setHeader('Pragma', headers['Pragma']);
                const chunks = [];
                const buf = await new Promise((resolve, reject) => {
                    req.on('response', (res) => {
                        res.on('data', (c) => chunks.push(Buffer.from(c)));
                        res.on('end', () => resolve(Buffer.concat(chunks)));
                        res.on('error', reject);
                    });
                    req.on('error', reject);
                    req.end();
                });
                return Array.from(new Uint8Array(buf));
            }
        }
    }
});

ipcMain.handle('mwb-extract', async (event, urlOrParams) => {
    const args = [];
    if (urlOrParams && typeof urlOrParams === 'string') {
        args.push('--url', urlOrParams);
    } else if (urlOrParams && typeof urlOrParams === 'object') {
        if (urlOrParams.url) { args.push('--url', urlOrParams.url); }
        if (urlOrParams.year) { args.push('--year', String(urlOrParams.year)); }
        if (urlOrParams.month) { args.push('--month', String(urlOrParams.month)); }
        if (urlOrParams.prefer_html !== undefined) { args.push('--prefer_html', String(urlOrParams.prefer_html ? 1 : 0)); }
        if (urlOrParams.file_base64) { args.push('--file_base64', String(urlOrParams.file_base64)); }
    }
    const script = path.join(__dirname, '../python/mwb_extract.py');
    const run = (cmd, cmdArgs) => new Promise((resolve, reject) => {
        const child = spawn(cmd, cmdArgs, { stdio: ['ignore', 'pipe', 'pipe'] });
        let out = '';
        let err = '';
        child.stdout.on('data', (d) => { out += d.toString(); });
        child.stderr.on('data', (d) => { err += d.toString(); });
        child.on('error', (e) => reject(e));
        child.on('close', (code) => {
            if (code !== 0) return reject(new Error(err || out || (cmd + ' exit code ' + code)));
            try {
                const j = JSON.parse(out.trim());
                if (!j.ok) return reject(new Error(j.error || 'mwb_extract failed'));
                resolve(j.weeks);
            } catch (e) {
                reject(e);
            }
        });
    });
    try {
        return await run('py', ['-3', script, ...args]);
    } catch (e1) {
        try {
            return await run('python', [script, ...args]);
        } catch (e2) {
            try {
                return await run('python3', [script, ...args]);
            } catch (e3) {
                console.warn('mwb-extract indisponível: Python não encontrado. Prosseguindo sem extração Python.');
                return [];
            }
        }
    }
});

ipcMain.handle('prefetch-mwb-pdfs', async (event, opts) => {
    const userDir = app.getPath('userData');
    const cacheDir = path.join(userDir, 'mwb_cache');
    try { fs.mkdirSync(cacheDir, { recursive: true }); } catch { }
    const now = new Date();
    const curMonth = now.getMonth() + 1;
    const startMonth = curMonth % 2 === 0 ? curMonth - 1 : curMonth;
    const startYear = now.getFullYear();
    const count = (opts && opts.count) ? parseInt(String(opts.count), 10) : 6;
    const items = [];
    let y = startYear;
    let m = startMonth;
    for (let i = 0; i < count; i++) {
        const issueStr = `${y}${String(m).padStart(2, '0')}`;
        const apiUrl = `https://b.jw-cdn.org/apis/pub-media/GETPUBMEDIALINKS?output=json&pub=mwb&fileformat=PDF&alllangs=0&langwritten=T&issue=${issueStr}`;
        try {
            const body = await ipcMain.handle('fetch-text', null, apiUrl);
        } catch { }
        const req = net.request({ url: apiUrl, followRedirect: true, session: session.fromPartition('persist:noroeste-jw') });
        req.setHeader('User-Agent', 'Mozilla/5.0');
        const chunks = [];
        const json = await new Promise((resolve, reject) => {
            req.on('response', (res) => {
                res.on('data', (c) => chunks.push(Buffer.from(c)));
                res.on('end', () => {
                    try { resolve(Buffer.concat(chunks).toString('utf8')); } catch (e) { reject(e); }
                });
                res.on('error', reject);
            });
            req.on('error', reject);
            req.end();
        });
        let pdfUrl = null;
        try {
            const data = JSON.parse(json);
            const files = data.files && data.files.T && data.files.T.PDF;
            if (Array.isArray(files) && files.length > 0) {
                const pick = files.find(f => f.label === 'Normal' || f.label === '0p') || files[0];
                pdfUrl = pick && pick.file && pick.file.url ? pick.file.url : null;
            }
        } catch { }
        if (pdfUrl) {
            const r = net.request({ url: pdfUrl, followRedirect: true, session: session.fromPartition('persist:noroeste-jw') });
            r.setHeader('User-Agent', 'Mozilla/5.0');
            const bChunks = [];
            const buf = await new Promise((resolve, reject) => {
                r.on('response', (res) => {
                    res.on('data', (c) => bChunks.push(Buffer.from(c)));
                    res.on('end', () => resolve(Buffer.concat(bChunks)));
                    res.on('error', reject);
                });
                r.on('error', reject);
                r.end();
            });
            const fileName = `mwb-${issueStr}.pdf`;
            const filePath = path.join(cacheDir, fileName);
            try { fs.writeFileSync(filePath, buf); items.push({ year: y, month: m, path: filePath }); } catch { }
        }
        m += 2;
        if (m > 11) { m = 1; y += 1; }
    }
    return items;
});

ipcMain.handle('get-mwb-path', async (event, params) => {
    const userDir = app.getPath('userData');
    const cacheDir = path.join(userDir, 'mwb_cache');
    const y = params && params.year ? parseInt(String(params.year), 10) : (new Date()).getFullYear();
    const mRaw = params && params.month ? parseInt(String(params.month), 10) : ((new Date()).getMonth() + 1);
    const m = mRaw % 2 === 0 ? mRaw - 1 : mRaw;
    const issueStr = `${y}${String(m).padStart(2, '0')}`;
    const filePath = path.join(cacheDir, `mwb-${issueStr}.pdf`);
    try { if (fs.existsSync(filePath)) return filePath; } catch { }
    return null;
});

// Salvar feed administrado (JSON) no diretório de dados do usuário
ipcMain.handle('save-admin-feed', async (event, params) => {
    const userDir = app.getPath('userData');
    const feedDir = path.join(userDir, 'admin_feed');
    try { fs.mkdirSync(feedDir, { recursive: true }); } catch { }
    const year = params && params.year ? parseInt(String(params.year), 10) : (new Date()).getFullYear();
    const month = params && params.month ? parseInt(String(params.month), 10) : ((new Date()).getMonth() + 1);
    const issue = month % 2 === 0 ? month - 1 : month;
    const weeks = Array.isArray(params && params.weeks) ? params.weeks : [];
    const fname = `${year}-${String(issue).padStart(2, '0')}.json`;
    const filePath = path.join(feedDir, fname);
    const json = JSON.stringify(weeks, null, 2);
    try { fs.writeFileSync(filePath, json, 'utf8'); } catch (e) { throw e; }
    return { path: filePath, count: weeks.length };
});

ipcMain.handle('save-backup', async (event, jsonData) => {
    console.log('💾 Iniciando backup automático...');
    const userDir = app.getPath('userData');
    const backupDir = path.join(userDir, 'backups');
    try {
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }
    } catch (e) {
        console.error('Erro ao criar pasta de backup:', e);
        return { success: false, error: e.message };
    }

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hour = String(now.getHours()).padStart(2, '0');
    const minute = String(now.getMinutes()).padStart(2, '0');
    const second = String(now.getSeconds()).padStart(2, '0');
    const timestamp = `${year}-${month}-${day}_${hour}-${minute}-${second}`;

    const fileName = `backup_${timestamp}.json`;
    const filePath = path.join(backupDir, fileName);

    try {
        fs.writeFileSync(filePath, jsonData, 'utf8');
        console.log(`✅ Backup salvo em: ${filePath}`);

        // Manter apenas os últimos 50 backups
        const files = fs.readdirSync(backupDir)
            .filter(f => f.startsWith('backup_') && f.endsWith('.json'))
            .map(f => ({ name: f, time: fs.statSync(path.join(backupDir, f)).mtime.getTime() }))
            .sort((a, b) => b.time - a.time);

        if (files.length > 50) {
            files.slice(50).forEach(f => {
                try {
                    fs.unlinkSync(path.join(backupDir, f.name));
                } catch (e) { }
            });
        }

        return { success: true, path: filePath };
    } catch (e) {
        console.error('Erro ao gravar arquivo de backup:', e);
        return { success: false, error: e.message };
    }
});

// Configurações do autoUpdater
autoUpdater.on('checking-for-update', () => {
    console.log('🔍 Verificando se há atualizações...');
});

autoUpdater.on('update-available', (info) => {
    console.log('✅ Atualização disponível:', info.version);
});

autoUpdater.on('update-not-available', (info) => {
    console.log('ℹ️ Nenhuma atualização disponível.');
});

autoUpdater.on('error', (err) => {
    console.error('❌ Erro no autoUpdater:', err);
});

autoUpdater.on('download-progress', (progressObj) => {
    let log_message = "Baixando: " + progressObj.percent + "%";
    console.log(log_message);
});

autoUpdater.on('update-downloaded', (info) => {
    console.log('🎁 Atualização baixada; pronta para instalar.');
    // Você pode mostrar um diálogo aqui para o usuário se quiser
    // autoUpdater.quitAndInstall(); // Instala e reinicia automaticamente
});
