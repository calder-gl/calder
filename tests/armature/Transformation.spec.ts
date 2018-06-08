import { mat4, vec3 } from 'gl-matrix';
import { Transformation } from '../../src/armature/Transformation';
import '../glMatrix';

describe('Transformation', () => {
    describe('interpolate', () => {
        it('returns a copy of itself when the amount is 0', () => {
            const initialTransform = new Transformation(
                vec3.fromValues(1, 2, 3),
                mat4.fromRotation(mat4.create(), 90, vec3.fromValues(1, 0, 0)),
                mat4.fromScaling(mat4.create(), vec3.fromValues(1, 2, 3))
            );
            const finalTransform = new Transformation(
                vec3.fromValues(1, 2, 3),
                mat4.fromRotation(mat4.create(), 90, vec3.fromValues(1, 0, 0)),
                mat4.fromScaling(mat4.create(), vec3.fromValues(1, 2, 3))
            );

            expect(initialTransform.interpolate(finalTransform, 0).getTransformation()).toEqualMat4(
                initialTransform.getTransformation()
            );
        });

        it('returns a copy of the final transform when the amount is 1', () => {
            const initialTransform = new Transformation(
                vec3.fromValues(1, 2, 3),
                mat4.fromRotation(mat4.create(), 90, vec3.fromValues(1, 0, 0)),
                mat4.fromScaling(mat4.create(), vec3.fromValues(1, 2, 3))
            );
            const finalTransform = new Transformation(
                vec3.fromValues(1, 2, 3),
                mat4.fromRotation(mat4.create(), 90, vec3.fromValues(1, 0, 0)),
                mat4.fromScaling(mat4.create(), vec3.fromValues(1, 2, 3))
            );

            expect(initialTransform.interpolate(finalTransform, 1).getTransformation()).toEqualMat4(
                finalTransform.getTransformation()
            );
        });
    });
});
