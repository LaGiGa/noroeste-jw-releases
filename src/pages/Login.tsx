import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../services/auth';
import { showError } from '../utils/toast';
import { FaUser, FaLock, FaSignInAlt } from 'react-icons/fa';

export const Login: React.FC = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (auth.login(username, password)) {
            navigate('/');
        } else {
            showError('Usuário ou senha incorretos');
        }
    };

    return (
        <div className="min-vh-100 d-flex align-items-center justify-content-center" style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
        }}>
            <div className="container">
                <div className="row justify-content-center">
                    <div className="col-md-6 col-lg-5">
                        <div className="card shadow-lg border-0" style={{
                            borderRadius: '20px',
                            backdropFilter: 'blur(10px)',
                            background: 'rgba(255, 255, 255, 0.98)'
                        }}>
                            <div className="card-body p-5">
                                {/* Logo e Título */}
                                <div className="text-center mb-4">
                                    <div className="d-inline-flex align-items-center justify-content-center mb-3" style={{
                                        width: '80px',
                                        height: '80px',
                                        borderRadius: '20px',
                                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                        boxShadow: '0 8px 20px rgba(102, 126, 234, 0.3)'
                                    }}>
                                        <span className="text-white fw-bold" style={{ fontSize: '2.5rem' }}>N</span>
                                    </div>
                                    <h1 className="fw-bold mb-2" style={{
                                        fontSize: '1.75rem',
                                        color: '#2d3748'
                                    }}>Portal do Ministério do Reino</h1>
                                </div>

                                {/* Formulário */}
                                <form onSubmit={handleLogin}>
                                    <div className="mb-3">
                                        <label htmlFor="username" className="form-label fw-semibold text-secondary small">
                                            Usuário
                                        </label>
                                        <div className="input-group input-group-lg">
                                            <span className="input-group-text bg-light border-end-0" style={{
                                                borderRadius: '12px 0 0 12px',
                                                border: '2px solid #e9ecef',
                                                borderRight: 'none'
                                            }}>
                                                <FaUser className="text-muted" />
                                            </span>
                                            <input
                                                type="text"
                                                className="form-control border-start-0 ps-0"
                                                id="username"
                                                placeholder="Digite seu usuário"
                                                value={username}
                                                onChange={(e) => setUsername(e.target.value)}
                                                required
                                                autoFocus
                                                style={{
                                                    borderRadius: '0 12px 12px 0',
                                                    border: '2px solid #e9ecef',
                                                    borderLeft: 'none'
                                                }}
                                            />
                                        </div>
                                    </div>

                                    <div className="mb-4">
                                        <label htmlFor="password" className="form-label fw-semibold text-secondary small">
                                            Senha
                                        </label>
                                        <div className="input-group input-group-lg">
                                            <span className="input-group-text bg-light border-end-0" style={{
                                                borderRadius: '12px 0 0 12px',
                                                border: '2px solid #e9ecef',
                                                borderRight: 'none'
                                            }}>
                                                <FaLock className="text-muted" />
                                            </span>
                                            <input
                                                type="password"
                                                className="form-control border-start-0 ps-0"
                                                id="password"
                                                placeholder="Digite sua senha"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                required
                                                style={{
                                                    borderRadius: '0 12px 12px 0',
                                                    border: '2px solid #e9ecef',
                                                    borderLeft: 'none'
                                                }}
                                            />
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        className="btn btn-lg w-100 text-white fw-bold d-flex align-items-center justify-content-center gap-2 mb-4"
                                        style={{
                                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                            border: 'none',
                                            borderRadius: '12px',
                                            padding: '14px',
                                            transition: 'transform 0.2s, box-shadow 0.2s'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.transform = 'translateY(-2px)';
                                            e.currentTarget.style.boxShadow = '0 8px 20px rgba(102, 126, 234, 0.4)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.transform = 'translateY(0)';
                                            e.currentTarget.style.boxShadow = 'none';
                                        }}
                                    >
                                        <FaSignInAlt />
                                        Entrar
                                    </button>
                                </form>

                                {/* Linha divisória */}
                                <hr className="my-4" style={{ borderColor: '#e2e8f0' }} />

                                {/* Informações do Sistema */}
                                <div className="text-center">
                                    <p className="fw-semibold text-secondary mb-3" style={{ fontSize: '0.95rem' }}>
                                        Sistema desenvolvido para:
                                    </p>
                                    <ul className="list-unstyled text-start mb-4" style={{ fontSize: '0.9rem', color: '#64748b' }}>
                                        <li className="mb-2">
                                            <span className="text-primary me-2">✓</span>
                                            Organização de discursos
                                        </li>
                                        <li className="mb-2">
                                            <span className="text-primary me-2">✓</span>
                                            Gestão de oradores
                                        </li>
                                        <li className="mb-2">
                                            <span className="text-primary me-2">✓</span>
                                            Agenda congregacional
                                        </li>
                                        <li className="mb-2">
                                            <span className="text-primary me-2">✓</span>
                                            Escola do ministério
                                        </li>
                                        <li className="mb-2">
                                            <span className="text-primary me-2">✓</span>
                                            Pregação do reino
                                        </li>
                                    </ul>

                                    <div className="alert alert-warning py-2 mb-0" style={{
                                        fontSize: '0.85rem',
                                        borderRadius: '10px',
                                        background: 'rgba(255, 193, 7, 0.1)',
                                        border: '1px solid rgba(255, 193, 7, 0.3)'
                                    }}>
                                        🔒 Acesso restrito a usuários autorizados
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
