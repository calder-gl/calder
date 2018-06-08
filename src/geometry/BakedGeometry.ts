// tslint:disable-next-line:import-name
import REGL = require('regl');

/**
 * After modelling is complete, a BakedGeometry should be returned for use in the renderer.
 */
export type BakedGeometry = {
    vertices: Float32Array;
    normals: Float32Array;
    indices: Int16Array;
    colors: Float32Array;

    verticesBuffer?: REGL.Buffer;
    normalsBuffer?: REGL.Buffer;
    indicesBuffer?: REGL.Elements;
    colorsBuffer?: REGL.Buffer;
};
