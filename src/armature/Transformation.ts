import { mat3, mat4, quat, vec3 } from 'gl-matrix';
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

    /**
     * Returns a matrix representation of the transformation this object
     * represents, but for transforming normals instead of vertices.
     *
     * @returns {mat3}
     */
    public getNormalTransformation(): mat3 {
        const transform = this.getTransformation();
        const normal =  mat3.normalFromMat4(mat3.create(), transform);

        if (normal === null) {
            throw new Error('Transformation was not invertable!');
        }

        return normal;
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

    /**
     * Creates a new transformation that is between the current one and the provided one, with a
     * given mix proportion.
     *
     * @param {Transformation} other The other transformation to interpolate towards.
     * @param {number} amount The proportion to mix the transformations, where 0 is entirely the
     * current transformation and 1 is entirely the other transformation.
     * @returns {Transformation} The interpolated transformation.
     */
    public interpolate(other: Transformation, amount: number): Transformation {
        const interpolated = new Transformation();

        interpolated.setPosition(
            vec3.lerp(interpolated.getPosition(), this.getPosition(), other.getPosition(), amount)
        );

        // To interpolate matrices, we have to factor them into components and interpolate each
        // part separately
        const rotationOffsetBegin = mat4.getTranslation(vec3.create(), this.getRotation());
        const rotationOffsetEnd = mat4.getTranslation(vec3.create(), other.getRotation());
        const rotationRotationBegin = mat4.getRotation(quat.create(), this.getRotation());
        const rotationRotationEnd = mat4.getRotation(quat.create(), other.getRotation());
        quat.normalize(rotationRotationBegin, rotationRotationBegin);
        quat.normalize(rotationRotationEnd, rotationRotationEnd);
        const rotationScaleBegin = mat4.getScaling(vec3.create(), this.getRotation());
        const rotationScaleEnd = mat4.getScaling(vec3.create(), other.getRotation());
        interpolated.setRotation(
            mat4.fromRotationTranslationScale(
                interpolated.getRotation(),
                quat.slerp(quat.create(), rotationRotationBegin, rotationRotationEnd, amount),
                vec3.lerp(vec3.create(), rotationOffsetBegin, rotationOffsetEnd, amount),
                vec3.lerp(vec3.create(), rotationScaleBegin, rotationScaleEnd, amount)
            )
        );

        const scaleOffsetBegin = mat4.getTranslation(vec3.create(), this.getScale());
        const scaleOffsetEnd = mat4.getTranslation(vec3.create(), other.getScale());
        const scaleRotationBegin = mat4.getRotation(quat.create(), this.getScale());
        const scaleRotationEnd = mat4.getRotation(quat.create(), other.getScale());
        quat.normalize(scaleRotationBegin, scaleRotationBegin);
        quat.normalize(scaleRotationEnd, scaleRotationEnd);
        const scaleScaleBegin = mat4.getScaling(vec3.create(), this.getScale());
        const scaleScaleEnd = mat4.getScaling(vec3.create(), other.getScale());
        interpolated.setScale(
            mat4.fromRotationTranslationScale(
                interpolated.getScale(),
                quat.slerp(quat.create(), scaleRotationBegin, scaleRotationEnd, amount),
                vec3.lerp(vec3.create(), scaleOffsetBegin, scaleOffsetEnd, amount),
                vec3.lerp(vec3.create(), scaleScaleBegin, scaleScaleEnd, amount)
            )
        );

        return interpolated;
    }
}
