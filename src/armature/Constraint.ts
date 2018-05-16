import { vec3 } from 'gl-matrix';
import { nullableVector3 } from '../types/VectorTypes';

/**
 * User facing constraint on an armature which a user may define.
 */
export class Constraint {
    private position: nullableVector3;
    private rotation: nullableVector3;
    private scale: nullableVector3;

    constructor(position: nullableVector3, rotation: nullableVector3, scale: nullableVector3) {
        this.position = position;
        this.rotation = rotation;
        this.scale = scale;
    }

    public getPosition(): vec3 | null {
        return this.position instanceof Function ? this.position() : this.position;
    }

    public setPosition(position: nullableVector3) {
        this.position = position;
    }

    public getRotation(): vec3 | null {
        return this.rotation instanceof Function ? this.rotation() : this.rotation;
    }

    public setRotation(rotation: nullableVector3) {
        this.rotation = rotation;
    }

    public getScale(): vec3 | null {
        return this.scale instanceof Function ? this.scale() : this.scale;
    }

    public setScale(scale: nullableVector3) {
        this.scale = scale;
    }
}
