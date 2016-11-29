# phy6-js

An experimental physics engine for JavaScript written in ES6.

**NOTE**: This is *highly* experimental, it's nowhere near ready.
It's more of a toy, and if you use it you may cause mass extinction of pandas
and who knows what else, so be careful.

**NOTE 2**: `phy6-js` is highly inspired by [Matter.js](http://brm.io/matter-js/).
`Matter.js` is a true full-fledged physical engine: use `Matter.js` if you need to make
something serious.

## How to install

The most simple way to install `phy6-js` is to use `npm`:

```sh
npm install phy6-js
```

And then you can use it like any other module:

```js
import phy6 from 'phy6-js'
```

## Examples

A box falling down on a bar:

```js
import { Engine, Timer, Renderer, BodyFactory } from 'phy6-js';

// `rect` is an helper function that constructs a `Body` with a rectangular shape.
// If you want, you can construct bodies directly using the `Body` constructor.
const bigOne = BodyFactory.rect(100, 30, 200, 100);
const bar = BodyFactory.rect(0, 400, 400, 30);

// Create the engine passing an array of bodies
const engine = new Engine([ bigOne, bar ]);

// Create a Renderer and connect it to the engine and to a canvas.
// Whenever the engine updates it's status, it will be automatically redrawn.
new Renderer(engine, document.getElementsByTagName('canvas')[0]).start();

// Start the timer that at every tick will update the engine.
// By default the timer ticks 60 times per second.
const timer = new Timer();
timer.on('tick', engine.update.bind(engine));
timer.start();
```

A stack of boxes:

```js
// `stack` is an helper function that allows constructing stack of object
// in a fast and easy way. Here we are building a stack of 5x4 objects,
// located at (100, 310), and each object is a rectangle 30x30.
// Note that `stack` is an array.
const stack = BodyFactory.stack(100, 310, 5, 4, (x, y) =>
    BodyFactory.rect(x, y, 30, 30)
);

const engine = new Engine(stack);

...
```

Some common properties on bodies:

```js
const body = new Body({

    // Array of `Vector`s representing the vertices of the body.
    // Note that the shape must be convex.
    vertices: [ new Vector(0, 0), new Vector(100, 0), new Vector(100, 50) ],

    // Density of the material of the body.
    // This value is used to compute mass from the area (which is in turn
    // computed from the shape expressed by the vertices)
    density: 0.005,

    // Forces applied to the body *in this frame*.
    // The forces (torque included) are cleared at every timestep to allow
    // dynamic forces to be recomputed every time the state of the simulation changes.
    // The correct way to apply changing forces (like gravitational attraction between bodies)
    // is to listen to the `preUpdate` event on the engine and recompute the forces
    // in the event handler. 
    force: new Vector(0.3, 1.6),
    torque: 0.46,

    // A static body is a body that will never change its position.
    // Other bodies can bounce off this one, but a static body will never move.
    isStatic: false,

    // Inclination of the body (in radians)
    angle: Math.PI / 4,

    // Coefficient of restitution used during collision resolution.
    // It's like the "bouncyness" of the body: `0` means that will never bounce
    // and `1` is a perfectly elastic collision. (Note that to have a perfectly
    // elastic collision you should also set to `0` the friction.)
    restitution: 0.99,

    // Friction for sliding bodies and for bodies flying in the air.
    // These values are also between `0` and `1`.
    friction: 0.1,
    frictionAir: 0.01

});
```

There are other properties that are automatically computed (like `mass`, `area`,
`inertia` and `bounds`) and they can be both read and written, even though it will
rarely be necessary.