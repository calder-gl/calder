import { vec3 } from 'gl-matrix';

export type vector3 = vec3 | (() => vec3);

export type nullableVector3 = vector3 | null;
