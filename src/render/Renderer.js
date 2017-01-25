import extend from 'extend';
import { now } from '../core/util';

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
            visible: true,

            showSleeping: false,
            sleepingWidth: 1.5,
            sleepingStyle: '#eee',
            sleepingDash: [5, 5],

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

            showCollisions: false,
            collisionsWidth: 1,
            collisionsStyle: '#000',
            collisionsDash: [0, 0],
            collisionsFill: '#9975B9',

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
        this._engine.on('update', this.render.bind(this));
    }

    /**
     *    Stops the rendering loop.
     */
    stop() {
        this._engine.removeListener('update', this.render.bind(this));
        this._context = null;
    }

    /**
     *    Redraws the current state of the engine.
     */
    render(collisions) {
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

        const getOption = (body, name) => {
            if (body.render) {
                return typeof body.render[name] === 'undefined' ? options[name] : body.render[name];
            } else {
                return options[name];
            }
        };

        const fillOrStroke = (b, name, fill) => {
            if (fill) {
                context.fillStyle = getOption(b, name + 'Fill');
                context.fill();
            }

            context.setLineDash(getOption(b, name + 'Dash'));
            context.lineWidth = getOption(b, name + 'Width');
            context.strokeStyle = getOption(b, name + 'Style');
            context.stroke();
        };

        // Cycle through all the bodies
        for (const b of engine.bodies) {

            // If the body is invisible, skip it
            if (!getOption(b, 'visible')) {
                continue;
            }

            // Fill the body with a pattern, or just draw the wireframe
            if (getOption(b, 'showWireframe') || getOption(b, 'pattern')) {

                // Draws the path of the hull
                context.beginPath();
                context.moveTo(b.vertices[0].x, b.vertices[0].y);
                b.vertices.forEach(v => context.lineTo(v.x, v.y));
                context.lineTo(b.vertices[0].x, b.vertices[0].y);

                // Fill the path with the pattern, first
                const pattern = getOption(b, 'pattern');
                if (pattern) {
                    context.fillStyle = context.createPattern(pattern, 'repeat');
                    context.fill();
                }

                // Draw the wireframe, then
                if (getOption(b, 'showWireframe')) {
                    fillOrStroke(b, 'wireframe', false);
                }

            }

            // The body is drawn with an image (for sprite animations)
            if (getOption(b, 'image')) {
                const image = getOption(b, 'image');
                const width = getOption(b, 'width');
                const height = getOption(b, 'height');
                const sx = getOption(b, 'sx');
                const sy = getOption(b, 'sy');
                const dx = getOption(b, 'dx');
                const dy = getOption(b, 'dy');
                context.drawImage(image, sx, sy, width, height, dx + b.position.x, dy + b.position.y, width, height);
            }

            // Draw bounds
            if (getOption(b, 'showBounds')) {
                const min = b.bounds.min;
                const max = b.bounds.max;
                context.beginPath();
                context.moveTo(min.x, min.y);
                context.lineTo(max.x, min.y);
                context.lineTo(max.x, max.y);
                context.lineTo(min.x, max.y);
                context.lineTo(min.x, min.y);
                fillOrStroke(b, 'bounds', false);
            }

            // A graphical feedback for sleeping bodies.
            // Redraws the body shape, but with a different color.
            if (getOption(b, 'showSleeping') && b.isSleeping) {
                context.beginPath();
                context.moveTo(b.vertices[0].x, b.vertices[0].y);
                b.vertices.forEach(v => context.lineTo(v.x, v.y));
                context.lineTo(b.vertices[0].x, b.vertices[0].y);
                fillOrStroke(b, 'sleeping', false);
            }

            // Axes
            if (getOption(b, 'showAxes')) {
                context.beginPath();
                b.axes.forEach(a => {
                    context.moveTo(b.position.x, b.position.y);
                    context.lineTo(b.position.x + a.x * 10, b.position.y + a.y * 10);
                });
                fillOrStroke(b, 'axes', false);
            }

            // Collision vertices.
            // Highlight collision vertices with a white circle.
            if (collisions && getOption(b, 'showCollisions')) {
                const r = 4;
                for (const collision of collisions) {
                    if (collision.colliding && (collision.body1 === b || collision.body2 === b)) {
                        context.beginPath();
                        for (let i = 0; i < collision.contacts.length; i++) {
                            const contact = collision.contacts[i].vertex;
                            context.moveTo(contact.x + r, contact.y);
                            context.arc(contact.x, contact.y, r, 0, Math.PI * 2);
                        }
                        fillOrStroke(b, 'collisions', true);
                    }
                }
            }

            // Velocities
            if (getOption(b, 'showVelocities')) {
                if (b.velocity.x !== 0 || b.velocity.y !== 0) {
                    context.beginPath();
                    context.moveTo(b.position.x, b.position.y);
                    context.lineTo(b.position.x + b.velocity.x * 10, b.position.y + b.velocity.y * 10);
                    fillOrStroke(b, 'velocities', false);
                }
            }

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
