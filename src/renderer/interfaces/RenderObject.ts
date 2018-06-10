import { mat4 } from 'gl-matrix';
import { BakedGeometry } from '../../geometry/BakedGeometry';

/*
 * A collection of the properties needed to render something using the default
 * shader.
 */
export type RenderObject = {
    geometry: BakedGeometry;
    transform: mat4;

    /**
     * Optional type denoting if the object is shaded. If this is present AND
     * `true`, then we will shade this object using the lights in the
     * `Renderer`.
     */
    isShadeless?: boolean;
};
