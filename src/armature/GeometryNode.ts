import { mat4 } from 'gl-matrix';
import { BakedGeometry } from '../geometry/BakedGeometry';
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
    public traverse(coordinateSpace: mat4, isRoot: boolean, makeBones: boolean): NodeRenderObject {
        const { currentMatrix, objects } = this.traverseChildren(
            coordinateSpace,
            isRoot,
            makeBones
        );
        objects.geometry.push({ ...this.geometry, transform: currentMatrix });

        return objects;
    }
}
