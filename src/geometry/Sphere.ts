import { vec3 } from 'gl-matrix';
import { range } from 'lodash';

import { Face, RGBColor, WorkingGeometry } from '../calder';
import { Color } from '../colors/Color';
import { genIsoSurface } from './MarchingCubes';
import { ScalarField } from './ScalarField';

const RADIUS = 1;
const DIM = 25;
const LENGTH = 2.5;

function sphereSignedDistFunc(coord: vec3): number {
    return Math.sqrt(coord[0] * coord[0] + coord[1] * coord[1] + coord[2] * coord[2]) - RADIUS;
}

export function genSphere(fillColor: Color = RGBColor.fromHex('#FF0000')): WorkingGeometry {
    const sphere = new ScalarField(DIM, LENGTH, sphereSignedDistFunc);
    const vertices = genIsoSurface(sphere);
    const faces = range(vertices.length / 3).map(
        (i: number) => new Face(range(i * 3, (i + 1) * 3))
    );

    return new WorkingGeometry(vertices, vertices, faces, [], fillColor);
}
