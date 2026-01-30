import React from 'react';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Plus, Search, Filter, Download } from 'lucide-react';
import { mockSpeeches } from '../data/mock';

export const Speeches: React.FC = () => {
    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Discursos</h1>
                    <p className="text-slate-500 mt-1">Gerencie os temas de discursos públicos.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline">
                        <Download className="mr-2 h-4 w-4" />
                        Exportar PDF
                    </Button>
                    <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        Novo Discurso
                    </Button>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                            <Input placeholder="Buscar por tema ou título..." className="pl-9" />
                        </div>
                        <Button variant="outline">
                            <Filter className="mr-2 h-4 w-4" />
                            Filtros
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {mockSpeeches.map((speech) => (
                            <Card key={speech.id} className="hover:shadow-md transition-shadow">
                                <CardContent className="p-6">
                                    <div className="flex justify-between items-start mb-4">
                                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-sm">
                                            #{speech.number}
                                        </span>
                                        <span className={`px-2 py-1 text-xs rounded-full ${speech.difficulty === 'fácil' ? 'bg-green-100 text-green-700' :
                                            speech.difficulty === 'médio' ? 'bg-yellow-100 text-yellow-700' :
                                                'bg-red-100 text-red-700'
                                            }`}>
                                            {speech.difficulty}
                                        </span>
                                    </div>
                                    <h3 className="font-bold text-lg mb-2 line-clamp-2">{speech.title}</h3>
                                    <div className="space-y-2 text-sm text-slate-600">
                                        <p><span className="font-medium text-slate-900">Tema:</span> {speech.theme}</p>
                                        <p><span className="font-medium text-slate-900">Texto Base:</span> {speech.scripture}</p>
                                        <p><span className="font-medium text-slate-900">Duração:</span> {speech.duration} min</p>
                                    </div>
                                    <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center">
                                        <span className="text-xs text-slate-500">
                                            Última vez: {speech.lastGivenDate ? new Date(speech.lastGivenDate).toLocaleDateString('pt-BR') : 'Nunca'}
                                        </span>
                                        <Button variant="ghost" size="sm">Detalhes</Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};
