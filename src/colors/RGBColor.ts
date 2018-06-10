import { vec3 } from 'gl-matrix';
import { Color } from './Color';

/**
 * An RGB representation of a color in a WebGL context.
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
     * @param {string} value A hex string of the form `FF0000`.
     * @returns {RGBColor}
     */
    public static fromHex(value: string): RGBColor {
        if (value.length !== 6) {
            throw new Error('Please pass in a hexadecimal string (i.e., FF33AA)');
        }

        // Split hex string into segments of length 2
        const hexValues = value.match(/.{2}/g)!.map((hex: string) => parseInt(hex, 16));

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

    public interpolate() {
        // TODO(andrew)
    }

    private vecValue(value: number): number {
        return value / 255.0;
    }
}
