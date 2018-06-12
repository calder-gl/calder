import { vec3 } from 'gl-matrix';
import { RGBColor } from '../../src/calder';

import '../glMatrix';

describe('RGBColor', () => {
    describe('RGBColor.fromHex', () => {
        it('properly returns the appropriate normalized RGB values', () => {
            const red: RGBColor = RGBColor.fromHex('FF0000');
            const redTwo: RGBColor = RGBColor.fromHex('#FF0000');
            const green: RGBColor = RGBColor.fromHex('00FF00');
            const blue: RGBColor = RGBColor.fromHex('0000FF');

            expect(red.asArray()).toEqual([1, 0, 0]);
            expect(redTwo.asArray()).toEqual([1, 0, 0]);
            expect(green.asArray()).toEqual([0, 1, 0]);
            expect(blue.asArray()).toEqual([0, 0, 1]);
        });

        it('properly throws errors for invalid hexadecimal strings', () => {
            expect(() => {
                RGBColor.fromHex('FF');
            }).toThrow('Please pass in a valid hexadecimal string (i.e., FF33AA or #FF33AA)');

            expect(() => {
                RGBColor.fromHex('FFFFFFF');
            }).toThrow('Please pass in a valid hexadecimal string (i.e., FF33AA or #FF33AA)');
        });
    });

    describe('RGBColor.fromRGB', () => {
        it('properly returns the appropriate normalized RGB values', () => {
            const red: RGBColor = RGBColor.fromRGB(255, 0, 0);
            const green: RGBColor = RGBColor.fromRGB(0, 255, 0);
            const blue: RGBColor = RGBColor.fromRGB(0, 0, 255);

            expect(red.asArray()).toEqual([1, 0, 0]);
            expect(green.asArray()).toEqual([0, 1, 0]);
            expect(blue.asArray()).toEqual([0, 0, 1]);
        });

        it('properly throws errors for invalid RGB value ranges', () => {
            expect(() => {
                RGBColor.fromRGB(-1, 0, 0);
            }).toThrow("red's value (-1) must be in range [0, 255]");

            expect(() => {
                RGBColor.fromRGB(256, 0, 0);
            }).toThrow("red's value (256) must be in range [0, 255]");

            expect(() => {
                RGBColor.fromRGB(0, -1, 0);
            }).toThrow("green's value (-1) must be in range [0, 255]");

            expect(() => {
                RGBColor.fromRGB(0, 256, 0);
            }).toThrow("green's value (256) must be in range [0, 255]");

            expect(() => {
                RGBColor.fromRGB(0, 0, -1);
            }).toThrow("blue's value (-1) must be in range [0, 255]");

            expect(() => {
                RGBColor.fromRGB(0, 0, 256);
            }).toThrow("blue's value (256) must be in range [0, 255]");
        });
    });

    describe('asArray', () => {
        it('properly returns the appropriate normalized RGB values in an array representation', () => {
            const red: RGBColor = RGBColor.fromHex('FF0000');
            const green: RGBColor = RGBColor.fromHex('00FF00');
            const blue: RGBColor = RGBColor.fromHex('0000FF');

            expect(red.asArray()).toEqual([1, 0, 0]);
            expect(green.asArray()).toEqual([0, 1, 0]);
            expect(blue.asArray()).toEqual([0, 0, 1]);
        });
    });

    describe('asVec', () => {
        it('properly returns the appropriate normalized RGB values in an array representation', () => {
            const red: RGBColor = RGBColor.fromHex('FF0000');
            const green: RGBColor = RGBColor.fromHex('00FF00');
            const blue: RGBColor = RGBColor.fromHex('0000FF');

            expect(red.asVec()).toEqualVec3(vec3.fromValues(1, 0, 0));
            expect(green.asVec()).toEqualVec3(vec3.fromValues(0, 1, 0));
            expect(blue.asVec()).toEqualVec3(vec3.fromValues(0, 0, 1));
        });
    });

    describe('mix', () => {
        it('properly mixes colors with no ratio provided', () => {
            const red: RGBColor = RGBColor.fromRGB(255, 0, 0);
            const blue: RGBColor = RGBColor.fromHex('0000FF');
            const purple: RGBColor = red.mix(blue);

            expect(purple.asArray()).toEqual([0.5, 0, 0.5]);
        });

        it('properly mixes colors with a ratio provided', () => {
            const red: RGBColor = RGBColor.fromRGB(255, 0, 0);
            const blue: RGBColor = RGBColor.fromHex('0000FF');
            const purple: RGBColor = red.mix(blue, 0.25);

            expect(purple.asArray()).toEqual([0.25, 0, 0.75]);
        });
    });
});
