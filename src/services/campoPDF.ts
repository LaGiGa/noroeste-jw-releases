
import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface DesignacaoCampo {
    id: string;
    data: string;
    diaSemana: string;
    hora: string;
    territorio: string;
    local: string;
    dirigente: string;
}

/*
const COLORS = {
    header: [200, 200, 200] as [number, number, number], // Gray
    headerText: [0, 0, 0] as [number, number, number],
    border: [0, 0, 0] as [number, number, number], // Black
    nightHeader: [255, 255, 255] as [number, number, number] // White bg
};
*/

export const exportCampoPDF = (designacoes: DesignacaoCampo[], mesAnoTexto: string) => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    // Header Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    // ex: PROGRAMAÇÃO DE SAÍDA DE CAMPO - DEZEMBRO / 2025
    doc.text(`PROGRAMAÇÃO DE SAÍDA DE CAMPO - ${mesAnoTexto.toUpperCase()}`, 105, 15, { align: 'center' });

    // Separate Morning (Tue-Sun) and Evening (Thu, Fri)
    // Evening logic: Time >= 18:00
    const morning = designacoes.filter(d => parseInt(d.hora.split(':')[0]) < 18);
    const evening = designacoes.filter(d => parseInt(d.hora.split(':')[0]) >= 18);

    // const tableHeaders = [['DIA', 'TERRITÓRIO', 'HORÁRIO', 'LOCAL DE SAÍDA', 'DIRIGENTE']];

    // Helper to format rows
    const formatRow = (d: DesignacaoCampo) => {
        const dateStr = new Date(d.data + 'T00:00:00').toLocaleDateString('pt-BR');
        // Combined Date + Weekday for first column? No, image has them separate or merged?
        // Image: "02/12/2025" (left) | "Terça-feira" (right of same cell?).
        // Actually the image shows: "DIA" header spanning two cols? No, "DIA" is one header but the cell has a vertical line?
        // Let's assume standard columns: Date, Day, Territory, Time, Local, Conductor.
        // But the image has 5 headers: DIA, TERRITORIO, HORARIO, LOCAL, DIRIGENTE. 
        // Under "DIA", there are two sub-columns: Date and Weekday Name.
        // Just use two columns for clarity or merge them string-wise.
        // Merging string-wise: "02/12/2025\nTerça-feira"
        return [
            { content: `${dateStr}\n${d.diaSemana}`, styles: { halign: 'center', valign: 'middle' } },
            { content: d.territorio, styles: { halign: 'center', valign: 'middle' } },
            { content: d.hora, styles: { halign: 'center', valign: 'middle' } },
            { content: d.local, styles: { halign: 'center', valign: 'middle' } },
            { content: d.dirigente, styles: { halign: 'center', valign: 'middle' } }
        ];
    };

    // Prepare body for Morning
    const morningBody = morning.map(d => {
        const row = formatRow(d);
        // Bold if Saturday or Sunday
        if (d.diaSemana.toLowerCase().includes('sábado') || d.diaSemana.toLowerCase().includes('domingo')) {
            // @ts-ignore
            row.forEach(cell => cell.styles = { ...cell.styles, fontStyle: 'bold' });
        }
        return row;
    });

    // Generate Morning Table
    // @ts-ignore
    doc.autoTable({
        startY: 25,
        head: [['DIA', 'TERRITÓRIO', 'HORÁRIO', 'LOCAL DE SAÍDA', 'DIRIGENTE']],
        body: morningBody,
        theme: 'grid', // Uses grid lines
        styles: {
            fontSize: 10,
            textColor: 0,
            lineWidth: 0.1,
            lineColor: [0, 0, 0]
        },
        headStyles: {
            fillColor: [220, 220, 220],
            textColor: 0,
            fontStyle: 'bold',
            halign: 'center',
            valign: 'middle'
        },
        columnStyles: {
            0: { cellWidth: 40 }, // Dia
            1: { cellWidth: 25 }, // Territorio
            2: { cellWidth: 20 }, // Horario
            3: { cellWidth: 55 }, // Local
            4: { cellWidth: 'auto' } // Dirigente
        },
        didParseCell: (_data: any) => {
            // Optional customized styling per cell
        }
    });

    // Add Sunday Footer Row manually? 
    // The autoTable doesn't easily support a full-width footer row that merges all columns.
    // We can just add another table strictly for that row or draw it.
    // Let's use autoTable finalY.
    // @ts-ignore
    const finalY = doc.lastAutoTable.finalY;

    // Fixed Sunday Row
    // @ts-ignore
    doc.autoTable({
        startY: finalY, // attach immediately
        body: [[
            { content: 'Domingo', styles: { halign: 'center', fontStyle: 'bold' } },
            { content: '', styles: { cellWidth: 25 } }, // empty territory
            { content: '08:30', styles: { halign: 'center', fontStyle: 'bold' } },
            { content: 'Cada publicador no seu respectivo grupo', colSpan: 2, styles: { halign: 'center', fontStyle: 'bold' } }
        ]],
        theme: 'grid',
        styles: {
            fontSize: 10,
            textColor: 0,
            lineWidth: 0.1,
            lineColor: 0
        },
        columnStyles: {
            0: { cellWidth: 40 },
            1: { cellWidth: 25 },
            2: { cellWidth: 20 }
            // 3 & 4 covered by colSpan
        },
        showHead: false
    });

    // EVENING SECTION
    if (evening.length > 0) {
        // @ts-ignore
        const currentY = doc.lastAutoTable.finalY + 10;

        // Header "CAMPO À NOITE"
        doc.setFontSize(12);
        doc.setTextColor(150, 0, 0); // Dark Red
        doc.text('CAMPO À NOITE', 105, currentY - 3, { align: 'center' });

        const eveningBody = evening.map(formatRow);

        // @ts-ignore
        doc.autoTable({
            startY: currentY,
            head: [['DIA', 'TERRITÓRIO', 'HORÁRIO', 'LOCAL DE SAÍDA', 'DIRIGENTE']],
            body: eveningBody,
            theme: 'grid',
            styles: {
                fontSize: 10,
                textColor: 0,
                lineWidth: 0.1,
                lineColor: 0
            },
            headStyles: {
                fillColor: [220, 220, 220],
                textColor: 0,
                fontStyle: 'bold',
                halign: 'center',
                valign: 'middle'
            },
            columnStyles: {
                0: { cellWidth: 40 },
                1: { cellWidth: 25 },
                2: { cellWidth: 20 },
                3: { cellWidth: 55 },
                4: { cellWidth: 'auto' }
            }
        });
    }

    // Save
    doc.save(`Campo_${mesAnoTexto.replace(/\s/g, '_')}.pdf`);
};
