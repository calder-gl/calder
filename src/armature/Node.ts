import { flatMap } from 'lodash';
import { mat4, vec3 } from 'gl-matrix';
import { RenderObject } from '../renderer/interfaces/RenderObject';
import { Transformation } from './Transformation';

export class Node {
    public readonly children: Node[];
    protected transformation: Transformation = new Transformation();

    constructor(children: Node[] = []) {
        this.children = children;
    }

    /**
     * Gets the node's rotation.
     *
     * @returns {vec3}
     */
    public getRotation(): vec3 {
        return this.transformation.rotation;
    }

    /**
     * Sets the rotation for the node by updating the private `transformation` property.
     *
     * @param {vec3} rotation
     */
    public setRotation(rotation: vec3) {
        this.transformation.rotation = rotation;
    }

    /**
     * Gets the node's scale.
     *
     * @returns {vec3}
     */
    public getScale(): vec3 {
        return this.transformation.scale;
    }

    /**
     * Sets the scale for the node by updating the private `transformation` property.
     *
     * @param {vec3} scale
     */
    public setScale(scale: vec3) {
        this.transformation.scale = scale;
    }

    /**
     * Gets the node's position.
     *
     * @returns {vec3}
     */
    public getPosition(): vec3 {
        return this.transformation.position;
    }

    /**
     * Sets the position for the node by updating the private `transformation`
     * property.
     *
     * @param {vec3} position
     */
    public setPosition(position: vec3) {
        this.transformation.position = position;
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

        return flatMap(this.children, (c: Node) => c.traverse(matrix));
    }
}
