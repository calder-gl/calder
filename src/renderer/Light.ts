import { vec3 } from 'gl-matrix';
import { coord, Bakeable, Color, RGBColor } from '../calder';
import { Mapper } from '../utils/mapper';

/**
 * Required parameters when defining a `Light` source.
 */
export type LightParams = {
    position: coord;
    color: Color;
    strength: number;
};

/**
 * The representation of the `Light` source to pass in the shader.
 */
export type BakedLight = {
    lightPosition: vec3;
    lightColor: vec3;
    lightStrength: number;
};

/**
 * A Light representation with a position, color, and intensity.
 *
 * @class Light
 */
export class Light implements Bakeable {
    public readonly lightPosition: vec3;
    public readonly lightColor: vec3;
    public readonly lightStrength: number;

    /**
     * Instantiate a new Light object.
     *
     * @class Light
     * @constructor
     * @param {LightParams} params The named parameters for the light source.
     */
    private constructor(params: LightParams) {
        this.lightPosition = Mapper.coordToVector(params.position);
        this.lightColor = params.color.asVec();
        this.lightStrength = params.strength;
    }

    /**
     * Instantiate a new Light object.
     *
     * @param {LightParams} params The named parameters for the light source.
     * @returns {Light} A new light.
     */
    public static create(params: LightParams): Light {
        return new Light(params);
    }

    /**
     * Returns a representation of a light which may be used in the shader.
     *
     * @class Light
     * @returns {BakedLight}
     */
    public bake(): BakedLight {
        return {
            lightPosition: this.lightPosition,
            lightColor: this.lightColor,
            lightStrength: this.lightStrength
        };
    }
}

/**
 * A blank light that does no illumination.
 */
export const blankLight: Light = Light.create({
    position: { x: 0, y: 0, z: 0 },
    color: RGBColor.fromRGB(0, 0, 0),
    strength: 1
});
