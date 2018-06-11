import { vec3 } from 'gl-matrix';
import { CMYKColor } from "../../src/calder";

import '../glMatrix';

describe('CMYKColor', () => {
    describe('CMYKColor.fromCMYK', () => {
        it('properly returns the appropriate normalized CMYK values', () => {
            const red: CMYKColor = CMYKColor.fromCMYK(0, 1, 1, 0);
            const green: CMYKColor = CMYKColor.fromCMYK(1, 0, 1, 0);
            const blue: CMYKColor = CMYKColor.fromCMYK(1, 1, 0, 0);

            expect(red.asArray()).toEqual([1, 0, 0]);
            expect(green.asArray()).toEqual([0, 1, 0]);
            expect(blue.asArray()).toEqual([0, 0, 1]);
        });

        it('properly throws errors for invalid CMYK value ranges', () => {
            expect(() => {
                CMYKColor.fromCMYK(-1, 0, 0, 0);
            }).toThrow("cyan's value (-1) must be in range [0, 1]");

            expect(() => {
                CMYKColor.fromCMYK(2, 0, 0, 0);
            }).toThrow("cyan's value (2) must be in range [0, 1]");

            expect(() => {
                CMYKColor.fromCMYK(0, -1, 0, 0);
            }).toThrow("magenta's value (-1) must be in range [0, 1]");

            expect(() => {
                CMYKColor.fromCMYK(0, 2, 0, 0);
            }).toThrow("magenta's value (2) must be in range [0, 1]");

            expect(() => {
                CMYKColor.fromCMYK(0, 0, -1, 0);
            }).toThrow("yellow's value (-1) must be in range [0, 1]");

            expect(() => {
                CMYKColor.fromCMYK(0, 0, 2, 0);
            }).toThrow("yellow's value (2) must be in range [0, 1]");

            expect(() => {
                CMYKColor.fromCMYK(0, 0, 0, -1);
            }).toThrow("black's value (-1) must be in range [0, 1]");

            expect(() => {
                CMYKColor.fromCMYK(0, 0, 0, 2);
            }).toThrow("black's value (2) must be in range [0, 1]");
        });
    });

    describe('asArray', () => {
        it('properly returns the appropriate normalized CMYK values in an array representation', () => {
            const red: CMYKColor = CMYKColor.fromCMYK(0, 1, 1, 0);
            const green: CMYKColor = CMYKColor.fromCMYK(1, 0, 1, 0);
            const blue: CMYKColor = CMYKColor.fromCMYK(1, 1, 0, 0);

            expect(red.asArray()).toEqual([1, 0, 0]);
            expect(green.asArray()).toEqual([0, 1, 0]);
            expect(blue.asArray()).toEqual([0, 0, 1]);
        });
    });

    describe('asVec', () => {
        it('properly returns the appropriate normalized CMYK values in an array representation', () => {
            const red: CMYKColor = CMYKColor.fromCMYK(0, 1, 1, 0);
            const green: CMYKColor = CMYKColor.fromCMYK(1, 0, 1, 0);
            const blue: CMYKColor = CMYKColor.fromCMYK(1, 1, 0, 0);

            expect(red.asVec()).toEqualVec3(vec3.fromValues(1, 0, 0));
            expect(green.asVec()).toEqualVec3(vec3.fromValues(0, 1, 0));
            expect(blue.asVec()).toEqualVec3(vec3.fromValues(0, 0, 1));
        });
    });

    describe('mix', () => {
        it('properly mixes colors with no ratio provided', () => {
            const red: CMYKColor = CMYKColor.fromCMYK(0, 1, 1, 0);
            const blue: CMYKColor = CMYKColor.fromCMYK(1, 1, 0, 0);
            const purple: CMYKColor = red.mix(blue);

            expect(purple.asArray()).toEqual([1, 0, 1]);
        });

        it('properly mixes colors with a ratio provided', () => {
            const red: CMYKColor = CMYKColor.fromCMYK(0, 1, 1, 0);
            const blue: CMYKColor = CMYKColor.fromCMYK(1, 1, 0, 0);
            const purple: CMYKColor = red.mix(blue, 0.25);

            expect(purple.asArray()).toEqual([0.25, 0, 0.75]);
        });
    });
});
