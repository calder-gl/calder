import { vec3 } from 'gl-matrix';
import { Color } from './Color';

/**
 * An RGB representation of a color in a WebGL context.
 *
 * The acronym stands for:
 *   R: `R`ed
 *   G: `G`reen
 *   B: `B`lue
 *
 * @class RGBColor
 */
export class RGBColor implements Color {
    private red: number;
    private green: number;
    private blue: number;

    /**
     * Instantiate a new RGBColor object.
     *
     * @class RGBColor
     * @constructor
     * @param {number} red Red numeric color value.
     * @param {number} green Green numeric color value.
     * @param {number} blue Blue numeric color value.
     */
    private constructor(red: number, green: number, blue: number) {
        if (red < 0 || red > 255) {
            throw new RangeError(`red's value (${red}) must be in range [0, 255]`);
        } else if (green < 0 || green > 255) {
            throw new RangeError(`green's value (${green}) must be in range [0, 255]`);
        } else if (blue < 0 || blue > 255) {
            throw new RangeError(`blue's value (${blue}) must be in range [0, 255]`);
        }

        this.red = red;
        this.green = green;
        this.blue = blue;
    }

    /**
     * Instantiates a new RGBColor object from a hex string.
     *
     * @class RGBColor
     * @method fromHex
     * @param {string} value A hex string of the form `FF0000` or `#FF0000`.
     * @returns {RGBColor}
     */
    public static fromHex(value: string): RGBColor {
        // Ensure the user passed in a valid hexadecimal string
        if (
            value.length > 7 ||
            value.length < 6 ||
            (value.length === 7 && value.lastIndexOf('#', 0) !== 0)
        ) {
            throw new Error('Please pass in a valid hexadecimal string (i.e., FF33AA or #FF33AA)');
        }

        // Split the hexadecimal string into segments of length 2
        const matches = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(value);

        // Throw error if `matches` is null. Shouldn't be the case because of
        // the previous assertion - but tslint was complaining ¯\_(ツ)_/¯
        if (matches === null) {
            throw new Error();
        }

        // Map the hexadecimal string segments to decimal integers
        const hexValues = matches.slice(1).map((hex: string) => parseInt(hex, 16));

        // Return the new color
        return new RGBColor(hexValues[0], hexValues[1], hexValues[2]);
    }

    /**
     * Instantiates a new RGBColor object from RGB integer values.
     *
     * @class RGBColor
     * @method fromRGB
     * @param {number} red Red numeric color value.
     * @param {number} green Green numeric color value.
     * @param {number} blue Blue numeric color value.
     * @returns {RGBColor}
     */
    public static fromRGB(red: number, green: number, blue: number): RGBColor {
        return new RGBColor(red, green, blue);
    }

    /**
     * Returns a three element array representation of the `RGBColor` object.
     *
     * @class RGBColor
     * @method asArray
     * @returns {number[]}
     */
    public asArray(): number[] {
        return [this.vecValue(this.red), this.vecValue(this.green), this.vecValue(this.blue)];
    }

    /**
     * Returns a gl-matrix `vec3` representation of the `RGBColor` object.
     *
     * @class RGBColor
     * @method asVec
     * @returns {gl-matrix.vec3}
     */
    public asVec(): vec3 {
        return vec3.fromValues(
            this.vecValue(this.red),
            this.vecValue(this.green),
            this.vecValue(this.blue)
        );
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
            (c: number, i: number) => (c * ratio + colorsArray[i] * (1 - ratio)) * 255
        );

        // Return a new RGB color mixed from the two
        return new RGBColor(mappedColors[0], mappedColors[1], mappedColors[2]);
    }

    private vecValue(value: number): number {
        return value / 255.0;
    }
}
