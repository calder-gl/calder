import { mat4 } from 'gl-matrix';
// tslint:disable-next-line:import-name
import REGL = require('regl');

// tslint:disable:no-unsafe-any

// Uniforms are the same for all vertices.
interface Uniforms {
    projection: mat4;
    view: mat4;
}

// Attributes are per vertex.
interface Attributes {
    position: Float32Array;
}

/**
 * All the information needed to be able to draw an object to the screen
 */
export interface DrawVectorFieldProps {
    cameraTransform: mat4;
    projectionMatrix: mat4;
    positions: Float32Array;
}

/**
 * Shader to draw a field of vectors at points in the scene.
 *
 * @param {REGL.regl} regl The regl object factory to build a function to draw an object.
 */
export function createDrawVectorField(
    regl: REGL.Regl
): REGL.DrawCommand<REGL.DefaultContext, DrawVectorFieldProps> {
    return regl<Uniforms, Attributes, DrawVectorFieldProps>({
        vert: `
            precision mediump float;

            attribute vec3 position;
            varying vec4 vertexPosition;

            uniform mat4 projection;
            uniform mat4 view;

            void main() {
                vertexPosition = view * vec4(position, 1);
                gl_Position = projection * vertexPosition;
            }
        `,
        frag: `
            precision mediump float;
            varying vec4 vertexPosition;

            void main() {
                gl_FragColor = vec4(
                    clamp(vertexPosition / 5.0 + 0.7, 0.0, 1.0).xyz * vec3(1.0, 1.0, 1.0),
                    1.0);
            }
        `,
        attributes: {
            position: regl.prop<DrawVectorFieldProps, keyof DrawVectorFieldProps>('positions')
        },
        uniforms: {
            projection: regl.prop<DrawVectorFieldProps, keyof DrawVectorFieldProps>(
                'projectionMatrix'
            ),
            view: regl.prop<DrawVectorFieldProps, keyof DrawVectorFieldProps>('cameraTransform')
        },
        // tslint:disable:typedef
        // tslint:disable:variable-name
        count: (_context, props, _batch_id) => props.positions.length / 3,
        primitive: 'lines'
    });
}
