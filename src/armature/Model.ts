import { mat3, mat4 } from 'gl-matrix';

import { Node } from './Node';
import { NodeRenderObject } from './NodeRenderObject';

type RenderInfo = {
    /**
     * The position transformation matrix for a node's coordinate space.
     */
    currentMatrix: mat4;

    /**
     * The normal transformation matrix for a node's coordinate space.
     */
    currentNormalMatrix: mat3;

    /**
     * The geometry and bones to be rendered from a node.
     */
    objects: NodeRenderObject;
};

/**
 * A set of connected armature nodes, enabling efficient creation of a copy that one can add to
 * without modifying the original. Nodes have connections to the parent that they are connected
 * to and not to their children, so new nodes can be added that refer to parents without the parents
 * needing to be modified.
 */
export class Model {
    /**
     * The collection of connected nodes.
     */
    public readonly nodes: Node[];

    /**
     * Creates a new model.
     *
     * @param {Node[]} nodes A set of nodes which, if passed in, are used to initialize the model.
     */
    constructor(nodes: Node[] = []) {
        this.nodes = nodes;
    }

    /**
     * Creates a new model.
     *
     * @param {Node[]} nodes A set of nodes which, if passed in, are used to initialize the model.
     * @returns {Model} The new model.
     */
    public static create(...nodes: Node[]): Model {
        return new Model(nodes);
    }

    /**
     * @returns A copy of the current model that has all the same nodes, but can be added to.
     */
    public clone() {
        return new Model([...this.nodes]);
    }

    /**
     * Adds a node to the model.
     *
     * @param {Node} node The node to add.
     * @returns Node The added node, for convenience.
     */
    public add(node: Node): Node {
        this.nodes.push(node);

        return node;
    }

    /**
     * @returns {Node} The first node added to the model, which is therefore the root node.
     */
    public root(): Node {
        return this.nodes[0];
    }

    /**
     * @returns {Node} The most recently added node to the model.
     */
    public latest(): Node {
        return this.nodes[this.nodes.length - 1];
    }

    /**
     * Walks through all the nodes in the model, generating buffers to send to the renderer.
     *
     * @param {boolean} makeBones Whether or not to generate buffers for bones in addition to
     * geometry.
     * @returns NodeRenderObject The info needed by the renderer to visualize this model.
     */
    public computeRenderInfo(makeBones: boolean): NodeRenderObject {
        // In order to render a child, we have to know its parent's transformation. We don't want
        // to recompute this any more times than we have to, so we keep a cache of this information
        // for each node in the form of a `RenderInfo`
        const renderCache: Map<Node, RenderInfo> = new Map<Node, RenderInfo>();

        // Nodes yet to be added to the `NodeRenderObject` result.
        const renderStack = [...this.nodes];

        const result: NodeRenderObject = { geometry: [], bones: [] };

        while (renderStack.length > 0) {
            const node = <Node>renderStack.pop();

            if (renderCache.has(node)) {
                continue;
            }

            if (node.parent === null) {
                // If the node has no parent, its parent transforms are identity matrices
                const info = node.computeRenderInfo(mat4.create(), mat3.create(), makeBones);

                // Cache this info so it can be used for the node's children
                renderCache.set(node, info);

                // Add to the result
                result.geometry.push(...info.objects.geometry);
                result.bones.push(...info.objects.bones);
            } else if (renderCache.has(node.parent)) {
                // If the node's parent has already been rendered, we can read its transformation
                // information from the cache
                const { currentMatrix, currentNormalMatrix } = <RenderInfo>renderCache.get(
                    node.parent
                );
                const info = node.computeRenderInfo(currentMatrix, currentNormalMatrix, makeBones);

                // Cache this info so it can be used for the node's children
                renderCache.set(node, info);

                // Add to the result
                result.geometry.push(...info.objects.geometry);
                result.bones.push(...info.objects.bones);
            } else {
                // Otherwise, we need to render the parent before the current node. Add both back
                // to the list, but with the parent closer to the top, so that it gets rendered
                // first.
                renderStack.push(node, node.parent);
            }
        }

        return result;
    }
}
