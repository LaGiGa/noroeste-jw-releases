import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { GraduationCap, UserCheck, BookOpen } from 'lucide-react';

export const School: React.FC = () => {
    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Escola do Ministério</h1>
                    <p className="text-slate-500 mt-1">Acompanhamento dos estudantes.</p>
                </div>
                <Button>
                    <GraduationCap className="mr-2 h-4 w-4" />
                    Nova Designação
                </Button>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle>Próximas Designações</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                                            {i}
                                        </div>
                                        <div>
                                            <p className="font-medium text-slate-900">Leitura da Bíblia</p>
                                            <p className="text-sm text-slate-500">Estudante: Maria Silva</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-medium text-slate-900">05/11/2025</p>
                                        <p className="text-xs text-slate-500">Sala Principal</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Estatísticas</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-green-100 rounded-lg text-green-600">
                                <UserCheck size={24} />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">45</p>
                                <p className="text-sm text-slate-500">Estudantes Ativos</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-purple-100 rounded-lg text-purple-600">
                                <BookOpen size={24} />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">12</p>
                                <p className="text-sm text-slate-500">Pontos de Estudo</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};
