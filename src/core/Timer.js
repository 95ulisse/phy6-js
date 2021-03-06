import EventEmitter from 'eventemitter3';
import autobind from 'autobind-decorator';
import extend from 'extend';
import { global, now } from './util';

// Maybe the browser natively supports requestAnimationFrame
let requestAnimationFrame = global.requestAnimationFrame || global.webkitRequestAnimationFrame ||
    global.mozRequestAnimationFrame || global.msRequestAnimationFrame
let cancelAnimationFrame = global.cancelAnimationFrame || global.webkitCancelAnimationFrame ||
    global.mozCancelAnimationFrame || global.msCancelAnimationFrame

// Approximate the RAF with a setTimeout if we are out of luck
if (!requestAnimationFrame) {
    requestAnimationFrame = (cb) => setTimeout(() => cb(now()), 1000 / 60);
    cancelAnimationFrame = clearTimeout;
}

/**
 *    Main game loop.
 *    This class provides the means to control the timing of a physical simulation,
 *    so that it can be slowed down or made go faster. Fires the event `tick` when ready.
 */
export default class Timer extends EventEmitter {

    /**
     *    Creates a new `Timer` instance.
     *    @param {object} options - Options for the timer.
     */
    constructor(options) {
        super();
        this._options = extend({
            fps: 60,
            deltaSamplesCount: 60,
            isFixed: true
        }, options);

        // Compute some common options
        this._options.delta = this._options.delta || 1000 / this._options.fps;
        this._options.deltaMin = this._options.deltaMin || 1000 / this._options.fps;
        this._options.deltaMax = this._options.deltaMax || this._options.deltaMin * 2;
        this._options.fps = 1000 / this._options.delta;

        // Internal state of the timer
        this._previousTime = 0;
        this._previousDeltas = [];

    }

    /**
     *    Starts the timer.
     */
    start() {
        this._frameHandle = requestAnimationFrame(this._onTick);
    }

    /**
     *    Stops the timer.
     */
    stop() {
        cancelAnimationFrame(this._frameHandle);
        this._frameHandle = null;
    }

    @autobind
    _onTick(time) {

        const { _options: options } = this;

        let delta, lastDelta;
        if (options.isFixed) {
            // Fixed step
            delta = lastDelta = options.delta;
        } else {

            // WARNING: This is horribly experimental, and causes lots of problems.

            // Compute current delta
            delta = (time - this._previousTime) || options.delta;

            // Stores the current delta
            this._previousTime = time;
            this._previousDeltas.push(delta);
            this._previousDeltas = this._previousDeltas.slice(-options.deltaSamplesCount);

            // Use the average of the last deltas as the current delta.
            // This is a simple method to smooth the delta and to avoid
            // random lags impacting the timing too much.
            delta = this._previousDeltas.reduce((a, b) => a + b, 0) / options.deltaSamplesCount;

            // Clamp delta
            delta = Math.max(options.deltaMin, Math.min(delta, options.deltaMax));

            // Verlet time correction
            lastDelta = this._previousDeltas.length <= 1 ? delta : this._previousDeltas[this._previousDeltas.length - 2];

        }

        // Fire the event
        this.emit('tick', { delta, lastDelta });

        // Before exiting, don't forget that we want to be called again
        if (this._frameHandle !== null) {
            this._frameHandle = requestAnimationFrame(this._onTick);
        }

    }

}
