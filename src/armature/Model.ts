import { mat3, mat4 } from 'gl-matrix';

import { Node } from './Node';
import { NodeRenderObject } from './NodeRenderObject';

type RenderInfo = { currentMatrix: mat4; currentNormalMatrix: mat3; objects: NodeRenderObject };

export class Model {
    public readonly nodes: Node[];

    constructor(nodes: Node[] = []) {
        this.nodes = nodes;
    }

    public static create(...nodes: Node[]): Model {
        return new Model(nodes);
    }

    public clone() {
        return new Model([...this.nodes]);
    }

    public add(node: Node): Node {
        this.nodes.push(node);

        return node;
    }

    public root(): Node {
        return this.nodes[0];
    }

    public traverse(makeBones: boolean): NodeRenderObject {
        const renderCache: Map<Node, RenderInfo> = new Map<Node, RenderInfo>();
        const renderQueue = [...this.nodes];

        const result: NodeRenderObject = { geometry: [], bones: [] };

        while (renderQueue.length > 0) {
            const node = <Node>renderQueue.pop();

            if (renderCache.has(node)) {
                continue;
            }

            if (node.parent === null) {
                const info = node.traverse(mat4.create(), mat3.create(), makeBones);
                renderCache.set(node, info);
                result.geometry.push(...info.objects.geometry);
                result.bones.push(...info.objects.bones);
            } else if (renderCache.has(node.parent)) {
                const { currentMatrix, currentNormalMatrix } = <RenderInfo>renderCache.get(
                    node.parent
                );
                const info = node.traverse(currentMatrix, currentNormalMatrix, makeBones);
                renderCache.set(node, info);
                result.geometry.push(...info.objects.geometry);
                result.bones.push(...info.objects.bones);
            } else {
                renderQueue.push(node, node.parent);
            }
        }

        return result;
    }
}
