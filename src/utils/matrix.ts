import { mat4, quat } from 'gl-matrix';
import { coord } from '../calder';
import { Mapper } from './mapper';

export namespace Matrix {
    export function fromQuat4(quaternion: quat, matrix: mat4 = mat4.create()): mat4 {
        return mat4.fromQuat(matrix, quaternion);
    }

    export function fromScaling4(c: coord, matrix: mat4 = mat4.create()): mat4 {
        return mat4.fromScaling(matrix, Mapper.coordToVector(c));
    }
}
