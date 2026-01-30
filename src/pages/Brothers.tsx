import React from 'react';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Plus, Search, Filter } from 'lucide-react';
import { mockBrothers } from '../data/mock';

export const Brothers: React.FC = () => {
    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Irmãos</h1>
                    <p className="text-slate-500 mt-1">Gerencie o cadastro de publicadores.</p>
                </div>
                <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Novo Cadastro
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                            <Input placeholder="Buscar por nome..." className="pl-9" />
                        </div>
                        <Button variant="outline">
                            <Filter className="mr-2 h-4 w-4" />
                            Filtros
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b">
                                <tr>
                                    <th className="px-6 py-3">Nome</th>
                                    <th className="px-6 py-3">Privilégio</th>
                                    <th className="px-6 py-3">Disponibilidade</th>
                                    <th className="px-6 py-3">Habilidades</th>
                                    <th className="px-6 py-3">Status</th>
                                    <th className="px-6 py-3">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {mockBrothers.map((brother) => (
                                    <tr key={brother.id} className="bg-white border-b hover:bg-slate-50">
                                        <td className="px-6 py-4 font-medium text-slate-900">{brother.name}</td>
                                        <td className="px-6 py-4 capitalize">{brother.privilege}</td>
                                        <td className="px-6 py-4 capitalize">{brother.availability}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-wrap gap-1">
                                                {brother.abilities.map((ability) => (
                                                    <span key={ability} className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full">
                                                        {ability}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 text-xs rounded-full ${brother.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                {brother.isActive ? 'Ativo' : 'Inativo'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <Button variant="ghost" size="sm">Editar</Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};
