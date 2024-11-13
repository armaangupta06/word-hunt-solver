export const GRID_CELL_SIZE_MM = 12.5; // Each grid cell represents 12mm

/**
* Maps grid coordinates to machine coordinates.
 * @param {number} gridX - The x-coordinate in grid units.
 * @param {number} gridY - The y-coordinate in grid units.
 * @returns {Object} - The mapped coordinates in machine units.
 */
export const mapGridToMachineCoordinates = (gridX, gridY) => {
    return {
        y: gridX * GRID_CELL_SIZE_MM,
        x: gridY * GRID_CELL_SIZE_MM
    };
};
