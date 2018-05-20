import { Face, WorkingGeometry } from '../../src/geometry/WorkingGeometry';
import { TestHelper } from '../utils/helper';

import { vec3, vec4 } from 'gl-matrix';
import { range } from 'lodash';

import '../glMatrix';

describe('Face', () => {
    describe('constructor', () => {
        it('can create an object as specified', () => {
            const indices = [0, 1, 2];
            const n = [0, 1, 2];
            const normalVec3 = vec3.fromValues(n[0], n[1], n[2]);

            const face = new Face(indices, normalVec3);

            expect(face.indices).toEqual(indices);
            expect(face.normal).toEqualVec4(vec4.fromValues(n[0], n[1], n[2], 0));
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
            const normal = vec3.fromValues(0, 0, 1);
            const faces = [new Face([0, 1, 2], normal), new Face([0, 2, 3], normal)];
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
            const normal = vec3.fromValues(0, 0, 1);
            const faces = [new Face([0, 1, 2], normal), new Face([0, 2, 3], normal)];
            const controlPoints = [vec3.fromValues(0, 0, 0)];
            const square = new WorkingGeometry(vertices, faces, controlPoints);
            const bakedSquare = square.bake();

            // Not testing the colors yet since they don't do anything useful
            expect(bakedSquare.indices).toEqual([0, 1, 2, 0, 2, 3]);
            expect(bakedSquare.vertices).toEqual(vertices);
            expect(bakedSquare.normals).toEqual([normal, normal]);
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
            const expectedNormals: vec3[] = range(normalCount).map(() => vec3.fromValues(0, 0, 1));
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
    describe('translate', () => {
        it('can translate on the positive x, y, z axes', () => {
            const cube = TestHelper.cube();
            const v = vec3.fromValues(1, 2, 3);

            cube.translate(v);

            const result = TestHelper.cube(v);
            expect(cube.vertices).toEqual(result.vertices);
        });
        it('can translate on the negative x, y, z axes', () => {
            const cube = TestHelper.cube();
            const v = vec3.fromValues(-3, -2, -1);

            cube.translate(v);

            const result = TestHelper.cube(v);
            expect(cube.vertices).toEqual(result.vertices);
        });
        it('can translate with arbitrary values on the x, y, z axes', () => {
            const cube = TestHelper.cube();
            const v = vec3.fromValues(1.2, -3.5, 6.2);

            cube.translate(v);

            const result = TestHelper.cube(v);
            expect(cube.vertices).toEqual(result.vertices);
        });
        it('can translate with the zero vector and remain unchanged', () => {
            const cube = TestHelper.cube();
            const v = vec3.fromValues(0, 0, 0);

            cube.translate(v);

            const result = TestHelper.cube(v);
            expect(cube.vertices).toEqual(result.vertices);
        });
    });
    describe('rotate', () => {
        it('can rotate on the x axis by 90 degrees about origin', () => {
            const cube = TestHelper.cube();
            const xAxis = vec3.fromValues(1, 0, 0);

            cube.rotate(xAxis, Math.PI/2);

            const result = TestHelper.cube(v);
            expect(cube.vertices).toEqual(result.vertices);
        });
        it('can rotate on an arbitrary axis by 90 degrees about origin', () => {
            const cube = TestHelper.cube();
            const xAxis = vec3.fromValues(1, 2, 3);

            cube.rotate(xAxis, Math.PI/2);

            const result = TestHelper.cube(v);
            expect(cube.vertices).toEqual(result.vertices);
        });
        it('can rotate on the x axis by 90 degrees about (1, 0, 0)', () => {
            const cube = TestHelper.cube();
            const xAxis = vec3.fromValues(1, 2, 3);

            cube.rotate(xAxis, Math.PI/2, vec3.fromValues(1, 0, 0));

            const result = TestHelper.cube(v);
            expect(cube.vertices).toEqual(result.vertices);
        });
        it('can rotate on x, y, z axes and reverse the rotation to remain unchanged', () => {
            const cube = TestHelper.cube();
            const xAxis = vec3.fromValues(1, 0, 0);
            const yAxis = vec3.fromValues(0, 1, 0);
            const zAxis = vec3.fromValues(0, 0, 1);
            const rotationAmount = 0.34;

            cube.rotate(xAxis, rotationAmount);
            cube.rotate(yAxis, rotationAmount);
            cube.rotate(zAxis, rotationAmount);

            cube.rotate(xAxis, -1 * rotationAmount);
            cube.rotate(yAxis, -1 * rotationAmount);
            cube.rotate(zAxis, -1 * rotationAmount);

            const result = TestHelper.cube(v);
            expect(cube.vertices).toEqual(TestHelper.cube().vertices);
        });
        it('can rotate 360 degrees and remain unchanged', () => {
            const cube = TestHelper.cube();
            const xAxis = vec3.fromValues(1, 0, 0);

            cube.rotate(xAxis, 2 * Math.PI);

            const result = TestHelper.cube(v);
            expect(cube.vertices).toEqual(TestHelper.cube().vertices);
        });
    });
    describe('scale', () => {
        it('can scale from (1, 1, 1) to (2, 2, 2) about origin', () => {
        });
        it('can scale from (0, 0, 0) to (-1, -1, -1) about (1, 1, 1)', () => {
        });
        it('can scale to itself and remain unchanged', () => {
        });
    });
    describe('scaleByFactor', () => {
        it('can scale by a factor of 2 on the positive axes about origin', () => {
        });
        it('can scale by a factor of 2 on the negative axes about (1, 1, 1)', () => {
        });
        it('can scale by a factor of 1 and remain unchanged', () => {
        });
    });
});
