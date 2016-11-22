import Vector from './Vector';

/**
 *    Returns the bounds comprising the given array of vertices.
 *    @param  {Vector[]} vertices - Vertices of the body.
 *    @return {Bounds} The bounds.
 */
export const fromVertices = (vertices) => {

    // We just need to find the maximum and minimum values for both x and y
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const v of vertices) {
        if (v.x < minX) minX = v.x;
        if (v.y < minY) minY = v.y;
        if (v.x > maxX) maxX = v.x;
        if (v.y > maxY) maxY = v.y;
    }

    return {
        min: new Vector(minX, minY),
        max: new Vector(maxX, maxY)
    };

};

/**
 *    Translates the given bounds of a given vector.
 *    @param  {Bounds} bounds - Bounds to translate.
 *    @param  {Vector} delta - Translation vector.
 *    @return {Bounds} New translated bounds.
 */
export const translate = (bounds, delta) => {
    return {
        min: bounds.min.add(delta),
        max: bounds.max.add(delta)
    };
};

/**
 *    Returns a boolean value indicating whether the given bounds overlap or not.
 *    @param  {Bounds} a - First bounds.
 *    @param  {Bounds} b - Second bounds.
 *    @return {boolean} `true` if the bounds overlap, `false` otherwise.
 */
export const overlap = (a, b) => {
    return !(
        a.max.x < b.min.x || a.min.X > b.max.X ||
        a.max.y < b.min.y || a.min.y > b.max.y
    );
};
