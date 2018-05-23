import { mat4, vec3 } from 'gl-matrix';

/**
 * Not intended to be user facing.
 */
export class Transformation {
    public position: vec3;
    public transform: mat4;
    public scale: vec3;

    constructor(
        position: vec3 = vec3.fromValues(0, 0, 0),
        transform: mat4 = mat4.create()
    ) {
        this.position = position;
        this.transform = transform;
    }

    /**
     * Returns a matrix representation of the transformation this object
     * represents.
     *
     * @returns {mat4}
     */
    public getMatrix(): mat4 {
        return mat4.translate(
            mat4.create(),
            this.transform,
            this.position
        );
    }
}
