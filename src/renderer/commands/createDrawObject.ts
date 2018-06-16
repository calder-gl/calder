import { mat3, mat4, vec3 } from 'gl-matrix';
import { range } from 'lodash';
// tslint:disable-next-line:import-name
import REGL = require('regl');
import { blankLight, BakedLight, Light } from '../Light';

// tslint:disable:no-unsafe-any

// Uniforms are the same for all vertices.
interface Uniforms {
    projection: mat4;
    view: mat4;
    model: mat4;
    normalTransform: mat3;
    numLights: number;
    ambientLight: vec3;
    isShadeless: boolean;
}

// Attributes are per vertex.
interface Attributes {
    position: Float32Array;
    normal: Float32Array;
    color: Float32Array;
}

/**
 * All the information needed to be able to draw an object to the screen
 */
export interface DrawObjectProps {
    model: mat4;
    normalTransform: mat3;
    cameraTransform: mat4;
    projectionMatrix: mat4;
    positions: REGL.Buffer;
    normals: REGL.Buffer;
    colors: REGL.Buffer;
    indices: REGL.Elements;
    numLights: number;
    ambientLight: vec3;
    isShadeless: boolean;
    lights: BakedLight[];
}

/**
 * Shader to draw a single object with Phong shading to the screen.
 *
 * @param {REGL.regl} regl The regl object factory to build a function to draw an object.
 */
export function createDrawObject(
    regl: REGL.Regl,
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
            uniform mat3 normalTransform;

            varying vec3 vertexPosition;
            varying vec3 vertexNormal;
            varying vec3 vertexColor;

            void main() {
                vertexPosition = (view * model * vec4(position, 1.0)).xyz;
                vertexNormal = mat3(view) * mat3(normalTransform) * normal;
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
            uniform vec3 ambientLight;
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
                    color += ambientLight * vertexColor;
                }

                gl_FragColor = vec4(color, 1.0);
            }
        `,
        attributes: {
            position: regl.prop<DrawObjectProps, keyof DrawObjectProps>('positions'),
            normal: regl.prop<DrawObjectProps, keyof DrawObjectProps>('normals'),
            color: regl.prop<DrawObjectProps, keyof DrawObjectProps>('colors')
        },
        uniforms: {
            projection: regl.prop<DrawObjectProps, keyof DrawObjectProps>('projectionMatrix'),
            view: regl.prop<DrawObjectProps, keyof DrawObjectProps>('cameraTransform'),
            model: regl.prop<DrawObjectProps, keyof DrawObjectProps>('model'),
            normalTransform: regl.prop<DrawObjectProps, keyof DrawObjectProps>('normalTransform'),
            numLights: regl.prop<DrawObjectProps, keyof DrawObjectProps>('numLights'),
            ambientLight: regl.prop<DrawObjectProps, keyof DrawObjectProps>('ambientLight'),
            isShadeless: regl.prop<DrawObjectProps, keyof DrawObjectProps>('isShadeless'),
            ...buildLightMetadata(maxLights)
        },
        elements: regl.prop<DrawObjectProps, keyof DrawObjectProps>('indices')
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
