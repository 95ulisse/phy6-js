import EventEmitter from 'eventemitter3';
import extend from 'extend';
import Vector from './Vector';

const VERTICES = Symbol('vertices');
const POSITION = Symbol('position');

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

        options = extend(true, {
            vertices: [],
            position: new Vector(0, 0),
            velocity: new Vector(0, 0),
            force: new Vector(0, 0),
            mass: 1,
            isStatic: false
        }, options);

        for (let k in options) {
            if (Object.prototype.hasOwnProperty.call(options, k)) {
                this[k] = options[k];
            }
        }
    }

    get vertices() {
        return this[VERTICES];
    }

    set vertices(vertices) {
        this[VERTICES] = vertices;

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

    }

    get position() {
        return this[POSITION];
    }

    set position(p) {
        this[POSITION] = p;
        this.previousPosition = p;
    }

    /**
     *    Advances the physical simulation of `dt` seconds.
     *    @param {number|object} dt - Amount of time to advance the simulation.
     *    It can also be an object with properties `delta` and `lastDelta` for
     *    integration using the Time-Corrected Verlet method. If only a number is passed,
     *    `lastDelta` is assumed to be equal to `delta`.
     */
    update(dt) {

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

        // And now position
        this.previousPosition = this.position;
        this[POSITION] = this[POSITION].add(this.velocity);

    }

}
