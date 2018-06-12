import { mat4, quat } from 'gl-matrix';
import { coord } from '../calder';
import { Mapper } from './mapper';

export namespace Matrix {
    /**
     * Calculates and return a 4x4 matrix from a quaternion and a matrix.
     *
     * @param {quat} quaternion The quaternion to create the matrix from.
     * @param {mat4} matrix An optional matrix (by default the identity matrix).
     * @returns {mat4}
     */
    export function fromQuat4(quaternion: quat, matrix: mat4 = mat4.create()): mat4 {
        return mat4.fromQuat(matrix, quaternion);
    }

    /**
     * Creates a 4x4 matrix from a vector scaling.
     *
     * @param {coord} c The coordinate representing a 3 dimensional vector.
     * @param {mat4} matrix An optional matrix (by default the identity matrix).
     * @returns {mat4}
     */
    export function fromScaling4(c: coord, matrix: mat4 = mat4.create()): mat4 {
        return mat4.fromScaling(matrix, Mapper.coordToVector(c));
    }
}
