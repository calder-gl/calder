import { mat4, quat, vec3 } from 'gl-matrix';
import { vector3 } from '../types/VectorTypes';
import { Constraint } from './Constraint';

/**
 * Not intended to be user facing.
 */
export class Transformation {
    private position: vector3;
    private rotation: quat;
    private scale: vector3;
    private constraint: Constraint;

    constructor(
        position: vector3 = vec3.fromValues(0, 0, 0),
        rotation: quat = quat.create(),
        scale: vector3 = vec3.fromValues(1, 1, 1),
        constraint: Constraint = new Constraint()
    ) {
        this.position = position;
        this.rotation = rotation;
        this.scale = scale;
        this.constraint = constraint;
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

    public getConstraint(): Constraint {
        return this.constraint;
    }

    public setConstraint(constraint: Constraint) {
        this.constraint = constraint;
    }

    public addConstraint(constraint: Constraint) {
        if (constraint.getPosition() !== null && this.constraint.getPosition() === null) {
            this.constraint.setPosition(constraint.getPosition());
        }

        if (constraint.getRotation() !== null && this.constraint.getRotation() === null) {
            this.constraint.setRotation(constraint.getRotation());
        }

        if (constraint.getScale() !== null && this.constraint.getScale() === null) {
            this.constraint.setScale(constraint.getScale());
        }
    }
}
