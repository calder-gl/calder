// tslint:disable-next-line:import-name
import REGL = require('regl');

interface Uniforms {
    projection: REGL.Mat4;
    view: REGL.Mat4;
    model: REGL.Mat4;
    numLights: number;
    lightPositions: REGL.Vec3[];
    lightColors: REGL.Vec3[];
    lightIntensities: number[];
};

interface Attributes {
    position: REGL.Vec3;
    normal: REGL.Vec3;
    color: REGL.Vec3;
};

/*
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
};

/*
 * Shader to draw a single object with Phong shading to the screen
 */
export function drawObject(regl: REGL.regl): REGL.DrawCommand<REGL.DefaultContext, DrawObjectProps> {
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

            const int MAX_LIGHTS = 1; // TODO: increase this and have a way to pass in lights

            varying vec3 vertexPosition;
            varying vec3 vertexNormal;
            varying vec3 vertexColor;

            uniform mat4 view;
            uniform int numLights;
            uniform vec3 lightPositions[MAX_LIGHTS];
            uniform vec3 lightColors[MAX_LIGHTS];
            uniform float lightIntensities[MAX_LIGHTS];

            void main() {
                gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);

                vec3 normal = normalize(vertexNormal);
                vec3 color = vec3(0.0, 0.0, 0.0);

                for (int i = 0; i < MAX_LIGHTS; i++) {
                    if (i >= numLights) break;

                    vec3 lightPosition = (view * vec4(lightPositions[i], 1.0)).xyz;
                    vec3 lightDir = normalize(lightPosition - vertexPosition);
                    float lambertian = max(dot(lightDir, normal), 0.0);

                    color += lambertian * vertexColor;

                    vec3 viewDir = normalize(-vertexPosition);
                    float spec = pow(max(dot(viewDir, reflect(-lightDir, normal)), 0.0), lightIntensities[i]);

                    color += spec * lightColors[i];
                }
                gl_FragColor = vec4(color, 1.0);
            }
        `,
        attributes: {
            position: regl.prop('positions'),
            normal: regl.prop('normals'),
            color: regl.prop('colors'),
        },
        uniforms: {
            projection: regl.prop('projectionMatrix'),
            view: regl.prop('cameraTransform'),
            model: regl.prop('model'),
            numLights: 1, // Note: max 20 lights
            "lightPositions[0]": [10, 10, 10],
            "lightIntensities[0]": 256,
            "lightColors[0]": [1, 1, 1],
        },
        elements: regl.prop('indices'),
    });
}
