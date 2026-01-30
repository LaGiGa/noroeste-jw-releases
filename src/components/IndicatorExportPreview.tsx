import React from 'react';
import type { IndicatorAssignment } from '../services/database';

interface IndicatorExportPreviewProps {
    assignments: IndicatorAssignment[];
    month: string | number;
    year: string | number;
    orientation?: 'portrait' | 'landscape';
    id?: string;
}

const THEME_COLOR = '#70548a'; // Purple
const BORDER_COLOR = '#000000';
const LIGHT_GREY = '#f0f0f0';

export const IndicatorExportPreview: React.FC<IndicatorExportPreviewProps> = ({
    assignments,
    month,
    year,
    orientation = 'landscape',
    id = 'indicator-export-preview'
}) => {
    const isPortrait = orientation === 'portrait';
    const width = isPortrait ? '794px' : '1123px';
    const height = isPortrait ? '1123px' : '794px';

    const formatName = (name?: string) => {
        if (!name) return '';
        const fontSize = isPortrait ? '10px' : '11px';

        const parts = name.trim().split(' ');
        let firstLine = name;
        let secondLine = '';

        if (parts.length > 1) {
            firstLine = parts[0];
            secondLine = parts.slice(1).join(' ');
        }

        return (
            <div style={{
                fontSize,
                lineHeight: '1.0',
                padding: '0',
                overflow: 'hidden',
                wordWrap: 'break-word',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                height: '100%',
                gap: '1px'
            }}>
                <div style={{ marginBottom: '1px' }}>{firstLine}</div>
                {secondLine && <div style={{ fontSize: isPortrait ? '9px' : '10px' }}>{secondLine}</div>}
            </div>
        );
    };

    const parseLocalDate = (dateStr: string) => {
        const [year, month, day] = dateStr.split('-').map(Number);
        // Usar meio-dia (12) para evitar qualquer problema de virada de dia/fuso
        return new Date(year, month - 1, day, 12, 0, 0);
    };

    const isMidweek = (dateStr: string) => {
        const date = parseLocalDate(dateStr);
        return date.getDay() === 3; // Wednesday
    };

    const getDay = (dateStr: string) => parseLocalDate(dateStr).getDate();
    const getDayName = (dateStr: string) => {
        const date = parseLocalDate(dateStr);
        const day = date.getDay();
        if (day === 3) return 'QUARTA';
        if (day === 0) return 'DOMINGO';
        return date.toLocaleDateString('pt-BR', { weekday: 'short' }).toUpperCase().replace('.', '');
    };

    const isSpecialRow = (theme: string) => {
        if (!theme) return false;
        const t = theme.toLowerCase();
        return t.includes('congresso') ||
            t.includes('assembleia') ||
            t.includes('visita') ||
            t.includes('comemora') ||
            t.includes('observação') ||
            t.includes('não teremos');
    };

    const sortedAssignments = [...assignments].sort((a, b) => parseLocalDate(a.date).getTime() - parseLocalDate(b.date).getTime());

    const monthNames = [
        'JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO',
        'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'
    ];
    const monthName = monthNames[Number(month) - 1];

    return (
        <div id={id} style={{
            width: width,
            minHeight: height,
            backgroundColor: 'white',
            padding: isPortrait ? '25px' : '35px',
            fontFamily: "'Outfit', 'Inter', sans-serif",
            color: 'black',
            boxSizing: 'border-box',
            position: 'relative',
            overflow: 'auto',
            display: 'flex',
            flexDirection: 'column'
        }}>
            <style>
                {`
                table { width: 100%; border-collapse: collapse; table-layout: fixed; border: 1.5px solid ${BORDER_COLOR}; }
                th, td { border: 1px solid ${BORDER_COLOR}; text-align: center; vertical-align: middle; padding: 4px 2px; overflow: hidden; }
                th { color: black; font-weight: 700; height: 35px; }
                `}
            </style>

            <div style={{
                backgroundColor: THEME_COLOR,
                color: '#ffffff',
                padding: '12px',
                textAlign: 'center',
                fontWeight: '700',
                fontSize: isPortrait ? '18px' : '22px',
                border: `1.5px solid ${BORDER_COLOR}`,
                textTransform: 'uppercase',
                flexShrink: 0,
                width: '100%'
            }}>
                PROGRAMAÇÕES DAS REUNIÕES SEMANAIS - {monthName}/{year}
            </div>

            <div style={{ width: '100%', marginTop: '-1.5px' }}>
                <table>
                    <thead>
                        <tr style={{ height: isPortrait ? 'auto' : '55px' }}>
                            <th style={{ backgroundColor: THEME_COLOR, width: isPortrait ? '30px' : '45px', fontSize: isPortrait ? '9px' : '12px' }} rowSpan={2}>DIA</th>
                            <th style={{ backgroundColor: THEME_COLOR, width: isPortrait ? '24px' : '35px' }} rowSpan={2}></th>
                            <th style={{ backgroundColor: THEME_COLOR, width: isPortrait ? '110px' : '180px', fontSize: isPortrait ? '9px' : '12px' }} rowSpan={2}>TEMA</th>
                            <th style={{ backgroundColor: THEME_COLOR, width: isPortrait ? '55px' : '90px', fontSize: isPortrait ? '10px' : '12px' }} rowSpan={2}>ORADOR</th>
                            <th style={{ backgroundColor: THEME_COLOR, width: isPortrait ? '55px' : '90px', fontSize: isPortrait ? '10px' : '12px' }} rowSpan={2}>PRESIDEN-<br />TE</th>
                            <th style={{ backgroundColor: THEME_COLOR, width: isPortrait ? '55px' : '85px', fontSize: isPortrait ? '10px' : '12px' }} rowSpan={2}>LEITOR</th>
                            <th style={{ backgroundColor: THEME_COLOR, width: isPortrait ? '55px' : '85px', fontSize: isPortrait ? '10px' : '12px' }} rowSpan={2}>HOSPITA-<br />LIDADE</th>
                            <th style={{ backgroundColor: THEME_COLOR, fontSize: isPortrait ? '10px' : '12px' }} colSpan={2}>INDICADORES</th>
                            <th style={{ backgroundColor: THEME_COLOR, width: isPortrait ? '52px' : '75px', fontSize: isPortrait ? '8px' : '11px' }} rowSpan={2}>MIC.<br />VOLANTE<br />01</th>
                            <th style={{ backgroundColor: THEME_COLOR, width: isPortrait ? '52px' : '75px', fontSize: isPortrait ? '8px' : '11px' }} rowSpan={2}>MIC.<br />VOLANTE<br />02</th>
                            <th style={{ backgroundColor: THEME_COLOR, width: isPortrait ? '45px' : '70px', fontSize: isPortrait ? '9px' : '11px' }} rowSpan={2}>ÁUDIO</th>
                            <th style={{ backgroundColor: THEME_COLOR, width: isPortrait ? '45px' : '70px', fontSize: isPortrait ? '9px' : '11px' }} rowSpan={2}>VÍDEO</th>
                        </tr>
                        <tr style={{ height: isPortrait ? 'auto' : '35px' }}>
                            <th style={{ backgroundColor: THEME_COLOR, fontSize: isPortrait ? '8px' : '10px' }}>ENTRADA</th>
                            <th style={{ backgroundColor: THEME_COLOR, fontSize: isPortrait ? '8px' : '10px' }}>AUDITÓRIO</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedAssignments.map((assignment, index) => {
                            const isSpecial = isSpecialRow(assignment.theme);
                            const midweek = isMidweek(assignment.date);
                            const day = getDay(assignment.date);
                            const dayName = getDayName(assignment.date);

                            return (
                                <tr key={index} style={{ height: isSpecial ? '45px' : (isPortrait ? '55px' : '58px') }}>
                                    <td style={{ fontWeight: '700', fontSize: isPortrait ? '13px' : '16px' }}>{day}</td>
                                    <td style={{ padding: '0', position: 'relative' }}>
                                        <div style={{
                                            position: 'absolute',
                                            top: '50%',
                                            left: '50%',
                                            transform: 'translate(-50%, -50%) rotate(-90deg)',
                                            whiteSpace: 'nowrap',
                                            fontSize: isPortrait ? '7px' : '9px',
                                            fontWeight: '700',
                                            letterSpacing: '0.5px'
                                        }}>
                                            {dayName}
                                        </div>
                                    </td>

                                    {isSpecial ? (
                                        <td colSpan={11} style={{
                                            fontWeight: '700',
                                            padding: '8px',
                                            backgroundColor: '#f5f0f8',
                                            fontSize: isPortrait ? '9px' : '11px',
                                            textTransform: 'uppercase',
                                            textAlign: 'center'
                                        }}>
                                            {assignment.theme}
                                        </td>
                                    ) : (
                                        <>
                                            {midweek ? (
                                                <td colSpan={5} style={{ fontWeight: '400', fontSize: isPortrait ? '9px' : '11px' }}>
                                                    Vida e Ministério
                                                </td>
                                            ) : (
                                                <>
                                                    <td style={{ fontSize: isPortrait ? '10px' : '11px', fontWeight: '400' }}>{assignment.theme}</td>
                                                    <td>{formatName(assignment.speaker)}</td>
                                                    <td>{formatName(assignment.president)}</td>
                                                    <td>{formatName(assignment.reader)}</td>
                                                    <td>{formatName(assignment.hospitality)}</td>
                                                </>
                                            )}

                                            <td>{formatName(assignment.entranceIndicator)}</td>
                                            <td>{formatName(assignment.auditoriumIndicator)}</td>
                                            <td>{formatName(assignment.mic1)}</td>
                                            <td>{formatName(assignment.mic2)}</td>
                                            <td>{formatName(assignment.audio)}</td>
                                            <td>{formatName(assignment.video)}</td>
                                        </>
                                    )}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <div style={{ marginTop: '0px', flexShrink: 0, width: '100%' }}>
                <div style={{ backgroundColor: LIGHT_GREY, padding: '12px', border: `1.5px solid ${BORDER_COLOR}`, borderTop: 'none', fontSize: isPortrait ? '9px' : '11px' }}>
                    <div style={{ fontWeight: '700', marginBottom: '8px', fontSize: isPortrait ? '10px' : '12px' }}>OBS: Segue algumas orientações úteis que fazem parte da designação do indicador, entre outras coisas:</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: isPortrait ? '10px' : '40px' }}>
                        <div style={{ lineHeight: '1.4' }}>
                            <div>- Verificar sua designação com antecedência;</div>
                            <div>- Chegar pelo menos 30 minutos antes do início das reuniões;</div>
                            <div>- Abrir e fechar as portas do salão;</div>
                            <div>- Ligar os condicionadores de ar e manter temperatura agradável, 23° ou 24°, e desligar 15 minutos após a reunião;</div>
                            <div>- Verificar o estado da limpeza do Salão do Reino e limpar onde precisar;</div>
                        </div>
                        <div style={{ lineHeight: '1.4' }}>
                            <div>- Recepcionar com alegria e cordialidade todos os que chegam;</div>
                            <div>- Não deixar as crianças correrem no salão ou subir no palco e avisar os pais;</div>
                            <div>- Cuidar da segurança e manter um bom ambiente das reuniões;</div>
                            <div>- Uso de gravata é obrigatório, mas o terno é opcional;</div>
                        </div>
                    </div>
                </div>

                <div style={{
                    padding: '8px 5px',
                    textAlign: 'center',
                    border: `1.5px solid ${BORDER_COLOR}`,
                    borderTop: 'none',
                    backgroundColor: LIGHT_GREY,
                    fontWeight: '400',
                    fontSize: isPortrait ? '9px' : '11px'
                }}>
                    Recomendamos sempre a recaptular as orientações do livro organizados, capítulo 06, parágrafos 1 a 9; capítulo 11, parágrafos 1 a 14, especialmente 17;
                </div>

                <div style={{
                    backgroundColor: THEME_COLOR,
                    color: 'white',
                    textAlign: 'center',
                    padding: '12px 20px',
                    border: `1.5px solid ${BORDER_COLOR}`,
                    borderTop: 'none',
                    width: '100%',
                    boxSizing: 'border-box'
                }}>
                    <span style={{
                        fontWeight: '400',
                        fontSize: isPortrait ? '10px' : '12px',
                        lineHeight: '1.4',
                        letterSpacing: '0.2px',
                        wordSpacing: '1px',
                        display: 'inline-block'
                    }}>
                        "É por isso que nós trabalhamos arduamente e nos esforçamos, porque baseamos a nossa esperança num Deus vivente". - 1 Ti. 4:10
                    </span>
                </div>
            </div>
        </div>
    );
};
