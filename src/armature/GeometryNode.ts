import { flatMap } from 'lodash';
import { mat4 } from 'gl-matrix';
import { BakedGeometry } from '../geometry/BakedGeometry';
import { RenderObject } from '../renderer/interfaces/RenderObject';
import { Node } from './Node';

export class GeometryNode extends Node {
    public readonly geometry: BakedGeometry;

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
    public traverse(coordinateSpace: mat4 = mat4.create()): RenderObject[] {
        const matrix = this.transformation.getTransformation();
        mat4.multiply(matrix, coordinateSpace, matrix);

        return [
            { ...this.geometry, transform: matrix },
            ...flatMap(this.children, (c: Node) => c.traverse(matrix))
        ];
    }
}
