import Vector from './Vector';
import * as Vertices from './Vertices';
import * as Bounds from './Bounds';
import { VERTICES, POSITION } from '../bodies/Body';
import { clamp } from '../core/util';

const RESTING_THRESH = 6;

const TOTAL_CONTACTS = Symbol('totalContacts');
const POSITION_IMPULSE = Symbol('positionImpulse');

// Projects a set of vertices on the given axis and returns the interval
// from the minimum to the maximum projections.
const projectToAxis = (vertices, axis) => {
    let min = Infinity;
    let max = -Infinity;

    for (const v of vertices) {
        const projection = v.dot(axis);
        if (projection < min) {
            min = projection;
        }
        if (projection > max) {
            max = projection;
        }
    }

    return { min, max };
};

// Projects both set of vertices to the given set of axes,
// and returns `null` if there's no overlap, otherwise returns an object
// with the axes of collision and overlap.
const overlapAxes = (vertices1, vertices2, axes) => {
    const result = { overlap: Infinity };

    for (const a of axes) {

        const interval1 = projectToAxis(vertices1, a);
        const interval2 = projectToAxis(vertices2, a);

        const overlap = Math.min(interval1.max - interval2.min, interval2.max - interval1.min);

        if (overlap <= 0) {
            // No overlap, no collision!
            return null;
        }

        // Store only the minimum
        if (overlap < result.overlap) {
            result.overlap = overlap;
            result.axis = a;
        }

    }

    return result;
};

/**
 *    Returns the two nearest vertices from a target point along the given normal.
 *    @param  {Vector} target - Target point.
 *    @param  {Vector[]} vertices - Array of vertices.
 *    @param  {Vector} normal - Normal along which the distances will be measured.
 *    @return {Vector[]} The two nearest vectors.
 */
const twoNearestVertices = (target, vertices, normal) => {

    let vertex1 = 0;
    let vertex1Projection = -vertices[0].sub(target).dot(normal);
    let vertex2;
    let vertex2Projection;
    let vertex3;
    let vertex3Projection;

    for (let i = 1; i < vertices.length; i++) {
        const proj = -vertices[i].sub(target).dot(normal);
        if (proj < vertex1Projection) {
            vertex1 = i;
            vertex1Projection = proj;
        }
    }

    // We find the second vertex between the two directly connected to the first one
    vertex2 = (vertex1 - 1 + vertices.length) % vertices.length;
    vertex2Projection = -vertices[vertex2].sub(target).dot(normal);
    vertex3 = (vertex1 + 1 + vertices.length) % vertices.length;
    vertex3Projection = -vertices[vertex3].sub(target).dot(normal);

    return [
        vertices[vertex1],
        vertices[vertex2Projection < vertex3Projection ? vertex2 : vertex3]
    ];

};

/**
 *    Performs a full SAT test to check if two bodies are colliding or not.
 *    If the test is successful, other informations about the collision are retrived.
 *
 *    The returned object has the following properties:
 *    - `body1`: First body of the test.
 *    - `body2`: Second body of the test.
 *    - `colliding`: `true` if the bodies are actually colliding, `false` otherwise.
 *      If this property is `false`, the test failed, and the following properties
 *      are not meaningful.
 *    - `normal`: Unit vector representing the normal to the collision. This is also
 *      the opposite of the direction of the impulse to give to the first body
 *      to resolve the collision.
 *    - `tangent`: Tangent to the normal.
 *    - `depth`: How much the two bodies are compenetrating.
 *    - `penetrationVector`: It's just `normal.scalar(depth)`.
 *    - `contacts`: An array containing the one or two vertices involved in the collision.
 *
 *    Provides also the following properties, which are just the max of the same
 *    properties of the bodies:
 *    - `slop`
 *    - `restitution`
 *    - `friction`
 *
 *    @param  {Body} body1 - First body.
 *    @param  {Body} body2 - Second body.
 *    @return {object} The result of the test.
 */
export const test = (body1, body2) => {

    const result = { body1, body2, colliding: false };

    // Test collision on all the axes of both bodies
    const overlapAB = overlapAxes(body1.vertices, body2.vertices, body1.axes);
    if (!overlapAB) {
        return result;
    }
    const overlapBA = overlapAxes(body2.vertices, body1.vertices, body2.axes);
    if (!overlapBA) {
        return result;
    }

    // If we did not exit yet, there's a collision!
    result.colliding = true;

    // Store the minimum collision axis and depth
    if (overlapAB.overlap < overlapBA.overlap) {
        result.depth = overlapAB.overlap;
        result.normal = overlapAB.axis;
    } else {
        result.depth = overlapBA.overlap;
        result.normal = overlapBA.axis;
    }

    // Ensure normal is facing away from bodyA
    if (result.normal.dot(body2.position.sub(body1.position)) > 0)
        result.normal = result.normal.scalar(-1);

    result.tangent = result.normal.perp();
    result.penetrationVector = result.normal.scalar(result.depth);

    // Now we need to find the contact points between the two bodies.
    // Note that for each pair of bodies we consider exactly one or two vertices.

    result.contacts = [];

    const body1Contacts = twoNearestVertices(body1.position, body2.vertices, result.normal);
    if (Vertices.contains(body1.vertices, body1Contacts[0])) {
        result.contacts.push({ vertex: body1Contacts[0] });
    }
    if (Vertices.contains(body1.vertices, body1Contacts[1])) {
        result.contacts.push({ vertex: body1Contacts[1] });
    }

    if (result.contacts.length < 2) {

        const body2Contacts = twoNearestVertices(body2.position, body1.vertices, result.normal.scalar(-1));
        if (Vertices.contains(body2.vertices, body2Contacts[0])) {
            result.contacts.push({ vertex: body2Contacts[0] });
        }
        if (result.contacts.length < 2 && Vertices.contains(body2.vertices, body2Contacts[1])) {
            result.contacts.push({ vertex: body2Contacts[1]});
        }

    }

    // Other useful properties
    result.slop = Math.max(body1.slop, body2.slop);
    result.restitution = Math.max(body1.restitution, body2.restitution);
    result.friction = Math.min(body1.friction, body2.friction);

    return result;

};

/**
 * Prepares the bodies for collision solving.
 *
 * @param  {object[]} collisions - Collision objects as returned from `test.`
 */
export const preSolvePosition = (collisions) => {
    for (const c of collisions) {
        c.body1[TOTAL_CONTACTS] = (c.body1[TOTAL_CONTACTS] || 0) + c.contacts.length;
        c.body2[TOTAL_CONTACTS] = (c.body2[TOTAL_CONTACTS] || 0) + c.contacts.length;
    }
};

/**
 *    Performs a single iteration of collision resolution.
 *    Note that this step can (and should) be called more than one time,
 *    because the collisions aren't resolved with absolute mathematical precision,
 *    and more complicated scenarios (like multiple bodies compenetrating toghether)
 *    cannot be handled correctly in just one iteration.
 *
 *    Updates the field `Symbol(positionImpulse)` of each body in the collisions.
 *
 *    Note that this function does not update the bodies, use `postSolvePosition` for that.
 *
 *    @param  {object[]} collisions - Array of collisions.
 */
export const solvePosition = (collisions) => {

    // First iteration: compute the actual separation between the colliding bodies.
    // This step is necessary because this may not be the first call to `solvePosition`,
    // so there already is a value for `Symbol(positionImpulse)`, and we have to account for that.
    for (const collision of collisions) {
        const {
            body1,
            body2,
            normal,
            penetrationVector,
            slop
        } = collision;

        // Initialize the impulse vector if the bodies have not been colliding with anything yet.
        body1[POSITION_IMPULSE] = body1[POSITION_IMPULSE] || new Vector(0, 0);
        body2[POSITION_IMPULSE] = body2[POSITION_IMPULSE] || new Vector(0, 0);

        // Compute current separation taccounting for the updated impulses.
        // Note that when the impulses are all zero, this is just `collision.penetrationVector`.
        const separation =
            body2.position.add(body2[POSITION_IMPULSE])
                .sub(
                    body2.position.sub(penetrationVector).add(body1[POSITION_IMPULSE])
                );

        // This dot product is necessary because the impulses are not guaranteed to be
        // in the direction of this collision's normal. The same bodies can be involved
        // in multiple collisions at the same time, and we need to find a single impulse
        // to resolve all the collisions at once. This is also why the impulses are kept
        // on the single objects instead of the collision objects.
        //
        // Note also that this is the reason behind having a multi-iteration resolution:
        // it's too complicated to solve all these constraints at once!
        collision.separation = normal.dot(separation);

    }

    for (const collision of collisions) {

        // The impulses are already enough to separate the bodies
        if (collision.separation < 0) {
            continue;
        }

        let {
            body1,
            body2,
            normal,
            separation,
            slop
        } = collision;

        // If one of the two bodies is static, double the separation,
        // since only one of the two will move.
        if (!body1.shouldUpdate || !body2.shouldUpdate) {
            separation *= 2;
        }

        if (body1.shouldUpdate) {
            const contactShare = 1 / body1[TOTAL_CONTACTS];
            body1[POSITION_IMPULSE].x += normal.x * (separation - slop) * contactShare;
            body1[POSITION_IMPULSE].y += normal.y * (separation - slop) * contactShare;
        }

        if (body2.shouldUpdate) {
            const contactShare = 1 / body2[TOTAL_CONTACTS];
            body2[POSITION_IMPULSE].x -= normal.x * (separation - slop) * contactShare;
            body2[POSITION_IMPULSE].y -= normal.y * (separation - slop) * contactShare;
        }

    }

};

/**
 *    Applies the resolution of collisions as computed from `solvePosition`.
 *
 *    @param  {Body[]} bodies - Array of bodies after collision resolution.
 */
export const postSolvePosition = (bodies) => {
    for (const body of bodies) {

        // Reset contacts count
        body[TOTAL_CONTACTS] = 0;

        // Apply impulse
        const impulse = body[POSITION_IMPULSE];
        if (impulse && (impulse.x !== 0 || impulse.y !== 0)) {

            // Update geometry
            body[VERTICES] = body[VERTICES].map(v => v.add(impulse));
            body.bounds = Bounds.translate(body.bounds, impulse);
            body[POSITION] = body[POSITION].add(impulse);
            body.previousPosition = body.previousPosition.add(impulse);

            // Reset impulse
            body[POSITION_IMPULSE] = new Vector(0, 0);

        }

    }
};

/**
 * Iteratively solves the new position of the bodies after the collision.
 *
 * @param  {object[]} collisions - Collision objects as returned from `test`.
 */
export const solveVelocity = (collisions) => {
    for (const collision of collisions) {

        const {
            body1,
            body2,
            normal,
            tangent,
            contacts,
            depth,
            restitution,
            friction,
            separation
        } = collision;

        // Update velocities
        body1.velocity = body1.position.sub(body1.previousPosition);
        body2.velocity = body2.position.sub(body2.previousPosition);
        body1.angularVelocity = body1.angle - body1.previousAngle;
        body2.angularVelocity = body2.angle - body2.previousAngle;

        // Solve each contact individually
        for (const contact of contacts) {

            // The contact point is the point common to both bodies on which the collision happened.
            // We now need to compute the total velocity of this point as it belongs to both bodies,
            // which is just the sum of the tangential and linear velocities.
            const r1 = contact.vertex.sub(body1.position);
            const r2 = contact.vertex.sub(body2.position);
            const contactVelocity1 = r1.perp().scalar(body1.angularVelocity).add(body1.velocity);
            const contactVelocity2 = r2.perp().scalar(body2.angularVelocity).add(body2.velocity);

            // The coefficient of restitution allows us to model a non elastic collision,
            // and represents the ratio between the relative velocities of the bodies before
            // and after the collision.
            const relativeVelocity = contactVelocity1.sub(contactVelocity2);
            const normalVelocity = relativeVelocity.dot(normal);
            const tangentVelocity = relativeVelocity.dot(tangent);

            // The big magic.
            // https://en.wikipedia.org/wiki/Collision_response#Impulse-based_contact_model
            // http://chrishecker.com/images/e/e7/Gdmphys3.pdf
            const r1crossN = r1.cross(normal);
            const r2crossN = r2.cross(normal);
            const denominator = (
                body1.invMass + body2.invMass +
                (body1.invInertia * r1crossN * r1crossN) +
                (body2.invInertia * r2crossN * r2crossN)
            ) * contacts.length;
            let normalImpulse = (1 + restitution) * normalVelocity / denominator;

            // Friction
            const normalForce = clamp(separation + normalVelocity, 0, 1) * 5;
            let tangentImpulse = tangentVelocity;
            let maxFriction = Infinity;
            if (Math.abs(tangentVelocity) > friction * normalForce) {
                maxFriction = Math.abs(tangentVelocity);
                tangentImpulse = clamp(friction * Math.sign(tangentVelocity), -maxFriction, maxFriction);
            }
            tangentImpulse /= denominator;

            // Solve resting collisions separately using Erin Catto's method (GDC 2006)
            if (normalVelocity < 0 && normalVelocity * normalVelocity > RESTING_THRESH) {
                contact.normalImpulse = 0;
            } else {
                contact.normalImpulse = contact.normalImpulse || 0;
                const temp = contact.normalImpulse;
                contact.normalImpulse = Math.min(contact.normalImpulse + normalImpulse, 0);
                normalImpulse = contact.normalImpulse - temp;
            }
            if (tangentVelocity * tangentVelocity > RESTING_THRESH) {
                contact.tangentImpulse = 0;
            } else {
                contact.tangentImpulse = contact.tangentImpulse || 0;
                const temp = contact.tangentImpulse;
                contact.tangentImpulse = clamp(contact.tangentImpulse + tangentImpulse, -maxFriction, maxFriction);
                tangentImpulse = contact.tangentImpulse - temp;
            }

            // Apply impulse. Remember that the impulse is the change in momentum,
            // that's why we divide by the mass/inertia.
            const totalImpulse = normal.scalar(normalImpulse).add(tangent.scalar(tangentImpulse));
            if (body1.shouldUpdate) {
                body1.previousPosition = body1.previousPosition.add(totalImpulse.scalar(body1.invMass));
                body1.previousAngle += r1.cross(totalImpulse) * body1.invInertia;
            }
            if (body2.shouldUpdate) {
                body2.previousPosition = body2.previousPosition.sub(totalImpulse.scalar(body2.invMass));
                body2.previousAngle -= r2.cross(totalImpulse) * body2.invInertia;
            }

        }

    }
};
