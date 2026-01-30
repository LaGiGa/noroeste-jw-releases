
const calculateErase = (cursor, lines, eraseRadius = 50) => {
    if (!lines || !Array.isArray(lines)) return [];

    const newLines = [];
    const METERS_PER_DEGREE_LAT = 111132;
    const R = eraseRadius;
    const R2 = R * R;
    
    try {
        const cursorLat = cursor.lat;
        const cursorLng = cursor.lng;
        
        const radCosLat = Math.cos(cursorLat * Math.PI / 180);
        
        const toLocal = (lat, lng) => ({
            x: (lng - cursorLng) * METERS_PER_DEGREE_LAT * radCosLat,
            y: (lat - cursorLat) * METERS_PER_DEGREE_LAT
        });

        const toLatLngLiteral = (x, y) => ({
            lat: cursorLat + (y / METERS_PER_DEGREE_LAT),
            lng: cursorLng + (x / (METERS_PER_DEGREE_LAT * radCosLat))
        });

        lines.forEach(line => {
            if (!line || line.length < 2) return;

            const segments = [];
            let currentPath = [];

            for (let i = 0; i < line.length - 1; i++) {
                const p1 = line[i];
                const p2 = line[i+1];
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

                let tValues = [];

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

                // DEBUG LOGIC FOR EDGE CASES
                if (tValues.length === 0) {
                    // No intersection detected by formula
                    if (AInside !== BInside) {
                        // LOGIC ERROR OR PRECISION ISSUE: One inside, one outside, but no T found.
                        console.log(`Edge case: A(${AInside}), B(${BInside}) but no T.`);
                        if (AInside && !BInside) {
                            // Exiting circle. Start new segment at B (gap).
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
                    // Intersections found
                    const points = [0, ...tValues, 1];
                    for (let k = 0; k < points.length - 1; k++) {
                        const tStart = points[k];
                        const tEnd = points[k+1];
                        const tMid = (tStart + tEnd) / 2;
                        
                        const midX = A.x + tMid * Vx;
                        const midY = A.y + tMid * Vy;
                        const midInside = (midX * midX + midY * midY) <= R2;

                        if (!midInside) {
                            // Segment is outside
                            if (k > 0) {
                                // Start point (intersection)
                                const pX = A.x + tStart * Vx;
                                const pY = A.y + tStart * Vy;
                                if (currentPath.length === 0) {
                                    currentPath.push(toLatLngLiteral(pX, pY));
                                } else {
                                    // Verify distance to avoid spikes? 
                                    currentPath.push(toLatLngLiteral(pX, pY));
                                }
                            }
                            
                            if (k < points.length - 2) {
                                // End point (intersection)
                                const pX = A.x + tEnd * Vx;
                                const pY = A.y + tEnd * Vy;
                                currentPath.push(toLatLngLiteral(pX, pY));
                            } else {
                                // End point is p2
                                currentPath.push(p2);
                            }
                        } else {
                            // Segment is inside: Cut
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
            newLines.push(...validSegments);
        });

        return newLines;
    } catch (error) {
        console.error("Critical error in calculateErase:", error);
        return lines;
    }
};

// TEST CASE
// Line: (0,0) -> (0, 0.001) [Approx 111m]
// Circle: at (0, 0.0005) radius 20m.
// Should cut middle.

const line = [{lat: 0, lng: 0}, {lat: 0, lng: 0.001}];
const cursor = {lat: 0, lng: 0.0005};
const radius = 20;

console.log("Original Line Segments:", 1);
const result = calculateErase(cursor, [line], radius);
console.log("Result Segments:", result.length);
console.log("Result:", JSON.stringify(result, null, 2));

// Test Edge Case: Point Inside -> Point Outside
// Circle at (0,0), radius 20m.
// Line from (0,0) [inside] to (0, 0.001) [outside]
const cursor2 = {lat: 0, lng: 0};
const line2 = [{lat: 0, lng: 0}, {lat: 0, lng: 0.001}];
console.log("\nTest Edge Case (Inside->Outside):");
const result2 = calculateErase(cursor2, [line2], radius);
console.log("Result Segments:", result2.length);
console.log("Result:", JSON.stringify(result2, null, 2));
