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
export interface DrawGuidingCurveProps {
    cameraTransform: mat4;
    projectionMatrix: mat4;
    positions: Float32Array;
}

/**
 * Shader to draw a guiding curve on top of a scene.
 *
 * @param {REGL.regl} regl The regl object factory to build a function to draw an object.
 */
export function createDrawGuidingCurve(
    regl: REGL.Regl
): REGL.DrawCommand<REGL.DefaultContext, DrawGuidingCurveProps> {
    return regl<Uniforms, Attributes, DrawGuidingCurveProps>({
        vert: `
            precision mediump float;

            attribute vec3 position;

            uniform mat4 projection;
            uniform mat4 view;

            void main() {
                vec4 vertexPosition = view * vec4(position, 1);
                gl_Position = projection * vertexPosition;
            }
        `,
        frag: `
            precision mediump float;

            void main() {
                gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);
            }
        `,
        attributes: {
            position: regl.prop<DrawGuidingCurveProps, keyof DrawGuidingCurveProps>('positions')
        },
        uniforms: {
            projection: regl.prop<DrawGuidingCurveProps, keyof DrawGuidingCurveProps>(
                'projectionMatrix'
            ),
            view: regl.prop<DrawGuidingCurveProps, keyof DrawGuidingCurveProps>('cameraTransform')
        },
        depth: {
            enable: false
        },
        lineWidth: 4,
        // tslint:disable:typedef
        // tslint:disable:variable-name
        count: (_context, props, _batch_id) => props.positions.length / 3,
        primitive: 'line strip'
    });
}
