import { Face, WorkingGeometry } from '../../src/geometry/WorkingGeometry';
import { TestHelper } from '../utils/helper';

import { vec3, vec4 } from 'gl-matrix';
import { range } from 'lodash';

import '../glMatrix';

describe('Face', () => {
    describe('constructor', () => {
        it('can create an object as specified', () => {
            const indices = [0, 1, 2];

            const face = new Face(indices);

            expect(face.indices).toEqual(indices);
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
            const faces = [new Face([0, 1, 2]), new Face([0, 2, 3])];
            const controlPoints = [vec3.fromValues(0, 0, 0)];
            const geo = new WorkingGeometry(vertices, faces, controlPoints);

            expect(geo.vertices).toEqual([
                vec4.fromValues(0, 0, 0, 1),
                vec4.fromValues(0, 1, 0, 1),
                vec4.fromValues(1, 1, 0, 1),
                vec4.fromValues(1, 0, 0, 1)
            ]);
            expect(geo.faces).toEqual(faces);
            expect(geo.controlPoints).toEqual([vec4.fromValues(0, 0, 0, 1)]);
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
            const faces = [new Face([0, 1, 2]), new Face([0, 2, 3])];
            const controlPoints = [vec3.fromValues(0, 0, 0)];
            const square = new WorkingGeometry(vertices, faces, controlPoints);
            const bakedSquare = square.bake();

            // Not testing the colors yet since they don't do anything useful
            expect(bakedSquare.indices).toEqual([0, 1, 2, 0, 2, 3]);
            expect(bakedSquare.vertices).toEqual(vertices);
            expect(bakedSquare.normals).toEqual([
                vec3.fromValues(-0, -0, -1),
                vec3.fromValues(-0, 0, -1)
            ]);
        });
        it('can bake a WorkingGeometry that has many merged objects', () => {
            const rootSquare = TestHelper.square();
            const childSquare1 = TestHelper.square(vec3.fromValues(1, 0, 0));
            const childSquare2 = TestHelper.square(vec3.fromValues(-1, 0, 0));
            const grandChildSquare = TestHelper.square(vec3.fromValues(1, 0, 1));
            rootSquare.merge(childSquare1);
            rootSquare.merge(childSquare2);
            childSquare1.merge(grandChildSquare);

            const bakedObject = rootSquare.bake();
            expect(bakedObject.indices).toEqual([
                0,
                1,
                2,
                0,
                2,
                3,
                4,
                5,
                6,
                4,
                6,
                7,
                8,
                9,
                10,
                8,
                10,
                11,
                12,
                13,
                14,
                12,
                14,
                15
            ]);
            expect(bakedObject.vertices).toEqual([
                vec3.fromValues(0, 0, 0),
                vec3.fromValues(0, 1, 0),
                vec3.fromValues(1, 1, 0),
                vec3.fromValues(1, 0, 0),
                vec3.fromValues(1, 0, 0),
                vec3.fromValues(1, 1, 0),
                vec3.fromValues(2, 1, 0),
                vec3.fromValues(2, 0, 0),
                vec3.fromValues(1, 0, 1),
                vec3.fromValues(1, 1, 1),
                vec3.fromValues(2, 1, 1),
                vec3.fromValues(2, 0, 1),
                vec3.fromValues(-1, 0, 0),
                vec3.fromValues(-1, 1, 0),
                vec3.fromValues(0, 1, 0),
                vec3.fromValues(0, 0, 0)
            ]);
            // Normals should be an array of 8 (indices/3) [0, 0, 1] vectors
            const indexStride = 3;
            const normalCount = bakedObject.indices.length / indexStride;
            const expectedNormals: vec3[] = range(normalCount).map(
                (i: number) =>
                    i % 2 === 0 ? vec3.fromValues(-0, -0, -1) : vec3.fromValues(-0, 0, -1)
            );
            expect(bakedObject.normals).toEqual(expectedNormals);
        });
    });
    describe('merge', () => {
        it('can merge one child', () => {
            const cube1 = TestHelper.cube();
            const cube2 = TestHelper.cube(vec3.fromValues(1, 0, 0));

            cube1.merge(cube2);
        });
        it('can merge serveral nested children', () => {
            const rootCube = TestHelper.cube();
            const childCube1 = TestHelper.cube(vec3.fromValues(1, 0, 0));
            const childCube2 = TestHelper.cube(vec3.fromValues(-1, 0, 0));
            const grandChildCube3 = TestHelper.cube(vec3.fromValues(1, 0, 1));

            rootCube.merge(childCube1);
            rootCube.merge(childCube2);
            childCube1.merge(grandChildCube3);
        });
    });
});
