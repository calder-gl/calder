import { mat4, vec3 } from 'gl-matrix';
// tslint:disable-next-line:import-name
import REGL = require('regl');

import { flatMap } from 'lodash';

// tslint:disable:no-unsafe-any
// tslint:disable:variable-name

// Uniforms are the same for all vertices.
interface Uniforms {
    projection: mat4;
    view: mat4;
    thickness: number;
    color: vec3;
    screenSize: [number, number];
}

// Attributes are per vertex.
interface Attributes {
    position: [number, number, number][];
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
    thickness: number;
    color: vec3;
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
                    vec4(screenPosition.w * screenNormal * side * thickness / screenSize / 2.0, 0.0, 0.0);
            }
        `,
        frag: `
            precision mediump float;

            uniform vec3 color;

            void main() {
                gl_FragColor = vec4(color, 1.0);
            }
        `,
        attributes: {
            position: (_context: REGL.DefaultContext, props: DrawGuidingCurveProps) =>
                flatMap(props.positions, (position: [number, number, number]) => [
                    position,
                    position
                ]),
            side: (_context: REGL.DefaultContext, props: DrawGuidingCurveProps) =>
                flatMap(props.positions, (_position: [number, number, number]) => [-1, 1]),
            direction: (_context: REGL.DefaultContext, props: DrawGuidingCurveProps) =>
                flatMap(props.positions, (_position: [number, number, number], i: number) => {
                    let index: number = i;
                    if (index === props.positions.length - 1) {
                        index -= 1;
                    }
                    const [ax, ay, az] = props.positions[index];
                    const [bx, by, bz] = props.positions[index + 1];
                    const direction = [bx - ax, by - ay, bz - az];

                    return [direction, direction];
                })
        },
        uniforms: {
            projection: regl.prop<DrawGuidingCurveProps, keyof DrawGuidingCurveProps>(
                'projectionMatrix'
            ),
            view: regl.prop<DrawGuidingCurveProps, keyof DrawGuidingCurveProps>('cameraTransform'),
            thickness: regl.prop<DrawGuidingCurveProps, keyof DrawGuidingCurveProps>('thickness'),
            color: regl.prop<DrawGuidingCurveProps, keyof DrawGuidingCurveProps>('color'),
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
