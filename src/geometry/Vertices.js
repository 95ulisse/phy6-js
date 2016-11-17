/*
 * This module is a collection of useful algorithms to manipulate a group of vertices.
 */

/**
 *    Computes the area identified by a group of vertices.
 *    The vertices must form a convex shape.
 *    @param  {Vector[]} vertices - Vertices defining the area to compute.
 *    @return {number} The area.
 */
export const area = (vertices) => {

    // Algorithm taken from http://www.mathopenref.com/coordpolygonarea2.html

    if (vertices.length === 0) {
        return 0;
    }

    let area = 0;
    let j = vertices.length - 1;
    for (let i = 0; i < vertices.length; i++) {
        area += (vertices[j].x + vertices[i].x) * (vertices[j].y - vertices[i].y);
        j = i;
    }

    return Math.abs(area) / 2;

};
