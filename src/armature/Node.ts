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

    public getRotation(): vec3 {
        return this.transformation.rotation;
    }

    /**
     * Sets the rotation for a particular node by overriding the private `transformation` property.
     *
     * @param {vec3} rotation
     */
    public setRotation(rotation: vec3) {
        this.transformation.rotation = rotation;
    }

    public getScale(): vec3 {
        return this.transformation.scale;
    }

    public setScale(scale: vec3) {
        this.transformation.scale = scale;
    }

    public getPosition(): vec3 {
        return this.transformation.position;
    }

    public setPosition(translation: vec3) {
        this.transformation.position = translation;
    }

    public traverse(coordinateSpace: mat4 = mat4.create()): RenderObject[] {
        const matrix = this.transformation.getTransformation();
        mat4.multiply(matrix, coordinateSpace, matrix);

        return flatMap(this.children, (c: Node) => c.traverse(matrix));
    }
}
