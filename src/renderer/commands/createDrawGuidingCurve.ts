import { mat4 } from 'gl-matrix';
// tslint:disable-next-line:import-name
import REGL = require('regl');

import { flatMap, range } from 'lodash';

// tslint:disable:no-unsafe-any
// tslint:disable:variable-name

// Uniforms are the same for all vertices.
interface Uniforms {
    projection: mat4;
    view: mat4;
    thickness: number;
    screenSize: [number, number];
}

// Attributes are per vertex.
interface Attributes {
    position: number[];
    side: number[];
    direction: number[][];
}

/**
 * All the information needed to be able to draw an object to the screen
 */
export interface DrawGuidingCurveProps {
    cameraTransform: mat4;
    projectionMatrix: mat4;
    positions: [number, number, number][];
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
            attribute float side;
            attribute vec3 direction;

            uniform mat4 projection;
            uniform mat4 view;
            uniform float thickness;
            uniform vec2 screenSize;

            void main() {
                vec4 screenPosition = projection * view * vec4(position, 1);
                vec4 screenDirection = projection * view * vec4(direction, 0);
                vec2 screenNormal = normalize(vec2(screenDirection.y, -screenDirection.x));
                gl_Position = screenPosition +
                    vec4(screenPosition.w * screenNormal * side * thickness / screenSize, 0.0, 0.0);
            }
        `,
        frag: `
            precision mediump float;

            void main() {
                gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);
            }
        `,
        attributes: {
            position: (_context: REGL.DefaultContext, props: DrawGuidingCurveProps) =>
                flatMap(props.positions, (position: number) => [position, position]),
            side: (_context: REGL.DefaultContext, props: DrawGuidingCurveProps) =>
                flatMap(props.positions, (_position: number) => [-1, 1]),
            direction: (_context: REGL.DefaultContext, props: DrawGuidingCurveProps) =>
                range(props.positions.length * 2).map((i: number) => {
                    let index = Math.floor(i / 2);
                    if (index === props.positions.length - 1) {
                        index -= 1;
                    }
                    const [ax, ay, az] = props.positions[index];
                    const [bx, by, bz] = props.positions[index + 1];

                    return [bx - ax, by - ay, bz - az];
                })
        },
        uniforms: {
            projection: regl.prop<DrawGuidingCurveProps, keyof DrawGuidingCurveProps>(
                'projectionMatrix'
            ),
            view: regl.prop<DrawGuidingCurveProps, keyof DrawGuidingCurveProps>('cameraTransform'),
            thickness: 5,
            screenSize: (context: REGL.DefaultContext) => [
                context.viewportWidth,
                context.viewportHeight
            ]
        },
        depth: {
            enable: false
        },
        // tslint:disable:typedef
        count: (_context, props, _batch_id) => props.positions.length * 2,
        primitive: 'triangle strip'
    });
}
