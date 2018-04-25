// tslint:disable-next-line:import-name
import REGL = require('regl');

interface Uniforms {
    projection: REGL.Mat4;
    view: REGL.Mat4;
    offset: REGL.Vec2;
    scale: number;
};

interface Attributes {
    position: REGL.Vec3;
    color: REGL.Vec3;
};

/*
 * All the information needed to be able to draw axes to the screen
 */
export interface DrawAxesProps {
    positions: REGL.Vec4[];
    colors: REGL.Vec3[];
    count: number;
};

/*
 * Shader to draw axes in the corner of the screen
 */
export function drawAxes(regl: REGL.regl): REGL.DrawCommand<REGL.DefaultContext, DrawAxesProps> {
    return regl<Uniforms, Attributes, DrawAxesProps>({
        vert: `
            precision mediump float;

            attribute vec4 position;
            attribute vec3 color;

            varying vec3 vertexColor;

            void main() {
                //gl_Position = projection * (view * vec4(position, 0.0) * scale + vec4(offset, -500, 1.0));
                gl_Position = position;
                vertexColor = color;
            }
        `,
        frag: `
            precision mediump float;

            varying vec3 vertexColor;

            void main() {
                gl_FragColor = vec4(vertexColor, 1.0);
                //gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);
            }
        `,
        primitive: 'lines',
        attributes: {
            position: regl.prop('positions'),
            color: regl.prop('colors'),
        },
        uniforms: {},
        count: regl.prop('count'),
    });
}
