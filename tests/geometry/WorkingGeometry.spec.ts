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
            const expectedNormal = vec3.fromValues(0, 0, -1);
            expect(bakedSquare.indices).toEqual([0, 1, 2, 0, 2, 3]);
            expect(bakedSquare.vertices).toEqual(vertices);
            expect(bakedSquare.normals).toEqualArrVec3([expectedNormal, expectedNormal]);
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
            const expectedNormals: vec3[] = range(normalCount).map(() => vec3.fromValues(0, 0, -1));
            expect(bakedObject.normals).toEqualArrVec3(expectedNormals);
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
            expect(cube.vertices).toEqualArrVec4(result.vertices);
        });
        it('can translate on the negative x, y, z axes', () => {
            const cube = TestHelper.cube();
            const v = vec3.fromValues(-3, -2, -1);

            cube.translate(v);

            const result = TestHelper.cube(v);
            expect(cube.vertices).toEqualArrVec4(result.vertices);
        });
        it('can translate with arbitrary values on the x, y, z axes', () => {
            const cube = TestHelper.cube();
            const v = vec3.fromValues(1.2, -3.5, 6.2);

            cube.translate(v);

            const result = TestHelper.cube(v);
            expect(cube.vertices).toEqualArrVec4(result.vertices);
        });
        it('can translate with the zero vector and remain unchanged', () => {
            const cube = TestHelper.cube();
            const v = vec3.fromValues(0, 0, 0);

            cube.translate(v);

            const result = TestHelper.cube(v);
            expect(cube.vertices).toEqualArrVec4(result.vertices);
        });
    });
    describe('rotate', () => {
        it('can rotate on the x axis by 90 degrees about origin', () => {
            const square = TestHelper.square();
            const xAxis = vec3.fromValues(1, 0, 0);

            square.rotate(xAxis, Math.PI / 2);

            expect(square.vertices).toEqualArrVec4([
                vec4.fromValues(0, 0, 0, 1),
                vec4.fromValues(0, 0, 1, 1),
                vec4.fromValues(1, 0, 1, 1),
                vec4.fromValues(1, 0, 0, 1)
            ]);
        });
        it('can rotate on an arbitrary axis by 90 degrees about origin', () => {
            const square = TestHelper.square();
            const axis = vec3.fromValues(1, 2, 3);

            square.rotate(axis, Math.PI/2);

            // TODO: Verify this by plotting it graphically, or using another tool.
            expect(square.vertices).toEqualArrVec4([
                vec4.fromValues(0, 0, 0, 1),
                vec4.fromValues(-0.6589266061782837, 0.28571420907974243, 0.6958326697349548, 1),
                vec4.fromValues(-0.587498128414154, 1.2303550243377686, 0.37559592723846436, 1),
                vec4.fromValues(0.07142850011587143, 0.9446408748626709, -0.3202367424964905, 1)
            ]);
        });
        it('can rotate on the x axis by 90 degrees about (1, 0, 0)', () => {
            const square = TestHelper.square();
            const xAxis = vec3.fromValues(1, 0, 0);

            square.rotate(xAxis, Math.PI/2, vec3.fromValues(1, 0, 0));

            expect(square.vertices).toEqualArrVec4([
                vec4.fromValues(0, 0, 0, 1),
                vec4.fromValues(0, 0, 1, 1),
                vec4.fromValues(1, 0, 1, 1),
                vec4.fromValues(1, 0, 0, 1)
            ]);
        });
        it('can rotate on the y axis by 90 degrees about (1, 0, 0)', () => {
            const square = TestHelper.square();
            const yAxis = vec3.fromValues(0, 1, 0);

            square.rotate(yAxis, Math.PI/2, vec3.fromValues(1, 0, 0));

            expect(square.vertices).toEqualArrVec4([
                vec4.fromValues(1, 0, 1, 1),
                vec4.fromValues(1, 1, 1, 1),
                vec4.fromValues(1, 1, 0, 1),
                vec4.fromValues(1, 0, 0, 1)
            ]);
        });
        it('can rotate on x, y, z axes and reverse the rotation to remain unchanged', () => {
            const square = TestHelper.square();
            const xAxis = vec3.fromValues(1, 0, 0);
            const yAxis = vec3.fromValues(0, 1, 0);
            const zAxis = vec3.fromValues(0, 0, 1);
            const angle = 0.7;

            square.rotate(xAxis, angle);
            square.rotate(yAxis, angle);
            square.rotate(zAxis, angle);

            square.rotate(zAxis, -angle);
            square.rotate(yAxis, -angle);
            square.rotate(xAxis, -angle);

            expect(square.vertices).toEqualArrVec4(TestHelper.square().vertices);
        });
        it('can rotate on one axis at a non 90 degree angle', () => {
            const square = TestHelper.square();
            const xAxis = vec3.fromValues(1, 0, 0);
            const angle = 0.7;

            square.rotate(xAxis, angle);

            expect(square.vertices).toEqualArrVec4([
                vec4.fromValues(0, 0, 0, 1),
                vec4.fromValues(0, Math.cos(angle), Math.sin(angle), 1),
                vec4.fromValues(1, Math.cos(angle), Math.sin(angle), 1),
                vec4.fromValues(1, 0, 0, 1)
            ]);
        });
        it('can rotate at 90 degrees on x, y, z axes and reverse the rotation to remain unchanged, regardless of order', () => {
            const square = TestHelper.square();
            const xAxis = vec3.fromValues(1, 0, 0);
            const yAxis = vec3.fromValues(0, 1, 0);
            const zAxis = vec3.fromValues(0, 0, 1);
            const angle = Math.PI / 2;

            square.rotate(xAxis, angle);
            square.rotate(yAxis, angle);
            square.rotate(zAxis, angle);

            square.rotate(xAxis, -angle);
            square.rotate(yAxis, -angle);
            square.rotate(zAxis, angle);

            expect(square.vertices).toEqualArrVec4(TestHelper.square().vertices);
        });
        it('can rotate at an arbitrary degrees on x, y, z axes and reverse the rotation to remain unchanged, regardless of order', () => {
            // TODO: I don't think this test is valid. Need to verify.
        });
        it('can rotate 360 degrees and remain unchanged', () => {
            const square = TestHelper.square();
            const xAxis = vec3.fromValues(1, 0, 0);
            const yAxis = vec3.fromValues(0, 1, 0);
            const zAxis = vec3.fromValues(0, 0, 1);
            const angle = 2 * Math.PI;
            
            // xAxis
            square.rotate(xAxis, angle);
            expect(square.vertices).toEqualArrVec4(TestHelper.square().vertices);

            // yAxis
            square.rotate(yAxis, angle);
            expect(square.vertices).toEqualArrVec4(TestHelper.square().vertices);

            // zAxis
            square.rotate(zAxis, angle);
            expect(square.vertices).toEqualArrVec4(TestHelper.square().vertices);
        });
    });
    describe('scale', () => {
        it('can scale from (1, 1, 0) to (2, 2, 0) about origin', () => {
            const square = TestHelper.square();

            square.scale(vec3.fromValues(1, 1, 0), vec3.fromValues(2, 2, 0));

            expect(square.vertices).toEqual([
                vec4.fromValues(0, 0, 0, 1),
                vec4.fromValues(0, 2, 0, 1),
                vec4.fromValues(2, 2, 0, 1),
                vec4.fromValues(2, 0, 0, 1)
            ]);
        });
        it('can scale from (0, 0, 0) to (-1, -1, 0) about (1, 1, 0)', () => {
            const square = TestHelper.square();

            square.scale(
                vec3.fromValues(0, 0, 0),
                vec3.fromValues(-1, -1, 0),
                vec3.fromValues(1, 1, 0)
            );

            expect(square.vertices).toEqual([
                vec4.fromValues(-1, -1, 0, 1),
                vec4.fromValues(-1, 1, 0, 1),
                vec4.fromValues(1, 1, 0, 1),
                vec4.fromValues(1, -1, 0, 1)
            ]);
        });
        it('can scale to itself and remain unchanged', () => {
            const square = TestHelper.square();

            square.scale(vec3.fromValues(1, 1, 0), vec3.fromValues(1, 1, 0));

            expect(square.vertices).toEqual(TestHelper.square().vertices);
        });
    });
    describe('scaleByFactor', () => {
        it('can scale by a factor of 2 on the positive axes about origin', () => {
            const square = TestHelper.square();

            square.scaleByFactor(2, vec3.fromValues(1, 1, 0));

            expect(square.vertices).toEqualArrVec4([
                vec4.fromValues(0, 0, 0, 1),
                vec4.fromValues(0, 2, 0, 1),
                vec4.fromValues(2, 2, 0, 1),
                vec4.fromValues(2, 0, 0, 1)
            ]);
        });
        it('can scale by a factor of 2 on the negative axes about (1, 1, 0)', () => {
            const square = TestHelper.square();

            square.scaleByFactor(2, vec3.fromValues(0, 0, 0), vec3.fromValues(1, 1, 0));

            expect(square.vertices).toEqualArrVec4([
                vec4.fromValues(-1, -1, 0, 1),
                vec4.fromValues(-1, 1, 0, 1),
                vec4.fromValues(1, 1, 0, 1),
                vec4.fromValues(1, -1, 0, 1)
            ]);
        });
        it('can scale by a factor of 1 and remain unchanged', () => {
            const square = TestHelper.square();

            square.scaleByFactor(1, vec3.fromValues(1, 1, 0));

            expect(square.vertices).toEqualArrVec4(TestHelper.square().vertices);
        });
    });
});
