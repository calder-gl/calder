import { mat4, vec3, vec4 } from 'gl-matrix';
// tslint:disable-next-line:import-name
import REGL = require('regl');
import { NodeRenderObject } from '../armature/NodeRenderObject';
import {
    coord,
    createDrawAxes,
    createDrawGuidingCurve,
    createDrawObject,
    createDrawVectorField,
    Animation,
    BakedGeometry,
    BakedLight,
    Camera,
    Color,
    Constraints,
    DebugParams,
    DrawAxesProps,
    DrawGuidingCurveProps,
    DrawObjectProps,
    DrawVectorFieldProps,
    GuidingCurveInfo,
    Light,
    Model,
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
    backgroundColor: Color;
    willReadPixels?: boolean;
};

const selectedColor = vec3.fromValues(1, 0, 1);
const unselectedColor = vec3.fromValues(1, 1, 1);

const tmpVec4 = vec4.create();

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
    private drawVectorField: REGL.DrawCommand<REGL.DefaultContext, DrawVectorFieldProps>;
    private drawGuidingCurve: REGL.DrawCommand<REGL.DefaultContext, DrawGuidingCurveProps>;
    private lights: Light[];
    private ambientLight: vec3;
    private pickingFramebuffer: REGL.Framebuffer2D;

    // Record all the BakedGeometry seen so that the buffers can be later cleared
    private seenBakedGeometry: Set<BakedGeometry> = new Set<BakedGeometry>();

    // Length four array representing an RGBA color
    private backgroundColorArray: [number, number, number, number];

    private projectionMatrix: mat4 = mat4.create();
    private ctx2D: CanvasRenderingContext2D;

    constructor(
        params: RendererParams = {
            width: 0,
            height: 0,
            maxLights: 0,
            ambientLightColor: RGBColor.fromHex('#000000'),
            backgroundColor: RGBColor.fromHex('#000000'),
            willReadPixels: false
        }
    ) {
        this.width = params.width;
        this.height = params.height;
        this.maxLights = params.maxLights;
        this.lights = [];
        this.ambientLight = params.ambientLightColor.asVec();
        const { willReadPixels = false } = params;

        // Yeah, this is kinda sketchy, but REGL requires a [number, number, number, number] array instead of a number[] array
        const backgroundColorArray = params.backgroundColor.asArray();
        this.backgroundColorArray = [
            backgroundColorArray[0],
            backgroundColorArray[1],
            backgroundColorArray[2],
            1
        ];

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
        this.regl = REGL({
            canvas: canvas3D,
            attributes: { preserveDrawingBuffer: willReadPixels }
        });

        this.clearAll = () => {
            this.ctx2D.clearRect(0, 0, this.width, this.height);
            this.regl.clear({
                color: this.backgroundColorArray,
                depth: 1
            });
        };

        this.clearDepth = () =>
            this.regl.clear({
                depth: 1
            });

        this.drawObject = createDrawObject(this.regl, this.maxLights);
        this.drawAxes = createDrawAxes(this.regl);
        this.drawVectorField = createDrawVectorField(this.regl);
        this.drawGuidingCurve = createDrawGuidingCurve(this.regl);

        this.pickingFramebuffer = this.regl.framebuffer({ width: this.width, height: this.height });
    }

    public destroy() {
        this.cleanBakedGeometryBuffers();
        this.regl.destroy();
        Node.invalidateBuffers();
    }

    public cleanBakedGeometryBuffers() {
        this.seenBakedGeometry.forEach((geometry: BakedGeometry) => {
            if (geometry.verticesBuffer !== undefined) {
                geometry.verticesBuffer.destroy();
                delete geometry.verticesBuffer;
            }
            if (geometry.normalsBuffer !== undefined) {
                geometry.normalsBuffer.destroy();
                delete geometry.normalsBuffer;
            }
            if (geometry.indicesBuffer !== undefined) {
                geometry.indicesBuffer.destroy();
                delete geometry.indicesBuffer;
            }
        });

        this.seenBakedGeometry.clear();
    }

    public draw(
        objects: Model[],
        debug: DebugParams = {
            drawAxes: false,
            drawArmatureBones: false,
            drawVectorField: undefined
        }
    ) {
        this.clearAll();

        const renderObjects = objects.reduce(
            (accum: NodeRenderObject, model: Model) => {
                const childObjects = model.computeRenderInfo(debug.drawArmatureBones === true);

                [...childObjects.geometry, ...childObjects.bones].forEach((o: RenderObject) => {
                    this.seenBakedGeometry.add(o.geometry);

                    if (o.geometry.verticesBuffer === undefined) {
                        o.geometry.verticesBuffer = this.regl.buffer(o.geometry.vertices);
                    }
                    if (o.geometry.normalsBuffer === undefined) {
                        o.geometry.normalsBuffer = this.regl.buffer(o.geometry.normals);
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

        this.drawObjectArray(renderObjects.geometry, bakedLights);

        if (debug.drawArmatureBones === true && renderObjects.bones.length > 0) {
            this.clearDepth();

            this.drawObjectArray(renderObjects.bones, bakedLights);
        }

        if (debug.drawVectorField !== undefined) {
            this.drawField(debug.drawVectorField);
        }
        if (debug.drawGuidingCurve !== undefined) {
            this.drawCurve(debug.drawGuidingCurve);
        }
        if (debug.drawPencilLine !== undefined) {
            this.drawPencilLine(debug.drawPencilLine);
        }
        if (debug.drawAxes === true) {
            this.drawCrosshairs();
        }
    }

    public drawObjectArray(objects: RenderObject[], bakedLights: BakedLight[]) {
        this.drawObject(
            objects.map((o: RenderObject): DrawObjectProps => {
                if (
                    o.geometry.verticesBuffer === undefined ||
                    o.geometry.normalsBuffer === undefined ||
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
                    indices: o.geometry.indicesBuffer,
                    materialColor: o.geometry.material.materialColor,
                    materialShininess: o.geometry.material.materialShininess,
                    isShadeless: o.isShadeless === true,
                    numLights: this.lights.length,
                    ambientLight: this.ambientLight,
                    lights: bakedLights
                };
            })
        );
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
     * @param {GuidingCurveInfo[]} curves The curves to check.
     * @param {{x: number; y: number}} cursor The location in screen space of the mouse cursor.
     * @returns {number | null} The index of the guiding curve under the mouse cursor, if there
     * is one, or null otherwise.
     */
    public findCurveUnderCursor(
        curves: GuidingCurveInfo[],
        cursor: { x: number; y: number }
    ): number | null {
        let selectedIndex: number | null = null;

        // Use an offscreen framebuffer so the user doesn't see any of this happening
        this.pickingFramebuffer.use(() => {
            // Clear the buffer to the highest index to represent no curve
            this.regl.clear({ depth: 1, color: [1, 1, 1, 1] });

            // Draw the curves indices to the screen, thicker than usual to increase the
            // size of the clickable region
            this.drawGuidingCurve(
                curves.map((curve: GuidingCurveInfo, index: number) => {
                    // We want to see which curve is under the mouse pointer, so rather than render
                    // its actual colour, we want to render its index. This means we need to pack
                    // the curve index into a colour.
                    // tslint:disable:no-bitwise
                    const r = (index & 0xff) / 255;
                    const g = ((index >> 8) & 0xff) / 255;
                    const b = ((index >> 16) & 0xff) / 255;

                    return {
                        cameraTransform: this.camera.getTransform(),
                        projectionMatrix: this.projectionMatrix,
                        positions: curve.path,
                        thickness: 40,
                        color: vec3.fromValues(r, g, b)
                    };
                })
            );

            // Read the one pixel from under the
            const data = this.regl.read({
                x: cursor.x,
                y: this.height - cursor.y,
                width: 1,
                height: 1
            });

            // Unpack the colour data from the selected pixel to get an index
            const readIndex = data[0] + (data[1] << 8) + (data[2] << 16);
            if (readIndex < curves.length) {
                selectedIndex = readIndex;
            }
        });

        return selectedIndex;
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

    public pointInScreenSpace(point: coord): { x: number; y: number } {
        const vector = vec4.set(tmpVec4, point.x, point.y, point.z, 1);

        // Bring the point into camera space
        vec4.transformMat4(vector, vector, this.camera.getTransform());

        // Bring the point into screen space
        vec4.transformMat4(vector, vector, this.projectionMatrix);

        // Bring into device coordinates
        const x = (vector[0] / vector[3] + 1) / 2 * this.width;
        const y = (-vector[1] / vector[3] + 1) / 2 * this.height;

        return { x, y };
    }

    /**
     * @returns {Uint8Array} Pixel data for the current scene.
     * @throws {Error} When this method is called after the render event exits.
     */
    public getPixelData() {
        return this.regl.read();
    }

    private drawCurve(curves: GuidingCurveInfo[]) {
        this.drawGuidingCurve(
            curves.map((curve: GuidingCurveInfo) => {
                return {
                    cameraTransform: this.camera.getTransform(),
                    projectionMatrix: this.projectionMatrix,
                    positions: curve.path,
                    thickness: 8,
                    color: curve.selected ? selectedColor : unselectedColor
                };
            })
        );

        const selectedCurve = curves.find((curve: GuidingCurveInfo) => curve.selected);
        if (selectedCurve !== undefined) {
            this.drawSelectedCurveControls(selectedCurve);
        }
    }

    private drawSelectedCurveControls(curve: GuidingCurveInfo) {
        const points = curve.bezier.points;
        const screenSpacePoints = points.map((point: BezierJs.Point) =>
            this.pointInScreenSpace(<coord>point)
        );

        this.ctx2D.fillStyle = '#FFF';
        this.ctx2D.strokeStyle = '#F0F';
        this.ctx2D.lineWidth = 3;

        // Draw a line between endpoints and control points
        [1, screenSpacePoints.length - 1].forEach((i: number) => {
            this.ctx2D.beginPath();
            this.ctx2D.moveTo(screenSpacePoints[i].x, screenSpacePoints[i].y);
            this.ctx2D.lineTo(screenSpacePoints[i - 1].x, screenSpacePoints[i - 1].y);
            this.ctx2D.stroke();
        });

        // Draw a circle for the control point handle
        const radius = 3;
        screenSpacePoints.forEach((point: { x: number; y: number }) => {
            this.ctx2D.beginPath();
            this.ctx2D.arc(point.x, point.y, radius, 0, Math.PI * 2);
            this.ctx2D.stroke();
            this.ctx2D.fill();
        });
    }

    private drawPencilLine(polyline: { x: number; y: number }[]) {
        if (polyline.length === 0) {
            return;
        }

        this.ctx2D.strokeStyle = '#F0F';
        this.ctx2D.lineWidth = 2;

        this.ctx2D.beginPath();
        this.ctx2D.moveTo(polyline[0].x, polyline[0].y);

        for (let i = 1; i < polyline.length; i += 1) {
            this.ctx2D.lineTo(polyline[i].x, polyline[i].y);
        }

        this.ctx2D.stroke();
    }

    private drawField(field: Float32Array) {
        this.drawVectorField({
            cameraTransform: this.camera.getTransform(),
            projectionMatrix: this.projectionMatrix,
            positions: field
        });
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
