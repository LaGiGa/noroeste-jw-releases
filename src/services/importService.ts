import * as XLSX from 'xlsx';

interface Discurso {
    numero: number;
    tema: string;
}

export const importDiscursosFromExcel = async (file: File): Promise<Discurso[]> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = e.target?.result;
                const workbook = XLSX.read(data, { type: 'binary' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const json = XLSX.utils.sheet_to_json(worksheet);

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const discursos: Discurso[] = json.map((row: any) => ({
                    numero: parseInt(row['Número'] || row['Numero'] || row['numero'] || row['NÚMERO']),
                    tema: String(row['Tema'] || row['tema'] || row['TEMA'] || '')
                })).filter(d => d.numero && d.tema);

                resolve(discursos);
            } catch {
                reject(new Error('Erro ao processar arquivo Excel. Verifique o formato.'));
            }
        };

        reader.onerror = () => {
            reject(new Error('Erro ao ler arquivo.'));
        };

        reader.readAsBinaryString(file);
    });
};

export const importDiscursosFromPDF = async (file: File): Promise<Discurso[]> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = async (e) => {
            try {
                const text = e.target?.result as string;

                // Regex para identificar padrão: Número - Tema
                const regex = /(\d+)\s*[-–]\s*(.+)/g;
                const matches = [...text.matchAll(regex)];

                const discursos: Discurso[] = matches.map(match => ({
                    numero: parseInt(match[1]),
                    tema: match[2].trim()
                })).filter(d => d.numero && d.tema);

                if (discursos.length === 0) {
                    reject(new Error('Nenhum discurso encontrado no PDF. Formato esperado: "1 - Tema do discurso"'));
                } else {
                    resolve(discursos);
                }
            } catch {
                reject(new Error('Erro ao processar arquivo PDF.'));
            }
        };

        reader.onerror = () => {
            reject(new Error('Erro ao ler arquivo.'));
        };

        reader.readAsText(file);
    });
};

export const downloadExcelTemplate = () => {
    const template = [
        { 'Número': 1, 'Tema': 'A importância da oração' },
        { 'Número': 2, 'Tema': 'Fé em ação' },
        { 'Número': 3, 'Tema': 'O amor de Jeová' }
    ];

    const worksheet = XLSX.utils.json_to_sheet(template);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Discursos');

    XLSX.writeFile(workbook, 'template_discursos.xlsx');
};

export const validateDiscursoData = (discursos: Discurso[]): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];
    const numeros = new Set<number>();

    discursos.forEach((d, index) => {
        if (!d.numero || d.numero < 1 || d.numero > 999) {
            errors.push(`Linha ${index + 1}: Número inválido (deve ser entre 1 e 999)`);
        }
        if (!d.tema || d.tema.trim() === '') {
            errors.push(`Linha ${index + 1}: Tema não pode estar vazio`);
        }
        if (numeros.has(d.numero)) {
            errors.push(`Linha ${index + 1}: Número ${d.numero} duplicado`);
        }
        numeros.add(d.numero);
    });

    return {
        valid: errors.length === 0,
        errors
    };
};
