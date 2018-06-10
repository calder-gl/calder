import { vec3 } from 'gl-matrix';

/**
 * A representation of a color in a WebGL context.
 */
export interface Color {
    /**
     * Returns a three element array representation of the `Color` object.
     *
     * @class RGBColor
     * @method asArray
     * @returns {number[]}
     */
    asArray(): number[];

    /**
     * Returns a gl-matrix `vec3` representation of the `Color` object.
     *
     * @method asVec
     * @returns {gl-matrix.vec3}
     */
    asVec(): vec3;

    interpolate();
}
