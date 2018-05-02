import { Camera } from '../../src/renderer/Camera';
import '../glMatrix';

import { mat4, quat, vec3 } from 'gl-matrix';

describe('Camera', () => {
    it('defaults to an identity transformation', () => {
        expect(new Camera().getTransform()).toEqualMat4(mat4.create());
    });

    it('can be moved', () => {
        const camera = new Camera();
        camera.lookAt(vec3.fromValues(0, 0, -1));
        camera.moveTo(vec3.fromValues(0, 1, 1));
        expect(mat4.getTranslation(vec3.create(), camera.getTransform())).toEqualVec3(
            vec3.fromValues(0, -1, -1)
        );
        expect(mat4.getRotation(quat.create(), camera.getTransform())).toEqualQuat(quat.create());
    });

    it('can be moved without changing the target', () => {
        const camera = new Camera();
        camera.lookAt(vec3.fromValues(0, 0, -1));
        camera.moveToWithFixedTarget(vec3.fromValues(0, 2, 1));
        expect(
            vec3.transformMat4(vec3.create(), vec3.fromValues(0, 0, -1), camera.getTransform())
        ).toEqualVec3(vec3.fromValues(0, 0, -Math.sqrt(2) * 2));
    });

    it('can be moved incrementally', () => {
        const camera = new Camera();
        camera.lookAt(vec3.fromValues(0, 0, -1));
        camera.moveTo(vec3.fromValues(0, 1, 0));
        camera.moveBy(vec3.fromValues(0, 0, 1));
        expect(mat4.getTranslation(vec3.create(), camera.getTransform())).toEqualVec3(
            vec3.fromValues(0, -1, -1)
        );
        expect(mat4.getRotation(quat.create(), camera.getTransform())).toEqualQuat(quat.create());
    });

    it('can be moved incrementally without changing the target', () => {
        const camera = new Camera();
        camera.lookAt(vec3.fromValues(0, 0, -1));
        camera.moveToWithFixedTarget(vec3.fromValues(0, 1, 1));
        camera.moveByWithFixedTarget(vec3.fromValues(0, 1, 0));
        expect(
            vec3.transformMat4(vec3.create(), vec3.fromValues(0, 0, -1), camera.getTransform())
        ).toEqualVec3(vec3.fromValues(0, 0, -Math.sqrt(2) * 2));
    });

    it('can be rotated', () => {
        const camera = new Camera();
        camera.setRotation(quat.fromEuler(quat.create(), 0, 90, 0));
        expect(
            vec3.transformMat4(vec3.create(), vec3.fromValues(1, 0, 0), camera.getTransform())
        ).toEqualVec3(vec3.fromValues(0, 0, 1));
    });

    it('can be rotated incrementally', () => {
        const camera = new Camera();
        camera.setRotation(quat.fromEuler(quat.create(), 0, 90, 0));
        camera.rotate(quat.fromEuler(quat.create(), 0, 90, 0));
        expect(
            vec3.transformMat4(vec3.create(), vec3.fromValues(0, 0, -1), camera.getTransform())
        ).toEqualVec3(vec3.fromValues(0, 0, 1));
    });
});
