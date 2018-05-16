import { mat4, vec3 } from 'gl-matrix';
import { BakedGeometry } from '../geometry/BakedGeometry';
import { RenderObject } from '../renderer/interfaces/RenderObject';
import { NodeRenderObject } from './NodeRenderObject';
import { Transformation } from './Transformation';
import { vector3 } from '../types/VectorTypes';

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
        indices: [0, 1, 2, 0, 2, 3, 0, 3, 4, 0, 4, 1, 5, 2, 1, 5, 3, 2, 5, 4, 3, 5, 1, 4],

        // Map x, y, z to r, g, b to give a sense of bone orientation
        colors: Node.boneVertices.map((v: vec3) =>
            vec3.fromValues(v[0], v[1] / 0.1 + 0.1, v[2] / 0.1 + 0.1)
        )
    };

    public readonly children: Node[];
    protected transformation: Transformation;
    private points: { [key: string]: Point } = {};

    /**
     * Instantiates a new `Node`.
     *
     * @param {Node[]} children
     */
    constructor(
        children: Node[] = [],
        position: vector3 = vec3.fromValues(0, 0, 0),
        rotation: vector3 = vec3.fromValues(0, 0, 0),
        scale: vector3 = vec3.fromValues(1, 1, 1)
    ) {
        this.children = children;
        this.transformation = new Transformation(position, rotation, scale);
    }

    public createPoint(name: string, position: vec3) {
        // tslint:disable-next-line:no-use-before-declare
        this.points[name] = new Point(this, position);
    }

    public point(name: string): Point {
        const point = this.points[name];
        if (point === undefined) {
            throw new Error(`Could not find a point named ${name}`);
        }

        return point;
    }

    public addChild(child: Node) {
        this.children.push(child);
    }

    /**
     * Gets the node's rotation.
     *
     * @returns {vec3}
     */
    public getRotation(): vec3 {
        return this.transformation.getRotation();
    }

    /**
     * Sets the rotation for the node by updating the private `transformation`
     * property.
     *
     * @param {vec3} rotation
     */
    public setRotation(rotation: vector3) {
        this.transformation.setRotation(rotation);
    }

    /**
     * Gets the node's scale.
     *
     * @returns {vec3}
     */
    public getScale(): vec3 {
        return this.transformation.getScale();
    }

    /**
     * Sets the scale for the node by updating the private `transformation` property.
     *
     * @param {vec3} scale
     */
    public setScale(scale: vector3) {
        this.transformation.setScale(scale);
    }

    /**
     * Gets the node's position.
     *
     * @returns {vec3}
     */
    public getPosition(): vec3 {
        return this.transformation.getPosition();
    }

    /**
     * Sets the position for the node by updating the private `transformation`
     * property.
     *
     * @param {vec3} position
     */
    public setPosition(position: vector3) {
        this.transformation.setPosition(position);
    }

    /**
     * Returns an array of `RenderObject`s denoting `GeometryNode`s
     * transformations multiplied by the `coordinateSpace` parameter.
     *
     * @param {mat4} coordinateSpace The coordinate space this node resides in.
     * @param {boolean} isRoot Whether or not this node is attached to another armature node.
     * @param {boolean} makeBones Whether or not the armature heirarchy should be visualized.
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
            (accum: NodeRenderObject, child: Node) => {
                const childRenderObject: NodeRenderObject = child.traverse(
                    currentMatrix,
                    false,
                    makeBones
                );

                // Merge the geometry and bones from each child into one long list of geometry and
                // one long list of bones for all children
                accum.geometry.push(...childRenderObject.geometry);
                accum.bones.push(...childRenderObject.bones);

                return accum;
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
        const position = this.getPosition();
        const transform: Transformation = new Transformation(
            // Since the bone will start at the parent node's origin, we do not need to translate it
            vec3.fromValues(0, 0, 0),

            // Rotate the bone so it points from the parent node's origin to the current node's
            // origin
            vec3.fromValues(
                0,
                Math.atan2(position[2], position[0]),
                Math.atan2(position[1], position[0])
            ),

            // Scale the bone so its length is equal to the length between the parent node's origin
            // and the current node's origin
            vec3.fromValues(
                Math.sqrt(
                    Math.pow(position[0], 2) + Math.pow(position[1], 2) + Math.pow(position[2], 2)
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
     * @param {mat4} coordinateSpace The coordinate space this node resides in.
     * @param {boolean} isRoot Whether or not this node is attached to another armature node.
     * @param {boolean} makeBones Whether or not the armature heirarchy should be visualized.
     * @returns {NodeRenderObject} The geometry for this armature subtree, and possibly geometry
     * representing the armature itself.
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

/**
 * A point on an armature that other armature nodes can attach to.
 */
class Point {
    public readonly node: Node;
    public readonly position: vec3;

    /**
     * @param {Node} node The node that this point is in the coordinate space of.
     * @param {vec3} position The position of this point relative to its node's origin.
     */
    constructor(node: Node, position: vec3) {
        this.node = node;
        this.position = position;
    }

    /**
     * Attaches the current node to the specified target node at the given point.
     *
     * @param {Point} target The point on another node that the current one should be attached to.
     */
    public stickTo(target: Point) {
        if (target.node === this.node) {
            throw new Error('Cannot attach a point to another point on the same node');
        }
        target.node.addChild(this.node);
        this.node.setPosition(vec3.subtract(vec3.create(), target.position, this.position));
    }

    /**
     * Attaches the specified geometry to the current point on a node.
     *
     * @param {BakedGeometry} geometry The geometry to attach to the current point.
     */
    public attach(geometry: BakedGeometry) {
        const geometryNode = new GeometryNode(geometry);
        geometryNode.setPosition(this.position);
        this.node.addChild(geometryNode);
    }
}
