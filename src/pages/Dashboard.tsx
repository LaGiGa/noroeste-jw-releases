import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaUsers, FaCalendarAlt, FaBuilding, FaBook, FaChalkboardTeacher, FaUserGraduate, FaClipboardList, FaArrowRight } from 'react-icons/fa';
import { db } from '../services/database';
import type { ScheduleItem, IndicatorAssignment, SchoolAssignment } from '../services/database';

interface WeekSchedule {
    speeches: ScheduleItem[];
    indicators: IndicatorAssignment[];
    school: SchoolAssignment[];
}

const StatCard: React.FC<{
    title: string;
    value: number;
    icon: React.ReactNode;
    color: string;
    link?: string;
}> = ({ title, value, icon, color, link }) => {
    const navigate = useNavigate();

    // Map colors to hex values for the gradient
    const colorMap: Record<string, string> = {
        primary: '#3b82f6',
        success: '#10b981',
        info: '#06b6d4',
        warning: '#f59e0b',
        danger: '#ef4444'
    };

    const hexColor = colorMap[color] || '#3b82f6';

    return (
        <div
            className="stat-card-futuristic h-100"
            onClick={() => link && navigate(link)}
            style={{
                cursor: link ? 'pointer' : 'default',
                '--card-color': hexColor
            } as React.CSSProperties}
        >
            <div className="card-body p-4">
                <div className="d-flex justify-content-between align-items-start mb-3">
                    <div className="icon-wrapper" style={{ color: hexColor }}>
                        <div style={{ fontSize: '1.5rem' }}>
                            {icon}
                        </div>
                    </div>
                    {link && (
                        <div className="text-muted opacity-50">
                            <FaArrowRight size={12} />
                        </div>
                    )}
                </div>
                <div>
                    <h2 className="mb-1 fw-bold" style={{ fontSize: '2rem' }}>{value}</h2>
                    <p className="text-muted mb-0 small text-uppercase letter-spacing-1">{title}</p>
                </div>
            </div>
        </div>
    );
};

export const Dashboard: React.FC = () => {
    const [weekSchedule, setWeekSchedule] = useState<WeekSchedule>({
        speeches: [],
        indicators: [],
        school: []
    });
    const [congregacoes, setCongregacoes] = useState(db.getCongregations());
    const [stats, setStats] = useState({
        oradores: 0,
        discursosAgendados: 0,
        congregacoes: 0,
        temasDisponiveis: 194,
        estudantes: 0,
        designacoesIndicador: 0,
        designacoesEscola: 0,
        pessoas: 0
    });

    const getCongLabel = (name: string): string => {
        const c = congregacoes.find(x => x.name === name);
        const loc = c?.city || c?.address;
        return loc ? `${name} - ${loc}` : name;
    };

    const location = useLocation();

    const loadWeekSchedule = React.useCallback(() => {
        const now = new Date();
        const currentDay = now.getDay();
        const diff = currentDay === 0 ? 0 : -currentDay; // Domingo é 0
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() + diff);
        weekStart.setHours(0, 0, 0, 0);

        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);

        // Carregar discursos da semana
        const allSchedule = db.getSchedule();
        const weekSpeeches = allSchedule.filter(item => {
            try {
                const itemDate = new Date(item.date + 'T00:00:00');
                return itemDate >= weekStart && itemDate <= weekEnd;
            } catch {
                return false;
            }
        });

        // Carregar designações de indicador da semana
        const allIndicators = db.getIndicatorAssignments();
        const weekIndicators = allIndicators.filter(item => {
            try {
                const itemDate = new Date(item.date + 'T00:00:00');
                return itemDate >= weekStart && itemDate <= weekEnd;
            } catch {
                return false;
            }
        });

        // Carregar designações da escola da semana
        const allSchool = db.getSchoolAssignments();
        const weekSchool = allSchool.filter(item => {
            try {
                const itemDate = new Date(item.date + 'T00:00:00');
                return itemDate >= weekStart && itemDate <= weekEnd;
            } catch {
                return false;
            }
        });

        setWeekSchedule({
            speeches: weekSpeeches,
            indicators: weekIndicators,
            school: weekSchool
        });
    }, []);

    const loadAllData = React.useCallback(() => {
        console.log('📊 Dashboard: Carregando dados atualizados...');
        loadWeekSchedule();
        setCongregacoes(db.getCongregations());

        const allPersons = db.getPersons();
        const allSchool = db.getSchoolAssignments();
        const allIndicators = db.getIndicatorAssignments();

        setStats({
            oradores: db.getSpeakers().length,
            discursosAgendados: db.getSchedule().length,
            congregacoes: db.getCongregations().length,
            temasDisponiveis: 194,
            estudantes: allPersons.filter(p => p && p.active && !p.moved && (
                p.assignments?.bibleReading ||
                p.assignments?.studentTalk ||
                p.assignments?.assistant ||
                p.assignments?.startingConversations ||
                p.assignments?.cultivatingInterest ||
                p.assignments?.makingDisciples ||
                p.assignments?.explainingBeliefs ||
                p.roles?.includes('Estudante')
            )).length,
            designacoesIndicador: allIndicators.length,
            designacoesEscola: allSchool.length,
            pessoas: allPersons.filter(p => p.active && !p.moved).length
        });
    }, [loadWeekSchedule]);

    useEffect(() => {
        loadAllData();
    }, [loadAllData, location.key]); // location.key changes on every navigation


    const formatDate = (dateString: string) => {
        try {
            const date = new Date(dateString + 'T00:00:00');
            const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
            const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

            const dayName = days[date.getDay()];
            const day = date.getDate().toString().padStart(2, '0');
            const month = months[date.getMonth()];

            return `${dayName}, ${day} de ${month}`;
        } catch {
            return dateString;
        }
    };

    return (
        <div className="container-fluid pb-5">
            <div className="mb-5">
                <h2 className="mb-1 fw-bold">Visão Geral</h2>
                <p className="text-muted">Bem-vindo ao Sistema de Gerenciamento - Congregação Noroeste</p>
            </div>

            {/* Cards de Estatísticas */}
            <div className="row g-4 mb-5">
                <div className="col-md-6 col-lg-3">
                    <StatCard
                        title="Oradores"
                        value={stats.oradores}
                        icon={<FaUsers />}
                        color="primary"
                        link="/agenda"
                    />
                </div>

                <div className="col-md-6 col-lg-3">
                    <StatCard
                        title="Discursos Agendados"
                        value={stats.discursosAgendados}
                        icon={<FaCalendarAlt />}
                        color="success"
                        link="/agenda"
                    />
                </div>

                <div className="col-md-6 col-lg-3">
                    <StatCard
                        title="Congregações"
                        value={stats.congregacoes}
                        icon={<FaBuilding />}
                        color="info"
                        link="/congregacoes"
                    />
                </div>

                <div className="col-md-6 col-lg-3">
                    <StatCard
                        title="Temas Disponíveis"
                        value={stats.temasDisponiveis}
                        icon={<FaBook />}
                        color="warning"
                        link="/agenda"
                    />
                </div>

                <div className="col-md-6 col-lg-3">
                    <StatCard
                        title="Pessoas Ativas"
                        value={stats.pessoas}
                        icon={<FaUsers />}
                        color="warning"
                        link="/pessoas"
                    />
                </div>

                <div className="col-md-6 col-lg-3">
                    <StatCard
                        title="Designações Escola"
                        value={stats.designacoesEscola}
                        icon={<FaChalkboardTeacher />}
                        color="primary"
                        link="/escola"
                    />
                </div>

                <div className="col-md-6 col-lg-3">
                    <StatCard
                        title="Indicadores"
                        value={stats.designacoesIndicador}
                        icon={<FaClipboardList />}
                        color="info"
                        link="/designacoes"
                    />
                </div>

                <div className="col-md-6 col-lg-3">
                    <StatCard
                        title="Estudantes Ativos"
                        value={stats.estudantes}
                        icon={<FaUserGraduate />}
                        color="success"
                        link="/escola"
                    />
                </div>
            </div>

            {/* Agendamentos da Semana */}
            <div className="row g-4">
                {/* Discursos da Semana */}
                <div className="col-lg-6">
                    <div className="dashboard-section-card h-100">
                        <div className="dashboard-card-header">
                            <div className="position-absolute top-0 start-0 h-100 w-100" style={{ background: 'linear-gradient(90deg, rgba(59, 130, 246, 0.15), transparent)', opacity: 0.5 }}></div>
                            <h5 className="mb-0 d-flex align-items-center position-relative">
                                <FaCalendarAlt className="me-2 text-primary" />
                                Discursos da Semana
                            </h5>
                        </div>
                        <div className="card-body p-4">
                            {weekSchedule.speeches.length > 0 ? (
                                <div className="d-flex flex-column gap-3">
                                    {weekSchedule.speeches.map((speech) => (
                                        <div key={speech.id} className="dashboard-list-item">
                                            <div className="d-flex justify-content-between align-items-start mb-2">
                                                <span className="badge bg-primary bg-opacity-25 text-primary border border-primary border-opacity-25">
                                                    {formatDate(speech.date)}
                                                </span>
                                            </div>
                                            <h6 className="mb-1">{speech.speechTheme}</h6>
                                            <p className="mb-1 text-muted small">
                                                <strong className="text-primary-50">Orador:</strong> {speech.speakerName}
                                            </p>
                                            <p className="mb-0 text-muted small">
                                                <strong className="text-primary-50">Congregação:</strong> {getCongLabel(speech.congregation)}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center text-muted py-5">
                                    <div className="mb-3 p-4 rounded-circle bg-secondary bg-opacity-10 d-inline-block">
                                        <FaCalendarAlt size={32} className="opacity-25" />
                                    </div>
                                    <p className="mb-0">Nenhum discurso agendado para esta semana</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Designações de Indicador da Semana */}
                <div className="col-lg-6">
                    <div className="dashboard-section-card h-100">
                        <div className="dashboard-card-header">
                            <div className="position-absolute top-0 start-0 h-100 w-100" style={{ background: 'linear-gradient(90deg, rgba(16, 185, 129, 0.15), transparent)', opacity: 0.5 }}></div>
                            <h5 className="mb-0 d-flex align-items-center position-relative">
                                <FaUsers className="me-2 text-success" />
                                Designações de Indicador
                            </h5>
                        </div>
                        <div className="card-body p-4">
                            {weekSchedule.indicators.length > 0 ? (
                                <div className="d-flex flex-column gap-3">
                                    {weekSchedule.indicators.map((indicator) => (
                                        <div key={indicator.id} className="dashboard-list-item">
                                            <div className="d-flex justify-content-between align-items-start mb-2">
                                                <span className="badge bg-success bg-opacity-25 text-success border border-success border-opacity-25">
                                                    {formatDate(indicator.date)}
                                                </span>
                                                <span className="badge bg-secondary bg-opacity-10 text-secondary border border-secondary border-opacity-10">
                                                    {indicator.type === 'domingo' ? 'Domingo' : 'Quarta-feira'}
                                                </span>
                                            </div>
                                            <h6 className="mb-2 text-white">{indicator.theme}</h6>
                                            <div className="d-flex flex-wrap gap-3">
                                                {indicator.speaker && (
                                                    <small className="text-muted">
                                                        <strong className="text-success-50">Orador:</strong> {indicator.speaker}
                                                    </small>
                                                )}
                                                {indicator.president && (
                                                    <small className="text-muted">
                                                        <strong className="text-success-50">Presidente:</strong> {indicator.president}
                                                    </small>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center text-muted py-5">
                                    <div className="mb-3 p-4 rounded-circle bg-secondary bg-opacity-10 d-inline-block">
                                        <FaUsers size={32} className="opacity-25" />
                                    </div>
                                    <p className="mb-1">Nenhuma designação de indicador para esta semana</p>
                                    <small className="opacity-50">Acesse a página de Designações para sortear</small>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Designações da Escola da Semana */}
                <div className="col-12">
                    <div className="dashboard-section-card">
                        <div className="dashboard-card-header">
                            <div className="position-absolute top-0 start-0 h-100 w-100" style={{ background: 'linear-gradient(90deg, rgba(6, 182, 212, 0.15), transparent)', opacity: 0.5 }}></div>
                            <h5 className="mb-0 d-flex align-items-center position-relative">
                                <FaChalkboardTeacher className="me-2 text-info" />
                                Designações da Escola da Semana
                            </h5>
                        </div>
                        <div className="card-body p-0">
                            {weekSchedule.school.length > 0 ? (
                                <div className="table-responsive">
                                    <table className="table table-futuristic mb-0">
                                        <thead>
                                            <tr>
                                                <th className="ps-4">Data</th>
                                                <th>Estudante</th>
                                                <th>Ponto</th>
                                                <th>Sala</th>
                                                <th>Ajudante</th>
                                                <th className="pe-4">Orador</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {weekSchedule.school.map((assignment) => (
                                                <tr key={assignment.id}>
                                                    <td className="ps-4">
                                                        <span className="badge bg-secondary bg-opacity-25 text-secondary border border-secondary border-opacity-25">
                                                            {formatDate(assignment.date).split(',')[0]}
                                                        </span>
                                                    </td>
                                                    <td className="fw-bold">{assignment.studentName}</td>
                                                    <td className="text-muted">{assignment.point}</td>
                                                    <td>
                                                        <span className={`badge ${assignment.room === 'Principal' ? 'bg-primary' : 'bg-secondary'} bg-opacity-25 text-${assignment.room === 'Principal' ? 'primary' : 'secondary'} border border-${assignment.room === 'Principal' ? 'primary' : 'secondary'} border-opacity-25`}>
                                                            {assignment.room}
                                                        </span>
                                                    </td>
                                                    <td className="text-muted">{assignment.assistant || '-'}</td>
                                                    <td className="pe-4 text-muted">{assignment.speaker || '-'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="text-center text-muted py-5">
                                    <div className="mb-3 p-4 rounded-circle bg-secondary bg-opacity-10 d-inline-block">
                                        <FaChalkboardTeacher size={32} className="opacity-25" />
                                    </div>
                                    <p className="mb-0">Nenhuma designação da escola para esta semana</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            {/* Rodapé com botão de Sincronização e Restauração (Aparece APENAS em Modo DEV) */}
            {import.meta.env.DEV && (
                <div className="row mt-4 mb-5">
                    <div className="col-12 text-center">
                        <hr className="my-4 opacity-10" />
                        <div className="d-flex justify-content-center gap-3">
                            <button
                                onClick={async () => {
                                    if (!window.confirm('Tem certeza que deseja enviar os dados locais para a nuvem? Isso irá substituir os dados no Supabase.')) return;
                                    try {
                                        const { syncToCloud } = await import('../services/syncToCloud');
                                        const res = await syncToCloud();
                                        if (res.success) {
                                            alert(`Sincronização concluída! ${res.count} pessoas enviadas.`);
                                        } else {
                                            alert('Erro ao sincronizar. Verifique o console.');
                                        }
                                    } catch (e) {
                                        alert('Falha na sincronização.');
                                        console.error(e);
                                    }
                                }}
                                className="btn btn-outline-primary btn-sm opacity-50 hover-opacity-100"
                                title="Enviar dados locais para o Supabase (Piloto)"
                            >
                                ☁️ Enviar p/ Nuvem
                            </button>

                            <button
                                onClick={async () => {
                                    if (!window.confirm('⚠️ ATENÇÃO: Isso irá BAIXAR os dados da nuvem e SUBSTITUIR os dados atuais deste computador. Use isso para recuperar dados perdidos.\n\nDeseja continuar?')) return;
                                    try {
                                        const { restoreFromCloud } = await import('../services/restoreFromCloud');
                                        const res = await restoreFromCloud();
                                        if (res.success) {
                                            alert(`Restauração concluída com sucesso!\nRecuperados: ${res.count} pessoas.\nO sistema será recarregado.`);
                                            window.location.reload();
                                        } else {
                                            alert('Erro ao restaurar. Verifique o console.');
                                        }
                                    } catch (e) {
                                        alert('Falha na restauração.');
                                        console.error(e);
                                    }
                                }}
                                className="btn btn-outline-danger btn-sm opacity-75 hover-opacity-100"
                                title="Baixar dados do Supabase para o Computador"
                            >
                                ⬇️ Restaurar da Nuvem (Emergência)
                            </button>
                        </div>
                        <p className="small text-muted mt-2 opacity-50">Modo Desenvolvedor • Controle Cloud</p>
                    </div>
                </div>
            )}

            {!import.meta.env.DEV && (
                <div className="row mt-4 mb-5">
                    <div className="col-12 text-center">
                        <p className="small text-muted mt-2 opacity-25">Noroeste JW • v1.0.9</p>
                    </div>
                </div>
            )}
        </div>
    );
};
