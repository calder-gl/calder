import { vec3 } from 'gl-matrix';
import { Color } from './Color';

/**
 * An CMYK representation of a color in a WebGL context.
 *
 * @class CMYKColor
 */
export class CMYKColor implements Color {
    private cyan: number;
    private magenta: number;
    private yellow: number;
    private black: number;

    /**
     * Instantiate a new CMYKColor object.
     *
     * @class CMYKColor
     * @constructor
     * @param {number} cyan Cyan percentage.
     * @param {number} magenta Magenta percentage.
     * @param {number} yellow Yellow percentage.
     * @param {number} black Black percentage.
     */
    private constructor(cyan: number, magenta: number, yellow: number, black: number) {
        if (cyan < 0 || cyan > 1) {
            throw new RangeError(`cyan's value (${cyan}) must be in range [0, 1]`);
        } else if (magenta < 0 || magenta > 1) {
            throw new RangeError(`magenta's value (${magenta}) must be in range [0, 1]`);
        } else if (yellow < 0 || yellow > 1) {
            throw new RangeError(`yellow's value (${yellow}) must be in range [0, 1]`);
        } else if (black < 0 || black > 1) {
            throw new RangeError(`black's value (${black}) must be in range [0, 1]`);
        }

        this.cyan = cyan;
        this.magenta = magenta;
        this.yellow = yellow;
        this.black = black;
    }

    /**
     * Instantiates a new CMYKColor object from CMYK integer values.
     *
     * @class CMYKColor
     * @method fromCMYK
     * @param {number} cyan Cyan percentage.
     * @param {number} magenta Magenta percentage.
     * @param {number} yellow Yellow percentage.
     * @param {number} black Black percentage.
     * @returns {CMYKColor}
     */
    public static fromCMYK(
        cyan: number,
        magenta: number,
        yellow: number,
        black: number
    ): CMYKColor {
        return new CMYKColor(cyan, magenta, yellow, black);
    }

    /**
     * Returns a three element array representation of the `CMYKColor` object.
     *
     * @class CMYKColor
     * @method asArray
     * @returns {number[]}
     */
    public asArray(): number[] {
        return this.rgb();
    }

    /**
     * Returns a gl-matrix `vec3` representation of the `CMYKColor` object.
     *
     * @class CMYKColor
     * @method asVec
     * @returns {gl-matrix.vec3}
     */
    public asVec(): vec3 {
        const rgb = this.rgb();

        return vec3.fromValues(rgb[0], rgb[1], rgb[2]);
    }

    public interpolate() {
        // TODO(andrew)
    }

    private rgb(): number[] {
        const red = (1 - this.cyan) * (1 - this.black);
        const green = (1 - this.magenta) * (1 - this.black);
        const blue = (1 - this.yellow) * (1 - this.black);

        return [red, green, blue];
    }
}
