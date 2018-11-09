import { vec3 } from 'gl-matrix';
import { flatMap, range } from 'lodash';

import { defaultMaterial, Face, Material, WorkingGeometry } from '../calder';
import { genIsoSurface } from './MarchingCubes';
import { ScalarField } from './ScalarField';

export namespace Shape {
    export function sphere(material: Material = defaultMaterial): WorkingGeometry {
        const RADIUS = 1;
        const DIM = 10;
        const LENGTH = 2.5;

        function sphereSignedDistFunc(coord: vec3): number {
            return (
                Math.sqrt(coord[0] * coord[0] + coord[1] * coord[1] + coord[2] * coord[2]) - RADIUS
            );
        }

        const sphereField = new ScalarField(DIM, LENGTH, sphereSignedDistFunc);
        const vertices = genIsoSurface(sphereField);
        const faces = range(vertices.length / 3).map((i: number) => {
            const indices = range(i * 3, (i + 1) * 3);
            return new Face(indices, indices);
        });

        return new WorkingGeometry({
            vertices: vertices,
            normals: vertices,
            faces: faces,
            controlPoints: [],
            material: material
        });
    }

    export function cube(material: Material = defaultMaterial): WorkingGeometry {
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

        const vertices: vec3[] = [
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

        const normals: vec3[] = flatMap(normalDirections, (v: vec3) => [v, v, v, v]);

        const faces: Face[] = [];
        for (let i = 0; i < 6; i += 1) {
            const base = i * 4;
            const indicesSide1 = [base, base + 1, base + 2];
            const indicesSide2 = [base, base + 2, base + 3];
            faces.push(new Face(indicesSide1, indicesSide1));
            faces.push(new Face(indicesSide2, indicesSide2));
        }

        return new WorkingGeometry({
            vertices: vertices,
            normals: normals,
            faces: faces,
            controlPoints: [],
            material: material
        });
    }

    // tslint:disable:max-func-body-length
    export function cylinder(material: Material = defaultMaterial): WorkingGeometry {
        const LENGTH = 1;
        const PRECISION = 20;

        const vertices: vec3[] = [];
        const normals: vec3[] = [];

        // We need to duplicate the vertices so that ones for the faces on the ends can have
        // different normals from the ones in the middle segment of the cylinder
        [true, false].forEach((onEnd: boolean) => {
            // Add a ring on the top and a ring on the bottom
            [1, -1].forEach((side: number) => {
                // We are going to make triangles coming radially out from the center.
                // e.g., for PRECISION = 6:
                //    5---6
                //   / \ / \
                //  4---0---1
                //   \ / \ /
                //    3---2

                if (onEnd) {
                    // Place the middle vertex
                    vertices.push(vec3.fromValues(0, side * LENGTH / 2, 0));
                    normals.push(vec3.fromValues(0, side, 0));
                }

                // Place the surrounding ring of vertices
                range(PRECISION).forEach((i: number) => {
                    const angle = Math.PI * 2 * (i / PRECISION);
                    vertices.push(
                        vec3.fromValues(Math.cos(angle), side * LENGTH / 2, Math.sin(angle))
                    );

                    if (onEnd) {
                        normals.push(vec3.fromValues(0, side, 0));
                    } else {
                        normals.push(vec3.fromValues(Math.cos(angle), 0, Math.sin(angle)));
                    }
                });
            });
        });

        const faces: Face[] = [];

        // Top and bottom faces: connect outer ring vertices to central vertex
        [0, 1].forEach((side: number) => {
            range(PRECISION).forEach((i: number) => {
                const offset = side * (PRECISION + 1);

                // Connect vertices i and i+1 to the middle:
                //    X---X
                //   / \ / \
                //  X---0---i
                //   \ / \ /
                //    X---i+1
                // The offset is the first index of either the top or the bottom ring.

                const face = [offset, offset + i + 1, offset + (i + 1) % PRECISION + 1];

                // Ensure proper winding order on top and bottom
                if (side === 0) {
                    face.reverse();
                }

                faces.push(new Face(face, face));
            });
        });

        // Connect top and bottom rings
        range(PRECISION).forEach((i: number) => {
            const offset = (PRECISION + 1) * 2;

            // We want to make a rectangle connecting two vertices on the top ring to two vertices
            // on the bottom ring. The offset represents the starting index of the duplicate rings
            // of vertices that we use for the side faces, and there are PRECISION vertices in each
            // ring.

            // Triangle 1:
            // -------i-----i+1----
            //        |    /
            //        |  /
            //        |/
            // -----p+i-----p+i+1--
            // (p = PRECISION, which is # vertices in the ring)
            const indices = [offset + i, offset + (i + 1) % PRECISION, offset + PRECISION + i];
            faces.push(new Face(indices, indices));

            // Triangle 2:
            // -------i-----i+1----
            //             /|
            //           /  |
            //         /    |
            // -----p+i-----p+i+1--
            // (p = PRECISION, which is # vertices in the ring)
            const indices2 = [
                offset + (i + 1) % PRECISION,
                offset + PRECISION + (i + 1) % PRECISION,
                offset + PRECISION + i
            ];
            faces.push(new Face(indices2, indices2));
        });

        return new WorkingGeometry({
            vertices: vertices,
            normals: normals,
            faces: faces,
            controlPoints: [],
            material: material
        });
    }
}
