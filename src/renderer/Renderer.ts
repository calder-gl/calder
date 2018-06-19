import { mat3, mat4, vec3, vec4 } from 'gl-matrix';
// tslint:disable-next-line:import-name
import REGL = require('regl');
import { NodeRenderObject } from '../armature/NodeRenderObject';
import {
    createDrawAxes,
    createDrawObject,
    Animation,
    Camera,
    Color,
    Constraints,
    DebugParams,
    DrawAxesProps,
    DrawObjectProps,
    Light,
    Node,
    RenderObject,
    RenderParams,
    RGBColor
} from '../calder';

/**
 * Required parameters when defining a `Renderer`.
 */
export type RendererParams = {
    width: number;
    height: number;
    maxLights: number;
    ambientLightColor: Color;
};

/**
 * Manages all scene information and is responsible for rendering it to the screen
 */
export class Renderer {
    public readonly width: number;
    public readonly height: number;
    public readonly maxLights: number;
    public readonly stage: HTMLDivElement;

    public camera: Camera = new Camera();

    private regl: REGL.Regl;

    private clearAll: () => void;
    private clearDepth: () => void;
    private drawObject: REGL.DrawCommand<REGL.DefaultContext, DrawObjectProps>;
    private drawAxes: REGL.DrawCommand<REGL.DefaultContext, DrawAxesProps>;
    private lights: Light[];
    private ambientLight: vec3;

    private projectionMatrix: mat4 = mat4.create();
    private ctx2D: CanvasRenderingContext2D;

    constructor(
        params: RendererParams = {
            width: 0,
            height: 0,
            maxLights: 0,
            ambientLightColor: RGBColor.fromHex('#000000')
        }
    ) {
        this.width = params.width;
        this.height = params.height;
        this.maxLights = params.maxLights;
        this.lights = [];
        this.ambientLight = params.ambientLightColor.asVec();

        // Create a single element to contain the renderer view
        this.stage = document.createElement('div');
        this.stage.style.width = `${this.width}px`;
        this.stage.style.height = `${this.height}px`;
        this.stage.style.position = 'relative';

        const canvas3D: HTMLCanvasElement = document.createElement('canvas');
        const canvas2D: HTMLCanvasElement = document.createElement('canvas');

        // Place both canvases in a container, so we can draw on top of the 3D canvas in 2D
        [canvas3D, canvas2D].forEach((canvas: HTMLCanvasElement) => {
            canvas.width = this.width;
            canvas.height = this.height;
            canvas.style.position = 'absolute';
            this.stage.appendChild(canvas);
        });

        // Set up 2D rendering context, for drawing text
        const ctx2D = canvas2D.getContext('2d');
        if (ctx2D === null) {
            throw new Error("Couldn't get 2D rendering context!");
        }
        this.ctx2D = ctx2D;
        this.ctx2D.font = '14px sans-serif';

        // Set up perspective projection
        const fieldOfView = Math.PI / 4;
        const aspect = this.width / this.height;
        const zNear = 1;
        const zFar = 1000;
        mat4.perspective(this.projectionMatrix, fieldOfView, aspect, zNear, zFar);

        // Set up drawing commands
        this.regl = REGL(canvas3D);

        this.clearAll = () => {
            this.ctx2D.clearRect(0, 0, this.width, this.height);
            this.regl.clear({
                color: [0, 0, 0, 1],
                depth: 1
            });
        };

        this.clearDepth = () =>
            this.regl.clear({
                depth: 1
            });

        this.drawObject = createDrawObject(this.regl, this.maxLights);
        this.drawAxes = createDrawAxes(this.regl);
    }

    public destroy() {
        this.regl.destroy();
        Node.invalidateBuffers();
    }

    public draw(
        objects: Node[],
        debug: DebugParams = { drawAxes: false, drawArmatureBones: false }
    ) {
        this.clearAll();

        const renderObjects = objects.reduce(
            (accum: NodeRenderObject, node: Node) => {
                const childObjects = node.traverse(
                    mat4.create(),
                    mat3.create(),
                    debug.drawArmatureBones === true
                );

                [...childObjects.geometry, ...childObjects.bones].forEach((o: RenderObject) => {
                    if (o.geometry.verticesBuffer === undefined) {
                        o.geometry.verticesBuffer = this.regl.buffer(o.geometry.vertices);
                    }
                    if (o.geometry.normalsBuffer === undefined) {
                        o.geometry.normalsBuffer = this.regl.buffer(o.geometry.normals);
                    }
                    if (o.geometry.colorsBuffer === undefined) {
                        o.geometry.colorsBuffer = this.regl.buffer(o.geometry.colors);
                    }
                    if (o.geometry.indicesBuffer === undefined) {
                        o.geometry.indicesBuffer = this.regl.elements(o.geometry.indices);
                    }
                });

                accum.geometry.push(...childObjects.geometry);
                accum.bones.push(...childObjects.bones);

                return accum;
            },
            { geometry: [], bones: [] }
        );

        const bakedLights = this.lights.map((l: Light) => l.bake());

        this.drawObject(
            renderObjects.geometry.map((o: RenderObject): DrawObjectProps => {
                if (
                    o.geometry.verticesBuffer === undefined ||
                    o.geometry.normalsBuffer === undefined ||
                    o.geometry.colorsBuffer === undefined ||
                    o.geometry.indicesBuffer === undefined
                ) {
                    throw new Error('Buffers were not created correctly');
                }

                return {
                    model: o.transform,
                    normalTransform: o.normalTransform,
                    cameraTransform: this.camera.getTransform(),
                    projectionMatrix: this.projectionMatrix,
                    positions: o.geometry.verticesBuffer,
                    normals: o.geometry.normalsBuffer,
                    colors: o.geometry.colorsBuffer,
                    indices: o.geometry.indicesBuffer,
                    isShadeless: o.isShadeless === true,
                    numLights: this.lights.length,
                    ambientLight: this.ambientLight,
                    lights: bakedLights
                };
            })
        );

        if (debug.drawArmatureBones === true && renderObjects.bones.length > 0) {
            this.clearDepth();

            this.drawObject(
                renderObjects.bones.map((o: RenderObject): DrawObjectProps => {
                    if (
                        o.geometry.verticesBuffer === undefined ||
                        o.geometry.normalsBuffer === undefined ||
                        o.geometry.colorsBuffer === undefined ||
                        o.geometry.indicesBuffer === undefined
                    ) {
                        throw new Error('Buffers were not created correctly');
                    }

                    return {
                        model: o.transform,
                        normalTransform: o.normalTransform,
                        cameraTransform: this.camera.getTransform(),
                        projectionMatrix: this.projectionMatrix,
                        positions: o.geometry.verticesBuffer,
                        normals: o.geometry.normalsBuffer,
                        colors: o.geometry.colorsBuffer,
                        indices: o.geometry.indicesBuffer,
                        isShadeless: o.isShadeless === true,
                        numLights: this.lights.length,
                        ambientLight: this.ambientLight,
                        lights: bakedLights
                    };
                })
            );
        }

        if (debug.drawAxes === true) {
            this.drawCrosshairs();
        }
    }

    /**
     * Adds a light in the `lightPositions` match an entry in the `this.lights` array.
     *
     * @param {Light} light A light source to be added to the rendering context.
     * @throws {RangeError} If the number of lights in `this.lights` would exceed `this.maxLights` by appending another
     *     light to `this.lights`.
     */
    public addLight(light: Light) {
        if (this.lights.length === this.maxLights) {
            throw new RangeError(
                `Number of lights must be less than or equal to maxLights (${this.maxLights}).`
            );
        }
        this.lights.push(light);
    }

    /**
     * Removes a light if the entry passed in matches an entry in the `this.lights` array.
     *
     * @param {Light} light A light source to be removed from the rendering context.
     * @throws {RangeError} If the length of `this.lights` is equal to 0.
     */
    public removeLight(light: Light) {
        if (this.lights.length === 0) {
            throw new RangeError(`Can't remove a light from an empty array.`);
        }
        this.lights.filter((l: Light) => l === light);
    }

    public getLights(): Light[] {
        return this.lights;
    }

    /**
     * For each frame, the draw callback applies all constraints, and calls
     * `draw` on the objects returned by the callback.
     *
     * @param {RenderParams} drawCallback A callback to be applied each frame
     *   that will yield the objects to be rendered each frame.
     */
    public eachFrame(drawCallback: () => RenderParams) {
        const draw = () => {
            const { objects, debugParams } = drawCallback();
            Animation.tick();
            Constraints.getInstance().applyAll();
            this.draw(
                objects,
                debugParams !== undefined
                    ? debugParams
                    : { drawAxes: false, drawArmatureBones: false }
            );

            // Your callback routine must itself call requestAnimationFrame() if
            // you want to animate another frame at the next repaint.
            window.requestAnimationFrame(draw);
        };

        window.requestAnimationFrame(draw);
    }

    private drawCrosshairs() {
        this.clearDepth();

        const [zero, x, y, z] = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1]].map(
            (point: number[]): vec4 => {
                // Initially treat these as vectors (w = 0) instead of points (where w would be 1)
                // so that only the direction changes, and they are not translated from the origin
                const vector = vec4.fromValues(point[0], point[1], point[2], 0);

                // Bring them into camera space
                vec4.transformMat4(vector, vector, this.camera.getTransform());

                // Scale them and place them in the lower left corner of the screen
                vec4.scale(vector, vector, 20);
                vec4.add(vector, vector, [
                    this.width * -0.3,
                    this.height * -0.3,
                    -Math.min(this.width, this.height),
                    1
                ]);

                // Project them into 2D coordinates
                vec4.transformMat4(vector, vector, this.projectionMatrix);

                return vector;
            }
        );

        const redHex = '#FF0000';
        const greenHex = '#00FF00';
        const blueHex = '#0000FF';
        const redRGB = RGBColor.fromHex(redHex).asVec();
        const greenRGB = RGBColor.fromHex(greenHex).asVec();
        const blueRGB = RGBColor.fromHex(blueHex).asVec();

        this.drawAxes([
            {
                positions: [zero, x, zero, y, zero, z],
                colors: [redRGB, redRGB, greenRGB, greenRGB, blueRGB, blueRGB],
                count: 6
            }
        ]);

        // Use the 2D projected points to draw text labels for the axes. To convert the GL 3D point
        // to a point where each element is in [0, 1], we use:
        //   point2D = (point3D / point3D.w + 1) / 2
        // ...and then multiply by the width/height of the screen.
        this.ctx2D.fillStyle = redHex;
        this.ctx2D.fillText(
            'x',
            (x[0] / x[3] + 1) / 2 * this.width,
            (-x[1] / x[3] + 1) / 2 * this.height
        );
        this.ctx2D.fillStyle = greenHex;
        this.ctx2D.fillText(
            'y',
            (y[0] / y[3] + 1) / 2 * this.width,
            (-y[1] / y[3] + 1) / 2 * this.height
        );
        this.ctx2D.fillStyle = blueHex;
        this.ctx2D.fillText(
            'z',
            (z[0] / z[3] + 1) / 2 * this.width,
            (-z[1] / z[3] + 1) / 2 * this.height
        );
    }
}
