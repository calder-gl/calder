import { Face } from './Face';

import { vec3 } from 'gl-matrix';

export type WorkingGeometry = {
    faces: Face[];
    controlPoints: vec3[];
};
