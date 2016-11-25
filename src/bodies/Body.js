import EventEmitter from 'eventemitter3';
import extend from 'extend';
import Vector from '../geometry/Vector';
import * as Vertices from '../geometry/Vertices';
import * as Bounds from '../geometry/Bounds';

export const VERTICES = Symbol('vertices');
export const POSITION = Symbol('position');
export const ANGLE = Symbol('angle');
export const ISSTATIC = Symbol('isStatic');
export const ISSLEEPING = Symbol('isSleeping');

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
            previousPosition: new Vector(0, 0),
            velocity: new Vector(0, 0),
            force: new Vector(0, 0),
            angularVelocity: 0,
            angle: 0,
            previousAngle: 0,
            torque: 0,
            density: 0.001,
            isStatic: false,
            slop: 0.05,
            restitution: 0.5,
            friction: 0.1,
            frictionAir: 0.01
        }, options);

        // Properties must be set in order to make sure that the user can override
        // autocomputed values like area and mass
        const order = [
            'previousPosition',
            'previousAngle',
            'density',
            'position',
            'vertices',
            'velocity',
            'force',
            'isStatic',
            'angularVelocity',
            'angle',
            'torque',
            'slop',
            'restitution',
            'friction',
            'frictionAir',

            // Overrides of computed values
            'area',
            'mass',
            'inertia',
            'invMass',
            'invInertia',
            'bounds'
        ];
        for (const k of order) {
            if (typeof options[k] !== 'undefined') {
                this[k] = options[k];
            }
        }

        // A body is always awake when created
        this[ISSLEEPING] = false;

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
        this.invMass = 1 / this.mass;

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

        // Computes centroid and inertia of the body
        this.centroid = Vertices.centroid(vertices);
        this.inertia = Vertices.inertia(vertices, this.mass, this.centroid);
        this.invInertia = 1 / this.inertia;

        this[VERTICES] = vertices;
    }

    get position() {
        return this[POSITION];
    }

    set position(p) {

        // Update the position of the vertices
        const delta = p.sub(this[POSITION] || new Vector(0, 0));
        if (this[VERTICES]) {
            this[VERTICES] = this[VERTICES].map(v => v.add(delta));
        }

        // Do not change velocity
        this.previousPosition = this.previousPosition.add(delta);

        this[POSITION] = p;
    }

    get angle() {
        return this[ANGLE];
    }

    set angle(v) {
        const deltaAngle = v - (this[ANGLE] || 0);

        // Rotates the geometry of the body
        if (deltaAngle !== 0) {
            Vertices.rotate(this[VERTICES], deltaAngle, this[POSITION]);
            this.axes = this.axes.map(a => a.rotate(deltaAngle));
            this.bounds = Bounds.fromVertices(this[VERTICES]);
        }

        // Do not change angular velocity
        this.previousAngle += deltaAngle;

        this[ANGLE] = v;
    }

    get isStatic() {
        return this[ISSTATIC];
    }

    set isStatic(v) {
        this[ISSTATIC] = v;
        if (v) {
            this.mass = Infinity;
            this.invMass = 0;
        } else {
            this.mass = this.density * this.area;
            this.invMass = 1 / this.mass;
        }
    }

    get isSleeping() {
        return this[ISSLEEPING];
    }

    get shouldUpdate() {
        return !(this.isStatic || this[ISSLEEPING]);
    }

    /**
     *    Advances the physical simulation of `dt` seconds.
     *    @param {number|object} dt - Amount of time to advance the simulation.
     *    It can also be an object with properties `delta` and `lastDelta` for
     *    integration using the Time-Corrected Verlet method. If only a number is passed,
     *    `lastDelta` is assumed to be equal to `delta`.
     */
    update(dt) {

        if (!this.shouldUpdate) {
            return;
        }

        if (typeof dt === 'number') {
            dt = { delta: dt, lastDelta: dt };
        }

        const prevVelocity = this.position.sub(this.previousPosition);
        const correction1 = dt.delta / dt.lastDelta;
        const correction2 = 0.5 * dt.delta * (dt.delta + dt.lastDelta);
        const frictionAir = 1 - this.frictionAir;

        // Update the velocity using Verlet integration
        // https://en.wikipedia.org/wiki/Verlet_integration#Non-constant_time_differences
        this.velocity.x = prevVelocity.x * frictionAir * correction1 + (this.force.x / this.mass) * correction2;
        this.velocity.y = prevVelocity.y * frictionAir * correction1 + (this.force.y / this.mass) * correction2;

        // Always using Verlet, update the angle and angular velocity
        this.angularVelocity = (this.angle - this.previousAngle) * frictionAir * correction1 + (this.torque / this.inertia) * correction2;
        this.previousAngle = this.angle;
        this[ANGLE] += this.angularVelocity;

        // Updates the position of the vertices and the bounds
        this[VERTICES] = this[VERTICES].map(v => v.add(this.velocity));
        if (this.angularVelocity == 0) {
            this.bounds = Bounds.translate(this.bounds, this.velocity);
        } else {
            Vertices.rotate(this[VERTICES], this.angularVelocity, this.position);
            this.axes = this.axes.map(a => a.rotate(this.angularVelocity));
            this.bounds = Bounds.fromVertices(this[VERTICES]);
        }

        // And now position
        this.previousPosition = this.position;
        this[POSITION] = this[POSITION].add(this.velocity);

    }

}
