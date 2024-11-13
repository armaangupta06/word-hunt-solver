import { mapGridToMachineCoordinates } from '../utils/coordinateMapper.js';

/**
 * Generates a path by mapping grid coordinates to machine coordinates.
 * 
 * @param {Array} positions - An array of position objects with x and y properties.
 * @returns {Array} - An array of machine coordinates.
 */
export const generatePath = (positions) => {
    return positions.map(pos => mapGridToMachineCoordinates(pos.x, pos.y));
};