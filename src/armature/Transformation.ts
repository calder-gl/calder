import { mat4, vec3 } from 'gl-matrix';

/**
 * Not intended to be user facing.
 */
export class Transformation {
    public position: vec3;
    public rotation: mat4;
    public scale: vec3;

    constructor(
        position: vec3 = vec3.fromValues(0, 0, 0),
        rotation: mat4 = mat4.create(),
        scale: vec3 = vec3.fromValues(1, 1, 1)
    ) {
        this.position = position;
        this.rotation = rotation;
        this.scale = scale;
    }

    /**
     * Returns a matrix representation of the transformation this object
     * represents.
     *
     * @returns {mat4}
     */
    public getTransformation(): mat4 {
        const transform = mat4.fromTranslation(mat4.create(), this.position);
        mat4.multiply(transform, transform, this.rotation);
        mat4.scale(transform, transform, this.scale);

        return transform;
    }
}
