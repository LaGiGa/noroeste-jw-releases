import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Calendar as CalendarIcon, Wand2, Download, ChevronLeft, ChevronRight } from 'lucide-react';

export const Assignments: React.FC = () => {
    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Designações</h1>
                    <p className="text-slate-500 mt-1">Gerencie as partes das reuniões.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline">
                        <Download className="mr-2 h-4 w-4" />
                        Exportar
                    </Button>
                    <Button>
                        <Wand2 className="mr-2 h-4 w-4" />
                        Gerar Automático
                    </Button>
                </div>
            </div>

            <div className="flex items-center justify-between bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                <Button variant="ghost" size="sm">
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    Anterior
                </Button>
                <div className="flex items-center gap-2 font-medium text-lg">
                    <CalendarIcon className="h-5 w-5 text-slate-500" />
                    Novembro 2025
                </div>
                <Button variant="ghost" size="sm">
                    Próximo
                    <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Midweek Meeting */}
                <Card>
                    <CardHeader className="bg-slate-50 border-b border-slate-100">
                        <CardTitle className="flex justify-between items-center">
                            <span>Reunião de Meio de Semana</span>
                            <span className="text-sm font-normal text-slate-500">Quarta, 05/11</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y divide-slate-100">
                            <div className="p-4 flex items-center justify-between hover:bg-slate-50">
                                <div>
                                    <p className="font-medium text-slate-900">Presidente</p>
                                    <p className="text-sm text-slate-500">5 min</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-medium text-blue-600">Carlos Silva</p>
                                </div>
                            </div>
                            <div className="p-4 flex items-center justify-between hover:bg-slate-50">
                                <div>
                                    <p className="font-medium text-slate-900">Oração Inicial</p>
                                    <p className="text-sm text-slate-500">1 min</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-medium text-blue-600">Pedro Oliveira</p>
                                </div>
                            </div>
                            <div className="p-4 bg-slate-50/50">
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Tesouros da Palavra de Deus</p>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-medium text-slate-900">Discurso</p>
                                            <p className="text-sm text-slate-500">10 min</p>
                                        </div>
                                        <p className="font-medium text-blue-600">João Santos</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Weekend Meeting */}
                <Card>
                    <CardHeader className="bg-slate-50 border-b border-slate-100">
                        <CardTitle className="flex justify-between items-center">
                            <span>Reunião de Fim de Semana</span>
                            <span className="text-sm font-normal text-slate-500">Domingo, 09/11</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y divide-slate-100">
                            <div className="p-4 flex items-center justify-between hover:bg-slate-50">
                                <div>
                                    <p className="font-medium text-slate-900">Presidente</p>
                                    <p className="text-sm text-slate-500">5 min</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-medium text-blue-600">Carlos Silva</p>
                                </div>
                            </div>
                            <div className="p-4 flex items-center justify-between hover:bg-slate-50">
                                <div>
                                    <p className="font-medium text-slate-900">Discurso Público</p>
                                    <p className="text-sm text-slate-500">30 min</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-medium text-blue-600">Visitante</p>
                                    <p className="text-xs text-slate-500">Cong. Central</p>
                                </div>
                            </div>
                            <div className="p-4 flex items-center justify-between hover:bg-slate-50">
                                <div>
                                    <p className="font-medium text-slate-900">Estudo de A Sentinela</p>
                                    <p className="text-sm text-slate-500">60 min</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-medium text-blue-600">João Santos</p>
                                    <p className="text-xs text-slate-500">Leitor: Pedro Oliveira</p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};
