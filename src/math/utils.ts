import { vec3, vec4 } from 'gl-matrix';

export const vec3From4 = (v: vec4) => vec3.fromValues(v[0], v[1], v[2]);

export const vec3ToPoint = (v: vec3) => vec4.fromValues(v[0], v[1], v[2], 1);

export const vec3ToVector = (v: vec3) => vec4.fromValues(v[0], v[1], v[2], 0);

export const project = (v: vec4, onto: vec4) => {
    const angle = vec3.angle(vec3From4(v), vec3From4(onto));
    const normalizedOnto = vec4.normalize(vec4.create(), onto);

    return vec4.scale(vec4.create(), normalizedOnto, vec4.length(v) * Math.cos(angle));
};

export const closestPointOnLine = (p: vec4, lineOrigin: vec4, lineDirection: vec4) =>
    vec4.add(
        vec4.create(),
        lineOrigin,
        project(vec4.sub(vec4.create(), p, lineOrigin), lineDirection)
    );
