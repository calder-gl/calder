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
        return this.toRGB();
    }

    /**
     * Returns a gl-matrix `vec3` representation of the `CMYKColor` object.
     *
     * @class CMYKColor
     * @method asVec
     * @returns {gl-matrix.vec3}
     */
    public asVec(): vec3 {
        const rgb = this.toRGB();

        return vec3.fromValues(rgb[0], rgb[1], rgb[2]);
    }

    /**
     * Mix a color with another one. By default, it will mix the two colors
     * equally with a `ratio` value of `0.5`.
     *
     * @method mix
     * @param {Color} color The color object you wish to mix with `this`.
     * @param {number} ratio The ratio at which to mix the first color with the second.
     * @returns {RGBColor}
     */
    public mix(color: Color, ratio: number = 0.5) {
        // Assert the ratio is within the range [0, 1]
        if (ratio < 0 || ratio > 1) {
            throw new RangeError(`ratio's value (${ratio}) must be in range [0, 1]`);
        }

        // Get the normalized RGB values for the second color
        const colorsArray = color.asArray();

        // Map the normalized RGB values for `this` to new RGB values
        const mappedColors = this.asArray().map(
            (c: number, i: number) => c * ratio + colorsArray[i] * (1 - ratio)
        );

        // Get the percentage of `K` (black)
        const K = 1 - Math.max(mappedColors[0], mappedColors[1], mappedColors[2]);

        // Return a new CMYK color mixed from the two
        return new CMYKColor(
            (1 - mappedColors[0] - K) / (1 - K),
            (1 - mappedColors[1] - K) / (1 - K),
            (1 - mappedColors[2] - K) / (1 - K),
            K
        );
    }

    private toRGB(): number[] {
        const red = (1 - this.cyan) * (1 - this.black);
        const green = (1 - this.magenta) * (1 - this.black);
        const blue = (1 - this.yellow) * (1 - this.black);

        return [red, green, blue];
    }
}
