import { vec3 } from 'gl-matrix';

/**
 * A representation of a color in a WebGL context.
 */
export interface Color {
    /**
     * Returns a three element array representation of the `Color` object.
     *
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

    /**
     * Mix a color with another one.
     *
     * @method mix
     * @param {Color} color The color object you wish to mix with `this`.
     * @param {number} ratio The ratio at which to mix the first color with the second.
     * @returns {Color}
     */
    mix(color: Color, ratio: number);
}
