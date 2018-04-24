import { mat4 } from 'gl-matrix';

// tslint:disable-next-line:import-name
import REGL = require('regl');

/*
 * A collection of the properties needed to render something using the default shader
 */
export interface RenderObject {
    transform: REGL.Mat4;
    vertices: REGL.Vec3[];
    normals: REGL.Vec3[];
    colors: REGL.Vec3[];
    indices: number[];
};

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

interface Props {
    model: REGL.Mat4;
    positions: REGL.Vec3[];
    normals: REGL.Vec3[];
    colors: REGL.Vec3[];
    indices: number[];
};

/**
 * Manages all scene information and is responsible for rendering it to the screen
 */
export class Renderer {
    public readonly width: number;
    public readonly height: number;
    public readonly canvas3D: HTMLCanvasElement;
    public readonly clear: () => void;

    private drawObject: REGL.DrawCommand<REGL.DefaultContext, Props>;
    private cameraTransform: mat4 = mat4.create();
    private projectionMatrix: mat4 = mat4.create();

    constructor(width: number, height: number) {
        this.width = width;
        this.height = height;

        this.canvas3D = document.createElement('canvas');
        this.canvas3D.width = width;
        this.canvas3D.height = height;

        const fieldOfView = Math.PI / 4;
        const aspect = width / height;
        const zNear = 1;
        const zFar = 1000;
        mat4.perspective(this.projectionMatrix, fieldOfView, aspect, zNear, zFar);

        const regl: REGL.Regl = REGL(this.canvas3D);

        this.clear = () => regl.clear({
            color: [0, 0, 0, 1],
            depth: 1,
            stencil: 0
        });

        this.drawObject = regl<Uniforms, Attributes, Props>({
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
                projection: this.projectionMatrix,
                view: this.cameraTransform,
                model: regl.prop('model'),
                numLights: 1, // Note: max 20 lights
                "lightPositions[0]": [10, 10, 10],
                "lightIntensities[0]": 256,
                "lightColors[0]": [1, 1, 1],
            },
            elements: regl.prop('indices'),
        });
    }

    public draw(o: RenderObject) {
        this.drawObject({
            model: o.transform,
            positions: o.vertices,
            normals: o.normals,
            colors: o.colors,
            indices: o.indices,
        });
    }
}
