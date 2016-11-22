import Vector from './Vector';

/*
 * This module is a collection of useful algorithms to manipulate a group of vertices.
 */

/**
 *    Computes the area identified by a group of vertices.
 *    The vertices must form a convex shape.
 *    @param  {Vector[]} vertices - Vertices defining the area to compute.
 *    @param  {boolean} signed - `true` to return a signed area, `false` otherwise.
 *    @return {number} The area.
 */
export const area = (vertices, signed = false) => {

    // Algorithm taken from http://www.mathopenref.com/coordpolygonarea2.html

    if (vertices.length === 0) {
        return 0;
    }

    let area = 0;
    let j = vertices.length - 1;
    for (let i = 0; i < vertices.length; i++) {
        area += (vertices[j].x - vertices[i].x) * (vertices[j].y + vertices[i].y);
        j = i;
    }

    return (signed ? area : Math.abs(area)) / 2;

};

/**
 *    Checks whether the given set of vertices contains the given point or not.
 *    @param  {Vector[]} vertices - Vertices defining the area to test.
 *    @param  {Vector} point - Point to test for containment.
 *    @return {boolean} `true` if the given set of vertices contain the point, `false` otherwise.
 */
export const contains = (vertices, point) => {

    // Algorithm taken from:
    // https://www.ecse.rpi.edu/Homepages/wrf/Research/Short_Notes/pnpoly.html

    let i, j, c;
    c = false;

    for (i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
        if (
            ((vertices[i].y > point.y) !== (vertices[j].y > point.y)) &&
            (point.x < (vertices[j].x - vertices[i].x) * (point.y - vertices[i].y) / (vertices[j].y - vertices[i].y) + vertices[i].x)
        ) {
            c = !c;
        }
    }

    return c;

};

/**
 *    Rotates IN PLACE the given set of vertices.
 *    @param {Vector[]} vertices - Vertices to rotate.
 *    @param {number} angle - Angle (in radians) to rotate of.
 *    @param {Vector} point - Center of the rotation.
 */
export const rotate = (vertices, angle, point) => {
    if (angle === 0) {
        return;
    }

    // Precompute sin and cos
    const sin = Math.sin(angle);
    const cos = Math.cos(angle);

    for (const v of vertices) {
        const d = v.sub(point);
        v.x = point.x + (d.x * cos - d.y * sin);
        v.y = point.y + (d.x * sin + d.y * cos);
    }

};

/**
 *    Computes the centroid for the given set of vertices.
 *    @param  {Vector[]} vertices - Vertices to compute the centroid of.
 *    @param  {number} [a] - Optional precomputed SIGNED area of the vertices.
 *                           If not given, is automatically computed.
 *    @return {Vector The centroid.
 */
export const centroid = (vertices, a = area(vertices, true)) => {

    // Algorithm taken from:
    // https://en.wikipedia.org/wiki/Centroid#Centroid_of_polygon

    let center = new Vector(0, 0);

    for (let i = 0, j = 0; i < vertices.length; i++, j = (i + 1) % vertices.length) {
        const cross = vertices[i].cross(vertices[j]);
        center = vertices[i].add(vertices[j]).scalar(cross).add(center);
    }

    return center.scalar(1 / (6 * a));

};

/**
 *    Computes the inertia of a body with the given vertices and mass.
 *    @param  {Vector[]} vertices - Vertices of the body.
 *    @param  {number} mass - Mass of the body.
 *    @param  {Vector} [c] - Optional centroid of the body.
 *                           If not given, is automatically computed.
 *    @return {number} The inertia.
 */
export const inertia = (vertices, mass, c = centroid(certices)) => {

    // Taken from:
    // http://www.physicsforums.com/showthread.php?t=25293

    let numerator = 0;
    let denominator = 0;

    // The algorithm above assumes that the centroid is the origin, so translate all the vertices
    vertices = vertices.map(v => v.add(-c.x, -c.y));

    for (let i = 0, j = 0; i < vertices.length; i++, j = (i + 1) % vertices.length) {
        const cross = Math.abs(vertices[j].cross(vertices[i]));
        numerator +=
            cross * vertices[j].dot(vertices[j]) +
            vertices[j].dot(vertices[i]) +
            vertices[i].dot(vertices[i]);
        denominator += cross;
    }

    return (mass / 6) * (numerator / denominator);

};
