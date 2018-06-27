import { BakedGeometry, BakedLight, BakedMaterial } from '../calder';

/**
 * Classes implementing this interface must implement the method `bake`, which
 * returns a JSON representation of the object which may be passed into the
 * shader.
 */
export interface Bakeable {
    bake(): BakedGeometry | BakedLight | BakedMaterial;
}
