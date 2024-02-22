export function normalizeCoordinates(coords) {
    const xValues = coords.map(coord => coord[0]);
    const yValues = coords.map(coord => coord[1]);
    const xMin = Math.min(...xValues);
    const xMax = Math.max(...xValues);
    const yMin = Math.min(...yValues);
    const yMax = Math.max(...yValues);

    return coords.map(([x, y]) => [
        (x - xMin) / (xMax - xMin),
        (y - yMin) / (yMax - yMin)
    ]);
}

export function toScreenCoordinates(coords, screenWidth, screenHeight, padding = 40) { 
    const drawableWidth = screenWidth - 2 * padding;
    const drawableHeight = screenHeight - 2 * padding;
    const scaleMargin = padding; 
    const normalizedCoords = normalizeCoordinates(coords);
    
    return normalizedCoords.map(([x, y]) => {
        const left = (x * (drawableWidth - 2 * scaleMargin)) + padding + scaleMargin;
        const top = (y * (drawableHeight - 2 * scaleMargin)) + padding + scaleMargin;

        return { left, top };
    });
}