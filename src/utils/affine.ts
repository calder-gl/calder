import { vec3, vec4 } from 'gl-matrix';

/**
 * A helper functions to convert to and from Affine space.
 */
export namespace Affine {
    /**
     * Creates a point in Affine space given a point.
     * @param {vec3} point: The point to transform.
     * @return {vec4}: The point in Affine space.
     */
    export function createPoint(point: vec3): vec4 {
        return vec4.fromValues(point[0], point[1], point[2], 1);
    }

    /**
     * Creates a vector in Affine space given a vector.
     * @param {vec3} vector: The vector to transform.
     * @return {vec4}: The vector in Affine space.
     */
    export function createVector(vector: vec3): vec4 {
        return vec4.fromValues(vector[0], vector[1], vector[2], 0);
    }

    /**
     * Convert a vector from Affine space to 3D space.
     * @param {vec4} vector: The vector to truncate.
     * @return {vec3}: The vector without the last element.
     */
    export function to3D(vector: vec4): vec3 {
        return vec3.fromValues(vector[0], vector[1], vector[2]);
    }
}
