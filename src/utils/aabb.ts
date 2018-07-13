import { Node, Point } from '../armature/Node';
import { AABB } from '../geometry/BakedGeometry';

import { mat4, vec4 } from 'gl-matrix';

/**
 * Given a GeometryNode, make an axis-aligned bounding box, which consists of a min corner
 * and a max corner.
 */
export function worldSpaceAABB(node: Node, aabb: AABB): AABB {
    const localToGlobalTransform = node.localToGlobalTransform();
    const min = vec4.transformMat4(
        vec4.create(),
        aabb.min,
        localToGlobalTransform
    );
    const max = vec4.transformMat4(
        vec4.create(),
        aabb.max,
        localToGlobalTransform
    );

    return { min, max };
};

export function aabbAtPoint(aabb: AABB, point: Point): AABB {
    const localToGlobalTransform = point.node.localToGlobalTransform();
    mat4.multiply(localToGlobalTransform, localToGlobalTransform, mat4.translate(mat4.create(), mat4.create(), point.position));

    const min = vec4.transformMat4(vec4.create(), aabb.min, localToGlobalTransform);
    const max = vec4.transformMat4(vec4.create(), aabb.max, localToGlobalTransform);

    return { min, max };
}
