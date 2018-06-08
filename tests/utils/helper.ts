import { vec3 } from 'gl-matrix';
import { Face, WorkingGeometry } from '../../src/geometry/WorkingGeometry';

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
        /*
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

        return new WorkingGeometry(vertices, normals, faces, controlPoints);
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
        /*
		 *      5-------6
		 *     /|      /|
		 *    1-+-----2 | 
		 *    | |     | |   y
		 *    | 4-----+-7   | z
		 *    |/      |/    |/
		 *    0-------3     +--x
		 */
        const unitVertices = [
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
        const faces = [
            // Front side
            new Face([0, 1, 2]),
            new Face([0, 2, 3]),
            // Left side
            new Face([0, 1, 5]),
            new Face([1, 4, 5]),
            // Right side
            new Face([3, 2, 6]),
            new Face([3, 6, 7]),
            // Back side
            new Face([4, 5, 6]),
            new Face([4, 6, 7]),
            // Top side
            new Face([1, 2, 6]),
            new Face([1, 5, 6]),
            // Bottom side
            new Face([0, 4, 7]),
            new Face([0, 3, 7])
        ];
        const controlPoints = [start];

        const vertices = unitVertices.map((vertex: vec3) => {
            const out = vec3.create();
            vec3.scaleAndAdd(out, start, vertex, size);

            return out;
        });

        return new WorkingGeometry(vertices, faces, controlPoints);
    }
}
