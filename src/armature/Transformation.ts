import { mat4, vec3 } from 'gl-matrix';

/**
 * Not intended to be user facing.
 */
export class Transformation {
    public position: vec3;
    public rotation: vec3;
    public scale: vec3;

    constructor(
        position: vec3 = vec3.fromValues(0, 0, 0),
        rotation: vec3 = vec3.fromValues(0, 0, 0),
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
        const matrix = mat4.fromScaling(mat4.create(), this.scale);

        mat4.rotateX(matrix, matrix, this.rotation[0]);
        mat4.rotateY(matrix, matrix, this.rotation[1]);
        mat4.rotateZ(matrix, matrix, this.rotation[2]);
        mat4.translate(matrix, matrix, this.position);

        return matrix;
    }
}
