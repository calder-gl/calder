import { mat4 } from 'gl-matrix';
import { BakedGeometry } from '../geometry/BakedGeometry';
import { RenderObject } from '../renderer/interfaces/RenderObject';
import { Node } from './Node';
import { NodeRenderObject } from './NodeRenderObject';

/**
 * A derived `Node` with an additional `geometry` property.
 */
export class GeometryNode extends Node {
    public readonly geometry: BakedGeometry;

    /**
     * Instantiates a new `GeometryNode`.
     *
     * @param {BakedGeometry} geometry
     * @param {Node[]} children
     */
    constructor(geometry: BakedGeometry, children: Node[] = []) {
        super(children);
        this.geometry = geometry;
    }

    /**
     * Returns an array of `RenderObject`s denoting `GeometryNode`s
     * transformations multiplied by the `coordinateSpace` parameter.
     *
     * @param {mat4} coordinateSpace
     * @returns {RenderObject[]}
     */
    public traverse(
        coordinateSpace: mat4 = mat4.create(),
        makeBones: boolean = false
    ): NodeRenderObject {
        const matrix = this.transformation.getTransformation();
        mat4.multiply(matrix, coordinateSpace, matrix);

        const nodeRenderObject: NodeRenderObject = this.children.reduce(
            (n: NodeRenderObject, c: Node) => {
                const childRenderObject: NodeRenderObject = c.traverse(matrix, makeBones);

                return {
                    renderObjects: [...n.renderObjects, ...childRenderObject.renderObjects],
                    bones: [...n.bones, ...childRenderObject.bones]
                };
            },
            { renderObjects: [], bones: [] }
        );

        const renderObjects: RenderObject[] = [
            { ...this.geometry, transform: matrix },
            ...nodeRenderObject.renderObjects
        ];
        const bones: RenderObject[] = nodeRenderObject.bones;

        if (makeBones) {
            bones.push(this.boneRenderObject(coordinateSpace));
        }

        return { renderObjects, bones };
    }
}
