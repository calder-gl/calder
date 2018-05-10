import { mat4 } from 'gl-matrix';
import { flatMap } from 'lodash';
import { BakedGeometry } from '../geometry/BakedGeometry';
import { RenderObject } from '../renderer/interfaces/RenderObject';
import { Node } from './Node';

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
    ): RenderObject[] {
        const matrix = this.transformation.getTransformation();
        mat4.multiply(matrix, coordinateSpace, matrix);

        const renderObjects: RenderObject[] = [
            { ...this.geometry, transform: matrix },
            ...flatMap(this.children, (c: Node) => c.traverse(matrix, makeBones))
        ];

        if (makeBones) {
            this.appendBoneRenderObject(coordinateSpace, renderObjects);
        }

        return renderObjects;
    }
}
