import { mat4, quat, vec3 } from 'gl-matrix';
import { vector3 } from '../types/VectorTypes';

/**
 * Not intended to be user facing.
 */
export class Transformation {
    private position: vector3;
    private rotation: quat;
    private scale: vector3;

    constructor(
        position: vector3 = vec3.fromValues(0, 0, 0),
        rotation: quat = quat.create(),
        scale: vector3 = vec3.fromValues(1, 1, 1)
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
        return mat4.fromRotationTranslationScale(
            mat4.create(),
            this.rotation,
            this.getPosition(),
            this.getScale()
        );
    }

    public getPosition(): vec3 {
        return this.position instanceof Function ? this.position() : this.position;
    }

    public setPosition(position: vector3) {
        this.position = position;
    }

    public getRotation(): quat {
        return this.rotation instanceof Function ? this.rotation() : this.rotation;
    }

    public setRotation(rotation: quat) {
        this.rotation = rotation;
    }

    public getScale(): vec3 {
        return this.scale instanceof Function ? this.scale() : this.scale;
    }

    public setScale(scale: vector3) {
        this.scale = scale;
    }
}
