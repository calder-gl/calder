import { mat4, quat, vec3 } from 'gl-matrix';

/**
 * Not intended to be user facing.
 */
export class Transformation {
    public position: vec3;
    public rotation: quat;
    public scale: vec3;

    constructor(
        position: vec3 = vec3.fromValues(0, 0, 0),
        rotation: quat = quat.create(),
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
        return mat4.fromRotationTranslationScale(mat4.create(), this.rotation, this.position, this.scale);
    }
}
