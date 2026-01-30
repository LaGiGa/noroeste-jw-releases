import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Definições de Tipo e Cores
interface ProgramaVidaMinisterio {
    data: string;
    dataReuniao?: string;
    referenciaBiblica: string;
    canticoInicial: string;
    presidente: string;
    oracao: string;
    tesouros: { titulo: string; tempo: string; orador: string }[];
    leituraBiblia: { tempo: string; estudante: string; estudanteSalaB?: string };
    salaPrincipal: string; // Conselheiro Principal
    salaB?: string; // Conselheiro Sala B
    ministerioPrincipal?: { titulo: string; tempo: string; participante: string; ajudante?: string }[];
    ministerioSalaB?: { titulo: string; tempo: string; participante: string; ajudante?: string }[];
    canticoMeio: string;
    vidaCrista: { titulo: string; tempo: string; condutor: string }[];
    estudoBiblico: { condutor: string; leitor: string };
    comentariosFinais: string;
    canticoFinal: string;
    oracaoFinal: string;
    local?: string;
}

const COLORS = {
    header: [58, 104, 114] as [number, number, number],
    barBg: [230, 240, 242] as [number, number, number],
    tesouros: [60, 104, 115] as [number, number, number],
    ministerio: [201, 137, 13] as [number, number, number],
    vidaCrista: [158, 26, 39] as [number, number, number],
    text: [0, 0, 0] as [number, number, number],
    secondaryText: [50, 50, 50] as [number, number, number]
};

const MEASUREMENTS = {
    LEFT_MARGIN: 35,
    RIGHT_MARGIN: 560, // A4 Width (595) - 35
    COL_SALA_B: 237,
    COL_MAIN: 376,
    COL_LEITOR: 330,
    LINE_HEIGHT: 13,
    FONT_SIZE_TITLE: 22,
    FONT_SIZE_HEADER: 10,
    FONT_SIZE_BODY: 11,
    FONT_SIZE_SMALL: 10
};

const formatTempo = (t: string): string => {
    const m = t.match(/(\d{1,2})\s*min/i);
    return m ? `(${m[1]} min.)` : `(${t.replace(/[()]/g, '').trim()})`;
};

const formatRef = (ref: string): string => {
    return ref.toUpperCase()
        .replace(/CÂNTICO DOS CÂNTICOS/g, 'CÂNTICO DE SALOMÃO')
        .replace(/LEITURA DA BÍBLIA[:\s]*/gi, '')
        .trim();
};

const drawPage = (doc: jsPDF, p: ProgramaVidaMinisterio) => {
    const { LEFT_MARGIN, COL_SALA_B, COL_MAIN } = {
        LEFT_MARGIN: 35,
        COL_SALA_B: 285,
        COL_MAIN: 405   // Shifted right slightly
    };
    const PAGE_WIDTH = doc.internal.pageSize.getWidth();

    let y = 30;

    // --- Header ---
    doc.setDrawColor(...COLORS.header);
    doc.setLineWidth(1.5);
    doc.roundedRect(LEFT_MARGIN, y, PAGE_WIDTH - (LEFT_MARGIN * 2), 40, 8, 8, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(MEASUREMENTS.FONT_SIZE_TITLE);
    doc.setTextColor(...COLORS.header);
    doc.text('Vida e Ministério', PAGE_WIDTH / 2, y + 28, { align: 'center' });

    doc.setFont('times', 'normal');
    doc.setFontSize(9);
    doc.text('Noroeste - Palmas', LEFT_MARGIN + 10, y + 34);

    const impressao = `Impresso ${new Date().toLocaleDateString('pt-BR')} `;
    doc.text(impressao, PAGE_WIDTH - LEFT_MARGIN - 10, y + 34, { align: 'right' });

    y += 55;

    // --- Date Bar ---
    // 19 pt space
    doc.setFillColor(...COLORS.barBg);
    doc.rect(LEFT_MARGIN, y - 10, PAGE_WIDTH - (LEFT_MARGIN * 2), 16, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);

    const dateStr = (() => {
        const d = new Date(p.dataReuniao || p.data);
        if (!isNaN(d.getTime())) {
            // Se for segunda-feira (dia 1), ajusta para quarta (add 2 dias)
            // O sistema JW geralmente traz a data da segunda-feira como início da semana.

            // Ajuste simples: se a data vier como string YYYY-MM-DD, o new Date cria como UTC -3 (Brasil) ou UTC?
            // Melhor garantir: tratar como YYYY-MM-DD local
            const [ano, mes, dia] = (p.dataReuniao || p.data).split('-').map(Number);
            const dataLocal = new Date(ano, mes - 1, dia);

            if (dataLocal.getDay() === 1) {
                dataLocal.setDate(dataLocal.getDate() + 2);
            }

            const day = dataLocal.getDate();
            const month = dataLocal.toLocaleDateString('pt-BR', { month: 'long' });
            return `${day} ${month.charAt(0).toUpperCase() + month.slice(1)} `;
        }
        return p.data;
    })();

    doc.text(`${dateStr} | ${formatRef(p.referenciaBiblica)} `, LEFT_MARGIN + 5, y + 2);

    y += 24; // Aumentar espaço após Data (Gap visual maior)

    // --- Top Section ---
    doc.setFontSize(11);
    doc.text(`Cântico ${p.canticoInicial} `, LEFT_MARGIN, y);

    // Presidente
    // Label align right to COL_MAIN - 5
    // Value starts at COL_MAIN

    doc.setFont('helvetica', 'bold');
    doc.text('Presidente:', COL_MAIN - 5, y, { align: 'right' });

    doc.setFont('helvetica', 'normal'); // Nome do Presidente em Sans-Serif
    // Start value at COL_MAIN
    doc.text(p.presidente || '', COL_MAIN, y);

    y += 18; // 18 pt entre linhas de texto (Cântico -> Comentários)
    // "Comentários iniciais"
    doc.setFont('times', 'normal'); // Título da parte em Serif
    doc.text('Comentários iniciais (1 min.)', LEFT_MARGIN, y);

    doc.setFont('helvetica', 'bold');
    doc.text('Oração:', COL_MAIN - 5, y, { align: 'right' });
    doc.setFont('helvetica', 'normal'); // Nome da Oração em Sans-Serif
    doc.text(p.oracao || '', COL_MAIN, y);

    y += 32; // 20pt visual gap + altura da linha para Tesouros

    // --- TESOUROS ---
    doc.setFillColor(...COLORS.tesouros);
    // Ajustar quadrado: rect(x, y, w, h). Texto está em Y.
    // Queremos alinhar BASE do texto com BASE do quadrado.
    // Texto size 13.
    // Rect height 15.
    // Se y é a baseline do texto, rect deve descer um pouco.
    // Vamos testar y - 11 para top do rect.
    doc.rect(LEFT_MARGIN, y - 11, 15, 15, 'F');
    doc.setTextColor(...COLORS.tesouros);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('TESOUROS DA PALAVRA DE DEUS', LEFT_MARGIN + 20, y);

    y += 20; // Aumentar espaço entre o Título da Seção e a Parte 1
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);

    let itemNum = 1;

    // Items 1 & 2
    p.tesouros.forEach(item => {
        const titleFull = `${itemNum}. ${item.titulo} ${formatTempo(item.tempo)} `;
        doc.setFont('times', 'bold');
        const titleLines = doc.splitTextToSize(titleFull, COL_SALA_B - LEFT_MARGIN - 20); // Menor largura para não invadir
        doc.text(titleLines, LEFT_MARGIN, y);

        doc.setFont('helvetica', 'normal'); // Orador em Sans-Serif
        doc.text(item.orador || '', COL_MAIN, y);

        y += (titleLines.length * 12) + 12; // Voltar para 12, pois 24 ficou muito grande
        itemNum++;
    });

    // Bible Reading Header (Sala B / Main)
    // Only if we have Sala B or Reading needs it.
    // Image shows Headers above Reading lines.
    y += 5; // A little buffer before headers
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Sala B', COL_SALA_B, y);
    doc.text('Salão principal', COL_MAIN, y);

    y += 12;

    // Conselheiros
    doc.setFont('helvetica', 'normal'); // Conselheiros em Sans-Serif
    if (p.salaB) doc.text(p.salaB, COL_SALA_B, y);
    if (p.salaPrincipal) doc.text(p.salaPrincipal, COL_MAIN, y);

    y += 19; // 19 pt

    // Item 3: Reading
    doc.setFontSize(11);
    doc.setFont('times', 'bold');
    const readingTitle = `${itemNum}. Leitura da Bíblia: ${formatTempo(p.leituraBiblia.tempo)} `;
    doc.text(readingTitle, LEFT_MARGIN, y);

    // Students
    doc.setFont('helvetica', 'normal'); // Estudantes em Sans-Serif

    if (p.leituraBiblia.estudanteSalaB) {
        doc.text(p.leituraBiblia.estudanteSalaB, COL_SALA_B, y);
    }

    if (p.leituraBiblia.estudante) {
        doc.text(p.leituraBiblia.estudante, COL_MAIN, y);
    }

    itemNum++;
    y += 47; // 47 pt gap before ministerio

    // --- MINISTERIO ---
    doc.setFillColor(...COLORS.ministerio);
    doc.rect(LEFT_MARGIN, y - 11, 15, 15, 'F');
    doc.setTextColor(...COLORS.ministerio);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('FAÇA SEU MELHOR NO MINISTÉRIO', LEFT_MARGIN + 20, y);

    y += 25; // 25 pt
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);

    const minItemsP = p.ministerioPrincipal || [];
    const minItemsB = p.ministerioSalaB || [];
    const countMin = Math.max(minItemsP.length, minItemsB.length);

    for (let i = 0; i < countMin; i++) {
        const itemP = minItemsP[i];
        const itemB = minItemsB[i];

        // Title (Use P or B)
        const titleText = (itemP?.titulo || itemB?.titulo || 'Parte').trim();
        const tempo = (itemP?.tempo || itemB?.tempo || '').trim();

        // If empty, skip
        if (!titleText && !itemP?.participante && !itemB?.participante) continue;

        doc.setFont('times', 'bold');
        const fullTitle = `${itemNum}. ${titleText} ${formatTempo(tempo)} `;
        // Wrap title specifically to avoid columns
        const titleLines = doc.splitTextToSize(fullTitle, COL_SALA_B - LEFT_MARGIN - 10);

        doc.text(titleLines, LEFT_MARGIN, y);

        doc.setFont('helvetica', 'normal'); // Participantes em Sans-Serif

        // Sala B (participant + assistant)
        if (itemB) {
            doc.text(itemB.participante || '', COL_SALA_B, y);
            if (itemB.ajudante) {
                // Assistant on next line
                doc.text(itemB.ajudante, COL_SALA_B, y + 11);
            }
        }

        // Sala Main (participant + assistant)
        if (itemP) {
            doc.text(itemP.participante || '', COL_MAIN, y);
            if (itemP.ajudante) {
                doc.text(itemP.ajudante, COL_MAIN, y + 11);
            }
        }

        // Calculate spacing for next item
        // Each item seems to have around 25pt spacing in image logic (between starts?)
        // Let's calculate height used first
        const linesHeight = titleLines.length * 12;
        const hasAssistant = (itemP?.ajudante || itemB?.ajudante);
        const partHeight = hasAssistant ? 22 : 11;

        // Check if we need extra spacing like photo
        // Photo shows consistent spacing for items.

        y += Math.max(linesHeight, partHeight) + 16; // Increased from 12 to 16
        itemNum++;
    }

    y += 8; // Adjust spacing before Vida Cristã

    // --- Vida Cristã ---
    doc.setFillColor(...COLORS.vidaCrista);
    doc.rect(LEFT_MARGIN, y - 11, 15, 15, 'F');
    doc.setTextColor(...COLORS.vidaCrista);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('NOSSA VIDA CRISTÃ', LEFT_MARGIN + 20, y);

    y += 18; // 18 pt
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);

    // Cantico Meio
    doc.setFont('helvetica', 'bold');
    doc.text(`Cântico ${p.canticoMeio} `, LEFT_MARGIN, y);
    y += 6; // Increased gap

    // Items
    p.vidaCrista.forEach(item => {
        y += 16; // Increased vertical gap per item
        doc.setFont('times', 'bold');
        const titleFull = `${itemNum}. ${item.titulo} ${formatTempo(item.tempo)} `;
        const titleLines = doc.splitTextToSize(titleFull, COL_MAIN - LEFT_MARGIN - 20);
        doc.text(titleLines, LEFT_MARGIN, y);

        doc.setFont('helvetica', 'normal'); // Condutor em Sans-Serif
        doc.text(item.condutor || '', COL_MAIN, y);

        y += (titleLines.length * 12);
        itemNum++;
    });

    y += 18; // 18 pt

    // Estudo Biblico
    doc.setFont('times', 'bold');
    doc.text(`${itemNum}. Estudo Bíblico de Congregação(30 min.)`, LEFT_MARGIN, y);

    // Conductor
    doc.setFont('helvetica', 'normal'); // Condutor Sans-Serif
    doc.text(p.estudoBiblico.condutor || '', COL_MAIN, y);

    y += 16; // spacing to Leitor
    // Leitor at COL_MAIN (aligned right to -5 for Label)
    doc.setFont('helvetica', 'bold');
    doc.text('Leitor:', COL_MAIN - 5, y, { align: 'right' });

    doc.setFont('helvetica', 'normal'); // Leitor Sans-Serif
    // const leitorOffset = 0; // No offset, starts at COL_MAIN
    doc.text(p.estudoBiblico.leitor || '', COL_MAIN, y);

    y += 29; // 29 pt

    // Comentarios Finais
    doc.setFont('times', 'normal');
    doc.text('Comentários finais (3 min.)', LEFT_MARGIN, y);
    // Name of Chairman
    doc.setFont('helvetica', 'normal'); // Presidente final Sans-Serif
    doc.text(p.comentariosFinais || (p.salaPrincipal || ''), COL_MAIN, y);

    y += 24; // Aumentar espaçamento antes do Cântico Final

    // Bottom Cantico / Oração
    doc.setFont('helvetica', 'bold');
    doc.text(`Cântico ${p.canticoFinal} `, LEFT_MARGIN, y);

    doc.text('Oração:', COL_MAIN - 5, y, { align: 'right' });
    doc.setFont('helvetica', 'normal'); // Oração Final Sans-Serif
    doc.text(p.oracaoFinal || '', COL_MAIN, y);
};

// --- Exports ---

export const JW_NOV_DEZ_PRESET = {}; // Legacy support

export const exportProgramaVidaMinisterioPDF = (programa: ProgramaVidaMinisterio) => {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    drawPage(doc, programa);
    doc.save(`Vida_e_Ministerio_${programa.data.replace(/\//g, '-')}.pdf`);
};

export const exportProgramaVidaMinisterioPDFMulti = (programas: ProgramaVidaMinisterio[]) => {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    programas.forEach((p, i) => {
        if (i > 0) doc.addPage();
        drawPage(doc, p);
    });
    doc.save(`Vida_e_Ministerio_Multi.pdf`);
};

// Replace Exact with Single logic, as it is preferred layout
export const exportS89PDF = (programa: ProgramaVidaMinisterio) => {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });

    interface S89Data {
        student: string;
        assistant: string;
        date: string;
        part: string;
        room: 'Principal' | 'Sala B' | 'Sala C';
    }

    const assignments: S89Data[] = [];

    // Leitura da Bíblia
    if (programa.leituraBiblia.estudante) {
        assignments.push({
            student: programa.leituraBiblia.estudante,
            assistant: '',
            date: programa.dataReuniao || programa.data,
            part: 'Leitura da Bíblia',
            room: 'Principal'
        });
    }
    if (programa.leituraBiblia.estudanteSalaB) {
        assignments.push({
            student: programa.leituraBiblia.estudanteSalaB,
            assistant: '',
            date: programa.dataReuniao || programa.data,
            part: 'Leitura da Bíblia',
            room: 'Sala B'
        });
    }

    // Ministério
    programa.ministerioPrincipal?.forEach(p => {
        if (p.participante) {
            assignments.push({
                student: p.participante,
                assistant: p.ajudante || '',
                date: programa.dataReuniao || programa.data,
                part: p.titulo,
                room: 'Principal'
            });
        }
    });

    programa.ministerioSalaB?.forEach(p => {
        if (p.participante) {
            assignments.push({
                student: p.participante,
                assistant: p.ajudante || '',
                date: programa.dataReuniao || programa.data,
                part: p.titulo,
                room: 'Sala B'
            });
        }
    });

    const drawSlip = (x: number, y: number, data: S89Data) => {
        const width = 270;
        const height = 380; // Approximate quarter page

        // Debug border (optional, removed for production)
        // doc.rect(x, y, width, height);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text('DESIGNAÇÃO PARA A REUNIÃO', x + width / 2, y + 20, { align: 'center' });
        doc.text('NOSSA VIDA E MINISTÉRIO CRISTÃO', x + width / 2, y + 34, { align: 'center' });

        doc.setFontSize(10);
        const startY = y + 60;
        const lineHeight = 25;

        // Fields
        const drawField = (label: string, value: string, currentY: number) => {
            doc.setFont('helvetica', 'bold');
            doc.text(label, x + 10, currentY);
            doc.setFont('helvetica', 'normal');

            // Draw line
            const labelWidth = doc.getTextWidth(label);
            const lineStartX = x + 10 + labelWidth + 5;
            const lineEndX = x + width - 10;
            doc.line(lineStartX, currentY + 2, lineEndX, currentY + 2);

            // Value
            if (value) {
                doc.text(value, lineStartX + 2, currentY - 2);
            } else {
                // Dotted line or just empty
            }
        };

        const dateStr = (() => {
            if (!data.date) return '';
            // Try parsing YYYY-MM-DD
            if (data.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
                const [ano, mes, dia] = data.date.split('-').map(Number);
                const d = new Date(ano, mes - 1, dia);
                if (d.getDay() === 1) d.setDate(d.getDate() + 2); // Adjust Monday to Wednesday if needed, but dataReuniao usually is correct
                return d.toLocaleDateString('pt-BR');
            }
            return data.date;
        })();

        drawField('Nome:', data.student, startY);
        drawField('Ajudante:', data.assistant, startY + lineHeight);
        drawField('Data:', dateStr, startY + lineHeight * 2);
        drawField('Número da parte:', data.part, startY + lineHeight * 3);

        // Local
        const localY = startY + lineHeight * 4 + 10;
        doc.setFont('helvetica', 'bold');
        doc.text('Local:', x + 10, localY);

        doc.setFont('helvetica', 'normal');
        const boxSize = 8;

        const drawCheckbox = (label: string, checked: boolean, cx: number, cy: number) => {
            doc.rect(cx, cy, boxSize, boxSize);
            if (checked) {
                doc.setFont('helvetica', 'bold');
                doc.text('X', cx + 1, cy + 7);
                doc.setFont('helvetica', 'normal');
            }
            doc.text(label, cx + 15, cy + 7);
        };

        drawCheckbox('Salão principal', data.room === 'Principal', x + 20, localY + 15);
        drawCheckbox('Sala B', data.room === 'Sala B', x + 20, localY + 30);
        drawCheckbox('Sala C', data.room === 'Sala C', x + 20, localY + 45);

        // Footer Note
        const footerY = localY + 70;
        doc.setFontSize(8);
        const note = 'Observação para o estudante: A lição e a fonte de matéria para a sua designação estão na Apostila da Reunião Vida e Ministério. Veja as instruções para a parte que estão nas Instruções para a Reunião Nossa Vida e Ministério Cristão (S-38).';
        const splitNote = doc.splitTextToSize(note, width - 20);
        doc.text(splitNote, x + 10, footerY);

        // Code
        doc.setFontSize(7);
        doc.text('S-89-T   11/23', x + 10, y + height - 10);
    };

    // Pagination logic
    const slipsPerPage = 4;
    for (let i = 0; i < assignments.length; i++) {
        if (i > 0 && i % slipsPerPage === 0) {
            doc.addPage();
        }

        const indexOnPage = i % slipsPerPage;
        // 0: Top Left, 1: Top Right, 2: Bottom Left, 3: Bottom Right
        // Page size A4 pt: 595 x 842

        const col = indexOnPage % 2; // 0 or 1
        const row = Math.floor(indexOnPage / 2); // 0 or 1

        const x = col === 0 ? 20 : 307.5; // 20 padding, 307.5 is center + padding
        const y = row === 0 ? 20 : 421; // 20 padding, 421 is middle

        drawSlip(x, y, assignments[i]);
    }

    doc.save(`S -89_${programa.data.replace(/\//g, '-')}.pdf`);
};

export const exportS89PDFMulti = (programas: ProgramaVidaMinisterio[]) => {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });

    interface S89Data {
        student: string;
        assistant: string;
        date: string;
        part: string;
        room: 'Principal' | 'Sala B' | 'Sala C';
    }

    const assignments: S89Data[] = [];

    programas.forEach(programa => {
        // Leitura da Bíblia
        if (programa.leituraBiblia.estudante) {
            assignments.push({
                student: programa.leituraBiblia.estudante,
                assistant: '',
                date: programa.dataReuniao || programa.data,
                part: 'Leitura da Bíblia',
                room: 'Principal'
            });
        }
        if (programa.leituraBiblia.estudanteSalaB) {
            assignments.push({
                student: programa.leituraBiblia.estudanteSalaB,
                assistant: '',
                date: programa.dataReuniao || programa.data,
                part: 'Leitura da Bíblia',
                room: 'Sala B'
            });
        }

        // Ministério
        programa.ministerioPrincipal?.forEach(p => {
            if (p.participante) {
                assignments.push({
                    student: p.participante,
                    assistant: p.ajudante || '',
                    date: programa.dataReuniao || programa.data,
                    part: p.titulo,
                    room: 'Principal'
                });
            }
        });

        programa.ministerioSalaB?.forEach(p => {
            if (p.participante) {
                assignments.push({
                    student: p.participante,
                    assistant: p.ajudante || '',
                    date: programa.dataReuniao || programa.data,
                    part: p.titulo,
                    room: 'Sala B'
                });
            }
        });
    });

    const drawSlip = (x: number, y: number, data: S89Data) => {
        const width = 270;
        const height = 380; // Approximate quarter page

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text('DESIGNAÇÃO PARA A REUNIÃO', x + width / 2, y + 20, { align: 'center' });
        doc.text('NOSSA VIDA E MINISTÉRIO CRISTÃO', x + width / 2, y + 34, { align: 'center' });

        doc.setFontSize(10);
        const startY = y + 60;
        const lineHeight = 25;

        // Fields
        const drawField = (label: string, value: string, currentY: number) => {
            doc.setFont('helvetica', 'bold');
            doc.text(label, x + 10, currentY);
            doc.setFont('helvetica', 'normal');

            // Draw line
            const labelWidth = doc.getTextWidth(label);
            const lineStartX = x + 10 + labelWidth + 5;
            const lineEndX = x + width - 10;
            doc.line(lineStartX, currentY + 2, lineEndX, currentY + 2);

            // Value
            if (value) {
                doc.text(value, lineStartX + 2, currentY - 2);
            }
        };

        const dateStr = (() => {
            if (!data.date) return '';
            // Try parsing YYYY-MM-DD
            if (data.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
                const [ano, mes, dia] = data.date.split('-').map(Number);
                const d = new Date(ano, mes - 1, dia);
                if (d.getDay() === 1) d.setDate(d.getDate() + 2);
                return d.toLocaleDateString('pt-BR');
            }
            return data.date;
        })();

        drawField('Nome:', data.student, startY);
        drawField('Ajudante:', data.assistant, startY + lineHeight);
        drawField('Data:', dateStr, startY + lineHeight * 2);
        drawField('Número da parte:', data.part, startY + lineHeight * 3);

        // Local
        const localY = startY + lineHeight * 4 + 10;
        doc.setFont('helvetica', 'bold');
        doc.text('Local:', x + 10, localY);

        doc.setFont('helvetica', 'normal');
        const boxSize = 8;

        const drawCheckbox = (label: string, checked: boolean, cx: number, cy: number) => {
            doc.rect(cx, cy, boxSize, boxSize);
            if (checked) {
                doc.setFont('helvetica', 'bold');
                doc.text('X', cx + 1, cy + 7);
                doc.setFont('helvetica', 'normal');
            }
            doc.text(label, cx + 15, cy + 7);
        };

        drawCheckbox('Salão principal', data.room === 'Principal', x + 20, localY + 15);
        drawCheckbox('Sala B', data.room === 'Sala B', x + 20, localY + 30);
        drawCheckbox('Sala C', data.room === 'Sala C', x + 20, localY + 45);

        // Footer Note
        const footerY = localY + 70;
        doc.setFontSize(8);
        const note = 'Observação para o estudante: A lição e a fonte de matéria para a sua designação estão na Apostila da Reunião Vida e Ministério. Veja as instruções para a parte que estão nas Instruções para a Reunião Nossa Vida e Ministério Cristão (S-38).';
        const splitNote = doc.splitTextToSize(note, width - 20);
        doc.text(splitNote, x + 10, footerY);

        // Code
        doc.setFontSize(7);
        doc.text('S-89-T   11/23', x + 10, y + height - 10);
    };

    // Pagination logic
    const slipsPerPage = 4;
    for (let i = 0; i < assignments.length; i++) {
        if (i > 0 && i % slipsPerPage === 0) {
            doc.addPage();
        }

        const indexOnPage = i % slipsPerPage;

        const col = indexOnPage % 2; // 0 or 1
        const row = Math.floor(indexOnPage / 2); // 0 or 1

        const x = col === 0 ? 20 : 307.5; // 20 padding, 307.5 is center + padding
        const y = row === 0 ? 20 : 421; // 20 padding, 421 is middle

        drawSlip(x, y, assignments[i]);
    }

    doc.save(`S -89_Multi_${programas.length} _Semanas.pdf`);
};

export const exportProgramaVidaMinisterioPDFExact = async (programa: ProgramaVidaMinisterio, mode: 'save' | 'preview') => {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    drawPage(doc, programa);

    if (mode === 'preview') {
        const blob = doc.output('bloburl');
        return blob;
    }
    doc.save(`Vida_e_Ministerio_${programa.data.replace(/\//g, '-')}.pdf`);
};
