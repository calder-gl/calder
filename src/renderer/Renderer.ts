import { drawAxes, DrawAxesProps } from './commands/drawAxes';
import { drawObject, DrawObjectProps } from './commands/drawObject';

import { mat4, vec4 } from 'gl-matrix';

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

/**
 * Manages all scene information and is responsible for rendering it to the screen
 */
export class Renderer {
    public readonly width: number;
    public readonly height: number;
    public readonly stage: HTMLDivElement;

    private clearAll: () => void;
    private clearDepth: () => void;
    private drawObject: REGL.DrawCommand<REGL.DefaultContext, DrawObjectProps>;
    private drawAxes: REGL.DrawCommand<REGL.DefaultContext, DrawAxesProps>;

    private cameraTransform: mat4 = mat4.create();
    private projectionMatrix: mat4 = mat4.create();
    private ctx2D: CanvasRenderingContext2D;

    constructor(width: number, height: number) {
        this.width = width;
        this.height = height;

        // Create 
        this.stage = document.createElement('div');
        this.stage.style.width = `${width}px`;
        this.stage.style.height = `${width}px`;
        this.stage.style.position = 'relative';

        const canvas3D = document.createElement('canvas');
        const canvas2D = document.createElement('canvas');

        // Place both canvases in a container, so we can draw on top of the 3D canvas in 2D
        [canvas3D, canvas2D].forEach((canvas: HTMLCanvasElement) => {
            canvas.width = width;
            canvas.height = height;
            canvas.style.position = 'absolute';
            this.stage.appendChild(canvas);
        });

        // Set up 2D rendering context, for drawing text
        const ctx2D = canvas2D.getContext('2d');
        if (!ctx2D) {
            throw new Error('Couldn\'t get 2D rendering context!');
        }
        this.ctx2D = ctx2D;
        this.ctx2D.font = '14px sans-serif';

        // Set up perspective projection
        const fieldOfView = Math.PI / 4;
        const aspect = width / height;
        const zNear = 1;
        const zFar = 1000;
        mat4.perspective(this.projectionMatrix, fieldOfView, aspect, zNear, zFar);

        // Set up drawing commands
        const regl: REGL.Regl = REGL(canvas3D);

        this.clearAll = () => {
            this.ctx2D.clearRect(0, 0, this.width, this.height);
            regl.clear({
                color: [0, 0, 0, 1],
                depth: 1,
            });
        };

        this.clearDepth = () => regl.clear({
            depth: 1,
        });

        this.drawObject = drawObject(regl);
        this.drawAxes = drawAxes(regl);
    }

    public draw(objects: RenderObject[], debug: boolean = false) {
        this.clearAll();

        objects.forEach((o: RenderObject) => this.drawObject({
            model: o.transform,
            cameraTransform: this.cameraTransform,
            projectionMatrix: this.projectionMatrix,
            positions: o.vertices,
            normals: o.normals,
            colors: o.colors,
            indices: o.indices,
        }));

        if (debug) {
            this.drawCrosshairs();
        }
    }

    private drawCrosshairs() {
        this.clearDepth();

        const [zero, x, y, z] = [
            [0, 0, 0],
            [1, 0, 0],
            [0, 1, 0],
            [0, 0, 1],
        ].map((point: number[]) => {
            // Initially treat these as vectors (w = 0) instead of points (where w would be 1) so that only the direction changes, and they are not translated from the origin
            const vector = vec4.fromValues(point[0], point[1], point[2], 0);

            // Bring them into camera space
            vec4.transformMat4(vector, vector, this.cameraTransform);

            // Scale them and place them in the lower left corner of the screen
            vec4.scale(vector, vector, Math.min(this.width, this.height) * 0.05);
            vec4.add(vector, vector, [this.width * -0.25, this.height * -0.25, -500, 1]);

            // Project them into 2D coordinates
            vec4.transformMat4(vector, vector, this.projectionMatrix);

            return vector;
        });

        const colorX = [1, 0, 0];
        const colorY = [0, 1, 0];
        const colorZ = [0, 0, 1];

        this.drawAxes({
            positions: [
                zero,
                x,
                zero,
                y,
                zero,
                z,
            ],
            colors: [
                colorX,
                colorX,
                colorY,
                colorY,
                colorZ,
                colorZ,
            ],
            count: 6,
        });

        // Use the 2D projected points to draw text labels for the axes. To convert the GL 3D point to a point where each element is in [0, 1], we use point2D = (point3D / point3D.w + 1) / 2, and then multiply by the width/height of the screen.
        this.ctx2D.fillStyle = '#FF0000';
        this.ctx2D.fillText('x', (x[0] / x[3] + 1) / 2 * this.width, (-x[1] / x[3] + 1) / 2 * this.height);
        this.ctx2D.fillStyle = '#00FF00';
        this.ctx2D.fillText('y', (y[0] / y[3] + 1) / 2 * this.width, (-y[1] / y[3] + 1) / 2 * this.height);
        this.ctx2D.fillStyle = '#0000FF';
        this.ctx2D.fillText('z', (z[0] / z[3] + 1) / 2 * this.width, (-z[1] / z[3] + 1) / 2 * this.height);
    }
}
