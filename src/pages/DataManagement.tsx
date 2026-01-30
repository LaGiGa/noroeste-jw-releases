import React, { useState, useRef, useEffect } from 'react';
import { db } from '../services/database';
import { showSuccess, showError } from '../utils/toast';
import { FaDownload, FaUpload, FaDatabase, FaExclamationTriangle } from 'react-icons/fa';

export const DataManagement: React.FC = () => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [dbSize, setDbSize] = useState<string>('Calculando...');


    useEffect(() => {
        try {
            const size = (db.exportData().length / 1024).toFixed(2);
            setDbSize(size);
        } catch (error) {
            console.error('Erro ao calcular tamanho do banco:', error);
            setDbSize('Erro');
        }
    }, []);



    const handleExport = () => {
        try {
            const data = db.exportData();
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `noroeste-jw-backup-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showSuccess('Backup exportado com sucesso!');
        } catch (error) {
            console.error(error);
            showError('Erro ao exportar dados');
        }
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const content = e.target?.result as string;

                // Verificação preliminar para feedback ao usuário
                let countPersons = 0;
                try {
                    const parsed = JSON.parse(content);
                    countPersons = parsed.persons ? parsed.persons.length : 0;
                } catch (e) {
                    // Ignora erro de parse aqui, deixa o importData lidar
                }

                if (countPersons === 0) {
                    // Se não encontrar pessoas, avisa mas permite continuar (pode ser backup só de oradores)
                    alert('Aviso: Nenhuma pessoa encontrada no arquivo selecionado. Verifique se é o arquivo correto.');
                }

                db.importData(content);
                showSuccess(`Importação realizada! (${countPersons} pessoas identificadas). Recarregando...`);
            } catch (error) {
                console.error(error);
                showError('Erro ao importar dados. O arquivo pode estar corrompido ou inválido.');
            }
        };
        reader.readAsText(file);

        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };




    return (
        <div className="container mt-4">
            <h2 className="mb-4">Gerenciamento de Dados</h2>

            <div className="row">
                <div className="col-md-6 mb-4">
                    <div className="card h-100 shadow-sm border-0">
                        <div className="card-header bg-primary text-white py-3">
                            <h5 className="mb-0">
                                <FaDownload className="me-2" />
                                Exportar Backup
                            </h5>
                        </div>
                        <div className="card-body">
                            <p className="card-text text-muted">
                                Faça o download de todos os dados do sistema (oradores, agenda, histórico, etc.) em um arquivo JSON.
                                Guarde este arquivo em um local seguro.
                            </p>
                            <button className="btn btn-primary w-100" onClick={handleExport}>
                                <FaDownload className="me-2" />
                                Exportar Dados (JSON)
                            </button>
                        </div>
                    </div>
                </div>

                <div className="col-md-6 mb-4">
                    <div className="card h-100 shadow-sm border-0">
                        <div className="card-header bg-warning text-dark py-3">
                            <h5 className="mb-0">
                                <FaUpload className="me-2" />
                                Importar Backup
                            </h5>
                        </div>
                        <div className="card-body">
                            <div className="alert alert-info py-2 small mb-3">
                                <FaExclamationTriangle className="me-2" />
                                <strong>Informação:</strong> A importação irá <u>adicionar</u> apenas os dados novos.
                            </div>
                            <p className="card-text text-muted">
                                Restaure os dados a partir de um arquivo de backup (.json) criado anteriormente.
                            </p>
                            <input
                                type="file"
                                ref={fileInputRef}
                                style={{ display: 'none' }}
                                accept=".json"
                                onChange={handleFileChange}
                            />
                            <button className="btn btn-warning w-100" onClick={handleImportClick}>
                                <FaUpload className="me-2" />
                                Importar Dados (JSON)
                            </button>
                        </div>
                    </div>
                </div>
            </div>







            <div className="card mt-4 border-0 shadow-sm">
                <div className="card-header bg-light">
                    <h6 className="mb-0 text-muted">
                        <FaDatabase className="me-2" />
                        Informações do Sistema
                    </h6>
                </div>
                <div className="card-body py-2">
                    <div className="d-flex gap-4 small text-muted">
                        <span><strong>Armazenamento:</strong> Navegador (LocalStorage)</span>
                        <span><strong>Tamanho:</strong> {dbSize} KB</span>
                    </div>
                </div>
            </div>


        </div>
    );
};
