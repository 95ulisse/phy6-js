/**
 *    Reference to the global object.
 *    @type {object}
 */
export const global = (0, eval)('this');

/**
 *    Returns the current timestamp with the highest precision available.
 *    @return {number} Current timestamp.
 */
export const now = () => {
    if (global.performance) {
        return global.performance.now();
    } else {
        return Date.now();
    }
};

/**
 * Clamps the given value to the given interval.
 * @param  {number} v - Value to clamp.
 * @param  {number} min - Minimum allowed value for `v`.
 * @param  {number} max - Maximum allowed value for `v`.
 * @return {number} The clamped value.
 */
export const clamp = (v, min, max) => {
    if (v < min) {
        return min;
    } else if (v > max) {
        return max;
    } else {
        return v;
    }
};
