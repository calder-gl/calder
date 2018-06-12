import { mat3, mat4 } from 'gl-matrix';

export type coord = {
    x: number;
    y: number;
    z: number;
};

export type coordFunc = coord | (() => coord);

/**
 *
 */
export const identityMatrix3 = mat3.create();

/**
 *
 */
export const identityMatrix4 = mat4.create();
