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
