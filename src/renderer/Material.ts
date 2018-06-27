import { vec3 } from 'gl-matrix';
import { Bakeable, Color } from '../calder';
import { RGBColor } from '../colors/RGBColor';

/**
 * Required parameters when defining a `Material`.
 */
export type MaterialParams = {
    color: Color;
    shininess: number;
};

/**
 * The representation of a `Material` when passed to the shader.
 */
export type BakedMaterial = {
    materialColor: vec3;
    materialShininess: number;
};

/**
 * A simple representation of the material of an object in a scene.
 */
export class Material implements Bakeable {
    public readonly materialColor: vec3;
    public readonly materialShininess: number;

    /**
     * Instantiates a new Material.
     *
     * @class Material
     * @constructor
     * @param {MaterialParams} params The named parameters for this material.
     */
    constructor(params: MaterialParams) {
        this.materialColor = params.color.asVec();
        this.materialShininess = params.shininess;
    }

    /**
     * Instantiates a new Material.
     *
     * @param {MaterialParams} params The named parameters for this material.
     * @returns {Material} A new material.
     */
    public static create(params: MaterialParams): Material {
        return new Material(params);
    }

    /**
     * Returns a representation of the material that will be used by the shader.
     *
     * @returns {BakedMaterial}
     */
    public bake(): BakedMaterial {
        return {
            materialColor: this.materialColor,
            materialShininess: this.materialShininess
        };
    }
}

export const defaultMaterial: Material = Material.create({
    color: RGBColor.fromHex('#EEEEEE'),
    shininess: 1
});
