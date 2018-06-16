import { vec3 } from 'gl-matrix';
import { coord, RGBColor } from '../calder';
import { Color } from '../colors/Color';
import { Mapper } from '../utils/mapper';

/**
 * Required parameters when defining a `Light` source.
 */
export type LightParams = {
    position: coord;
    color: Color;
    intensity: number;
};

/**
 * The representation of the `Light` source to pass in the shader.
 */
export type BakedLight = {
    lightPosition: vec3;
    lightColor: vec3;
    lightIntensity: number;
};

/**
 * A Light representation with a position, color, and intensity.
 *
 * @class Light
 */
export class Light {
    public readonly lightPosition: vec3;
    public readonly lightColor: vec3;
    public readonly lightIntensity: number;

    /**
     * Instantiate a new Light object.
     *
     * @class Light
     * @constructor
     * @param {LightParams} params The named parameters for the light source.
     */
    constructor(params: LightParams) {
        this.lightPosition = Mapper.coordToVector(params.position);
        this.lightColor = params.color.asVec();
        this.lightIntensity = params.intensity;
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
            lightIntensity: this.lightIntensity
        };
    }
}

/**
 * A blank light with 0 intensity.
 */
export const blankLight: Light = new Light({
    position: { x: 0, y: 0, z: 0 },
    color: RGBColor.fromRGB(0, 0, 0),
    intensity: 0
});
