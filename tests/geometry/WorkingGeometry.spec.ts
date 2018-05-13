import { vec3, vec4 } from 'gl-matrix';
import { Face, WorkingGeometry } from '../../src/geometry/WorkingGeometry';
import '../glMatrix';

describe('Face', () => {
    describe('constructor', () => {
        it('can create an object as specified', () => {
            const indices = [0, 1, 2];
            const n = [0, 1, 2];
            const normalVec3 = vec3.fromValues(n[0], n[1], n[2]);

            const face = new Face(indices, normalVec3);

            expect(face.indices).toEqual(indices);
            expect(face.normal).toEqualVec4(vec4.fromValues(n[0], n[1], n[2], 1));
        });
    });
});

describe('WorkingGeometry', () => {
    describe('constructor', () => {
        it('can default to all fields empty when no params are specified', () => {
            const geo = new WorkingGeometry();

            expect(geo.vertices).toEqual([]);
            expect(geo.faces).toEqual([]);
            expect(geo.controlPoints).toEqual([]);
        });
        it('can create an object as specified', () => {
            const vertices = [
                vec3.fromValues(0, 0, 0),
                vec3.fromValues(0, 1, 0),
                vec3.fromValues(1, 1, 0),
                vec3.fromValues(1, 0, 0)
            ];
            const faces = [
                new Face([0, 1, 2], vec3.fromValues(0, 1, 0)),
                new Face([1, 2, 3], vec3.fromValues(0, 1, 0))
            ];
            const controlPoints = [vec3.fromValues(0, 0, 0)];
            const geo = new WorkingGeometry(vertices, faces, controlPoints);

            expect(geo.vertices).toEqual([
                vec4.fromValues(0, 0, 0, 0),
                vec4.fromValues(0, 1, 0, 0),
                vec4.fromValues(1, 1, 0, 0),
                vec4.fromValues(1, 0, 0, 0)
            ]);
            expect(geo.faces).toEqual(faces);
            expect(geo.controlPoints).toEqual([vec4.fromValues(0, 0, 0, 0)]);
        });
    });
    describe('bake', () => {
        it('can convert itself into a baked geometry', () => {
            const vertices = [
                vec3.fromValues(0, 0, 0),
                vec3.fromValues(0, 1, 0),
                vec3.fromValues(1, 1, 0),
                vec3.fromValues(1, 0, 0)
            ];
            const normal = vec3.fromValues(0, 1, 0);
            const faces = [new Face([0, 1, 2], normal), new Face([1, 2, 3], normal)];
            const controlPoints = [vec3.fromValues(0, 0, 0)];
            const square = new WorkingGeometry(vertices, faces, controlPoints);
            const bakedSquare = square.bake();

            // Not testing the colors yet since they don't do anything useful.
            expect(bakedSquare.indices).toEqual([0, 1, 2, 1, 2, 3]);
            expect(bakedSquare.vertices).toEqual(vertices);
            expect(bakedSquare.normals).toEqual([normal, normal]);
        });
    });
});
