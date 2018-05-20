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
}
