import { mat4, vec3 } from 'gl-matrix';
import { matrix4, vector3 } from '../types/VectorTypes';

/**
 * Not intended to be user facing.
 */
export class Transformation {
    private position: vector3;
    private rotation: matrix4;
    private scale: matrix4;

    constructor(
        position: vector3 = vec3.fromValues(0, 0, 0),
        rotation: matrix4 = mat4.create(),
        scale: matrix4 = mat4.create()
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
        const transform = mat4.fromTranslation(mat4.create(), this.getPosition());
        mat4.multiply(transform, transform, this.getRotation());
        mat4.multiply(transform, transform, this.getScale());

        return transform;
    }

    public getPosition(): vec3 {
        return this.position instanceof Function ? this.position() : this.position;
    }

    public setPosition(position: vector3) {
        this.position = position;
    }

    public getRotation(): mat4 {
        return this.rotation instanceof Function ? this.rotation() : this.rotation;
    }

    public setRotation(rotation: matrix4) {
        this.rotation = rotation;
    }

    public getScale(): mat4 {
        return this.scale instanceof Function ? this.scale() : this.scale;
    }

    public setScale(scale: matrix4) {
        this.scale = scale;
    }
}
