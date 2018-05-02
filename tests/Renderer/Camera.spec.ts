import { Camera } from '../../src/renderer/Camera';

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
                message: () => `expected ${mat4.str(received)} to not be equal to ${mat4.str(argument)}`,
                pass: true,
            };
        } else {
            return {
                message: () => `expected ${mat4.str(received)} to be equal to ${mat4.str(argument)}`,
                pass: false,
            };
        }
    },
    toEqualVec3(received: vec3, argument: vec3) {
        if (vec3.equals(received, argument)) {
            return {
                message: () => `expected ${vec3.str(received)} to not be equal to ${vec3.str(argument)}`,
                pass: true,
            };
        } else {
            return {
                message: () => `expected ${vec3.str(received)} to be equal to ${vec3.str(argument)}`,
                pass: false,
            };
        }
    },
    toEqualQuat(received: quat, argument: quat) {
        if (quat.equals(received, argument)) {
            return {
                message: () => `expected ${quat.str(received)} to not be equal to ${quat.str(argument)}`,
                pass: true,
            };
        } else {
            return {
                message: () => `expected ${quat.str(received)} to be equal to ${quat.str(argument)}`,
                pass: false,
            };
        }
    },
});

describe('Camera', () => {
    it('defaults to an identity transformation', () => {
        expect(new Camera().getTransform()).toEqualMat4(mat4.create());
    });

    it('can be moved', () => {
        const camera = new Camera();
        camera.lookAt(vec3.fromValues(0, 0, -1));
        camera.moveTo(vec3.fromValues(0, 1, 1));
        expect(mat4.getTranslation(vec3.create(), camera.getTransform())).toEqualVec3(vec3.fromValues(0, -1, -1));
        expect(mat4.getRotation(quat.create(), camera.getTransform())).toEqualQuat(quat.create());
    });

    it('can be moved without changing the target', () => {
        const camera = new Camera();
        camera.lookAt(vec3.fromValues(0, 0, -1));
        camera.moveToWithFixedTarget(vec3.fromValues(0, 2, 1));
        expect(vec3.transformMat4(vec3.create(), vec3.fromValues(0, 0, -1), camera.getTransform())).toEqualVec3(vec3.fromValues(0, 0, -Math.sqrt(2) * 2));
    });

    it('can be moved incrementally', () => {
        const camera = new Camera();
        camera.lookAt(vec3.fromValues(0, 0, -1));
        camera.moveTo(vec3.fromValues(0, 1, 0));
        camera.moveBy(vec3.fromValues(0, 0, 1));
        expect(mat4.getTranslation(vec3.create(), camera.getTransform())).toEqualVec3(vec3.fromValues(0, -1, -1));
        expect(mat4.getRotation(quat.create(), camera.getTransform())).toEqualQuat(quat.create());
    });

    it('can be moved incrementally without changing the target', () => {
        const camera = new Camera();
        camera.lookAt(vec3.fromValues(0, 0, -1));
        camera.moveToWithFixedTarget(vec3.fromValues(0, 1, 1));
        camera.moveByWithFixedTarget(vec3.fromValues(0, 1, 0));
        expect(vec3.transformMat4(vec3.create(), vec3.fromValues(0, 0, -1), camera.getTransform())).toEqualVec3(vec3.fromValues(0, 0, -Math.sqrt(2) * 2));
    });
});
