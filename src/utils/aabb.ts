import { Node, Point } from '../armature/Node';
import { AABB } from '../geometry/BakedGeometry';

import { mat4, vec4 } from 'gl-matrix';

/**
 * Given a node and a bounding box in the node's coordinate space, return the bounding box in
 * world space.
 *
 * @param {Node} node The node the bounding box is for.
 * @param {AABB} aabb The bounding box to be transformed.
 * @returns {AABB} The bounding box in world space.
 */
export function worldSpaceAABB(node: Node, aabb: AABB): AABB {
    const localToGlobalTransform = node.localToGlobalTransform();
    const min = vec4.transformMat4(vec4.create(), aabb.min, localToGlobalTransform);
    const max = vec4.transformMat4(vec4.create(), aabb.max, localToGlobalTransform);

    return { min, max };
}

/**
 * Given a point and a bounding box, aligns the bounding box to the point and returns the
 * resulting world-space bounding box. This is useful when you know the bounding box for a
 * component and know where the component will spawn and want to find out what the bounding box
 * for the spawned component will be in world-space.
 *
 * @param {AABB} aabb The model-space AABB.
 * @param {Point} point The point to align the AABB to.
 */
export function aabbAtPoint(aabb: AABB, point: Point): AABB {
    const localToGlobalTransform = point.node.localToGlobalTransform();
    mat4.multiply(
        localToGlobalTransform,
        localToGlobalTransform,
        mat4.translate(mat4.create(), mat4.create(), point.position)
    );

    const min = vec4.transformMat4(vec4.create(), aabb.min, localToGlobalTransform);
    const max = vec4.transformMat4(vec4.create(), aabb.max, localToGlobalTransform);

    return { min, max };
}
