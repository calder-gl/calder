// tslint:disable-next-line:import-name
import REGL = require('regl');

import { BakedMaterial } from '../calder';

/**
 * After modelling is complete, a BakedGeometry should be returned for use in the renderer.
 */
export type BakedGeometry = {
    vertices: Float32Array;
    normals: Float32Array;
    indices: Int16Array;
    material: BakedMaterial;

    verticesBuffer?: REGL.Buffer;
    normalsBuffer?: REGL.Buffer;
    indicesBuffer?: REGL.Elements;
};
