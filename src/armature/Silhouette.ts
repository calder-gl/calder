import { BakedGeometry, GeometryNode, Node } from '../calder';
import { Cost, CostFn, GeneratorInstance } from './Generator';

import { mat4 } from 'gl-matrix';

// tslint:disable-next-line:import-name
import REGL = require('regl');

interface Uniforms {
    model: mat4;
    projection: mat4;
}

interface Attributes {
    position: Float32Array;
}

interface Props {
    model: mat4;
    projection: mat4;
    positions: REGL.Buffer;
    indices: REGL.Elements;
}

function createRenderSilhouette(regl: REGL.Regl) {
    return regl<Uniforms, Attributes, Props>({
        vert: `
            precision mediump float;

            attribute vec3 position;
            uniform mat4 projection;
            uniform mat4 view;
            uniform mat4 model;

            void main() {
                vec4 movedPosition = model * vec4(position, 1.0);

                // Move each vertex back and down (apply a camera position)
                movedPosition = movedPosition + vec4(0.0, -4.5, -10.0, 0.0);

                // Flip the model vertically to match the target image data
                movedPosition = movedPosition * vec4(1.0, -1.0, 1.0, 1.0);

                gl_Position = projection * movedPosition;
            }
        `,

        frag: `
            precision mediump float;

            void main() {
                gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
            }
        `,

        attributes: {
            position: regl.prop<Props, keyof Props>('positions')
        },

        uniforms: {
            projection: regl.prop<Props, keyof Props>('projection'),
            model: regl.prop<Props, keyof Props>('model')
        },

        elements: regl.prop<Props, keyof Props>('indices')
    });
}

/**
 * A cost function where instances incur cost when their silhouette does not overlap
 * with a specified target image.
 */
export class Silhouette implements CostFn {
    private regl: REGL.Regl;
    private target: ImageData;
    private renderSilhouette: REGL.DrawCommand<REGL.DefaultContext, Props>;
    private projection: mat4 = mat4.create();
    private fbo: REGL.Framebuffer2D;

    // We can't use the buffers stored on BakedGeometry since those are for the
    // main renderer and aren't valid buffer object references in this context
    private positionBuffers: Map<BakedGeometry, REGL.Buffer> = new Map();
    private indicesBuffers: Map<BakedGeometry, REGL.Elements> = new Map();

    private lastImage: Map<Node, Uint8Array> = new Map();

    private debug: boolean;
    private ctx: CanvasRenderingContext2D;

    constructor(target: ImageData, debug: boolean) {
        const canvas: HTMLCanvasElement = document.createElement('canvas');
        this.regl = REGL(canvas);
        this.fbo = this.regl.framebuffer({ width: target.width, height: target.height });

        this.target = target;
        this.renderSilhouette = createRenderSilhouette(this.regl);

        const fieldOfView = Math.PI / 4;
        const aspect = this.target.width / this.target.height;
        const zNear = 1;
        const zFar = 1000;
        mat4.perspective(this.projection, fieldOfView, aspect, zNear, zFar);

        this.debug = debug;
        const canvas2D = document.createElement('canvas');
        canvas2D.width = target.width;
        canvas2D.height = target.height;
        this.ctx = <CanvasRenderingContext2D>canvas2D.getContext('2d');
        if (debug) {
            document.body.appendChild(canvas2D);
        }
    }

    public getCost(instance: GeneratorInstance, added: Node[]): Cost {
        const startIndex = instance.getModel().nodes.length - added.length;

        const data = new Uint8Array(this.target.width * this.target.height * 4);

        const addedGeometry: GeometryNode[] = [];
        instance
            .getModel()
            .nodes.slice(startIndex)
            .forEach((n: Node) => n.geometryCallback((g: GeometryNode) => addedGeometry.push(g)));

        this.fbo.use(() => {
            this.regl.clear({
                color: [1, 1, 1, 1],
                depth: 1
            });

            this.renderSilhouette(
                addedGeometry.map((g: GeometryNode) => {
                    if (this.positionBuffers.get(g.geometry) === undefined) {
                        this.positionBuffers.set(g.geometry, this.regl.buffer(g.geometry.vertices));
                    }
                    if (this.indicesBuffers.get(g.geometry) === undefined) {
                        this.indicesBuffers.set(g.geometry, this.regl.elements(g.geometry.indices));
                    }

                    return {
                        model: g.localToGlobalTransform(),
                        projection: this.projection,
                        positions: this.positionBuffers.get(g.geometry),
                        indices: this.indicesBuffers.get(g.geometry)
                    };
                })
            );

            this.regl.read(data);
        });

        const lastNodeInParent = instance.getModel().nodes[startIndex - 1];
        const parentImage = this.lastImage.get(lastNodeInParent);

        let difference = 0;
        let costViz: Uint8ClampedArray | undefined;
        if (this.debug) {
            costViz = new Uint8ClampedArray(this.target.width * this.target.height * 4);
        }
        for (let x = 0; x < this.target.width; x += 1) {
            for (let y = 0; y < this.target.height; y += 1) {
                const index = y * this.target.width * 4 + x * 4;

                if (parentImage !== undefined) {
                    data[index] = Math.min(data[index], parentImage[index]);
                }

                if (costViz !== undefined) {
                    costViz[index] = 255;
                    costViz[index + 1] = 255;
                    costViz[index + 2] = 255;
                    costViz[index + 3] = 255;
                }

                const incrementalDifference = this.target.data[index] - data[index];

                // Only have a penalty for not going into a black area of the target;
                // SOSMC should help ensure we don't go into the white region since
                // it adds no benefit
                if (incrementalDifference < 0) {
                    difference -= incrementalDifference;

                    if (costViz !== undefined) {
                        costViz[index + 1] = incrementalDifference + 255;
                        costViz[index + 2] = incrementalDifference + 255;
                    }
                }
            }
        }

        this.lastImage.set(instance.getModel().nodes[instance.getModel().nodes.length - 1], data);

        if (costViz !== undefined) {
            this.ctx.putImageData(
                new ImageData(costViz, this.target.width, this.target.height),
                0,
                0
            );
        }

        const normalizedDifference = difference / (this.target.width * this.target.height * 255);

        return { realCost: normalizedDifference * 1200 - 150, heuristicCost: 0 };
    }

    public done() {
        this.regl.destroy();
    }
}
