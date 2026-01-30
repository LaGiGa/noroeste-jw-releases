import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { auth } from '../services/auth';
import { db } from '../services/database';
import { showSuccess, showError } from '../utils/toast';
import { useTheme } from '../contexts/ThemeContext';
import {
    FaTachometerAlt,
    FaCalendarAlt,
    FaBuilding,
    FaUserCog,
    FaFilePdf,
    FaSignOutAlt,
    FaBars,
    FaClipboardList,
    FaUserGraduate,
    FaMapMarkedAlt,
    FaDatabase,
    FaMoon,
    FaSun,
    FaUsers
} from 'react-icons/fa';

interface NavItem {
    name: string;
    href: string;
    icon: React.ComponentType<{ size?: number }>;
    permission?: string;
    adminOnly?: boolean;
}

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();
    const user = auth.getCurrentUser();
    const { setTheme, effectiveTheme } = useTheme();

    // Definição dos itens de menu e permissões
    const navigation: NavItem[] = [
        { name: 'Visão Geral', href: '/', icon: FaTachometerAlt, permission: 'dashboard' },
        { name: 'Agenda', href: '/agenda', icon: FaCalendarAlt, permission: 'agenda' },
        { name: 'Campo', href: '/campo', icon: FaMapMarkedAlt, permission: 'campo' },
        { name: 'Congregações', href: '/congregacoes', icon: FaBuilding, permission: 'congregacoes' },
        { name: 'Escola', href: '/escola', icon: FaUserGraduate, permission: 'escola' },
        { name: 'Indicador', href: '/designacoes', icon: FaClipboardList, permission: 'indicador' },
        { name: 'Pessoas', href: '/pessoas', icon: FaUsers, permission: 'indicador' },
        { name: 'Relatórios', href: '/relatorios-pdf', icon: FaFilePdf, permission: 'relatorios' },
        { name: 'Usuários', href: '/usuarios', icon: FaUserCog, adminOnly: true },
        { name: 'Dados', href: '/dados', icon: FaDatabase, permission: 'dados' },
    ];

    const handleLogout = () => {
        auth.logout();
        navigate('/login');
    };

    // Função para verificar se o usuário tem acesso ao item do menu
    const hasAccess = (item: NavItem) => {
        if (!user) return false;

        // Se é apenas para admin
        if (item.adminOnly) {
            return user.role === 'ADMIN';
        }

        // Se não requer permissão específica, todos têm acesso
        if (!item.permission) {
            return true;
        }

        // Verifica se tem a permissão necessária
        return user.role === 'ADMIN' || (user.permissions && user.permissions.includes(item.permission));
    };

    return (
        <div className="d-flex">
            {/* Sidebar */}
            <aside className={`sidebar ${sidebarOpen ? 'show' : ''}`}>
                <div className="sidebar-header">
                    <Link to="/" className="sidebar-brand d-flex align-items-center gap-2">
                        <div className="text-white rounded p-1 fw-bold d-flex align-items-center justify-content-center" style={{ width: '32px', height: '32px', fontSize: '12px', background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', boxShadow: '0 0 10px rgba(59, 130, 246, 0.5)' }}>
                            APP
                        </div>
                        <span style={{ fontSize: '0.9rem', lineHeight: '1.2' }}>Portal do<br />Ministério</span>
                    </Link>
                </div>

                <nav className="sidebar-nav">
                    {navigation.map((item) => {
                        // Verificar se o usuário tem permissão para ver este item
                        if (!hasAccess(item)) {
                            return null;
                        }

                        const Icon = item.icon;
                        const isActive = location.pathname === item.href;
                        return (
                            <Link
                                key={item.name}
                                to={item.href}
                                className={`nav-link ${isActive ? 'active' : ''}`}
                                onClick={() => setSidebarOpen(false)}
                            >
                                <Icon />
                                <span>{item.name}</span>
                            </Link>
                        );
                    })}
                </nav>
            </aside>

            {/* Backdrop for mobile */}
            {sidebarOpen && (
                <div
                    className="position-fixed top-0 start-0 w-100 h-100 bg-dark bg-opacity-50 d-md-none"
                    style={{ zIndex: 999 }}
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Main Content */}
            <div className="main-content flex-grow-1">
                {/* Top Header */}
                <header className="top-header">
                    <div className="d-flex align-items-center">
                        <button
                            className="btn btn-link d-md-none text-dark p-0 me-3"
                            onClick={() => setSidebarOpen(true)}
                        >
                            <FaBars size={20} />
                        </button>
                        <h5 className="mb-0 fw-semibold">Portal do Ministério do Reino</h5>
                    </div>

                    <div className="d-flex align-items-center gap-3">
                        <span className="text-muted d-none d-sm-inline">
                            {user?.name || 'Usuário'} ({user?.role})
                        </span>
                        <button
                            onClick={() => setTheme(effectiveTheme === 'dark' ? 'light' : 'dark')}
                            className="btn btn-sm btn-outline-secondary btn-icon"
                            title={effectiveTheme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}
                        >
                            {effectiveTheme === 'dark' ? <FaSun /> : <FaMoon />}
                        </button>
                        <button
                            onClick={() => {
                                const data = db.exportData();
                                const electronAPI = (window as unknown as { electron?: { saveBackup: (data: string) => Promise<void> } }).electron;
                                if (electronAPI?.saveBackup) {
                                    electronAPI.saveBackup(data).then(() => {
                                        showSuccess('Backup realizado com sucesso!');
                                    }).catch((e: Error) => {
                                        showError('Erro ao realizar backup: ' + e.message);
                                    });
                                }
                            }}
                            className="btn btn-sm btn-outline-primary btn-icon"
                            title="Realizar Backup Agora"
                        >
                            <FaDatabase />
                        </button>
                        <button
                            onClick={handleLogout}
                            className="btn btn-sm btn-outline-danger btn-icon"
                        >
                            <FaSignOutAlt />
                            <span className="d-none d-sm-inline">Sair</span>
                        </button>
                    </div>
                </header>

                {/* Page Content */}
                <main className="page-content">
                    {children}
                </main>
            </div>
        </div>
    );
};
