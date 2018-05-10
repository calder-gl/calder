import { blankLight, Light } from '../interfaces/Light';

import { range } from 'lodash';
// tslint:disable-next-line:import-name
import REGL = require('regl');

// tslint:disable:no-unsafe-any

interface Uniforms {
    projection: REGL.Mat4;
    view: REGL.Mat4;
    model: REGL.Mat4;
    numLights: number;
    lightPositions: REGL.Vec3[];
    lightColors: REGL.Vec3[];
    lightIntensities: number[];
    inShaded: boolean;
}

interface Attributes {
    position: REGL.Vec3;
    normal: REGL.Vec3;
    color: REGL.Vec3;
}

/**
 * All the information needed to be able to draw an object to the screen
 */
export interface DrawObjectProps {
    model: REGL.Mat4;
    cameraTransform: REGL.Mat4;
    projectionMatrix: REGL.Mat4;
    positions: REGL.Vec3[];
    normals: REGL.Vec3[];
    colors: REGL.Vec3[];
    indices: number[];
    inShaded: boolean;
}

/**
 * Shader to draw a single object with Phong shading to the screen.
 *
 * @param {REGL.regl} regl The regl object factory to build a function to draw an object.
 */
export function createDrawObject(
    regl: REGL.regl,
    maxLights: number
): REGL.DrawCommand<REGL.DefaultContext, DrawObjectProps> {
    return regl<Uniforms, Attributes, DrawObjectProps>({
        vert: `
            precision mediump float;

            attribute vec3 position;
            attribute vec3 normal;
            attribute vec3 color;

            uniform mat4 projection;
            uniform mat4 view;
            uniform mat4 model;

            varying vec3 vertexPosition;
            varying vec3 vertexNormal;
            varying vec3 vertexColor;

            void main() {
                vertexPosition = (view * model * vec4(position, 1.0)).xyz;
                vertexNormal = (view * model * vec4(normal, 0.0)).xyz;
                vertexColor = color;
                gl_Position = projection * vec4(vertexPosition, 1.0);
            }
        `,
        frag: `
            precision mediump float;

            const int MAX_LIGHTS = ${maxLights};

            varying vec3 vertexPosition;
            varying vec3 vertexNormal;
            varying vec3 vertexColor;

            uniform mat4 view;
            uniform int numLights;
            uniform vec3 lightPositions[MAX_LIGHTS];
            uniform vec3 lightColors[MAX_LIGHTS];
            uniform float lightIntensities[MAX_LIGHTS];
            uniform bool isShadeless;

            void main() {
                vec3 normal = normalize(vertexNormal);
                vec3 color = vec3(0.0, 0.0, 0.0);

                if (isShadeless) {
                    color = vertexColor;
                } else {
                    // Use the renderer lights in the shader
                    for (int i = 0; i < MAX_LIGHTS; i++) {
                        if (i >= numLights) break;

                        vec3 lightPosition = (view * vec4(lightPositions[i], 1.0)).xyz;
                        vec3 lightDir = normalize(lightPosition - vertexPosition);
                        float lambertian = max(dot(lightDir, normal), 0.0);

                        color += lambertian * vertexColor;

                        vec3 viewDir = normalize(-vertexPosition);
                        float spec = pow(
                            max(dot(viewDir, reflect(-lightDir, normal)), 0.0),
                            lightIntensities[i]);

                        color += spec * lightColors[i];
                    }
                }

                gl_FragColor = vec4(color, 1.0);
            }
        `,
        attributes: {
            position: regl.prop('positions'),
            normal: regl.prop('normals'),
            color: regl.prop('colors')
        },
        uniforms: {
            projection: regl.prop('projectionMatrix'),
            view: regl.prop('cameraTransform'),
            model: regl.prop('model'),
            numLights: regl.prop('numLights'),
            isShadeless: regl.prop('isShadeless'),
            ...buildLightMetadata(maxLights)
        },
        elements: regl.prop('indices')
    });
}

// tslint:disable:newline-before-return
// tslint:disable:variable-name
// tslint:disable:typedef

/**
 * Returns JSON metadata for lights to be passed into the `uniforms` object.
 *
 * NOTE: When we increase MAX_LIGHTS, Regl will expect a property in this object for each array
 * element, even if less than MAX_LIGHTS lights are passed in, so the rest will have to be filled
 * with zeroed data.
 *
 * @param {number} maxLights The maximum number of light points that may exist.
 * @returns {{}} The JSON metadata for the lights.
 */
function buildLightMetadata(maxLights: number): {} {
    const visibleLightsJSON: {}[] = range(maxLights).map((index: number) => {
        return {
            [`lightPositions[${index}]`]: (_context, props, _batch_id) => {
                const light: Light | undefined = props.lights[index];
                return light !== undefined ? light.lightPosition : blankLight.lightPosition;
            },
            [`lightIntensities[${index}]`]: (_context, props, _batch_id) => {
                const light: Light | undefined = props.lights[index];
                return light !== undefined ? light.lightIntensity : blankLight.lightIntensity;
            },
            [`lightColors[${index}]`]: (_context, props, _batch_id) => {
                const light: Light = props.lights[index];
                return light !== undefined ? light.lightColor : blankLight.lightColor;
            }
        };
    });

    return visibleLightsJSON.reduce((accum: {}, obj: {}) => {
        return { ...accum, ...obj };
    }, {});
}
