import extend from 'extend';
import EventEmitter from 'eventemitter3';
import Vector from '../geometry/Vector';
import * as Bounds from '../geometry/Bounds';
import * as Collision from '../geometry/Collision';
import { ISSLEEPING } from '../bodies/Body';

const MOTION = Symbol('motion');
const SLEEPING_COUNT = Symbol('sleepingCount');
const SLEEPING_MAX_COUNT = 60;
const SLEEPING_MAX_MOTION_FOR_SLEEP = 0.04;
const SLEEPING_MIN_MOTION_FOR_WAKEUP = 0.09;

/**
 *    Actually sets the `isSleeping` property of the given object,
 *    updating other needed properties and firing the events `sleepEnter` and `sleepExit`.
 */
const setSleeping = (body, asleep) => {

    if (body[ISSLEEPING] === asleep) {
        return;
    }

    // Updates all the needed properties
    body[ISSLEEPING] = asleep;
    if (asleep) {

        // Zeroes all the velocities
        body.previousPosition = body.position;
        body.previousAngle = body.angle;
        body.velocity = new Vector(0, 0);
        body.angularVelocity = 0;
        body[MOTION] = 0;

        body.emit('sleepEnter');

    } else {

        // Resets the sleep counter
        body[SLEEPING_COUNT] = 0;

        body.emit('sleepExit');

    }

};

/**
 *    Updates the property `isSleeping` of the given bodies.
 */
const updateSleeping = (bodies) => {
    for (const b of bodies) {

        // If a body has a force on it, it must be awake
        if (b.force.x !== 0 || b.force.y !== 0 || b.torque !== 0) {
            setSleeping(b, false);
            continue;
        }

        // Approximate value representing the total (linear and angular) motion of the body
        const motion = b.velocity.lengthSquared() + b.angularVelocity * b.angularVelocity;

        // Use an average of the previous motion and the current one.
        // The bias is to aid stability of stacks.
        if (typeof b[MOTION] === 'undefined') {
            b[MOTION] = 0;
        }
        const minMotion = Math.min(b[MOTION], motion);
        const maxMotion = Math.max(b[MOTION], motion);
        b[MOTION] = 0.9 * minMotion + 0.1 * maxMotion;

        // Puts the body asleep if has very little motion for too much time
        b[SLEEPING_COUNT] = b[SLEEPING_COUNT] || 0;
        if (b[MOTION] < SLEEPING_MAX_MOTION_FOR_SLEEP) {
            b[SLEEPING_COUNT] = Math.min(b[SLEEPING_COUNT] + 1, SLEEPING_MAX_COUNT);

            if (b[SLEEPING_COUNT] >= SLEEPING_MAX_COUNT) {
                setSleeping(b, true);
            }
        } else if (b[SLEEPING_COUNT] > 0) {
            b[SLEEPING_COUNT]--;
        }

    }
};

/**
 *    Updates the `isSleeping` property of the bodies involved in collisions.
 */
const updateSleepingCollisions = (collisions) => {
    for (const collision of collisions) {

        const { body1, body2 } = collision;

        // Both bodies are sleeping, or one of them is static:
        // do not try to wake up anyone!
        if ((body1.isSleeping && body2.isSleeping) || body1.isStatic || body2.isStatic) {
            continue;
        }

        // We are try to wake up someone before collision solving, so, who can we wake up?
        // One of the two bodies is awake and is colliding with the other (which is asleep),
        // so we check if the motion of the awake body is above the threshold, and wake up
        // the other body.
        const awakeBody = body1.isSleeping ? body2 : body1;
        const asleepBody = body1.isSleeping ? body1 : body2;
        const awakeBodyMotion = awakeBody.velocity.lengthSquared() + awakeBody.angularVelocity * awakeBody.angularVelocity;
        if (awakeBodyMotion > SLEEPING_MIN_MOTION_FOR_WAKEUP) {
            setSleeping(asleepBody, false);
        }

    }
};

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
            gravity: new Vector(0, 0.001),
            enableSleeping: true
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

        // We emit the `preUpdate` event to let the user change body properties
        // before the actual update. This step is crucial to let the forces change
        // at every update.
        this.emit('preUpdate');

        // Updates the sleeping status of the bodies
        if (options.enableSleeping) {
            updateSleeping(this.bodies);
        }

        // Applies gravity to all the bodies
        for (const b of this.bodies) {
            b.force = b.force.add(options.gravity.scalar(b.mass));
        }

        // Updates all the bodies
        for (let b of this.bodies) {
            if (b.shouldUpdate) {
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

                    // Do not consider static or sleeping objects colliding toghether
                    if (!b1.shouldUpdate && !b2.shouldUpdate) {
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

        // Updates the sleeping status of the bodies involved in collisions
        if (options.enableSleeping) {
            updateSleepingCollisions(collisions);
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

        this.emit('update', collisions);

    }

}
