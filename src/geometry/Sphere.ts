import { vec3 } from 'gl-matrix';
import { range } from 'lodash';

import { Face, WorkingGeometry } from '../calder';
import { genIsoSurface } from './MarchingCubes';
import { ScalarField } from './ScalarField';

const RADIUS = 1;
const DIM = 25;
const LENGTH = 2.5;

function sphereSignedDistFunc(coord: vec3): number {
    return Math.sqrt(coord[0] * coord[0] + coord[1] * coord[1] + coord[2] * coord[2]) - RADIUS;
}

export function genSphere(): WorkingGeometry {
    const sphere = new ScalarField(DIM, LENGTH, sphereSignedDistFunc);
    const vertices = genIsoSurface(sphere);
    const face = new Face(range(vertices.length));

    return new WorkingGeometry(vertices, vertices, [face]);
}
