import { mat4, vec3 } from 'gl-matrix';
import { vector3 } from '../types/VectorTypes';
import { Constraint } from './Constraint';

/**
 * Not intended to be user facing.
 */
export class Transformation {
    private position: vector3;
    private rotation: vector3;
    private scale: vector3;
    private constraint: Constraint;

    constructor(position: vector3, rotation: vector3, scale: vector3, constraint: Constraint = new Constraint()) {
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
        const matrix = mat4.create();
        const rotation = this.getRotation();

        mat4.translate(matrix, matrix, this.getPosition());
        mat4.rotateX(matrix, matrix, rotation[0]);
        mat4.rotateY(matrix, matrix, rotation[1]);
        mat4.rotateZ(matrix, matrix, rotation[2]);
        mat4.scale(matrix, matrix, this.getScale());

        return matrix;
    }

    public getPosition(): vec3 {
        return this.position instanceof Function ? this.position() : this.position;
    }

    public setPosition(position: vector3) {
        this.position = position;
    }

    public getRotation(): vec3 {
        return this.rotation instanceof Function ? this.rotation() : this.rotation;
    }

    public setRotation(rotation: vector3) {
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
