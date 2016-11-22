import extend from 'extend';
import EventEmitter from 'eventemitter3';
import Vector from '../geometry/Vector';
import * as Bounds from '../geometry/Bounds';
import * as Collision from '../geometry/Collision';

/**
 *    Core physics engine of `phy6-js`.
 *    This class is responsible for integration and collision detection and response.
 *    Note that this class works only on the objects themselves:
 *    the drawing is performed by a `Renderer` and the time is kept by a `Timer`.
 */
export default class Engine extends EventEmitter {

    /**
     *    Constructs a new instance of an `Engine` with the given properties.
     *    @param {Body[]} bodies - Bodies that will take part in the simulation.
     *    @param {object} options - Options to set.
     */
    constructor(bodies, options) {
        super();
        this.bodies = bodies;
        this.options = extend({
            positionIterations: 6,
            velocityIterations: 4,
            gravity: new Vector(0, 0.001)
        }, options);
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

        const { options } = this;

        // Applies gravity to all the bodies
        for (const b of this.bodies) {
            b.force = b.force.add(options.gravity.scalar(b.mass));
        }

        // We emit the `preUpdate` event to let the user change body properties
        // before the actual update. This step is crucial to let the forces change
        // at every update.
        this.emit('preUpdate');

        // Updates all the bodies
        for (let b of this.bodies) {
            if (!b.isStatic) {
                b.update(dt);
            }
        }

        // This is the time to perform collision detection.
        // The collision detection is essentially split in two phases:
        // - Broad phase: We find a list of possibile collision candidates
        //   only based on the bounding boxes. This way we can filter out
        //   the bodies that are certainly not colliding with a test
        //   much simpler than a full SAT.
        // - Narrow phase: From the list of candidates found in the broad phase,
        //   eliminate the pairs of bodies that are not actually colliding.
        //   A full SAT will be performed for each pair here.

        // So, broad phase.
        const collisionCandidates = [];
        for (const b1 of this.bodies) {
            for (const b2 of this.bodies) {
                if (b1 !== b2 && Bounds.overlap(b1.bounds, b2.bounds)) {

                    // Do not consider static objects colliding toghether
                    if (b1.isStatic && b2.isStatic) {
                        continue;
                    }

                    // Before adding the pair, just be sure that the same pair
                    // but reversed has not already been added to the array
                    let doPush = true;
                    for (const c of collisionCandidates) {
                        if ((c[0] == b2 && c[1] == b1) || (c[0] == b1 && c[1] == b2)) {
                            doPush = false;
                            break;
                        }
                    }
                    if (doPush) {
                        collisionCandidates.push([ b1, b2 ]);
                    }

                }
            }
        }

        // And now, narrow phase.
        const collisions = [];
        for (const pair of collisionCandidates) {
            const collisionData = Collision.test(pair[0], pair[1]);
            if (collisionData.colliding) {
                collisions.push(collisionData);
            }
        }

        // Solve iteratively the collision positions
        Collision.preSolvePosition(collisions);
        for (let i = 0; i < options.positionIterations; i++) {
            Collision.solvePosition(collisions);
        }
        Collision.postSolvePosition(this.bodies);

        // Solve iteratively the collision velocities
        for (let i = 0; i < options.velocityIterations; i++) {
            Collision.solveVelocity(collisions);
        }

        // Fires the `collision` event on the colliding objects
        for (const c of collisions) {
            c.body1.emit('collision', c);
            c.body2.emit('collision', c);
        }

        // Resets the force on all the bodies
        for (const b of this.bodies) {
            b.force = new Vector(0, 0);
            b.torque = 0;
        }

        this.emit('update');

    }

}
