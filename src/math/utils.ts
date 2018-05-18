import { vec3, vec4 } from 'gl-matrix';

/**
 * Converts a point or vector vec4 into a vec3 by discarding the final field.
 */
export const vec3From4 = (v: vec4) => vec3.fromValues(v[0], v[1], v[2]);

/**
 * Converts a vec3 to a vec4 point by making the final field a 1.
 */
export const vec3ToPoint = (v: vec3) => vec4.fromValues(v[0], v[1], v[2], 1);

/**
 * Converts a vec3 to a vec4 vector by making the final field a 0.
 */
export const vec3ToVector = (v: vec3) => vec4.fromValues(v[0], v[1], v[2], 0);

/**
 * Returns the component of one vector that is parallel to another.
 *
 * @param {vec4} v The vector to take the parallel component of.
 * @param {vec4} onto The vector we want a component parallel to.
 * @returns {vec4} The component of `v` that is parallel to `onto`.
 */
export const project = (v: vec4, onto: vec4) => {
    const angle = vec3.angle(vec3From4(v), vec3From4(onto));
    const normalizedOnto = vec4.normalize(vec4.create(), onto);

    return vec4.scale(vec4.create(), normalizedOnto, vec4.length(v) * Math.cos(angle));
};

/**
 * Returns the point on a line that has the shortest distance to a given point.
 *
 * @param {vec4} p The point to measure distance to.
 * @param {vec4} lineOrigin An arbitrary point on the line.
 * @param {vec4} lineDirection The direction vector of the line.
 * @returns {vec4} The closest point on the line to `p`.
 */
export const closestPointOnLine = (p: vec4, lineOrigin: vec4, lineDirection: vec4) =>
    vec4.add(
        vec4.create(),
        lineOrigin,
        project(vec4.sub(vec4.create(), p, lineOrigin), lineDirection)
    );
