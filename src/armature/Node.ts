import { mat4, vec3 } from 'gl-matrix';
import { BakedGeometry } from '../geometry/BakedGeometry';
import { RenderObject } from '../renderer/interfaces/RenderObject';
import { NodeRenderObject } from './NodeRenderObject';
import { Transformation } from './Transformation';

/**
 * A `Node` in a scene-graph.
 */
export class Node {
    private static boneVertices: vec3[] = [
        vec3.fromValues(0, 0, 0),
        vec3.fromValues(0.5, 0.25, 0),
        vec3.fromValues(0.5, 0, -0.25),
        vec3.fromValues(0.5, -0.25, 0),
        vec3.fromValues(0.5, 0, 0.25),
        vec3.fromValues(1, 0, 0)
    ];

    private static bone: BakedGeometry = {
        vertices: Node.boneVertices,
        normals: [
            vec3.fromValues(-1, 0, 0),
            vec3.fromValues(0, 1, 0),
            vec3.fromValues(0, 0, -1),
            vec3.fromValues(0, -1, 0),
            vec3.fromValues(0, 0, 1),
            vec3.fromValues(1, 0, 0)
        ],
        indices: [0, 1, 2, 0, 2, 3, 0, 3, 4, 5, 2, 1, 5, 3, 2, 5, 4, 3],
        colors: Node.boneVertices.map(() => vec3.fromValues(1, 1, 1))
    };

    public readonly children: Node[];
    protected transformation: Transformation = new Transformation();

    /**
     * Instantiates a new `Node`.
     *
     * @param {Node[]} children
     */
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
     * Sets the rotation for the node by updating the private `transformation`
     * property.
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

        const renderObjects: RenderObject[] = nodeRenderObject.renderObjects;
        const bones: RenderObject[] = nodeRenderObject.bones;

        if (makeBones) {
            bones.push(this.boneRenderObject(coordinateSpace));
        }

        return { renderObjects, bones };
    }

    /**
     * TODO:
     */
    protected boneRenderObject(parentMatrix: mat4): RenderObject {
        const transform: Transformation = new Transformation(
            vec3.fromValues(0, 0, 0),
            vec3.fromValues(
                0,
                Math.atan2(this.transformation.position[2], this.transformation.position[0]),
                Math.atan2(this.transformation.position[1], this.transformation.position[0])
            ),
            vec3.fromValues(
                Math.sqrt(
                    Math.pow(this.transformation.position[0], 2) +
                        Math.pow(this.transformation.position[1], 2) +
                        Math.pow(this.transformation.position[2], 2)
                ),
                1,
                1
            )
        );
        const transformationMatrix = mat4.create();
        mat4.multiply(transformationMatrix, parentMatrix, transform.getTransformation());

        return { ...Node.bone, transform: transformationMatrix, isShadeless: true };
    }
}
