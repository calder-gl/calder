import { vec3 } from 'gl-matrix';
import { range } from 'lodash';

import { Face, RGBColor, WorkingGeometry } from '../calder';
import { Color } from '../colors/Color';
import { genIsoSurface } from './MarchingCubes';
import { ScalarField } from './ScalarField';

export namespace Shape {
    export function sphere(fillColor: Color = RGBColor.fromHex('#EEEEEE')): WorkingGeometry {
        const RADIUS = 1;
        const DIM = 25;
        const LENGTH = 2.5;

        function sphereSignedDistFunc(coord: vec3): number {
            return (
                Math.sqrt(coord[0] * coord[0] + coord[1] * coord[1] + coord[2] * coord[2]) - RADIUS
            );
        }

        const sphereField = new ScalarField(DIM, LENGTH, sphereSignedDistFunc);
        const vertices = genIsoSurface(sphereField);
        const faces = range(vertices.length / 3).map(
            (i: number) => new Face(range(i * 3, (i + 1) * 3))
        );

        return new WorkingGeometry(vertices, vertices, faces, [], fillColor);
    }

    export function cylinder(fillColor: Color = RGBColor.fromHex('#EEEEEE')): WorkingGeometry {
        const LENGTH = 1;
        const PRECISION = 20;

        const vertices: vec3[] = [];
        const normals: vec3[] = [];

        // We need to duplicate the vertices so that ones for the faces on the ends can have
        // different normals from the ones in the middle segment of the cylinder
        [true, false].forEach((onEnd: boolean) => {
            [1, -1].forEach((side: number) => {
                if (onEnd) {
                    vertices.push(vec3.fromValues(0, side * LENGTH / 2, 0));
                    normals.push(vec3.fromValues(0, side, 0));
                }

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

        // Top and bottom faces
        [0, 1].forEach((side: number) => {
            range(PRECISION).forEach((i: number) => {
                const offset = side * (PRECISION + 1);
                faces.push(new Face([offset, offset + i + 1, offset + (i + 1) % PRECISION + 1]));
            });
        });

        // Connecting faces
        range(PRECISION).forEach((i: number) => {
            const offset = (PRECISION + 1) * 2;
            faces.push(
                new Face([offset + i, offset + (i + 1) % PRECISION, offset + PRECISION + i])
            );
            faces.push(
                new Face([
                    offset + (i + 1) % PRECISION,
                    offset + PRECISION + (i + 1) % PRECISION,
                    offset + PRECISION + i
                ])
            );
        });

        return new WorkingGeometry(vertices, normals, faces, [], fillColor);
    }
}
