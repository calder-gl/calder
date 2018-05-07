import { vec3 } from 'gl-matrix';

export type Face = {
    points: vec3[3];
    normal: vec3;
};
