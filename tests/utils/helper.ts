import { vec3 } from 'gl-matrix';
import { Face, WorkingGeometry } from '../../src/geometry/WorkingGeometry';

import { flatMap } from 'lodash';
import { defaultMaterial } from '../../src/calder';

export namespace TestHelper {
    /**
     * Creates a square whose front-lower-left corner is at `start` and that has a width of `size`.
     * There is also a control point at the front-lower-left corner.
     *
     * @param {vec3} start: The front-lower-left start position of the square.
     * @param {number} size: The width of a side of the square.
     * @return {WorkingGeometry}: The square that was created.
     */
    export function square(
        start: vec3 = vec3.fromValues(0, 0, 0),
        size: number = 1
    ): WorkingGeometry {
        /**
         *   1----2     y
         *   |    |     | z
         *   |    |     |/
         *   0----3     +--x
         */
        const unitVertices = [
            vec3.fromValues(0, 0, 0),
            vec3.fromValues(0, 1, 0),
            vec3.fromValues(1, 1, 0),
            vec3.fromValues(1, 0, 0)
        ];
        const normals = [
            vec3.fromValues(0, 0, -1),
            vec3.fromValues(0, 0, -1),
            vec3.fromValues(0, 0, -1),
            vec3.fromValues(0, 0, -1)
        ];
        const faces = [new Face([0, 1, 2]), new Face([0, 2, 3])];
        const controlPoints = [start];

        const vertices = unitVertices.map((vertex: vec3) => {
            const out = vec3.create();
            vec3.scaleAndAdd(out, start, vertex, size);

            return out;
        });

        return new WorkingGeometry({
            vertices: vertices,
            normals: normals,
            faces: faces,
            controlPoints: controlPoints,
            material: defaultMaterial
        });
    }

    /**
     * Creates a cube whose front-lower-left corner is at `start` and that has a width of `size`.
     * There is also a control point at the front-lower-left corner.
     *
     * @param {vec3} start: The front-lower-left start position of the cube.
     * @param {number} size: The width of a side of the cube.
     * @return {WorkingGeometry}: The cube that was created.
     */
    export function cube(
        start: vec3 = vec3.fromValues(0, 0, 0),
        size: number = 1
    ): WorkingGeometry {
        // TODO(pbardea): This is currently just used by tests, but this should be exposed as
        // basic geometrical structures for the user.
        /**
         *      5-------6
         *     /|      /|
         *    1-+-----2 |
         *    | |     | |   y
         *    | 4-----+-7   | z
         *    |/      |/    |/
         *    0-------3     +--x
         */
        const cubeVertices = [
            // Front side of cube.
            vec3.fromValues(0, 0, 0),
            vec3.fromValues(0, 1, 0),
            vec3.fromValues(1, 1, 0),
            vec3.fromValues(1, 0, 0),
            // Back side of cube.
            vec3.fromValues(0, 0, 1),
            vec3.fromValues(0, 1, 1),
            vec3.fromValues(1, 1, 1),
            vec3.fromValues(1, 0, 1)
        ];
        const unitPositions = [
            // Front
            cubeVertices[0],
            cubeVertices[1],
            cubeVertices[2],
            cubeVertices[3],
            // Left
            cubeVertices[0],
            cubeVertices[1],
            cubeVertices[5],
            cubeVertices[4],
            // Back
            cubeVertices[4],
            cubeVertices[5],
            cubeVertices[6],
            cubeVertices[7],
            // Right
            cubeVertices[3],
            cubeVertices[2],
            cubeVertices[6],
            cubeVertices[7],
            // Top
            cubeVertices[1],
            cubeVertices[5],
            cubeVertices[6],
            cubeVertices[2],
            // Bottom
            cubeVertices[0],
            cubeVertices[4],
            cubeVertices[7],
            cubeVertices[3]
        ];
        const normalDirections = [
            // Front
            vec3.fromValues(0, 0, -1),
            // Left
            vec3.fromValues(-1, 0, 0),
            // Back
            vec3.fromValues(0, 0, 1),
            // Right
            vec3.fromValues(1, 0, 0),
            // Top
            vec3.fromValues(0, 1, 0),
            // Bottom
            vec3.fromValues(0, -1, 0)
        ];
        const normals = flatMap(normalDirections, (v: vec3) => [v, v, v, v]);
        const faces: Face[] = [];
        for (let i = 0; i < 6; i += 1) {
            const base = i * 4;
            faces.push(new Face([base, base + 1, base + 2]));
            faces.push(new Face([base, base + 2, base + 3]));
        }
        const controlPoints = [start];

        const vertices = unitPositions.map((vertex: vec3) => {
            const out = vec3.create();
            vec3.scaleAndAdd(out, start, vertex, size);

            return out;
        });

        return new WorkingGeometry({
            vertices: vertices,
            normals: normals,
            faces: faces,
            controlPoints: controlPoints,
            material: defaultMaterial
        });
    }
}
