import extend from 'extend';
import autobind from 'autobind-decorator';

const drawBodyWireframe = (context, bodies, options) => {

    // For each of the bodies, draw a path passing through all the vertices
    context.beginPath();
    bodies.forEach(b => {

        // All the coordinates of the vertices are relative to the body's center
        context.translate(b.position.x, b.position.y);

        // Draws the path for the hull
        context.moveTo(b.vertices[0].x, b.vertices[0].y);
        b.vertices.forEach(v => context.lineTo(v.x, v.y));
        context.lineTo(b.vertices[0].x, b.vertices[0].y);

        // Restore the state of the graphics context
        context.translate(-b.position.x, -b.position.y);

    });
    context.closePath();

    // Style for the lines
    context.lineWidth = options.strokeWidth;
    context.strokeStyle = options.strokeStyle;
    context.stroke();

};

const drawBodyAxes = (context, bodies, options) => {

    context.beginPath();
    bodies.forEach(b => {

        // All the coordinates of the vertices are relative to the body's center
        context.translate(b.position.x, b.position.y);

        // Axes
        b.axes.forEach(a => {
            context.moveTo(0, 0);
            context.lineTo(a.x * 20, a.y * 20);
        });

        // Restore the state of the graphics context
        context.translate(-b.position.x, -b.position.y);

    });
    context.closePath();

    // Style for the lines
    context.lineWidth = options.axesWidth;
    context.strokeStyle = options.axesStyle;
    context.stroke();

};

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
            strokeWidth: 1,
            strokeStyle: '#000',
            axesWidth: 1,
            axesStyle: 'orange',
            wireframe: true,
            showAxes: true
        }, options);
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

        // Draw wireframes
        if (options.wireframe) {
            drawBodyWireframe(context, engine.bodies, options);
        }

        // Axes
        if (options.showAxes) {
            drawBodyAxes(context, engine.bodies, options);
        }

    }

}
