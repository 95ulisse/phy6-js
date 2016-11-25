/**
 *    Two-dimensional vector.
 */
export default class Vector {

    /**
     *    Constructs a new vector with the given coordinates.
     *    @param {number} x - X coordinate of the vector.
     *    @param {number} y - Y coordinate of the vector.
     */
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }

    /**
     *    Adds a vector to this one. Returns a new vector.
     *    @param {number|Vector} x - Quantity to add to the X coordinate of the vector, or `Vector` whose coordinates will be both added to this one.
     *    @param {number} y - Quantity to add to the Y coordinate of the vector.
     *    @return {Vector} The vector resulting from the sum.
     */
    add(x, y) {

        // We allow passing both the coordinates and another vector
        if (x instanceof Vector) {
            y = x.y;
            x = x.x;
        }

        return new Vector(this.x + x, this.y + y);

    }

    /**
     *    Subtracts a vector to this one. Returns a new vector.
     *    @param {number|Vector} x - Quantity to subtract to the X coordinate of the vector, or `Vector` whose coordinates will be both subtracted to this one.
     *    @param {number} y - Quantity to subtract to the Y coordinate of the vector.
     *    @return {Vector} The vector resulting from the subtraction.
     */
    sub(x, y) {

        // We allow passing both the coordinates and another vector
        if (x instanceof Vector) {
            y = x.y;
            x = x.x;
        }

        return new Vector(this.x - x, this.y - y);

    }

    /**
     *    Multiplies the coordinates of this vector by a given scalar. Returns a new vector.
     *    @param {number} scalar - Scalar used to multiply the coordinates of the vector.
     *    @return {Vector} The vector resulting from the operation.
     */
    scalar(scalar) {
        return new Vector(this.x * scalar, this.y * scalar);
    }

    /**
     *    Performs the dot product between this vector and the given one.
     *    @param {Vector} other - Other vector of the product.
     *    @return {number} Result of the operation.
     */
    dot(other) {
        return this.x * other.x + this.y * other.y;
    }

    /**
     *    Performs the cross product between this vector and the given one.
     *    @param {Vector} other - Other vector of the product.
     *    @return {number} Result of the operation.
     */
    cross(other) {
        return (this.x * other.y) - (this.y * other.x);
    }

    /**
     *    Rotates this vector around the origin of the given angle.
     *    @param {number} angle - Angle to rotate this vector of.
     *    @return {Vector} New vector result of the rotation.
     */
    rotate(angle) {
        const sin = Math.sin(angle);
        const cos = Math.cos(angle);

        return new Vector(
            this.x * cos - this.y * sin,
            this.x * sin + this.y * cos
        );
    }

    /**
     *    Returns the length of this vector.
     *    @return {number} Length of this vector.
     */
    length() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }

    /**
     *    Returns the square of the length of this vector.
     *    @return {number} Length of this vector, squared.
     */
    lengthSquared() {
        return this.x * this.x + this.y * this.y;
    }

    /**
     *    Returns the angle in radians from the X axis to the vector.
     *    @return {number} Angle in radians representing the direction of this vector.
     */
    direction() {
        if (this.x === 0) {
            return Math.PI / 2;
        } else {
            return Math.atan(this.y / this.x);
        }
    }

    /**
     *    Returns a new normalized vector (length of 1 unit) on the same direction of this vector.
     *    @return {Vector} Unit vector along the direction of this vector.
     */
    normalize() {
        const l = this.length();
        return new Vector(this.x / l, this.y / l);
    }

    /**
     *    Returns a new vector perpendicular to this one.
     *    @return {Vector} New vector perpendicular to this one.
     */
    perp() {
        return new Vector(-this.y, this.x);
    }

    /**
     *    Returns a string representation of this vector.
     *    @return {string} String representation of this vector.
     */
    toString() {
        return `(${this.x}, ${this.y})`;
    }

};
