import extend from 'extend';
import autobind from 'autobind-decorator';
import { now } from '../core/util';

const drawFuncionFactory = (optionsName, f) => {
    return (context, bodies, options) => {

        context.beginPath();
        bodies.forEach(b => f(context, b));

        context.setLineDash(options[optionsName + 'Dash']);
        context.lineWidth = options[optionsName + 'Width'];
        context.strokeStyle = options[optionsName + 'Style'];
        context.stroke();

    };
};

const drawBodyBounds = drawFuncionFactory('bounds', (context, b) => {

    // Draws the rectangle of the bounds
    const min = b.bounds.min;
    const max = b.bounds.max;
    context.moveTo(min.x, min.y);
    context.lineTo(max.x, min.y);
    context.lineTo(max.x, max.y);
    context.lineTo(min.x, max.y);
    context.lineTo(min.x, min.y);

});

const drawBodyWireframe = drawFuncionFactory('wireframe', (context, b) => {

    // Draws the path for the hull
    context.moveTo(b.vertices[0].x, b.vertices[0].y);
    b.vertices.forEach(v => context.lineTo(v.x, v.y));
    context.lineTo(b.vertices[0].x, b.vertices[0].y);

});

const drawBodyAxes = drawFuncionFactory('axes', (context, b) => {

    // Axes
    b.axes.forEach(a => {
        context.moveTo(b.position.x, b.position.y);
        context.lineTo(b.position.x + a.x * 10, b.position.y + a.y * 10);
    });

});

const drawBodyVelocities = drawFuncionFactory('velocities', (context, b) => {

    // Velocities
    if (b.velocity.x !== 0 || b.velocity.y !== 0) {
        context.moveTo(b.position.x, b.position.y);
        context.lineTo(b.position.x + b.velocity.x * 10, b.position.y + b.velocity.y * 10);
    }

});

/**
 *    HTML5 Canvas render for the physical engine.
 */
export default class Renderer {

    /**
     *    Creates a new `Renderer` attached to the given engine.
     *    @param {Engine} engine - Engine whose state should be drawn.
     *    @param {HTMLCanvasElement} canvas - Canvas to draw in.
     *    @param {object} options - Options for the renderer.
     */
    constructor(engine, canvas, options) {
        this._engine = engine;
        this._canvas = canvas;
        this._options = extend({
            background: 'transparent',

            showWireframe: true,
            wireframeWidth: 1.5,
            wireframeStyle: '#000',
            wireframeDash: [0, 0],

            showBounds: false,
            boundsWidth: 1,
            boundsStyle: 'orange',
            boundsDash: [5, 5],

            showAxes: true,
            axesWidth: 1,
            axesStyle: 'orange',
            axesDash: [0, 0],

            showVelocities: true,
            velocitiesWidth: 1.5,
            velocitiesStyle: '#06C',
            velocitiesDash: [0, 0],

            showFPS: false
        }, options);
        this._frameCount = 0;
        this._lastFrameCountReset = now();
        this._fps = -1;
    }

    /**
     *    Starts the rendering loop.
     */
    start() {
        this._context = this._canvas.getContext('2d');
        this._engine.on('update', this._onEngineUpdate);
    }

    /**
     *    Stops the rendering loop.
     */
    stop() {
        this._engine.removeListener('update', this._onEngineUpdate);
        this._context = null;
    }

    /**
     *    Callback for the event `update` of the engine.
     *    On every update we just redraw everything.
     */
    @autobind
    _onEngineUpdate() {
        const { _engine: engine, _context: context, _canvas: canvas, _options: options } = this;

        // First step: a big cleanup.
        // Draw a completely transparent background to make sure that the canvas is transparent.
        context.globalCompositeOperation = 'source-in';
        context.fillStyle = 'transparent';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.globalCompositeOperation = 'source-over';

        // If there's a non-transparent background, draw it
        if (options.background && options.background !== 'transparent') {
            context.fillStyle = options.background;
            context.fillRect(0, 0, canvas.width, canvas.height);
        }

        // Bounds
        if (options.showBounds) {
            drawBodyBounds(context, engine.bodies, options);
        }

        // Draw wireframes
        if (options.showWireframe) {
            drawBodyWireframe(context, engine.bodies, options);
        }

        // Axes
        if (options.showAxes) {
            drawBodyAxes(context, engine.bodies, options);
        }

        // Velocities
        if (options.showVelocities) {
            drawBodyVelocities(context, engine.bodies, options);
        }

        // Increment the frame counter
        this._frameCount++;
        const moment = now();
        if (moment - this._lastFrameCountReset >= 1000) {
            this._fps = this._frameCount;
            this._frameCount = 0;
            this._lastFrameCountReset = moment;
        }

        // FPS
        if (options.showFPS && this._fps > -1) {
            context.font = '24px monospace';
            context.fillStyle = 'red';
            context.fillText(this._fps, 10, 30);
        }

    }

}