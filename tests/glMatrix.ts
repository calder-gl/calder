import { mat4, quat, vec3 } from 'gl-matrix';

declare global {
    namespace jest {
        interface Matchers<R> {
            toEqualMat4(argument: mat4): { pass: boolean; message(): string };
            toEqualVec3(argument: vec3): { pass: boolean; message(): string };
            toEqualQuat(argument: quat): { pass: boolean; message(): string };
        }
    }
}

expect.extend({
    toEqualMat4(received: mat4, argument: mat4) {
        if (mat4.equals(received, argument)) {
            return {
                message: () =>
                    `expected ${mat4.str(received)} to not be equal to ${mat4.str(argument)}`,
                pass: true
            };
        } else {
            return {
                message: () =>
                    `expected ${mat4.str(received)} to be equal to ${mat4.str(argument)}`,
                pass: false
            };
        }
    },
    toEqualVec3(received: vec3, argument: vec3) {
        if (vec3.equals(received, argument)) {
            return {
                message: () =>
                    `expected ${vec3.str(received)} to not be equal to ${vec3.str(argument)}`,
                pass: true
            };
        } else {
            return {
                message: () =>
                    `expected ${vec3.str(received)} to be equal to ${vec3.str(argument)}`,
                pass: false
            };
        }
    },
    toEqualQuat(received: quat, argument: quat) {
        if (quat.equals(received, argument)) {
            return {
                message: () =>
                    `expected ${quat.str(received)} to not be equal to ${quat.str(argument)}`,
                pass: true
            };
        } else {
            return {
                message: () =>
                    `expected ${quat.str(received)} to be equal to ${quat.str(argument)}`,
                pass: false
            };
        }
    }
});
