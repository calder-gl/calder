import { mat2, mat3, mat4 } from 'gl-matrix';

export type coord = {
    x: number;
    y: number;
    z: number;
};

/**
 * A coordinate, or a function which returns a coordinate.
 */
export type coordFunc = coord | (() => coord);

/**
 * The identity matrix for a 2x2 matrix.
 */
export const identityMatrix2 = mat2.create();

/**
 * The identity matrix for a 3x3 matrix.
 */
export const identityMatrix3 = mat3.create();

/**
 * The identity matrix for a 4x4 matrix.
 */
export const identityMatrix4 = mat4.create();
