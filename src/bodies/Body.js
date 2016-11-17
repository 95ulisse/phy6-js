import EventEmitter from 'eventemitter3';
import extend from 'extend';
import Vector from '../geometry/Vector';
import * as Vertices from '../geometry/Vertices';
import * as Bounds from '../geometry/Bounds';

const VERTICES = Symbol('vertices');
const POSITION = Symbol('position');
const ISSTATIC = Symbol('isStatic');

/**
 *    Body involved in a physical simulation.
 */
export default class Body extends EventEmitter {

    /**
     *    Constructs a new instance of a `Body`.
     *    @param {object} options - Object containing the properties to set on this object
     *    immediately after construction.
     */
    constructor(options) {
        super();

        options = extend({
            vertices: [],
            position: new Vector(0, 0),
            velocity: new Vector(0, 0),
            force: new Vector(0, 0),
            mass: 0,
            density: 0.001,
            area: 0,
            isStatic: false
        }, options);

        // Properties must be set in order to make sure that the user can override
        // autocomputed values like area and mass
        const order = [
            'density',
            'position',
            'vertices',
            'bounds',
            'velocity',
            'force',
            'area',
            'isStatic',
            'mass'
        ];
        for (const k of order) {
            if (typeof options[k] !== 'undefined') {
                this[k] = options[k];
            }
        }
    }

    get vertices() {
        return this[VERTICES];
    }

    set vertices(vertices) {

        // Vertices are given in input relative to the body center,
        // we want them to be in world coordinates
        vertices = vertices.map(v => v.add(this.position));

        // Compute area from the new vertices
        this.area = Vertices.area(vertices);

        // Use the new area to compute mass
        this.mass = this.density * this.area;

        // Update bounds
        this.bounds = Bounds.fromVertices(vertices);

        // We need to recalculate the collision axes for the new vertices
        const axes = vertices.map((v, i) => vertices[(i + 1) % vertices.length].sub(v).perp().normalize());

        // To reduce the number of calculations during collision detection,
        // we can remove all the axes that have the same direction.
        const map = new Map();
        for (const a of axes) {
            const dir = a.direction();
            if (!map.has(dir)) {
                map.set(dir, a);
            }
        }
        this.axes = Array.from(map.values());

        this[VERTICES] = vertices;
    }

    get position() {
        return this[POSITION];
    }

    set position(p) {

        // Update the position of the vertices
        const delta = p.sub(this[POSITION]);
        if (this[VERTICES]) {
            this[VERTICES] = this[VERTICES].map(v => v.add(delta));
        }

        // Manually reset the previous position to this one,
        // since the user changed the position manually
        this.previousPosition = p;

        this[POSITION] = p;
    }

    get isStatic() {
        return this[ISSTATIC];
    }

    set isStatic(v) {
        this[ISSTATIC] = v;
        if (v) {
            this.mass = Infinity;
        } else {
            this.mass = this.density * this.area;
        }
    }

    /**
     *    Advances the physical simulation of `dt` seconds.
     *    @param {number|object} dt - Amount of time to advance the simulation.
     *    It can also be an object with properties `delta` and `lastDelta` for
     *    integration using the Time-Corrected Verlet method. If only a number is passed,
     *    `lastDelta` is assumed to be equal to `delta`.
     */
    update(dt) {

        if (this.isStatic) {
            return;
        }

        if (typeof dt === 'number') {
            dt = { delta: dt, lastDelta: dt };
        }

        const prevVelocity = this.position.sub(this.previousPosition);
        const correction1 = dt.delta / dt.lastDelta;
        const correction2 = 0.5 * dt.delta * (dt.delta + dt.lastDelta);

        // Update the velocity using Verlet integration
        // https://en.wikipedia.org/wiki/Verlet_integration#Non-constant_time_differences
        this.velocity.x = prevVelocity.x * correction1 + (this.force.x / this.mass) * correction2;
        this.velocity.y = prevVelocity.y * correction1 + (this.force.y / this.mass) * correction2;

        // Updates the position of the vertices and the bounds
        this[VERTICES] = this[VERTICES].map(v => v.add(this.velocity));
        this.bounds = Bounds.translate(this.bounds, this.velocity);

        // And now position
        this.previousPosition = this.position;
        this[POSITION] = this[POSITION].add(this.velocity);

    }

}
