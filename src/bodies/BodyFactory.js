/**
 *    Factory functions for common bodies.
 */

import extend from 'extend';
import Body from './Body';
import Vector from '../geometry/Vector';

/**
 *    Creates a body with a rectangular shape.
 *    @param  {number} x - X coordinate of the upper left corner.
 *    @param  {number} y - Y coordinate of the upper left corner.
 *    @param  {number} width - Width of the rectangle.
 *    @param  {number} height - Height of the rectangle.
 *    @param  {object} [options] - Additional options for the body.
 *    @return {Body} The body created.
 */
export const rect = (x, y, width, height, options) => {

    const halfWidth = width / 2;
    const halfHeight = height / 2;

    return new Body(extend({
        position: new Vector(x + halfWidth, y + halfHeight),
        vertices: [
            new Vector(-halfWidth, -halfHeight),
            new Vector(halfWidth, -halfHeight),
            new Vector(halfWidth, halfHeight),
            new Vector(-halfWidth, halfHeight)
        ]
    }, options));

};

/**
 *    Creates a cage using 4 walls.
 *    @param  {number} x - X coordinate of the upper left corner.
 *    @param  {number} y - Y coordinate of the upper left corner.
 *    @param  {number} width - Width of the cage.
 *    @param  {number} height - Height of the cage.
 *    @param  {number} wallsWidth - Width of the walls.
 *    @param  {object} [options] - Additional options for the body.
 *    @return {Body[]} Array of bodies composing the cage.
 */
export const cage = (x, y, width, height, wallsWidth, options) => {

    const left = rect(x, y, wallsWidth, height, options);
    const top = rect(x, y, width, wallsWidth, options);
    const right = rect(width - wallsWidth, y, wallsWidth, height, options);
    const bottom = rect(x, height - wallsWidth, width, wallsWidth, options);

    return [ left, top, right, bottom ];

};

/**
 *    Constructs a stack of bodies.
 *    @param  {number} x - X coordinate of the upper left corner.
 *    @param  {number} y - Y coordinate of the upper left corner.
 *    @param  {number} width - Width of the stack (number of bodies).
 *    @param  {number} height - Height of the stack (number of bodies).
 *    @param  {function} bodyCreator - Factory of all the bodies of the stack.
 *            Is invoked with the X and Y coordinates of the object to create.
 *    @return {Body[]} The newly created stack of objects.
 */
export const stack = (x, y, width, height, bodyCreator) => {

    const res = [];
    
    let accumulatedWidth = 0;
    let columnWidth = -Infinity;
    for (let i = 0; i < width; i++) {

        let accumulatedHeight = 0;
        for (let j = 0; j < height; j++) {

            const body = bodyCreator(x + accumulatedWidth, y + accumulatedHeight);
            res.push(body);

            // Uses the bounds of the body to compute where the next body will be
            accumulatedHeight += body.bounds.max.y - body.bounds.min.y;
            columnWidth = Math.max(columnWidth, body.bounds.max.x - body.bounds.min.x);
        }

        accumulatedWidth += columnWidth;
    }

    return res;

};
