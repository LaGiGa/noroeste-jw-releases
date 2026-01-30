import React, { useState, useRef, useEffect } from 'react';
import { GoogleMap, Polygon, Polyline, DrawingManager, Circle, OverlayView } from '@react-google-maps/api';
import type { Quadra } from '../services/database';
import { FaTrash, FaPencilAlt, FaExpand, FaCompress, FaDrawPolygon, FaMinus, FaPlus, FaMagic, FaUndo, FaRedo } from 'react-icons/fa';

interface Grupo {
    id: string;
    nome: string;
    cor: string;
    paths?: google.maps.LatLngLiteral[][];
    lines?: google.maps.LatLngLiteral[][];
    quadras?: Quadra[];
}

interface MapaTerritorioProp {
    grupos: Grupo[];
    onUpdateTerritorio?: (grupoId: string, newPaths: google.maps.LatLngLiteral[][], newLines?: google.maps.LatLngLiteral[][]) => void;
    readOnly?: boolean;
    editingGrupoId?: string | null;
    extraPolylines?: google.maps.LatLngLiteral[][]; // Linhas extras para snapshot (não salvas no grupo)
    onCustomPolylineComplete?: (path: google.maps.LatLngLiteral[]) => void; // Callback para linhas extras
    onExtraPolylinesChange?: (lines: google.maps.LatLngLiteral[][]) => void; // Callback para atualizar linhas extras (apagar)
    hideExistingTerritories?: boolean;
    onQuadraMove?: (grupoId: string, quadraId: string, newLat: number, newLng: number) => void;
    onQuadraToggle?: (grupoId: string, quadraId: string) => void;
}

const defaultMapContainerStyle = {
    width: '100%',
    height: '600px',
    position: 'relative' as const
};

const fullScreenMapContainerStyle = {
    width: '100%',
    height: '100%',
    position: 'absolute' as const,
    top: 0,
    left: 0,
    zIndex: 1 // Baixo z-index para ficar atrás dos controles
};

// Centro em Palmas, TO (Plano Diretor Norte)
const center = {
    lat: -10.169,
    lng: -48.331
};

const mapOptions: google.maps.MapOptions = {
    disableDefaultUI: false,
    zoomControl: true,
    mapTypeControl: true,
    streetViewControl: false,
    fullscreenControl: false, // Vamos usar nosso próprio controle de fullscreen
};

export const MapaTerritorio: React.FC<MapaTerritorioProp> = ({ grupos, onUpdateTerritorio, readOnly = false, editingGrupoId = null, extraPolylines, onCustomPolylineComplete, onExtraPolylinesChange, hideExistingTerritories = false, onQuadraMove, onQuadraToggle }) => {
    const [selectedGrupoId, setSelectedGrupoId] = useState<string>(editingGrupoId || (grupos[0]?.id || ''));
    const [drawingMode, setDrawingMode] = useState<google.maps.drawing.OverlayType | null | 'eraser'>(null);
    const [isFreehand, setIsFreehand] = useState(false);
    const [freehandPath, setFreehandPath] = useState<google.maps.LatLngLiteral[]>([]);
    const [isDrawingFreehand, setIsDrawingFreehand] = useState(false);
    const [isSnapToRoadEnabled, setIsSnapToRoadEnabled] = useState(false);
    const [isProcessingSnap, setIsProcessingSnap] = useState(false);
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [panelPosition, setPanelPosition] = useState({ x: 20, y: 20 });
    const [isDragging, setIsDragging] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    // Eraser State
    const [isErasing, setIsErasing] = useState(false);
    const [eraserCursor, setEraserCursor] = useState<google.maps.LatLngLiteral | null>(null);
    const [tempLines, setTempLines] = useState<google.maps.LatLngLiteral[][] | null>(null);
    const [tempExtraLines, setTempExtraLines] = useState<google.maps.LatLngLiteral[][] | null>(null);
    const [tempPaths, setTempPaths] = useState<google.maps.LatLngLiteral[][] | null>(null);
    const [eraseRadius, setEraseRadius] = useState(150); // Default 150m
    const lastEraserPos = useRef<google.maps.LatLngLiteral | null>(null);
    const [quadraDragState, setQuadraDragState] = useState<{ id: string; startLat: number; startLng: number; startX: number; startY: number; currentLat: number; currentLng: number; moved: boolean } | null>(null);

    // History State (Undo/Redo)
    type HistoryEntry =
        | { type: 'group'; data: { paths?: google.maps.LatLngLiteral[][]; lines?: google.maps.LatLngLiteral[][] } }
        | { type: 'extra'; data: google.maps.LatLngLiteral[][] };
    const [history, setHistory] = useState<HistoryEntry[]>([]);
    const [redoStack, setRedoStack] = useState<HistoryEntry[]>([]);

    const addToHistory = (type?: 'group' | 'extra') => {
        // Determine target automatically if not specified, prioritizing explicit mode
        let targetType = type;
        if (!targetType) {
            if (onCustomPolylineComplete) targetType = 'extra';
            else targetType = 'group';
        }

        if (targetType === 'extra' && extraPolylines) {
            setHistory(prev => [...prev, { type: 'extra', data: extraPolylines }]);
        } else if (targetType === 'group' && selectedGrupoId) {
            const group = grupos.find(g => g.id === selectedGrupoId);
            if (group) {
                setHistory(prev => [...prev, { type: 'group', data: { paths: group.paths, lines: group.lines } }]);
            }
        }
        setRedoStack([]);
    };

    const handleUndo = () => {
        if (history.length === 0) return;
        const lastState = history[history.length - 1];
        if (!lastState) return;

        const newHistory = history.slice(0, -1);

        // Save current state to redo
        if (extraPolylines) {
            setRedoStack(prev => [...prev, { type: 'extra', data: extraPolylines }]);
        } else if (selectedGrupoId) {
            const group = grupos.find(g => g.id === selectedGrupoId);
            if (group) {
                setRedoStack(prev => [...prev, { type: 'group', data: { paths: group.paths, lines: group.lines } }]);
            }
        }

        setHistory(newHistory);

        // Apply state
        if (lastState.type === 'extra' && onExtraPolylinesChange) {
            onExtraPolylinesChange(lastState.data);
        } else if (lastState.type === 'group' && onUpdateTerritorio && selectedGrupoId) {
            onUpdateTerritorio(selectedGrupoId, lastState.data.paths || [], lastState.data.lines || []);
        }
    };

    const handleRedo = () => {
        if (redoStack.length === 0) return;
        const nextState = redoStack[redoStack.length - 1];
        if (!nextState) return;

        const newRedo = redoStack.slice(0, -1);

        // Save current to history
        if (extraPolylines) {
            setHistory(prev => [...prev, { type: 'extra', data: extraPolylines }]);
        } else if (selectedGrupoId) {
            const group = grupos.find(g => g.id === selectedGrupoId);
            if (group) {
                setHistory(prev => [...prev, { type: 'group', data: { paths: group.paths, lines: group.lines } }]);
            }
        }

        setRedoStack(newRedo);

        // Apply state
        if (nextState.type === 'extra' && onExtraPolylinesChange) {
            onExtraPolylinesChange(nextState.data);
        } else if (nextState.type === 'group' && onUpdateTerritorio && selectedGrupoId) {
            onUpdateTerritorio(selectedGrupoId, nextState.data.paths || [], nextState.data.lines || []);
        }
    };

    // Keyboard Shortcuts
    const handlersRef = useRef<{ handleUndo: typeof handleUndo; handleRedo: typeof handleRedo }>({ handleUndo, handleRedo });

    useEffect(() => {
        handlersRef.current = { handleUndo, handleRedo };
    }, [handleUndo, handleRedo]);

    // Keep refs in sync with state for closures in event listeners
    useEffect(() => {
        drawingModeRef.current = drawingMode;
    }, [drawingMode]);

    useEffect(() => {
        selectedGrupoIdRef.current = selectedGrupoId || '';
    }, [selectedGrupoId]);

    useEffect(() => {
        gruposRef.current = grupos;
    }, [grupos]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

            if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
                e.preventDefault();
                handlersRef.current.handleUndo();
            }
            if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'Z'))) {
                e.preventDefault();
                handlersRef.current.handleRedo();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);


    const dragOffset = useRef({ x: 0, y: 0 });
    const polygonRefs = useRef<{ [key: string]: google.maps.Polygon }>({});
    const polylineRefs = useRef<{ [key: string]: google.maps.Polyline }>({});
    const mapListenersRef = useRef<google.maps.MapsEventListener[]>([]);
    const drawingModeRef = useRef<google.maps.drawing.OverlayType | null | 'eraser'>(null);
    const selectedGrupoIdRef = useRef<string>('');
    const gruposRef = useRef<Grupo[]>([]);

    // Dragging Logic
    const handleMouseDown = (e: React.MouseEvent) => {
        if (readOnly) return;
        setIsDragging(true);
        dragOffset.current = {
            x: e.clientX - panelPosition.x,
            y: e.clientY - panelPosition.y
        };
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isDragging) {
                setPanelPosition({
                    x: e.clientX - dragOffset.current.x,
                    y: e.clientY - dragOffset.current.y
                });
            }
        };

        const handleMouseUp = () => {
            setIsDragging(false);
        };

        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging]);

    // Atualiza o grupo selecionado se a prop mudar
    useEffect(() => {
        if (editingGrupoId) {
            Promise.resolve().then(() => {
                setSelectedGrupoId(editingGrupoId);
            });
        }
    }, [editingGrupoId]);

    const handleClearPolygons = () => {
        if (!onUpdateTerritorio) return;
        if (window.confirm('Tem certeza que deseja apagar todos os polígonos (áreas) deste grupo?')) {
            addToHistory('group');
            const currentGrupo = grupos.find(g => g.id === selectedGrupoId);
            if (currentGrupo) {
                // Mantém as linhas, apaga os polígonos (paths)
                onUpdateTerritorio(selectedGrupoId, [], currentGrupo.lines || []);
            }
        }
    };

    const handleClearLines = () => {
        if (!onUpdateTerritorio) return;
        if (window.confirm('Tem certeza que deseja apagar todas as linhas (ruas) desenhadas neste grupo?')) {
            addToHistory('group');
            const currentGrupo = grupos.find(g => g.id === selectedGrupoId);
            if (currentGrupo) {
                // Mantém os polígonos, apaga as linhas
                onUpdateTerritorio(selectedGrupoId, currentGrupo.paths || [], []);
            }
        }
    };

    const mapRef = useRef<google.maps.Map | null>(null);

    const onLoad = React.useCallback(function callback(map: google.maps.Map) {
        mapRef.current = map;
    }, []);

    const onUnmount = React.useCallback(function callback() {
        // Remover listeners registrados
        try {
            mapListenersRef.current.forEach(l => l.remove());
            mapListenersRef.current = [];
        } catch (err) {
            console.warn('Erro ao remover listeners do mapa:', err);
        }
        mapRef.current = null;
    }, []);




    // Refs for accessing current state in event listeners/callbacks
    const tempLinesRef = useRef<google.maps.LatLngLiteral[][] | null>(null);
    const tempExtraLinesRef = useRef<google.maps.LatLngLiteral[][] | null>(null);
    const tempPathsRef = useRef<google.maps.LatLngLiteral[][] | null>(null);

    // Update refs when state changes
    useEffect(() => {
        tempLinesRef.current = tempLines;
    }, [tempLines]);

    useEffect(() => {
        tempExtraLinesRef.current = tempExtraLines;
    }, [tempExtraLines]);

    useEffect(() => {
        tempPathsRef.current = tempPaths;
    }, [tempPaths]);

    // Global MouseUp to ensure erasing stops even if mouse leaves map
    useEffect(() => {
        const handleGlobalMouseUp = () => {
            if (isErasing) {
                // Use refs instead of state closures to ensure we have the latest data
                console.log("Global MouseUp: Finishing erase");

                setIsErasing(false);
                let changed = false;

                if ((tempLinesRef.current || tempPathsRef.current) && onUpdateTerritorio && selectedGrupoId) {
                    const currentGrupo = grupos.find(g => g.id === selectedGrupoId);
                    const linesToSave = tempLinesRef.current || currentGrupo?.lines || [];
                    const pathsToSave = tempPathsRef.current || currentGrupo?.paths || [];

                    console.log("Eraser (Global): Committing. Paths:", pathsToSave.length, "Lines:", linesToSave.length);
                    addToHistory('group');
                    onUpdateTerritorio(selectedGrupoId, pathsToSave, linesToSave);
                    changed = true;
                }
                setTempLines(null);
                setTempPaths(null);

                if (tempExtraLinesRef.current && onExtraPolylinesChange) {
                    console.log("Eraser: Committing Extra Lines (Global). New count:", tempExtraLinesRef.current.length);
                    addToHistory('extra');
                    onExtraPolylinesChange(tempExtraLinesRef.current);
                    changed = true;
                }
                setTempExtraLines(null);

                if (!changed) {
                    console.log("Eraser: No changes to commit (Global).");
                }
            }
        };
        window.addEventListener('mouseup', handleGlobalMouseUp);
        return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
    }, [isErasing, onUpdateTerritorio, selectedGrupoId, grupos, onExtraPolylinesChange]);


    // Quadra Dragging Logic
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (quadraDragState && mapRef.current) {
                e.preventDefault();
                const deltaX = e.clientX - quadraDragState.startX;
                const deltaY = e.clientY - quadraDragState.startY;

                const projection = mapRef.current.getProjection();
                if (!projection) return;

                const startLatLng = new google.maps.LatLng(quadraDragState.startLat, quadraDragState.startLng);
                const worldPoint = projection.fromLatLngToPoint(startLatLng);
                if (!worldPoint) return;

                const scale = Math.pow(2, mapRef.current.getZoom() || 14);
                const newWorldPoint = new google.maps.Point(
                    worldPoint.x + (deltaX / scale),
                    worldPoint.y + (deltaY / scale)
                );
                const newLatLng = projection.fromPointToLatLng(newWorldPoint);

                if (newLatLng) {
                    setQuadraDragState(prev => prev ? ({
                        ...prev,
                        currentLat: newLatLng.lat(),
                        currentLng: newLatLng.lng(),
                        moved: Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2
                    }) : null);
                }
            }
        };

        const handleMouseUp = () => {
            if (quadraDragState) {
                if (quadraDragState.moved && onQuadraMove) {
                    onQuadraMove(selectedGrupoId, quadraDragState.id, quadraDragState.currentLat, quadraDragState.currentLng);
                } else if (!quadraDragState.moved && onQuadraToggle) {
                    onQuadraToggle(selectedGrupoId, quadraDragState.id);
                }
                setQuadraDragState(null);
            }
        };

        if (quadraDragState) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [quadraDragState, onQuadraMove, onQuadraToggle, selectedGrupoId]);

    // Eraser Logic
    const calculateErase = (cursor: google.maps.LatLng | google.maps.LatLngLiteral, lines: google.maps.LatLngLiteral[][]): google.maps.LatLngLiteral[][] => {
        if (!lines || !Array.isArray(lines)) return [];

        const newLines: google.maps.LatLngLiteral[][] = [];
        const METERS_PER_DEGREE_LAT = 111132;
        const R = eraseRadius;
        const R2 = R * R;

        try {
            const cursorLat = typeof cursor.lat === 'function' ? cursor.lat() : (cursor as google.maps.LatLngLiteral).lat;
            const cursorLng = typeof cursor.lng === 'function' ? cursor.lng() : (cursor as google.maps.LatLngLiteral).lng;

            if (isNaN(cursorLat) || isNaN(cursorLng)) return lines;

            // console.log(`[calculateErase] Cursor: (${cursorLat.toFixed(6)}, ${cursorLng.toFixed(6)}), Radius: ${R}m, Lines to check: ${lines.length}`);

            const radCosLat = Math.cos(cursorLat * Math.PI / 180);

            const toLocal = (lat: number, lng: number) => ({
                x: (lng - cursorLng) * METERS_PER_DEGREE_LAT * radCosLat,
                y: (lat - cursorLat) * METERS_PER_DEGREE_LAT
            });

            const toLatLngLiteral = (x: number, y: number): google.maps.LatLngLiteral => ({
                lat: cursorLat + (y / METERS_PER_DEGREE_LAT),
                lng: cursorLng + (x / (METERS_PER_DEGREE_LAT * radCosLat))
            });

            let totalErased = 0;
            let totalSegments = 0;

            lines.forEach((line) => {
                if (!line || line.length < 2) return;

                const segments: google.maps.LatLngLiteral[][] = [];
                let currentPath: google.maps.LatLngLiteral[] = [];

                for (let i = 0; i < line.length - 1; i++) {
                    const p1 = line[i];
                    const p2 = line[i + 1];
                    const A = toLocal(p1.lat, p1.lng);
                    const B = toLocal(p2.lat, p2.lng);

                    const AInside = (A.x * A.x + A.y * A.y) <= R2;

                    // Start path if empty and p1 is outside
                    if (currentPath.length === 0 && !AInside) {
                        currentPath.push(p1);
                    }

                    const Vx = B.x - A.x;
                    const Vy = B.y - A.y;

                    const a = Vx * Vx + Vy * Vy;
                    const b = 2 * (A.x * Vx + A.y * Vy);
                    const c = (A.x * A.x + A.y * A.y) - R2;

                    const tValues: number[] = [];

                    if (Math.abs(a) > 1e-9) {
                        const delta = b * b - 4 * a * c;
                        if (delta >= 0) {
                            const sqrtDelta = Math.sqrt(delta);
                            const t1 = (-b - sqrtDelta) / (2 * a);
                            const t2 = (-b + sqrtDelta) / (2 * a);
                            if (t1 > 0.001 && t1 < 0.999) tValues.push(t1);
                            if (t2 > 0.001 && t2 < 0.999) tValues.push(t2);
                        }
                    }

                    tValues.sort((x, y) => x - y);

                    const BInside = (B.x * B.x + B.y * B.y) <= R2;

                    if (AInside || BInside) {
                        totalErased++;
                    }

                    if (tValues.length === 0) {
                        // No intersection detected by formula
                        if (AInside !== BInside) {
                            // Edge case: One inside, one outside, but no T found (precision issue or tangent)
                            // Force cut
                            if (AInside && !BInside) {
                                // Exiting circle. Start new segment at B.
                                if (currentPath.length > 0) segments.push(currentPath);
                                currentPath = [p2];
                            } else {
                                // Entering circle. End segment.
                                if (currentPath.length > 0) segments.push(currentPath);
                                currentPath = [];
                            }
                        } else if (AInside && BInside) {
                            // Both inside: Cut.
                            if (currentPath.length > 0) {
                                segments.push(currentPath);
                                currentPath = [];
                            }
                        } else {
                            // Both outside: Keep B.
                            currentPath.push(p2);
                        }
                    } else {
                        const points = [0, ...tValues, 1];

                        for (let k = 0; k < points.length - 1; k++) {
                            const tStart = points[k];
                            const tEnd = points[k + 1];
                            const tMid = (tStart + tEnd) / 2;

                            const midX = A.x + tMid * Vx;
                            const midY = A.y + tMid * Vy;
                            const midInside = (midX * midX + midY * midY) <= R2;

                            if (!midInside) {
                                if (k > 0) {
                                    const pX = A.x + tStart * Vx;
                                    const pY = A.y + tStart * Vy;
                                    if (currentPath.length === 0) {
                                        currentPath.push(toLatLngLiteral(pX, pY));
                                    } else {
                                        currentPath.push(toLatLngLiteral(pX, pY));
                                    }
                                }

                                if (k < points.length - 2) {
                                    const pX = A.x + tEnd * Vx;
                                    const pY = A.y + tEnd * Vy;
                                    currentPath.push(toLatLngLiteral(pX, pY));
                                } else {
                                    currentPath.push(p2);
                                }
                            } else {
                                if (currentPath.length > 0) {
                                    segments.push(currentPath);
                                    currentPath = [];
                                }
                            }
                        }
                    }
                }

                if (currentPath.length > 0) {
                    segments.push(currentPath);
                }

                const validSegments = segments.filter(s => s.length > 1);
                if (validSegments.length > 0) {
                    newLines.push(...validSegments);
                    totalSegments += validSegments.length;
                }
            });

            // console.log(`[calculateErase Result] Input: ${lines.length} lines, Output: ${newLines.length} lines, Segments hit: ${totalErased}`);
            return newLines;
        } catch (error) {
            console.error("Critical error in calculateErase:", error);
            return lines;
        }
    };


    // Helper to calculate distance between two points in meters
    const getDistance = (p1: google.maps.LatLngLiteral, p2: google.maps.LatLngLiteral) => {
        const R = 6371e3; // Earth radius in meters
        const φ1 = p1.lat * Math.PI / 180;
        const φ2 = p2.lat * Math.PI / 180;
        const Δφ = (p2.lat - p1.lat) * Math.PI / 180;
        const Δλ = (p2.lng - p1.lng) * Math.PI / 180;

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c;
    };

    // Eraser Logic (Polygon)
    const calculatePolygonErase = (cursor: google.maps.LatLng | google.maps.LatLngLiteral, paths: google.maps.LatLngLiteral[][]): google.maps.LatLngLiteral[][] => {
        if (!paths || !Array.isArray(paths)) return [];

        const cursorLat = typeof cursor.lat === 'function' ? (cursor as google.maps.LatLng).lat() : (cursor as google.maps.LatLngLiteral).lat;
        const cursorLng = typeof cursor.lng === 'function' ? (cursor as google.maps.LatLng).lng() : (cursor as google.maps.LatLngLiteral).lng;

        const METERS_PER_DEGREE_LAT = 111132;
        const R = eraseRadius;
        const R2 = R * R;
        const radCosLat = Math.cos(cursorLat * Math.PI / 180);

        // Helper: Point in Polygon (using LatLng)
        const isPointInPoly = (lat: number, lng: number, path: google.maps.LatLngLiteral[]) => {
            let inside = false;
            for (let i = 0, j = path.length - 1; i < path.length; j = i++) {
                const xi = path[i].lng, yi = path[i].lat;
                const xj = path[j].lng, yj = path[j].lat;
                const intersect = ((yi > lat) !== (yj > lat))
                    && (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi);
                if (intersect) inside = !inside;
            }
            return inside;
        };

        // Helper: Distance squared (Local XY)
        const distToSegmentSquared = (p: { x: number, y: number }, v: { x: number, y: number }, w: { x: number, y: number }) => {
            const l2 = (w.x - v.x) * (w.x - v.x) + (w.y - v.y) * (w.y - v.y);
            if (l2 === 0) return (p.x - v.x) * (p.x - v.x) + (p.y - v.y) * (p.y - v.y);
            let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
            t = Math.max(0, Math.min(1, t));
            const x = v.x + t * (w.x - v.x);
            const y = v.y + t * (w.y - v.y);
            return (p.x - x) * (p.x - x) + (p.y - y) * (p.y - y);
        };

        const cursorLocal = { x: 0, y: 0 };

        return paths.filter(path => {
            if (!path || path.length < 3) return true;

            // 1. Center inside Poly?
            if (isPointInPoly(cursorLat, cursorLng, path)) return false; // Erase

            // 2. Edges intersect Circle?
            const localPath = path.map(p => ({
                x: (p.lng - cursorLng) * METERS_PER_DEGREE_LAT * radCosLat,
                y: (p.lat - cursorLat) * METERS_PER_DEGREE_LAT
            }));

            for (let i = 0; i < localPath.length; i++) {
                const p1 = localPath[i];
                const p2 = localPath[(i + 1) % localPath.length];
                if (distToSegmentSquared(cursorLocal, p1, p2) <= R2) return false; // Erase
            }
            return true; // Keep
        });
    };

    const handleEraserStart = React.useCallback((e: google.maps.MapMouseEvent) => {
        console.log("Eraser: Mouse Down", e.latLng?.toString());
        try {
            setIsErasing(true);

            if (e.latLng) {
                const startPos = { lat: e.latLng.lat(), lng: e.latLng.lng() };
                setEraserCursor(startPos);
                lastEraserPos.current = startPos;

                // Process initial click on group lines AND polygons
                if (selectedGrupoId && onUpdateTerritorio) {
                    const currentGrupo = grupos?.find(g => g.id === selectedGrupoId);

                    // Lines
                    const initialLines = currentGrupo?.lines || [];
                    const erasedLines = calculateErase(e.latLng, initialLines);
                    setTempLines(erasedLines);

                    // Polygons
                    const initialPaths = currentGrupo?.paths || [];
                    const erasedPaths = calculatePolygonErase(e.latLng, initialPaths);
                    setTempPaths(erasedPaths);
                }

                // Process initial click on extra lines
                if (extraPolylines && extraPolylines.length > 0) {
                    const initialExtra = extraPolylines;
                    const erased = calculateErase(e.latLng, initialExtra);
                    setTempExtraLines(erased);
                }
            }
        } catch (error) {
            console.error("Error in handleEraserStart:", error);
            setIsErasing(false);
        }
    }, [selectedGrupoId, grupos, onUpdateTerritorio, extraPolylines, eraseRadius]);

    const handleEraserMove = React.useCallback((e: google.maps.MapMouseEvent) => {
        try {
            if (!e.latLng) return;

            const currentPos = { lat: e.latLng.lat(), lng: e.latLng.lng() };
            setEraserCursor(currentPos);

            if (!isErasing) return;

            // Interpolation for smooth erasing
            const pointsToProcess = [currentPos];
            if (lastEraserPos.current) {
                const dist = getDistance(lastEraserPos.current, currentPos);
                if (dist > eraseRadius * 0.25) {
                    const steps = Math.ceil(dist / (eraseRadius * 0.25));
                    for (let i = 1; i < steps; i++) {
                        const fraction = i / steps;
                        pointsToProcess.unshift({
                            lat: lastEraserPos.current.lat + (currentPos.lat - lastEraserPos.current.lat) * fraction,
                            lng: lastEraserPos.current.lng + (currentPos.lng - lastEraserPos.current.lng) * fraction
                        });
                    }
                }
            }
            lastEraserPos.current = currentPos;

            if (selectedGrupoId && onUpdateTerritorio) {
                // Lines
                setTempLines(prevLines => {
                    let linesToProcess = prevLines || grupos?.find(g => g.id === selectedGrupoId)?.lines || [];
                    pointsToProcess.forEach(point => {
                        linesToProcess = calculateErase(point, linesToProcess);
                    });
                    return linesToProcess;
                });

                // Polygons (Paths)
                setTempPaths(prevPaths => {
                    let pathsToProcess = prevPaths || grupos?.find(g => g.id === selectedGrupoId)?.paths || [];
                    pointsToProcess.forEach(point => {
                        pathsToProcess = calculatePolygonErase(point, pathsToProcess);
                    });
                    return pathsToProcess;
                });
            }

            if (extraPolylines && extraPolylines.length > 0) {
                setTempExtraLines(prevLines => {
                    let linesToProcess = prevLines || extraPolylines || [];
                    pointsToProcess.forEach(point => {
                        linesToProcess = calculateErase(point, linesToProcess);
                    });
                    return linesToProcess;
                });
            }
        } catch (error) {
            console.error("Error in handleEraserMove:", error);
        }
    }, [selectedGrupoId, grupos, onUpdateTerritorio, extraPolylines, eraseRadius, isErasing]);

    const handleEraserEnd = React.useCallback(() => {
        console.log("Eraser: Mouse Up / End");
        setIsErasing(false);

        let changed = false;

        const currentTempLines = tempLinesRef.current;
        const currentTempExtraLines = tempExtraLinesRef.current;
        const currentTempPaths = tempPathsRef.current;

        const currentGrupo = grupos.find(g => g.id === selectedGrupoId);

        if (onUpdateTerritorio && selectedGrupoId) {
            if (currentTempLines || currentTempPaths) {
                addToHistory('group');
                const finalPaths = currentTempPaths || currentGrupo?.paths || [];
                const finalLines = currentTempLines || currentGrupo?.lines || [];
                console.log("Eraser End: Updating Group. Lines:", finalLines.length, "Paths:", finalPaths.length);
                onUpdateTerritorio(selectedGrupoId, finalPaths, finalLines);
                changed = true;
            }
        }
        setTempLines(null);
        setTempPaths(null);

        if (currentTempExtraLines && onExtraPolylinesChange) {
            addToHistory('extra');
            onExtraPolylinesChange(currentTempExtraLines);
            changed = true;
        }
        setTempExtraLines(null);

        if (!changed) {
            console.log("Eraser: No changes to commit.");
        }
    }, [selectedGrupoId, grupos, onUpdateTerritorio, onExtraPolylinesChange]);

    // Register eraser listeners when map is ready and drawing mode changes
    useEffect(() => {
        if (!mapRef.current || drawingMode !== 'eraser') {
            // Clean up old listeners if switching away from eraser
            if (drawingMode !== 'eraser') {
                mapListenersRef.current.forEach(l => l.remove());
                mapListenersRef.current = [];
            }
            return;
        }

        try {
            // Clean up previous listeners
            mapListenersRef.current.forEach(l => l.remove());
            mapListenersRef.current = [];

            const down = mapRef.current.addListener('mousedown', (e: google.maps.MapMouseEvent) => {
                handleEraserStart(e);
            });
            const move = mapRef.current.addListener('mousemove', (e: google.maps.MapMouseEvent) => {
                handleEraserMove(e);
            });
            const up = mapRef.current.addListener('mouseup', () => {
                handleEraserEnd();
            });

            mapListenersRef.current.push(down, move, up);
            console.log('Eraser listeners registered');
        } catch (err) {
            console.warn('Erro ao registrar listeners do mapa:', err);
        }
    }, [drawingMode, handleEraserStart, handleEraserMove, handleEraserEnd]); // Added handlers to deps

    // Handlers para Mão Livre (Freehand)
    const handleFreehandStart = (e: google.maps.MapMouseEvent) => {
        if (!isFreehand || !e.latLng) return;
        setIsDrawingFreehand(true);
        setFreehandPath([{ lat: e.latLng.lat(), lng: e.latLng.lng() }]);
    };

    const handleFreehandMove = (e: google.maps.MapMouseEvent) => {
        if (!isFreehand || !isDrawingFreehand || !e.latLng) return;
        setFreehandPath(prev => [...prev, { lat: e.latLng!.lat(), lng: e.latLng!.lng() }]);
    };

    const snapPathToRoad = async (path: google.maps.LatLngLiteral[]) => {
        if (path.length < 2) return path;

        // Limita o número de pontos para amostragem para evitar sobrecarga da API e limites
        // A API de Directions aceita até 25 waypoints (incluindo origem e destino)
        // Vamos pegar amostras do caminho desenhado
        const maxWaypoints = 23;
        const step = Math.ceil((path.length - 2) / maxWaypoints);

        const waypoints: google.maps.DirectionsWaypoint[] = [];

        // Se o desenho for muito curto, talvez não precise de muitos waypoints
        // Se for longo, pegamos pontos equidistantes
        if (path.length > 2) {
            for (let i = 1; i < path.length - 1; i += (step < 1 ? 1 : step)) {
                if (waypoints.length < maxWaypoints) {
                    waypoints.push({
                        location: path[i],
                        stopover: false
                    });
                }
            }
        }

        try {
            const directionsService = new google.maps.DirectionsService();
            const result = await directionsService.route({
                origin: path[0],
                destination: path[path.length - 1],
                waypoints: waypoints,
                travelMode: google.maps.TravelMode.WALKING,
            });

            if (result.routes && result.routes[0] && result.routes[0].overview_path) {
                return result.routes[0].overview_path.map(p => ({ lat: p.lat(), lng: p.lng() }));
            }
        } catch (e) {
            console.error("Erro ao ajustar à rua:", e);
        }
        return path;
    };

    const handleFreehandEnd = async () => {
        if (!isFreehand || !isDrawingFreehand) return;
        setIsDrawingFreehand(false);

        // Salva o caminho desenhado
        if (freehandPath.length > 1) {
            let finalPath = freehandPath;

            if (isSnapToRoadEnabled) {
                setIsProcessingSnap(true);
                finalPath = await snapPathToRoad(freehandPath);
                setIsProcessingSnap(false);
            }

            if (onCustomPolylineComplete) {
                addToHistory('extra');
                onCustomPolylineComplete(finalPath);
            } else if (onUpdateTerritorio) {
                addToHistory('group');
                const currentGrupo = grupos.find(g => g.id === selectedGrupoId);
                const currentPaths = currentGrupo?.paths || [];
                const currentLines = currentGrupo?.lines || [];
                onUpdateTerritorio(selectedGrupoId, currentPaths, [...currentLines, finalPath]);
            }
        }

        setFreehandPath([]);
    };

    const onPolygonComplete = (polygon: google.maps.Polygon) => {
        const newPath = polygon.getPath().getArray().map(latLng => ({
            lat: latLng.lat(),
            lng: latLng.lng()
        }));

        if (onUpdateTerritorio) {
            addToHistory('group');
            const currentGrupo = grupos.find(g => g.id === selectedGrupoId);
            const currentPaths = currentGrupo?.paths || [];
            const currentLines = currentGrupo?.lines || [];
            onUpdateTerritorio(selectedGrupoId, [...currentPaths, newPath], currentLines);
        }

        // Remove o polígono desenhado pelo DrawingManager pois ele será renderizado via props
        polygon.setMap(null);
        setDrawingMode(null);
    };

    const onPolylineComplete = (polyline: google.maps.Polyline) => {
        const newPath = polyline.getPath().getArray().map(latLng => ({
            lat: latLng.lat(),
            lng: latLng.lng()
        }));

        console.log('[onPolylineComplete] Drawn path:', {
            points: newPath.length,
            start: newPath[0],
            end: newPath[newPath.length - 1],
            center: center
        });

        if (onCustomPolylineComplete) {
            addToHistory('extra');
            onCustomPolylineComplete(newPath);
            // Remover após um pequeno delay para garantir que o state foi atualizado
            setTimeout(() => {
                polyline.setMap(null);
            }, 100);
            setDrawingMode(null);
            return;
        }

        if (onUpdateTerritorio) {
            addToHistory('group');
            const currentGrupo = grupos.find(g => g.id === selectedGrupoId);
            const currentPaths = currentGrupo?.paths || [];
            const currentLines = currentGrupo?.lines || [];
            onUpdateTerritorio(selectedGrupoId, currentPaths, [...currentLines, newPath]);
        }

        polyline.setMap(null);
        setDrawingMode(null);
    };

    const onPolygonEdit = (grupoId: string, index: number) => {
        const polygon = polygonRefs.current[`${grupoId}-${index}`];
        if (polygon && onUpdateTerritorio) {
            addToHistory('group');
            const newPath = polygon.getPath().getArray().map(latLng => ({
                lat: latLng.lat(),
                lng: latLng.lng()
            }));

            const currentGrupo = grupos.find(g => g.id === grupoId);
            if (currentGrupo && currentGrupo.paths) {
                const newPaths = [...currentGrupo.paths];
                newPaths[index] = newPath;
                onUpdateTerritorio(grupoId, newPaths, currentGrupo.lines);
            }
        }
    };

    const onPolylineEdit = (grupoId: string, index: number) => {
        const polyline = polylineRefs.current[`${grupoId}-${index}`];
        if (polyline && onUpdateTerritorio) {
            addToHistory('group');
            const newPath = polyline.getPath().getArray().map(latLng => ({
                lat: latLng.lat(),
                lng: latLng.lng()
            }));

            const currentGrupo = grupos.find(g => g.id === grupoId);
            if (currentGrupo && currentGrupo.lines) {
                const newLines = [...currentGrupo.lines];
                newLines[index] = newPath;
                onUpdateTerritorio(grupoId, currentGrupo.paths || [], newLines);
            }
        }
    };

    const onLoadPolygon = (polygon: google.maps.Polygon, grupoId: string, index: number) => {
        polygonRefs.current[`${grupoId}-${index}`] = polygon;
    };

    const onLoadPolyline = (polyline: google.maps.Polyline, grupoId: string, index: number) => {
        polylineRefs.current[`${grupoId}-${index}`] = polyline;
    };

    // Modifica as opções do mapa quando estiver em modo Mão Livre ou Borracha
    const currentMapOptions: google.maps.MapOptions = {
        ...mapOptions,
        draggable: !isFreehand && drawingMode !== 'eraser', // Desabilita arrastar o mapa quando estiver desenhando ou apagando
        clickableIcons: !isFreehand && drawingMode !== 'eraser',
        disableDoubleClickZoom: isFreehand || drawingMode === 'eraser',
        gestureHandling: (isFreehand || drawingMode === 'eraser') ? 'none' : 'auto'
    };

    return (
        <div className={isFullScreen ? "" : "position-relative"} style={isFullScreen ? { position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 9999, backgroundColor: 'white' } : undefined}>
            {/* Controles de Edição - Apenas se não for readOnly */}
            {!readOnly && (
                <div
                    className="card shadow-sm no-print"
                    style={{
                        position: 'absolute',
                        left: panelPosition.x,
                        top: panelPosition.y,
                        zIndex: 10,
                        maxWidth: '300px',
                        cursor: isDragging ? 'grabbing' : 'auto'
                    }}
                >
                    <div
                        className="d-flex justify-content-between align-items-center p-2 border-bottom bg-light rounded-top"
                        style={{ cursor: 'grab' }}
                        onMouseDown={handleMouseDown}
                    >
                        <h6 className="mb-0 user-select-none ps-2" style={{ fontSize: '0.9rem' }}>{onCustomPolylineComplete ? 'Ferramentas' : 'Editar Território'}</h6>
                        <div className="d-flex align-items-center">
                            <button
                                className="btn btn-sm btn-link text-secondary p-0 me-2"
                                onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }}
                                title={isMinimized ? "Expandir" : "Minimizar"}
                                onMouseDown={(e) => e.stopPropagation()}
                            >
                                {isMinimized ? <FaPlus size={12} /> : <FaMinus size={12} />}
                            </button>
                            <button
                                className={`btn btn-sm ${isFullScreen ? 'btn-danger' : 'btn-outline-secondary'} py-0 px-2`}
                                onClick={(e) => { e.stopPropagation(); setIsFullScreen(!isFullScreen); }}
                                title={isFullScreen ? "Sair da Tela Cheia" : "Tela Cheia"}
                                onMouseDown={(e) => e.stopPropagation()}
                                style={{ fontSize: '0.8rem', height: '24px' }}
                            >
                                {isFullScreen ? <FaCompress /> : <FaExpand />}
                            </button>
                        </div>
                    </div>

                    {!isMinimized && (
                        <div className="p-3">
                            {!onCustomPolylineComplete && (
                                <div className="mb-3">
                                    <label className="form-label small">Selecione o Grupo:</label>
                                    <select
                                        className="form-select form-select-sm"
                                        value={selectedGrupoId}
                                        onChange={(e) => setSelectedGrupoId(e.target.value)}
                                        disabled={!!editingGrupoId}
                                    >
                                        {grupos.map(g => (
                                            <option key={g.id} value={g.id}>{g.nome}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div className="d-grid gap-2">
                                {/* Undo/Redo Controls */}
                                <div className="btn-group btn-group-sm mb-1">
                                    <button
                                        className="btn btn-outline-secondary"
                                        onClick={handleUndo}
                                        disabled={history.length === 0}
                                        title="Desfazer (Ctrl+Z)"
                                    >
                                        <FaUndo />
                                    </button>
                                    <button
                                        className="btn btn-outline-secondary"
                                        onClick={handleRedo}
                                        disabled={redoStack.length === 0}
                                        title="Refazer (Ctrl+Y)"
                                    >
                                        <FaRedo />
                                    </button>
                                </div>

                                {!onCustomPolylineComplete && (
                                    <>
                                        <button
                                            className={`btn btn-sm ${drawingMode === 'polygon' ? 'btn-primary' : 'btn-outline-primary'}`}
                                            onClick={() => setDrawingMode(drawingMode === 'polygon' ? null : google.maps.drawing.OverlayType.POLYGON)}
                                        >
                                            <FaDrawPolygon className="me-2" />
                                            {drawingMode === 'polygon' ? 'Cancelar' : 'Área (Polígono)'}
                                        </button>

                                        <div className="btn-group btn-group-sm">
                                            <button
                                                className="btn btn-outline-danger"
                                                onClick={handleClearPolygons}
                                                title="Apagar áreas"
                                            >
                                                <FaTrash /> Áreas
                                            </button>
                                            <button
                                                className="btn btn-outline-danger"
                                                onClick={handleClearLines}
                                                title="Apagar linhas"
                                            >
                                                <FaTrash /> Linhas
                                            </button>
                                        </div>
                                        <hr className="my-1" />
                                    </>
                                )}

                                {/* Eraser Button */}
                                <div className="d-flex align-items-center">
                                    <button
                                        className={`btn btn-sm ${(drawingMode as any) === 'eraser' ? 'btn-danger' : 'btn-outline-danger'} flex-grow-1`}
                                        onClick={() => {
                                            if ((drawingMode as any) === 'eraser') {
                                                setDrawingMode(null);
                                            } else {
                                                setDrawingMode('eraser' as any); // Cast because not in OverlayType enum
                                                setIsFreehand(false);
                                            }
                                        }}
                                        title="Borracha: Clique e arraste para apagar linhas (estilo Paint)"
                                    >
                                        <FaTrash className="me-2" />
                                        {(drawingMode as any) === 'eraser' ? 'Cancelar' : 'Borracha'}
                                    </button>
                                    {(drawingMode as any) === 'eraser' && (
                                        <div className="btn-group btn-group-sm ms-1">
                                            <button
                                                className="btn btn-secondary px-1"
                                                onClick={() => setEraseRadius(prev => Math.max(5, prev - 5))}
                                                title="Diminuir Borracha"
                                            >
                                                <FaMinus size={10} />
                                            </button>
                                            <span className="btn btn-light px-1 border disabled" style={{ minWidth: '35px', fontSize: '0.75rem' }}>
                                                {eraseRadius}m
                                            </span>
                                            <button
                                                className="btn btn-secondary px-1"
                                                onClick={() => setEraseRadius(prev => Math.min(500, prev + 5))}
                                                title="Aumentar Borracha"
                                            >
                                                <FaPlus size={10} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <hr className="my-1" />

                                {onCustomPolylineComplete && (
                                    <>
                                        <button
                                            className={`btn btn-sm ${drawingMode === 'polyline' ? 'btn-primary' : 'btn-outline-primary'} w-100`}
                                            onClick={() => setDrawingMode(drawingMode === 'polyline' ? null : google.maps.drawing.OverlayType.POLYLINE)}
                                            title="Desenhar linha reta"
                                        >
                                            <FaMagic className="me-2" />
                                            {drawingMode === 'polyline' ? 'Cancelar Linha' : 'Desenhar Linha'}
                                        </button>
                                        <hr className="my-1" />
                                    </>
                                )}

                                <button
                                    className={`btn btn-sm ${drawingMode === 'polyline' || isFreehand ? 'btn-primary' : 'btn-outline-primary'}`}
                                    onClick={() => {
                                        if (isFreehand) {
                                            setIsFreehand(false);
                                            setDrawingMode(null);
                                        } else {
                                            setIsFreehand(true);
                                            setDrawingMode(null); // Desabilita DrawingManager
                                        }
                                    }}
                                >
                                    <FaPencilAlt className="me-2" />
                                    {isFreehand ? 'Cancelar' : 'Mão Livre (Rua)'}
                                </button>

                                {isFreehand && (
                                    <button
                                        className={`btn btn-sm ${isSnapToRoadEnabled ? 'btn-success' : 'btn-outline-secondary'}`}
                                        onClick={() => setIsSnapToRoadEnabled(!isSnapToRoadEnabled)}
                                        title="Ajustar automaticamente o desenho às ruas (Snap to Road)"
                                    >
                                        <FaMagic className="me-2" />
                                        {isSnapToRoadEnabled ? 'Ajustar: Ligado' : 'Ajustar: Desligado'}
                                    </button>
                                )}

                                {isProcessingSnap && (
                                    <div className="text-center small text-primary">
                                        <div className="spinner-border spinner-border-sm me-1" role="status"></div>
                                        Ajustando à rua...
                                    </div>
                                )}

                                <small className="text-muted text-center" style={{ fontSize: '0.75rem' }}>
                                    Arraste o topo para mover.
                                </small>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Se for ReadOnly, mostrar apenas o botão de FullScreen no canto */}
            {readOnly && (
                <div className="position-absolute top-0 end-0 m-3" style={{ zIndex: 10000 }}>
                    <button
                        className="btn btn-light shadow-sm"
                        onClick={() => setIsFullScreen(!isFullScreen)}
                        title={isFullScreen ? "Sair da Tela Cheia" : "Tela Cheia"}
                    >
                        {isFullScreen ? <FaCompress /> : <FaExpand />}
                    </button>
                </div>
            )}

            <GoogleMap
                mapContainerStyle={{
                    ...(isFullScreen ? fullScreenMapContainerStyle : defaultMapContainerStyle),
                    cursor: (drawingMode as any) === 'eraser' ? 'none' : 'default'
                }}
                center={center}
                zoom={14}
                options={currentMapOptions}
                onMouseDown={isFreehand ? handleFreehandStart : undefined}
                onMouseMove={isFreehand ? handleFreehandMove : undefined}
                onMouseUp={isFreehand ? handleFreehandEnd : undefined}
                onLoad={onLoad}
                onUnmount={onUnmount}
            >
                {!readOnly && !isFreehand && (
                    <DrawingManager
                        drawingMode={drawingMode === 'eraser' ? null : (drawingMode as google.maps.drawing.OverlayType | null)}
                        options={{
                            drawingControl: false,
                            polygonOptions: {
                                fillColor: grupos.find(g => g.id === selectedGrupoId)?.cor || '#000000',
                                fillOpacity: 0.1,
                                strokeColor: grupos.find(g => g.id === selectedGrupoId)?.cor || '#000000',
                                strokeWeight: 3,
                                clickable: true,
                                editable: true,
                                zIndex: 1
                            },
                            polylineOptions: {
                                strokeColor: onCustomPolylineComplete ? '#FF0000' : (grupos.find(g => g.id === selectedGrupoId)?.cor || '#000000'),
                                strokeWeight: 4,
                                clickable: true,
                                editable: true,
                                zIndex: 1
                            }
                        }}
                        onPolygonComplete={onPolygonComplete}
                        onPolylineComplete={onPolylineComplete}
                    />
                )}

                {/* Desenho atual do Freehand */}
                {isFreehand && freehandPath.length > 0 && (
                    <Polyline
                        path={freehandPath}
                        options={{
                            strokeColor: '#FF0000',
                            strokeOpacity: 0.8,
                            strokeWeight: 4,
                            clickable: false,
                            draggable: false,
                            editable: false,
                            zIndex: 100
                        }}
                    />
                )}

                {/* Eraser Cursor */}
                {(drawingMode as any) === 'eraser' && eraserCursor && (
                    <Circle
                        center={eraserCursor}
                        radius={eraseRadius}
                        options={{
                            strokeColor: '#FF0000',
                            strokeOpacity: 0.8,
                            strokeWeight: 2,
                            fillColor: '#FFFFFF',
                            fillOpacity: 0.3,
                            clickable: false,
                            draggable: false,
                            editable: false,
                            zIndex: 1000
                        }}
                    />
                )}

                {!hideExistingTerritories && grupos.map((grupo) => {
                    const isEditable = !readOnly && (!editingGrupoId || editingGrupoId === grupo.id);

                    return (
                        <React.Fragment key={grupo.id}>
                            {((grupo.id === selectedGrupoId && tempPaths) ? tempPaths : (grupo.paths || []))?.map((path, index) => (
                                <Polygon
                                    key={`poly-${grupo.id}-${index}`}
                                    onLoad={(p) => onLoadPolygon(p, grupo.id, index)}
                                    paths={path}
                                    options={{
                                        fillColor: (drawingMode as any) === 'eraser' ? '#ff0000' : grupo.cor,
                                        fillOpacity: 0,
                                        strokeColor: grupo.cor,
                                        strokeOpacity: 1,
                                        strokeWeight: 3,
                                        editable: isEditable && (drawingMode as any) !== 'eraser',
                                        draggable: false,
                                        clickable: isEditable && (drawingMode as any) !== 'eraser'
                                    }}
                                    onMouseUp={() => isEditable && (drawingMode as any) !== 'eraser' && onPolygonEdit(grupo.id, index)}
                                    onDragEnd={() => isEditable && (drawingMode as any) !== 'eraser' && onPolygonEdit(grupo.id, index)}
                                // onClick removed for eraser mode to prevent blocking map events
                                />
                            ))}
                            {((grupo.id === selectedGrupoId && tempLines) ? tempLines : grupo.lines)?.map((line, index) => (
                                <Polyline
                                    key={`line-${grupo.id}-${index}`}
                                    onLoad={(p) => onLoadPolyline(p, grupo.id, index)}
                                    path={line}
                                    options={{
                                        strokeColor: grupo.cor,
                                        strokeOpacity: 1,
                                        strokeWeight: 4,
                                        editable: isEditable && (drawingMode as any) !== 'eraser',
                                        draggable: false,
                                        clickable: isEditable && (drawingMode as any) !== 'eraser'
                                    }}
                                    onMouseUp={() => isEditable && (drawingMode as any) !== 'eraser' && onPolylineEdit(grupo.id, index)}
                                    onDragEnd={() => isEditable && (drawingMode as any) !== 'eraser' && onPolylineEdit(grupo.id, index)}
                                />
                            ))}
                        </React.Fragment>
                    );
                })}
                {/* Render Quadras (Cards) for Selected Group */}
                {selectedGrupoId && grupos.find(g => g.id === selectedGrupoId)?.quadras?.map((q) => {
                    if (q.lat === undefined || q.lng === undefined) return null;
                    const isDragging = quadraDragState?.id === q.id;
                    const position = {
                        lat: isDragging ? quadraDragState!.currentLat : q.lat,
                        lng: isDragging ? quadraDragState!.currentLng : q.lng
                    };

                    return (
                        <OverlayView
                            key={q.id}
                            position={position}
                            mapPaneName="floatPane"
                            getPixelPositionOffset={(w, h) => ({ x: -(w / 2), y: -(h / 2) })}
                        >
                            <div
                                className={`shadow-sm rounded px-2 py-1 border ${q.status === 'trabalhada' ? 'bg-success text-white' : 'bg-white text-dark'}`}
                                style={{
                                    cursor: !readOnly ? 'grab' : 'default',
                                    fontSize: '12px',
                                    fontWeight: 'bold',
                                    whiteSpace: 'nowrap',
                                    pointerEvents: 'auto',
                                    userSelect: 'none',
                                    minWidth: '30px',
                                    textAlign: 'center',
                                    zIndex: isDragging ? 1000 : 100
                                }}
                                onMouseDown={(e) => {
                                    if (readOnly) return;
                                    e.stopPropagation();
                                    e.preventDefault();
                                    setQuadraDragState({ id: q.id, startLat: q.lat!, startLng: q.lng!, startX: e.clientX, startY: e.clientY, currentLat: q.lat!, currentLng: q.lng!, moved: false });
                                }}
                                title="Clique para alternar status, arraste para mover"
                            >
                                {q.numero}
                            </div>
                        </OverlayView>
                    );
                })}



                {(tempExtraLines || extraPolylines)?.map((line, index) => (
                    <Polyline
                        key={`extra-line-${index}`}
                        path={line}
                        options={{
                            strokeColor: '#FF0000',
                            strokeOpacity: 1,
                            strokeWeight: 4,
                            editable: false,
                            draggable: false,
                            clickable: (drawingMode as any) !== 'eraser'
                        }}
                    />
                ))}
            </GoogleMap>
        </div>
    );
};
