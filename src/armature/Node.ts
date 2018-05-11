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
        vec3.fromValues(0.5, 0.1, 0),
        vec3.fromValues(0.5, 0, -0.1),
        vec3.fromValues(0.5, -0.1, 0),
        vec3.fromValues(0.5, 0, 0.1),
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
     * @returns {NodeRenderObject} The geometry for this armature subtree, and possibly geometry
     * representing the armature itself.
     */
    public traverse(coordinateSpace: mat4, isRoot: boolean, makeBones: boolean): NodeRenderObject {
        return this.traverseChildren(coordinateSpace, isRoot, makeBones).objects;
    }

    /**
     * Generates `RenderObject`s for this node's children, plus a bone for this node, if specified.
     * The current node's transformation matrix is also returned so that additional `RenderObject`s
     * can be added to the result if needed without recomputing this matrix.
     */
    protected traverseChildren(
        parentMatrix: mat4,
        isRoot: boolean,
        makeBones: boolean
    ): { currentMatrix: mat4; objects: NodeRenderObject } {
        const currentMatrix = this.transformation.getTransformation();
        mat4.multiply(currentMatrix, parentMatrix, currentMatrix);

        const objects: NodeRenderObject = this.children.reduce(
            (n: NodeRenderObject, c: Node) => {
                const childRenderObject: NodeRenderObject = c.traverse(
                    currentMatrix,
                    false,
                    makeBones
                );
                n.geometry.push(...childRenderObject.geometry);
                n.bones.push(...childRenderObject.bones);

                return n;
            },
            { geometry: [], bones: [] }
        );

        if (makeBones && !isRoot) {
            objects.bones.push(this.boneRenderObject(parentMatrix));
        }

        return { currentMatrix, objects };
    }

    /**
     * Create a RenderObject visualizing this armature node relative to its parent.
     *
     * @param {mat4} parentMatrix A matrix to translate points into the coordinate space of the
     * parent node.
     *
     * @returns {RenderObject} A RenderObject for a bone stretching from the parent node's origin
     * to the current node's origin.
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
