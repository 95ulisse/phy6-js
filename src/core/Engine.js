import EventEmitter from 'eventemitter3';

/**
 *    Core physics engine of `phy6-js`.
 *    This class is responsible for integration and collision detection and response.
 *    Note that this class works only on the objects themselves:
 *    the drawing is performed by a `Renderer` and the time is kept by a `Timer`.
 */
export default class Engine extends EventEmitter {

    /**
     *    Constructs a new instance of an `Engine` with the given properties.
     *    @param {object} options - Options to set.
     */
    constructor(options) {
        super();
        if (options && typeof options === 'object') {
            for (let k in options) {
                if (Object.prototype.hasOwnProperty.call(options, k)) {
                    this[k] = options[k];
                }
            }
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

        if (typeof dt === 'number') {
            dt = { delta: dt, lastDelta: dt };
        }

        // Updates all the bodies
        for (let b of this.bodies) {
            if (!b.isStatic) {
                b.update(dt);
            }
        }

        this.emit('update');

    }

}
