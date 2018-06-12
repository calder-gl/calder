import { mat3, mat4 } from 'gl-matrix';
import { BakedGeometry } from '../../geometry/BakedGeometry';

/*
 * A collection of the properties needed to render something using the default
 * shader.
 */
export type RenderObject = {
    geometry: BakedGeometry;

    /**
     * A transformation matrix to bring vertices out of model coordinates.
     */
    transform: mat4;

    /**
     * A transformation matrix for normals, since using the same one we use for vertices would
     * result on normals no longer being normal to surfaces.
     */
    normalTransform: mat3;

    /**
     * Optional type denoting if the object is shaded. If this is present AND
     * `true`, then we will shade this object using the lights in the
     * `Renderer`.
     */
    isShadeless?: boolean;
};
