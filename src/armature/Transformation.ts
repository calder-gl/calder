import { mat4, vec3 } from 'gl-matrix';

/**
 * Not intended to be user facing.
 */
export class Transformation {
    private position: vec3 | (() => vec3);
    private rotation: vec3 | (() => vec3);
    private scale: vec3 | (() => vec3);

    constructor(position: vec3 | (() => vec3), rotation: vec3 | (() => vec3), scale: vec3 | (() => vec3)) {
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
        const matrix = mat4.create();
        const rotation = this.getRotation()

        mat4.translate(matrix, matrix, this.getPosition());
        mat4.rotateX(matrix, matrix, rotation[0]);
        mat4.rotateY(matrix, matrix, rotation[1]);
        mat4.rotateZ(matrix, matrix, rotation[2]);
        mat4.scale(matrix, matrix, this.getScale());

        return matrix;
    }

    public getPosition(): vec3 {
        return (this.position instanceof Function) ? this.position() : this.position;
    }

    public setPosition(position: vec3 | (() => vec3)) {
        this.position = position;
    }

    public getRotation(): vec3 {
        return (this.rotation instanceof Function) ? this.rotation() : this.rotation;
    }

    public setRotation(rotation: vec3 | (() => vec3)) {
        this.rotation = rotation;
    }

    public getScale(): vec3 {
        return (this.scale instanceof Function) ? this.scale() : this.scale;
    }

    public setScale(scale: vec3 | (() => vec3)) {
        this.scale = scale;
    }
}
