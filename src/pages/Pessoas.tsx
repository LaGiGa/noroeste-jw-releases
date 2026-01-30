import React, { useState, useEffect } from 'react';
import { FaPlus, FaEdit, FaTrash, FaUser, FaUserTie, FaMicrophone, FaCalendarTimes } from 'react-icons/fa';
import { v4 as uuidv4 } from 'uuid';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { showSuccess, showError } from '../utils/toast';
import { db } from '../services/database';
import type { Person, SpecialEvent } from '../services/database';

export const Pessoas: React.FC = () => {
    // State for People Modal
    const [showPessoaModal, setShowPessoaModal] = useState(false);
    const [showDeletePessoaConfirm, setShowDeletePessoaConfirm] = useState(false);
    const [editingPessoa, setEditingPessoa] = useState<Person | null>(null);
    const [deletingPessoaId, setDeletingPessoaId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState('pessoa');
    
    const [specialEvents, setSpecialEvents] = useState<SpecialEvent[]>([]);
    const [newSpecialEvent, setNewSpecialEvent] = useState<Partial<SpecialEvent>>({
        startDate: '',
        endDate: '',
        description: '',
        type: 'VISITA_SUPERINTENDENTE'
    });
    
    const initialFormData: Partial<Person> = {
        name: '',
        firstName: '',
        middleName: '',
        lastName: '',
        suffix: '',
        displayName: '',
        gender: 'M',
        headOfFamily: false,
        maritalStatus: '',
        birthDate: '',
        phones: { home: '', mobile: '', work: '' },
        email: '',
        address: '',
        notes: '',
        active: true,
        elderly: false,
        child: false,
        incarcerated: false,
        deaf: false,
        blind: false,
        khsUser: false,
        moved: false,
        deceased: false,
        baptizedDate: '',
        unbaptizedPublisher: false,
        serviceGroup: '',
        spiritualNotes: {
            printedWatchtower: false,
            printedMeetingWorkbook: false,
            largePrint: false,
            khKeys: false
        },
        privileges: { elder: false, ministerialServant: false },
        pioneerStatus: { auxiliary: false, regular: false, special: false, missionary: false },
        reportDirectly: false,
        responsibilities: {},
        assignments: {},
        congregation: 'Noroeste',
        roles: [],
        phone: '', // Legacy compatibility
        spouseId: '',
        childrenIds: [],
        unavailability: []
    };

    const [formData, setFormData] = useState<Partial<Person>>(initialFormData);
    const [pessoas, setPessoas] = useState<Person[]>([]);
    const [serviceGroups, setServiceGroups] = useState<{ id: string, nome: string }[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    const [newUnavailability, setNewUnavailability] = useState({
        startDate: '',
        endDate: '',
        reason: '',
        applyToFamily: false,
        selectedFamilyMembers: [] as string[]
    });

    const [selectedChildId, setSelectedChildId] = useState('');

    useEffect(() => {
        const persons = db.getPersons();
        const sorted = persons.sort((a, b) => {
            const nameA = a.name || '';
            const nameB = b.name || '';
            return nameA.localeCompare(nameB);
        });
        setPessoas(sorted);
        setServiceGroups(db.getServiceGroups());
        setSpecialEvents(db.getSpecialEvents());
    }, []);

    const filteredPessoas = pessoas.filter(p => 
        (p.name || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Handlers
    const handleOpenPessoaModal = (pessoa?: Person) => {
        setActiveTab('pessoa');
        if (pessoa) {
            setEditingPessoa(pessoa);
            // Merge defaults to ensure nested objects exist
            setFormData({
                ...initialFormData,
                ...pessoa,
                phones: { ...initialFormData.phones, ...pessoa.phones },
                spiritualNotes: { ...initialFormData.spiritualNotes, ...pessoa.spiritualNotes },
                privileges: { ...initialFormData.privileges, ...pessoa.privileges },
                pioneerStatus: { ...initialFormData.pioneerStatus, ...pessoa.pioneerStatus },
                responsibilities: { ...initialFormData.responsibilities, ...pessoa.responsibilities },
                assignments: { ...initialFormData.assignments, ...pessoa.assignments },
            });
        } else {
            setEditingPessoa(null);
            setFormData(initialFormData);
        }
        setShowPessoaModal(true);
    };

    const handleClosePessoaModal = () => {
        setShowPessoaModal(false);
        setEditingPessoa(null);
    };

    const calculateRoles = (assignments: Person['assignments']): string[] => {
        const roles: string[] = [];
        if (!assignments) return roles;
        if (assignments.publicTalkSpeaker) roles.push('Orador');
        if (assignments.president || assignments.publicMeetingPresident) roles.push('Presidente');
        if (assignments.watchtowerReader || assignments.reader) roles.push('Leitor');
        if (assignments.prayer) roles.push('Oração');
        if (assignments.hospitality) roles.push('Hospitalidade');
        if (assignments.indicator || assignments.zoomIndicator) roles.push('Indicador');
        if (assignments.sound) roles.push('Áudio');
        if (assignments.videoOperator || assignments.videoZoom) roles.push('Vídeo');
        if (assignments.mic) roles.push('Mic. Volante');
        return Array.from(new Set(roles));
    };

    const handleSavePessoa = () => {
        // Permitir salvar se tiver nome ou se tiver campo nome no formData (mesmo que name esteja vazio temporariamente)
        if (!formData.name && !(formData as any).nome) {
            showError('Nome de Exibição é obrigatório');
            return;
        }

        // Process unavailability to handle "applyToSpouse" and "familyIdsToApply"
        const finalUnavailability = formData.unavailability?.map(u => {
            const { applyToSpouse, familyIdsToApply, ...rest } = u as any;
            return rest;
        });

        // Update legacy roles and phone
        const updatedFormData = {
            ...formData,
            name: formData.name || (formData as any).nome,
            roles: calculateRoles(formData.assignments),
            phone: formData.phones?.mobile || formData.phones?.home || '',
            unavailability: finalUnavailability
        };

        // Sincronizar com Grupos de Campo
        const personName = updatedFormData.name;
        const newGroupName = updatedFormData.serviceGroup;
        const oldGroupName = editingPessoa?.serviceGroup;

        if (personName) {
            const allGroups = db.getServiceGroups();
            
            // Se houve mudança de grupo ou é um novo cadastro com grupo
            if (newGroupName !== oldGroupName) {
                // Remover do grupo antigo
                if (oldGroupName) {
                    const oldGroup = allGroups.find(g => g.nome === oldGroupName);
                    if (oldGroup) {
                        const memberNameToRemove = editingPessoa?.name || personName;
                        const updatedMembros = (oldGroup.membros || []).filter(m => m !== memberNameToRemove);
                        db.updateServiceGroup(oldGroup.id, { membros: updatedMembros });
                    }
                }

                // Adicionar ao novo grupo
                if (newGroupName) {
                    const newGroup = allGroups.find(g => g.nome === newGroupName);
                    if (newGroup) {
                        const updatedMembros = [...(newGroup.membros || [])];
                        if (!updatedMembros.includes(personName)) {
                            updatedMembros.push(personName);
                            db.updateServiceGroup(newGroup.id, { membros: updatedMembros });
                        }
                    }
                }
            } 
            // Se o grupo é o mesmo mas o nome mudou, atualiza o nome no grupo
            else if (editingPessoa && newGroupName && editingPessoa.name !== personName) {
                 const group = allGroups.find(g => g.nome === newGroupName);
                 if (group) {
                     const updatedMembros = (group.membros || []).map(m => m === editingPessoa.name ? personName : m);
                     db.updateServiceGroup(group.id, { membros: updatedMembros });
                 }
            }
        }

        if (editingPessoa) {
            db.updatePerson(editingPessoa.id, updatedFormData);
            
            // Handle Family Unavailability Sync
            if (formData.unavailability) {
                const familyUnavailabilities = (formData.unavailability as any[])
                    .filter(u => u.familyIdsToApply && u.familyIdsToApply.length > 0);
                
                let appliedCount = 0;
                familyUnavailabilities.forEach(u => {
                    const { familyIdsToApply, ...rest } = u;
                    // Remove temporary fields
                    const { applyToSpouse, ...cleanRest } = rest;

                    familyIdsToApply.forEach((targetId: string) => {
                         const targetPerson = db.getPersons().find(p => p.id === targetId);
                         if (targetPerson) {
                             const newItem = { ...cleanRest, id: uuidv4() };
                             const updatedTarget = {
                                 ...targetPerson,
                                 unavailability: [...(targetPerson.unavailability || []), newItem]
                             };
                             db.updatePerson(targetPerson.id, updatedTarget);
                             appliedCount++;
                         }
                    });
                });
                
                if (appliedCount > 0) {
                    showSuccess(`Indisponibilidade aplicada a familiares.`);
                }
            }

            showSuccess('Pessoa atualizada com sucesso!');
        } else {
            db.addPerson(updatedFormData as Omit<Person, 'id'>);
            showSuccess('Pessoa criada com sucesso!');
        }
        const sorted = db.getPersons().sort((a, b) => a.name.localeCompare(b.name));
        setPessoas(sorted);
        handleClosePessoaModal();
    };

    const handleDeletePessoa = (id: string) => {
        setDeletingPessoaId(id);
        setShowDeletePessoaConfirm(true);
    };

    const confirmDeletePessoa = () => {
        if (deletingPessoaId) {
            db.deletePerson(deletingPessoaId);
            const sorted = db.getPersons().sort((a, b) => a.name.localeCompare(b.name));
            setPessoas(sorted);
            showSuccess('Pessoa excluída com sucesso!');
        }
        setShowDeletePessoaConfirm(false);
        setDeletingPessoaId(null);
    };

    const updateNestedState = (section: keyof Person, field: string, value: any) => {
        setFormData(prev => ({
            ...prev,
            [section]: {
                ...(prev[section] as any || {}),
                [field]: value
            }
        }));
    };

    const handleAddSpecialEvent = () => {
        if (!newSpecialEvent.startDate || !newSpecialEvent.endDate || !newSpecialEvent.description) {
            showError('Preencha todos os campos do evento.');
            return;
        }
        db.addSpecialEvent(newSpecialEvent as Omit<SpecialEvent, 'id'>);
        setSpecialEvents(db.getSpecialEvents());
        setNewSpecialEvent({
            startDate: '',
            endDate: '',
            description: '',
            type: 'VISITA_SUPERINTENDENTE'
        });
        showSuccess('Evento adicionado com sucesso!');
    };

    const handleDeleteSpecialEvent = (id: string) => {
        db.deleteSpecialEvent(id);
        setSpecialEvents(db.getSpecialEvents());
        showSuccess('Evento removido.');
    };

    const getEventTypeLabel = (type: string) => {
        switch (type) {
            case 'VISITA_SUPERINTENDENTE': return 'Visita Superintendente';
            case 'ASSEMBLEIA': return 'Assembleia';
            case 'CONGRESSO': return 'Congresso';
            case 'CELEBRACAO': return 'Celebração';
            case 'MEMORIAL': return 'Celebração'; // Fallback
            case 'OUTRO': return 'Outro';
            default: return type;
        }
    };
    
    const renderTabContent = () => {
        switch (activeTab) {
            case 'pessoa':
                return (
                    <div className="row g-3">
                        {/* Linha 1: Nome */}
                        <div className="col-12">
                            <label className="form-label">Nome de Exibição *</label>
                            <input type="text" className="form-control" value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                        </div>

                        {/* Linha 2: Gênero e Chefe de Família */}
                        <div className="col-md-6">
                            <label className="form-label d-block">Gênero</label>
                            <div className="d-flex align-items-center gap-4">
                                <div className="form-check">
                                    <input className="form-check-input" type="radio" name="gender" id="genderM" checked={formData.gender === 'M'} onChange={() => setFormData({ ...formData, gender: 'M' })} />
                                    <label className="form-check-label" htmlFor="genderM">Masculino</label>
                                </div>
                                <div className="form-check">
                                    <input className="form-check-input" type="radio" name="gender" id="genderF" checked={formData.gender === 'F'} onChange={() => setFormData({ ...formData, gender: 'F' })} />
                                    <label className="form-check-label" htmlFor="genderF">Feminino</label>
                                </div>
                            </div>
                        </div>
                        <div className="col-md-6 d-flex align-items-center">
                            <div className="form-check mt-4">
                                <input className="form-check-input" type="checkbox" id="headOfFamily" checked={formData.headOfFamily || false} onChange={e => setFormData({ ...formData, headOfFamily: e.target.checked })} />
                                <label className="form-check-label fw-bold" htmlFor="headOfFamily">Chefe de Família</label>
                            </div>
                        </div>

                        {/* Linha 3: Estado Civil, Cônjuge e Data Nascimento */}
                        <div className="col-md-4">
                            <label className="form-label">Estado civil</label>
                            <select className="form-select" value={formData.maritalStatus || ''} onChange={e => setFormData({ ...formData, maritalStatus: e.target.value })}>
                                <option value="">Selecione...</option>
                                <option value="Solteiro">Solteiro (a)</option>
                                <option value="Casado">Casado (a)</option>
                                <option value="Viúvo">Viúvo (a)</option>
                                <option value="Divorciado">Divorciado (a)</option>
                            </select>
                        </div>

                        {formData.maritalStatus === 'Casado' && (
                            <div className="col-md-4">
                                <label className="form-label">Cônjuge</label>
                                <select 
                                    className="form-select" 
                                    value={formData.spouseId || ''} 
                                    onChange={e => setFormData({ ...formData, spouseId: e.target.value })}
                                >
                                    <option value="">Selecione...</option>
                                    {pessoas
                                        .filter(p => p.id !== editingPessoa?.id) // Remove self
                                        .sort((a, b) => a.name.localeCompare(b.name))
                                        .map(p => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))
                                    }
                                </select>
                            </div>
                        )}

                        <div className="col-12">
                             <label className="form-label fw-bold">Filhos</label>
                             <div className="card p-3 bg-light">
                                 <div className="d-flex gap-2 mb-2">
                                     <select 
                                         className="form-select" 
                                         value={selectedChildId}
                                         onChange={(e) => setSelectedChildId(e.target.value)}
                                     >
                                         <option value="">Selecione um filho...</option>
                                         {pessoas
                                             .filter(p => p.id !== editingPessoa?.id && !formData.childrenIds?.includes(p.id))
                                             .sort((a, b) => a.name.localeCompare(b.name))
                                             .map(p => (
                                                 <option key={p.id} value={p.id}>{p.name}</option>
                                             ))
                                         }
                                     </select>
                                     <button 
                                         className="btn btn-primary" 
                                         type="button" 
                                         disabled={!selectedChildId}
                                         onClick={() => {
                                             if (selectedChildId) {
                                                 setFormData({
                                                     ...formData,
                                                     childrenIds: [...(formData.childrenIds || []), selectedChildId]
                                                 });
                                                 setSelectedChildId('');
                                             }
                                         }}
                                     >
                                         <FaPlus />
                                     </button>
                                 </div>
                                 {(formData.childrenIds?.length || 0) > 0 && (
                                     <div className="list-group">
                                         {formData.childrenIds?.map(childId => {
                                             const child = pessoas.find(p => p.id === childId);
                                             return (
                                                 <div key={childId} className="list-group-item d-flex justify-content-between align-items-center py-1">
                                                     <span>{child?.name || 'Desconhecido'}</span>
                                                     <button 
                                                         type="button" 
                                                         className="btn btn-sm btn-outline-danger border-0" 
                                                         onClick={() => {
                                                             setFormData({
                                                                 ...formData,
                                                                 childrenIds: formData.childrenIds?.filter(id => id !== childId)
                                                             });
                                                         }}
                                                     >
                                                         <FaTrash />
                                                     </button>
                                                 </div>
                                             );
                                         })}
                                     </div>
                                 )}
                             </div>
                        </div>

                        <div className="col-md-4">
                            <label className="form-label">Data de Nascimento</label>
                            <input type="date" className="form-control" value={formData.birthDate || ''} onChange={e => setFormData({ ...formData, birthDate: e.target.value })} />
                        </div>

                        {/* Linha 4: Contato */}
                        <div className="col-md-4">
                            <label className="form-label">Celular</label>
                            <input type="text" className="form-control" value={formData.phones?.mobile || ''} onChange={e => updateNestedState('phones', 'mobile', e.target.value)} />
                        </div>
                        <div className="col-md-4">
                            <label className="form-label">Telefone Residencial</label>
                            <input type="text" className="form-control" value={formData.phones?.home || ''} onChange={e => updateNestedState('phones', 'home', e.target.value)} />
                        </div>
                        <div className="col-md-4">
                            <label className="form-label">Email</label>
                            <input type="email" className="form-control" value={formData.email || ''} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                        </div>

                        {/* Linha 5: Endereço e Flags */}
                        <div className="col-md-12">
                            <label className="form-label">Endereço Completo</label>
                            <input type="text" className="form-control" value={formData.address || ''} onChange={e => setFormData({ ...formData, address: e.target.value })} />
                        </div>

                        <div className="col-md-12">
                            <div className="card p-3 bg-light">
                                <div className="row">
                                    <div className="col-md-3">
                                        <div className="form-check"><input className="form-check-input" type="checkbox" checked={formData.elderly || false} onChange={e => setFormData({ ...formData, elderly: e.target.checked })} /><label className="form-check-label">Idosos/Enfermos</label></div>
                                        <div className="form-check"><input className="form-check-input" type="checkbox" checked={formData.child || false} onChange={e => setFormData({ ...formData, child: e.target.checked })} /><label className="form-check-label">Criança</label></div>
                                    </div>
                                    <div className="col-md-3">
                                        <div className="form-check"><input className="form-check-input" type="checkbox" checked={formData.deaf || false} onChange={e => setFormData({ ...formData, deaf: e.target.checked })} /><label className="form-check-label">Surdo</label></div>
                                        <div className="form-check"><input className="form-check-input" type="checkbox" checked={formData.blind || false} onChange={e => setFormData({ ...formData, blind: e.target.checked })} /><label className="form-check-label">Cego</label></div>
                                    </div>
                                    <div className="col-md-3">
                                        <div className="form-check"><input className="form-check-input" type="checkbox" checked={formData.moved || false} onChange={e => setFormData({ ...formData, moved: e.target.checked })} /><label className="form-check-label">Mudou-se</label></div>
                                        <div className="form-check"><input className="form-check-input" type="checkbox" checked={formData.deceased || false} onChange={e => setFormData({ ...formData, deceased: e.target.checked })} /><label className="form-check-label">Falecido</label></div>
                                    </div>
                                    <div className="col-md-3">
                                        <div className="form-check"><input className="form-check-input" type="checkbox" checked={formData.active || false} onChange={e => setFormData({ ...formData, active: e.target.checked })} /><label className="form-check-label fw-bold">Cadastro Ativo</label></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Linha 6: Notas */}
                        <div className="col-12">
                            <label className="form-label">Notas</label>
                            <textarea className="form-control" rows={2} value={formData.notes || ''} onChange={e => setFormData({ ...formData, notes: e.target.value })}></textarea>
                        </div>
                    </div>
                );
            case 'designacoes':
                return (
                    <div className="row g-3">
                        <div className="col-md-6">
                            <div className="card p-3 bg-light mb-3">
                                <h6 className="fw-bold mb-3">Privilégios</h6>
                                <div className="form-check"><input className="form-check-input" type="checkbox" checked={formData.privileges?.elder || false} onChange={e => updateNestedState('privileges', 'elder', e.target.checked)} /><label className="form-check-label">Ancião</label></div>
                                <div className="form-check"><input className="form-check-input" type="checkbox" checked={formData.privileges?.ministerialServant || false} onChange={e => updateNestedState('privileges', 'ministerialServant', e.target.checked)} /><label className="form-check-label">Servo ministerial</label></div>
                            </div>
                            
                            <div className="card p-3 bg-light">
                                <h6 className="fw-bold mb-3">Serviço de Pioneiro</h6>
                                <div className="form-check"><input className="form-check-input" type="checkbox" checked={formData.pioneerStatus?.auxiliary || false} onChange={e => updateNestedState('pioneerStatus', 'auxiliary', e.target.checked)} /><label className="form-check-label">Pioneiro Auxiliar Contínuo</label></div>
                                <div className="form-check"><input className="form-check-input" type="checkbox" checked={formData.pioneerStatus?.regular || false} onChange={e => updateNestedState('pioneerStatus', 'regular', e.target.checked)} /><label className="form-check-label">Pioneiro regular</label></div>
                                <div className="form-check"><input className="form-check-input" type="checkbox" checked={formData.pioneerStatus?.special || false} onChange={e => updateNestedState('pioneerStatus', 'special', e.target.checked)} /><label className="form-check-label">Pioneiro Especial</label></div>
                                <div className="form-check"><input className="form-check-input" type="checkbox" checked={formData.pioneerStatus?.missionary || false} onChange={e => updateNestedState('pioneerStatus', 'missionary', e.target.checked)} /><label className="form-check-label">Missionário em campo</label></div>
                            </div>
                        </div>

                        <div className="col-md-6">
                            <div className="card p-3 bg-light h-100">
                                <h6 className="fw-bold mb-3">Grupo de Serviço</h6>
                                <select className="form-select" value={formData.serviceGroup || ''} onChange={e => setFormData({ ...formData, serviceGroup: e.target.value })}>
                                    <option value="">Selecione...</option>
                                    {serviceGroups.map(g => (
                                        <option key={g.id} value={g.nome}>{g.nome}</option>
                                    ))}
                                </select>
                                <div className="mt-3 text-muted small">
                                    <p className="mb-0">Selecione o grupo de serviço ao qual este publicador pertence.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 'disponibilidade':
                return (
                    <div className="container-fluid p-0">
                        <div className="row g-4">
                            {/* Indisponibilidade Pessoal */}
                            <div className="col-12">
                                <h6 className="fw-bold text-muted border-bottom pb-2 mb-3">Indisponibilidade Pessoal</h6>
                                <div className="row g-4">
                                    <div className="col-md-5">
                                        <div className="card h-100 bg-light">
                                            <div className="card-header fw-bold bg-white">
                                                <FaPlus className="me-2" />
                                                Nova Indisponibilidade
                                            </div>
                                            <div className="card-body">
                                                <div className="mb-3">
                                                    <label className="form-label">Data Início</label>
                                                    <input type="date" className="form-control" value={newUnavailability.startDate} onChange={e => setNewUnavailability({ ...newUnavailability, startDate: e.target.value })} />
                                                </div>
                                                <div className="mb-3">
                                                    <label className="form-label">Data Fim</label>
                                                    <input type="date" className="form-control" value={newUnavailability.endDate} onChange={e => setNewUnavailability({ ...newUnavailability, endDate: e.target.value })} />
                                                </div>
                                                <div className="mb-3">
                                                    <label className="form-label">Motivo (Opcional)</label>
                                                    <input type="text" className="form-control" placeholder="Ex: Férias, Viagem, Doença..." value={newUnavailability.reason} onChange={e => setNewUnavailability({ ...newUnavailability, reason: e.target.value })} />
                                                </div>
                                                
                                                {(formData.spouseId || (formData.childrenIds?.length || 0) > 0) && (
                                                    <div className="mb-3">
                                                        <label className="form-label fw-bold small text-muted">Aplicar também para:</label>
                                                        <div className="card p-2 bg-white border">
                                                            {formData.spouseId && (
                                                                <div className="form-check">
                                                                    <input 
                                                                        className="form-check-input" 
                                                                        type="checkbox" 
                                                                        id="chkSpouse"
                                                                        checked={newUnavailability.selectedFamilyMembers?.includes(formData.spouseId)}
                                                                        onChange={e => {
                                                                            const checked = e.target.checked;
                                                                            const spouseId = formData.spouseId!;
                                                                            setNewUnavailability(prev => ({
                                                                                ...prev,
                                                                                selectedFamilyMembers: checked 
                                                                                    ? [...(prev.selectedFamilyMembers || []), spouseId]
                                                                                    : (prev.selectedFamilyMembers || []).filter(id => id !== spouseId)
                                                                            }));
                                                                        }}
                                                                    />
                                                                    <label className="form-check-label" htmlFor="chkSpouse">
                                                                        Cônjuge: {pessoas.find(p => p.id === formData.spouseId)?.name}
                                                                    </label>
                                                                </div>
                                                            )}
                                                            {formData.childrenIds?.map(childId => {
                                                                const child = pessoas.find(p => p.id === childId);
                                                                if (!child) return null;
                                                                return (
                                                                    <div className="form-check" key={childId}>
                                                                        <input 
                                                                            className="form-check-input" 
                                                                            type="checkbox" 
                                                                            id={`chkChild-${childId}`}
                                                                            checked={newUnavailability.selectedFamilyMembers?.includes(childId)}
                                                                            onChange={e => {
                                                                                const checked = e.target.checked;
                                                                                setNewUnavailability(prev => ({
                                                                                    ...prev,
                                                                                    selectedFamilyMembers: checked 
                                                                                        ? [...(prev.selectedFamilyMembers || []), childId]
                                                                                        : (prev.selectedFamilyMembers || []).filter(id => id !== childId)
                                                                                }));
                                                                            }}
                                                                        />
                                                                        <label className="form-check-label" htmlFor={`chkChild-${childId}`}>
                                                                            Filho(a): {child.name}
                                                                        </label>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                )}

                                                <button 
                                                    className="btn btn-success w-100"
                                                    disabled={!newUnavailability.startDate || !newUnavailability.endDate}
                                                    onClick={() => {
                                                        const newItem = {
                                                            id: uuidv4(),
                                                            startDate: newUnavailability.startDate,
                                                            endDate: newUnavailability.endDate,
                                                            reason: newUnavailability.reason,
                                                            familyIdsToApply: newUnavailability.selectedFamilyMembers
                                                        };
                                                        setFormData({
                                                            ...formData,
                                                            unavailability: [...(formData.unavailability || []), newItem]
                                                        });
                                                        setNewUnavailability({ 
                                                            startDate: '', 
                                                            endDate: '', 
                                                            reason: '', 
                                                            applyToFamily: false, 
                                                            selectedFamilyMembers: [] 
                                                        });
                                                    }}
                                                >
                                                    Adicionar
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="col-md-7">
                                        <div className="card h-100 bg-light">
                                            <div className="card-header fw-bold bg-white">Indisponibilidades Registradas</div>
                                            <div className="card-body">
                                                {(!formData.unavailability || formData.unavailability.length === 0) ? (
                                                    <div className="alert alert-secondary">Nenhuma indisponibilidade registrada.</div>
                                                ) : (
                                                    <div className="table-responsive">
                                                        <table className="table table-sm table-hover">
                                                            <thead>
                                                                <tr>
                                                                    <th>Início</th>
                                                                    <th>Fim</th>
                                                                    <th>Motivo</th>
                                                                    <th style={{ width: '50px' }}></th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {formData.unavailability.map((u: any) => (
                                                                    <tr key={u.id}>
                                                                        <td>{new Date(u.startDate).toLocaleDateString()}</td>
                                                                        <td>{new Date(u.endDate).toLocaleDateString()}</td>
                                                                        <td>
                                                                            {u.reason}
                                                                            {u.applyToSpouse && <span className="badge bg-info ms-2" title="Será aplicado ao cônjuge ao salvar">Família</span>}
                                                                        </td>
                                                                        <td>
                                                                            <button 
                                                                                className="btn btn-sm btn-outline-danger border-0"
                                                                                onClick={() => {
                                                                                    setFormData({
                                                                                        ...formData,
                                                                                        unavailability: formData.unavailability?.filter((item: any) => item.id !== u.id)
                                                                                    });
                                                                                }}
                                                                            >
                                                                                <FaTrash />
                                                                            </button>
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Eventos da Congregação */}
                            <div className="col-12 mt-4">
                                <h6 className="fw-bold text-muted border-bottom pb-2 mb-3">Eventos da Congregação</h6>
                                <div className="row g-4">
                                    <div className="col-md-5">
                                        <div className="card h-100 bg-light">
                                            <div className="card-header bg-warning text-dark fw-bold">
                                                <FaCalendarTimes className="me-2"/> Novo Evento
                                            </div>
                                            <div className="card-body">
                                                <div className="row g-2">
                                                    <div className="col-12">
                                                        <label className="small fw-bold">Descrição</label>
                                                        <input type="text" className="form-control form-control-sm" 
                                                            value={newSpecialEvent.description || ''}
                                                            onChange={e => setNewSpecialEvent({...newSpecialEvent, description: e.target.value})}
                                                        />
                                                    </div>
                                                    <div className="col-6">
                                                        <label className="small fw-bold">Tipo</label>
                                                        <select className="form-select form-select-sm"
                                                            value={newSpecialEvent.type}
                                                            onChange={e => setNewSpecialEvent({...newSpecialEvent, type: e.target.value as any})}
                                                        >
                                                            <option value="VISITA_SUPERINTENDENTE">Visita Superintendente</option>
                                                            <option value="ASSEMBLEIA">Assembleia</option>
                                                            <option value="CONGRESSO">Congresso</option>
                                                            <option value="CELEBRACAO">Celebração</option>
                                                            <option value="OUTRO">Outro</option>
                                                        </select>
                                                    </div>
                                                    <div className="col-6">
                                                        <label className="small fw-bold">Início</label>
                                                        <input type="date" className="form-control form-control-sm" 
                                                            value={newSpecialEvent.startDate || ''}
                                                            onChange={e => setNewSpecialEvent({...newSpecialEvent, startDate: e.target.value})}
                                                        />
                                                    </div>
                                                    <div className="col-6">
                                                        <label className="small fw-bold">Fim</label>
                                                        <input type="date" className="form-control form-control-sm" 
                                                            value={newSpecialEvent.endDate || ''}
                                                            onChange={e => setNewSpecialEvent({...newSpecialEvent, endDate: e.target.value})}
                                                        />
                                                    </div>
                                                    <div className="col-12 mt-2">
                                                        <button className="btn btn-sm btn-success w-100" onClick={handleAddSpecialEvent}>
                                                            <FaPlus className="me-1"/> Adicionar Evento
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="col-md-7">
                                        <div className="card h-100 bg-light">
                                            <div className="card-header fw-bold bg-white">Eventos Registrados</div>
                                            <div className="card-body">
                                                <div className="table-responsive">
                                                    <table className="table table-sm table-striped">
                                                        <thead>
                                                            <tr>
                                                                <th>Data</th>
                                                                <th>Evento</th>
                                                                <th>Ação</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {specialEvents.length === 0 && (
                                                                <tr><td colSpan={3} className="text-center text-muted">Nenhum evento registrado</td></tr>
                                                            )}
                                                            {specialEvents.map(evt => (
                                                                <tr key={evt.id}>
                                                                    <td>
                                                                        <div className="small">{new Date(evt.startDate).toLocaleDateString()}</div>
                                                                        <div className="small text-muted">até {new Date(evt.endDate).toLocaleDateString()}</div>
                                                                    </td>
                                                                    <td>
                                                                        <div className="fw-bold">{evt.description}</div>
                                                                        <div className="badge bg-secondary">{getEventTypeLabel(evt.type)}</div>
                                                                    </td>
                                                                    <td>
                                                                        <button className="btn btn-sm btn-danger py-0" onClick={() => handleDeleteSpecialEvent(evt.id)}>
                                                                            <FaTrash size={12}/>
                                                                        </button>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 'atribuicoes':
                return (
                    <div className="row g-3">
                        <div className="col-md-6">
                            {/* Tesouros */}
                            <div className="card mb-3">
                                <div className="card-header bg-secondary text-white fw-bold">TESOUROS DA PALAVRA DE DEUS</div>
                                <div className="card-body">
                                    <div className="form-check"><input className="form-check-input" type="checkbox" checked={formData.assignments?.president || false} onChange={e => updateNestedState('assignments', 'president', e.target.checked)} /><label className="form-check-label">Presidente</label></div>
                                    <div className="form-check"><input className="form-check-input" type="checkbox" checked={formData.assignments?.prayer || false} onChange={e => updateNestedState('assignments', 'prayer', e.target.checked)} /><label className="form-check-label">Oração</label></div>
                                    <div className="form-check"><input className="form-check-input" type="checkbox" checked={formData.assignments?.treasuresTalk || false} onChange={e => updateNestedState('assignments', 'treasuresTalk', e.target.checked)} /><label className="form-check-label">Discurso Tesouros</label></div>
                                    <div className="form-check"><input className="form-check-input" type="checkbox" checked={formData.assignments?.gems || false} onChange={e => updateNestedState('assignments', 'gems', e.target.checked)} /><label className="form-check-label">Joias espirituais</label></div>
                                    {formData.gender === 'M' && (
                                        <div className="form-check"><input className="form-check-input" type="checkbox" checked={formData.assignments?.bibleReading || false} onChange={e => updateNestedState('assignments', 'bibleReading', e.target.checked)} /><label className="form-check-label">Leitura da Bíblia</label></div>
                                    )}
                                </div>
                            </div>
                            {/* Ministério */}
                            <div className="card mb-3">
                                <div className="card-header bg-warning text-dark fw-bold">FAÇA SEU MELHOR NO MINISTÉRIO</div>
                                <div className="card-body">
                                    <div className="form-check"><input className="form-check-input" type="checkbox" checked={formData.assignments?.startingConversations || false} onChange={e => updateNestedState('assignments', 'startingConversations', e.target.checked)} /><label className="form-check-label">Iniciando conversas</label></div>
                                    <div className="form-check"><input className="form-check-input" type="checkbox" checked={formData.assignments?.cultivatingInterest || false} onChange={e => updateNestedState('assignments', 'cultivatingInterest', e.target.checked)} /><label className="form-check-label">Cultivando o interesse</label></div>
                                    <div className="form-check"><input className="form-check-input" type="checkbox" checked={formData.assignments?.makingDisciples || false} onChange={e => updateNestedState('assignments', 'makingDisciples', e.target.checked)} /><label className="form-check-label">Fazendo discípulos</label></div>
                                    <div className="form-check"><input className="form-check-input" type="checkbox" checked={formData.assignments?.explainingBeliefs || false} onChange={e => updateNestedState('assignments', 'explainingBeliefs', e.target.checked)} /><label className="form-check-label">Explicando suas crenças</label></div>
                                    <div className="form-check"><input className="form-check-input" type="checkbox" checked={formData.assignments?.assistant || false} onChange={e => updateNestedState('assignments', 'assistant', e.target.checked)} /><label className="form-check-label">Ajudante</label></div>
                                    {formData.gender === 'M' && (
                                        <>
                                            <div className="form-check"><input className="form-check-input" type="checkbox" checked={formData.assignments?.studentTalk || false} onChange={e => updateNestedState('assignments', 'studentTalk', e.target.checked)} /><label className="form-check-label">Discurso de Estudante</label></div>
                                            <div className="form-check"><input className="form-check-input" type="checkbox" checked={formData.assignments?.noMainHall || false} onChange={e => updateNestedState('assignments', 'noMainHall', e.target.checked)} /><label className="form-check-label">Não usar no Salão Principal</label></div>
                                            <div className="form-check"><input className="form-check-input" type="checkbox" checked={formData.assignments?.onlyMainHall || false} onChange={e => updateNestedState('assignments', 'onlyMainHall', e.target.checked)} /><label className="form-check-label">Usar somente no Salão Principal</label></div>
                                        </>
                                    )}
                                </div>
                            </div>
                            {/* Vida Cristã */}
                            <div className="card mb-3">
                                <div className="card-header bg-danger text-white fw-bold">NOSSA VIDA CRISTÃ</div>
                                <div className="card-body">
                                    <div className="form-check"><input className="form-check-input" type="checkbox" checked={formData.assignments?.parts || false} onChange={e => updateNestedState('assignments', 'parts', e.target.checked)} /><label className="form-check-label">Partes</label></div>
                                    <div className="form-check"><input className="form-check-input" type="checkbox" checked={formData.assignments?.congregationBibleStudy || false} onChange={e => updateNestedState('assignments', 'congregationBibleStudy', e.target.checked)} /><label className="form-check-label">Estudo Bíblico de Congregação</label></div>
                                    <div className="form-check"><input className="form-check-input" type="checkbox" checked={formData.assignments?.reader || false} onChange={e => updateNestedState('assignments', 'reader', e.target.checked)} /><label className="form-check-label">Leitor</label></div>
                                </div>
                            </div>
                        </div>
                        <div className="col-md-6">
                            {/* Discursos Públicos */}
                            <div className="card mb-3">
                                <div className="card-header bg-primary text-white fw-bold">Discursos Públicos</div>
                                <div className="card-body">
                                    <div className="form-check"><input className="form-check-input" type="checkbox" checked={formData.assignments?.publicTalkSpeaker || false} onChange={e => updateNestedState('assignments', 'publicTalkSpeaker', e.target.checked)} /><label className="form-check-label">Orador Público</label></div>
                                    <div className="form-check"><input className="form-check-input" type="checkbox" checked={formData.assignments?.publicMeetingPresident || false} onChange={e => updateNestedState('assignments', 'publicMeetingPresident', e.target.checked)} /><label className="form-check-label">Presidente da Reunião Pública</label></div>
                                    <div className="form-check"><input className="form-check-input" type="checkbox" checked={formData.assignments?.watchtowerReader || false} onChange={e => updateNestedState('assignments', 'watchtowerReader', e.target.checked)} /><label className="form-check-label">Leitor de A Sentinela</label></div>
                                    <div className="form-check"><input className="form-check-input" type="checkbox" checked={formData.assignments?.hospitality || false} onChange={e => updateNestedState('assignments', 'hospitality', e.target.checked)} /><label className="form-check-label">Anfitrião</label></div>
                                </div>
                            </div>
                            {/* Áudio/Vídeo */}
                            <div className="card mb-3">
                                <div className="card-header bg-purple text-white fw-bold" style={{ backgroundColor: '#6f42c1' }}>ÁUDIO/VÍDEO INDICADORES</div>
                                <div className="card-body">
                                    <div className="form-check"><input className="form-check-input" type="checkbox" checked={formData.assignments?.indicatorEntrance || false} onChange={e => updateNestedState('assignments', 'indicatorEntrance', e.target.checked)} /><label className="form-check-label">Indicador (Entrada)</label></div>
                                    <div className="form-check"><input className="form-check-input" type="checkbox" checked={formData.assignments?.indicatorAuditorium || false} onChange={e => updateNestedState('assignments', 'indicatorAuditorium', e.target.checked)} /><label className="form-check-label">Indicador (Auditório)</label></div>
                                    <div className="form-check"><input className="form-check-input" type="checkbox" checked={formData.assignments?.sound || false} onChange={e => updateNestedState('assignments', 'sound', e.target.checked)} /><label className="form-check-label">Áudio</label></div>
                                    <div className="form-check"><input className="form-check-input" type="checkbox" checked={formData.assignments?.videoOperator || false} onChange={e => updateNestedState('assignments', 'videoOperator', e.target.checked)} /><label className="form-check-label">Vídeo</label></div>
                                    <div className="form-check"><input className="form-check-input" type="checkbox" checked={formData.assignments?.mic || false} onChange={e => updateNestedState('assignments', 'mic', e.target.checked)} /><label className="form-check-label">Microfone Volante</label></div>
                                </div>
                            </div>
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };



    return (
        <div>
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2>Publicadores Congregação Noroeste</h2>
                <div className="d-flex gap-2">
                    <input
                        type="text"
                        className="form-control"
                        placeholder="Pesquisar por nome..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ maxWidth: '300px' }}
                    />
                    <button className="btn btn-primary" onClick={() => handleOpenPessoaModal()}>
                        <FaPlus /> Nova Pessoa
                    </button>
                </div>
            </div>

            <div className="card">
                <div className="card-body">
                    <div className="table-responsive">
                        <table className="table table-bordered table-striped">
                            <thead className="table-header-gradient">
                                <tr>
                                    <th>Nome</th>
                                    <th>Privilégios</th>
                                    <th>Grupo</th>
                                    <th>Telefone</th>
                                    <th>Status</th>
                                    <th>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredPessoas.map(pessoa => (
                                    <tr key={pessoa.id}>
                                        <td>
                                            <div className="fw-bold">{pessoa.name || 'Sem Nome'}</div>
                                            <small className="text-muted">{pessoa.email}</small>
                                        </td>
                                        <td>
                                            {pessoa.privileges?.elder && <span className="badge bg-primary me-1">Ancião</span>}
                                            {pessoa.privileges?.ministerialServant && <span className="badge bg-info me-1">Servo Ministerial</span>}
                                            {pessoa.pioneerStatus?.regular && <span className="badge bg-success me-1">Pioneiro Regular</span>}
                                        </td>
                                        <td>{pessoa.serviceGroup || '-'}</td>
                                        <td>{pessoa.phones?.mobile || pessoa.phone || '-'}</td>
                                        <td>
                                            <span className={`badge ${pessoa.active ? 'bg-success' : 'bg-danger'}`}>
                                                {pessoa.active ? 'Ativo' : 'Inativo'}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="btn-group">
                                                <button className="btn btn-sm btn-primary" onClick={() => handleOpenPessoaModal(pessoa)}>
                                                    <FaEdit />
                                                </button>
                                                <button className="btn btn-sm btn-danger" onClick={() => handleDeletePessoa(pessoa.id)}>
                                                    <FaTrash />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Modal de Pessoas */}
            <Modal
                isOpen={showPessoaModal}
                onClose={handleClosePessoaModal}
                title={editingPessoa ? 'Editar Pessoa' : 'Nova Pessoa'}
                size="xl"
                footer={
                    <>
                        <button className="btn btn-secondary" onClick={handleClosePessoaModal}>
                            Cancelar
                        </button>
                        <button className="btn btn-primary" onClick={handleSavePessoa}>
                            {editingPessoa ? 'Atualizar' : 'Salvar'}
                        </button>
                    </>
                }
            >
                <div className="d-flex flex-column h-100">
                    <ul className="nav nav-tabs mb-3">
                        <li className="nav-item">
                            <button className={`nav-link ${activeTab === 'pessoa' ? 'active' : ''}`} onClick={() => setActiveTab('pessoa')}>
                                <FaUser className="me-2" /> Pessoa
                            </button>
                        </li>

                        <li className="nav-item">
                            <button className={`nav-link ${activeTab === 'designacoes' ? 'active' : ''}`} onClick={() => setActiveTab('designacoes')}>
                                <FaUserTie className="me-2" /> Designações
                            </button>
                        </li>

                        <li className="nav-item">
                            <button className={`nav-link ${activeTab === 'atribuicoes' ? 'active' : ''}`} onClick={() => setActiveTab('atribuicoes')}>
                                <FaMicrophone className="me-2" /> Atribuições
                            </button>
                        </li>

                        <li className="nav-item">
                            <button className={`nav-link ${activeTab === 'disponibilidade' ? 'active' : ''}`} onClick={() => setActiveTab('disponibilidade')}>
                                <FaCalendarTimes className="me-2" /> Disponibilidade
                            </button>
                        </li>
                    </ul>

                    <div className="tab-content flex-grow-1 overflow-auto p-1">
                        {renderTabContent()}
                    </div>
                </div>
            </Modal>

            <ConfirmDialog
                isOpen={showDeletePessoaConfirm}
                title="Excluir Pessoa"
                message="Tem certeza que deseja excluir esta pessoa?"
                onConfirm={confirmDeletePessoa}
                onCancel={() => setShowDeletePessoaConfirm(false)}
                confirmText="Excluir"
                variant="danger"
            />
        </div>
    );
};
