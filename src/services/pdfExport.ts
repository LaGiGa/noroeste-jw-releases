import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface IndicatorAssignment {
    date: string;
    type: string;
    theme: string;
    speaker?: string;
    president?: string;
    reader?: string;
    hospitality?: string;
    entranceIndicator?: string;
    auditoriumIndicator?: string;
    audio?: string;
    video?: string;
    mic1?: string;
    mic2?: string;
}

interface Orador {
    nome: string;
    telefone: string;
    congregacao: string;
}

interface Discurso {
    numero: number;
    tema: string;
}

export const exportDesignacoesPDF = (designacoes: IndicatorAssignment[], mes: number, ano: number) => {
    const doc = new jsPDF('landscape');

    // Configurações de fonte e cores
    const titleFontSize = 18;
    const subTitleFontSize = 14;

    // Cabeçalho do Documento
    doc.setTextColor(44, 62, 80);
    doc.setFontSize(titleFontSize);
    doc.setFont("helvetica", "bold");
    doc.text('Programação de Designações - Congregação Noroeste', 14, 15);

    doc.setFontSize(subTitleFontSize);
    doc.setFont("helvetica", "normal");
    doc.text(`Mês de Referência: ${new Date(ano, mes - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`, 14, 22);

    doc.setFontSize(10);
    doc.setTextColor(127, 140, 141);
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, 280, 15, { align: 'right' });

    // Preparar dados para tabela
    // Ordenar por data
    const sortedDesignacoes = [...designacoes].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const tableData = sortedDesignacoes.map(d => {
        const dataFormatada = new Date(d.date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        const diaSemana = d.type === 'domingo' ? 'Domingo' : 'Quarta';

        return [
            `${dataFormatada}\n${diaSemana}`,
            d.president || '-',
            d.reader || '-',
            d.type === 'domingo' ? (d.speaker || '-') : (d.theme || '-'),
            `${d.entranceIndicator || '-'}\n${d.auditoriumIndicator || '-'}`,
            `${d.mic1 || '-'}\n${d.mic2 || '-'}`,
            `${d.audio || '-'}\n${d.video || '-'}\n${d.hospitality || '-'}`
        ];
    });

    autoTable(doc, {
        head: [['Data', 'Presidente', 'Leitor', 'Orador / Tema', 'Indicadores\n(Entrada / Auditório)', 'Microfones\n(Volante 1 / Volante 2)', 'Mídia / Hosp.\n(Áudio / Vídeo / Hosp.)']],
        body: tableData,
        startY: 30,
        styles: {
            fontSize: 9,
            cellPadding: 3,
            valign: 'middle',
            halign: 'center',
            lineWidth: 0.1,
            lineColor: [189, 195, 199]
        },
        headStyles: {
            fillColor: [41, 128, 185],
            textColor: 255,
            fontStyle: 'bold',
            halign: 'center',
            valign: 'middle'
        },
        columnStyles: {
            0: { cellWidth: 25, fontStyle: 'bold' }, // Data
            1: { cellWidth: 35 }, // Presidente
            2: { cellWidth: 35 }, // Leitor
            3: { cellWidth: 50 }, // Orador/Tema
            4: { cellWidth: 40 }, // Indicadores
            5: { cellWidth: 40 }, // Microfones
            6: { cellWidth: 45 }  // Mídia
        },
        alternateRowStyles: { fillColor: [240, 248, 255] },
        margin: { left: 10, right: 10 },
        didDrawPage: (data) => {
            // Rodapé
            const pageCount = doc.getNumberOfPages();
            doc.setFontSize(8);
            doc.setTextColor(127, 140, 141);
            const pageSize = doc.internal.pageSize;
            const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();
            doc.text(`Página ${data.pageNumber} de ${pageCount}`, data.settings.margin.left, pageHeight - 10);
        }
    });

    doc.save(`Designacoes_Noroeste_${mes}_${ano}.pdf`);
};

export const exportOradoresPDF = (oradores: Orador[]) => {
    const doc = new jsPDF();

    doc.setFontSize(16);
    doc.text('Sistema de Discursos - Congregação Noroeste', 14, 15);
    doc.setFontSize(12);
    doc.text('Lista de Oradores', 14, 22);
    doc.setFontSize(10);
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 14, 28);

    const tableData = oradores.map(o => [
        o.nome,
        o.telefone || '-',
        o.congregacao
    ]);

    autoTable(doc, {
        head: [['Nome', 'Telefone', 'Congregação']],
        body: tableData,
        startY: 35,
        styles: { fontSize: 10 },
        headStyles: { fillColor: [33, 37, 41], textColor: 255 },
        alternateRowStyles: { fillColor: [248, 249, 250] }
    });

    doc.save('oradores.pdf');
};

export const exportOradoresAprovadosPDF = (oradores: (Orador & { qualifiedSpeeches: number[] })[]) => {
    const doc = new jsPDF();

    doc.setFontSize(16);
    doc.text('Sistema de Discursos - Congregação Noroeste', 14, 15);
    doc.setFontSize(12);
    doc.text('Oradores Aprovados para Discursos Fora', 14, 22);
    doc.setFontSize(10);
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 14, 28);

    const tableData = oradores.map(o => [
        o.nome,
        o.telefone || '-',
        o.congregacao,
        o.qualifiedSpeeches.join(', ')
    ]);

    autoTable(doc, {
        head: [['Nome', 'Telefone', 'Congregação', 'Esboços Disponíveis']],
        body: tableData,
        startY: 35,
        styles: { fontSize: 9 },
        headStyles: { fillColor: [41, 128, 185], textColor: 255 },
        alternateRowStyles: { fillColor: [248, 249, 250] },
        columnStyles: {
            3: { cellWidth: 50 }
        }
    });

    doc.save('oradores_aprovados.pdf');
};

export const exportDiscursosPDF = (discursos: Discurso[]) => {
    const doc = new jsPDF();

    doc.setFontSize(16);
    doc.text('Sistema de Discursos - Congregação Noroeste', 14, 15);
    doc.setFontSize(12);
    doc.text('Lista de Discursos', 14, 22);
    doc.setFontSize(10);
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 14, 28);

    const tableData = discursos
        .sort((a, b) => a.numero - b.numero)
        .map(d => [d.numero.toString(), d.tema]);

    autoTable(doc, {
        head: [['Número', 'Tema']],
        body: tableData,
        startY: 35,
        styles: { fontSize: 10 },
        headStyles: { fillColor: [33, 37, 41], textColor: 255 },
        alternateRowStyles: { fillColor: [248, 249, 250] },
        columnStyles: {
            0: { cellWidth: 20 }
        }
    });

    doc.save('discursos.pdf');
};

interface AgendaItem {
    data: string;
    horario?: string;
    tema: string;
    orador: string;
    congregacao: string; // Origem
    local?: string;      // Destino
    anfitrao?: string;
}

export const exportAgendaPDF = (agenda: AgendaItem[], periodo: string) => {
    const doc = new jsPDF('landscape');

    doc.setFontSize(16);
    doc.text('Sistema de Discursos - Congregação Noroeste', 14, 15);
    doc.setFontSize(12);
    doc.text(`Agenda - ${periodo}`, 14, 22);
    doc.setFontSize(10);
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 280, 15, { align: 'right' });

    const tableData = agenda.map(a => [
        new Date(a.data + 'T00:00:00').toLocaleDateString('pt-BR'),
        a.horario || '-',
        a.tema,
        a.orador,
        a.congregacao,
        a.local || '-',
        a.anfitrao || '-'
    ]);

    autoTable(doc, {
        head: [['Data', 'Horário Reunião', 'Tema', 'Orador', 'Cong. Origem', 'Local do Discurso', 'Anfitrião']],
        body: tableData,
        startY: 35,
        styles: { fontSize: 9 },
        headStyles: { fillColor: [33, 37, 41], textColor: 255 },
        alternateRowStyles: { fillColor: [248, 249, 250] }
    });

    doc.save(`agenda_${periodo}.pdf`);
};

interface CongregacaoItem {
    nome: string;
    horario: string;
    cidade: string;
}

export const exportCongregacoesPDF = (congregacoes: CongregacaoItem[]) => {
    const doc = new jsPDF();

    doc.setFontSize(16);
    doc.text('Sistema de Discursos - Congregação Noroeste', 14, 15);
    doc.setFontSize(12);
    doc.text('Lista de Congregações', 14, 22);
    doc.setFontSize(10);
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 14, 28);

    const tableData = congregacoes.map(c => [
        c.nome,
        c.horario,
        c.cidade
    ]);

    autoTable(doc, {
        head: [['Nome', 'Horário da Reunião', 'Cidade']],
        body: tableData,
        startY: 35,
        styles: { fontSize: 10 },
        headStyles: { fillColor: [33, 37, 41], textColor: 255 },
        alternateRowStyles: { fillColor: [248, 249, 250] }
    });

    doc.save('congregacoes.pdf');
};
