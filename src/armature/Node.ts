import { glMatrix, mat3, mat4, quat, vec3, vec4 } from 'gl-matrix';
import { flatten, flatMap, isNumber } from 'lodash';
import { closestPointOnLine, coord, coordFunc, BakedGeometry, RenderObject } from '../calder';
import { vec3From4, vec3ToPoint } from '../math/utils';
import { matrix4, vector3 } from '../types/InternalVectorTypes';
import { Mapper } from '../utils/mapper';
import { NodeRenderObject } from './NodeRenderObject';
import { Transformation } from './Transformation';

/**
 * A `Node` in a scene-graph.
 */
export class Node {
    private static boneVertices: number[][] = [
        [0, 0, 0],
        [0.5, 0.1, 0],
        [0.5, 0, -0.1],
        [0.5, -0.1, 0],
        [0.5, 0, 0.1],
        [1, 0, 0]
    ];

    private static bone: BakedGeometry = {
        vertices: Float32Array.from(flatten(Node.boneVertices)),
        normals: Float32Array.from(
            flatten([[-1, 0, 0], [0, 1, 0], [0, 0, -1], [0, -1, 0], [0, 0, 1], [1, 0, 0]])
        ),
        indices: Int16Array.from(
            flatten([
                [0, 1, 2],
                [0, 2, 3],
                [0, 3, 4],
                [0, 4, 1],
                [5, 2, 1],
                [5, 3, 2],
                [5, 4, 3],
                [5, 1, 4]
            ])
        ),

        // Map x, y, z to r, g, b to give a sense of bone orientation
        colors: Float32Array.from(
            flatMap(Node.boneVertices, (v: number[]) => [v[0], v[1] / 0.1 + 0.1, v[2] / 0.1 + 0.1])
        )
    };

    public readonly children: Node[];
    protected parent: Node | null = null;
    protected transformation: Transformation = new Transformation();
    private points: { [key: string]: Point } = {};
    private anchor: vec3 | null = null;
    private held: vec3[] = [];
    private grabbed: vec3 | null = null;

    /**
     * Instantiates a new `Node`.
     *
     * @param {Node[]} children
     */
    constructor(
        children: Node[] = [],
        position: vector3 = vec3.fromValues(0, 0, 0),
        rotation: matrix4 = mat4.create(),
        scale: matrix4 = mat4.create()
    ) {
        this.children = children;
        this.transformation = new Transformation(position, rotation, scale);
    }

    public static clone(node: Node): Node {
        const cloned = new Node(
            node.children,
            node.getPosition(),
            node.getRotation(),
            node.getScale()
        );
        cloned.parent = node.parent;
        Object.keys(node.points).forEach((key: string) => {
            cloned.createPoint(key, Mapper.vectorToCoord(node.points[key].position));
        });
        cloned.anchor = node.anchor;

        return cloned;
    }

    public static invalidateBuffers() {
        Node.bone.verticesBuffer = undefined;
        Node.bone.normalsBuffer = undefined;
        Node.bone.indicesBuffer = undefined;
        Node.bone.colorsBuffer = undefined;
    }

    public createPoint(name: string, positionCoord: coord) {
        const position = Mapper.coordToVector(positionCoord);

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

    /**
     * Holds the current node in place at a given point so that it can be manipulated about
     * that point.
     *
     * @param {Point | coord} point The point to be held, either as a local coordinate, or a
     * control point on the current or any other node.
     * @returns {Node} The current node, for method chaining.
     */
    public hold(point: Point | coord): Node {
        this.held.push(this.localPointCoordinate(point));

        return this;
    }

    /**
     * Removes all held points so that new transformation constraints can be applied.
     *
     * @returns {Node} The current node, for method chaining.
     */
    public release(): Node {
        this.held = [];
        this.grabbed = null;

        return this;
    }

    /**
     * Marks a point as grabbed so that it can be used to push or pull the node.
     *
     * @param {Point | coord} point The point to grab.
     * @returns {Node} The current node, for method chaining.
     */
    public grab(point: Point | coord): Node {
        this.grabbed = this.localPointCoordinate(point);

        return this;
    }

    /**
     * Scales the node by the specified amount, either about the node's origin or a single
     * constrained point.
     *
     * @param {number | coord} amount The amount to scale by, either the same in each axis or the
     * components for each axis.
     * @returns {Node} The current node, for method chaining.
     */
    public scale(amount: number | coord): Node {
        const amountVec = isNumber(amount)
            ? vec3.fromValues(amount, amount, amount)
            : Mapper.coordToVector(amount);
        const constrainedPoints: vec3[] = [...this.held];

        // If the node is attached to a parent node with an anchor, add it to the list of
        // constrained points.
        if (this.anchor !== null) {
            constrainedPoints.push(this.anchor);
        }

        if (constrainedPoints.length > 1) {
            throw new Error("Can't scale when more than one point is held!");
        }

        const anchor =
            constrainedPoints.length > 0 ? constrainedPoints[0] : vec3.fromValues(0, 0, 0);

        const incScaling = mat4.fromTranslation(mat4.create(), anchor);

        mat4.scale(incScaling, incScaling, amountVec);

        // Shift the center back again
        mat4.translate(incScaling, incScaling, vec3.sub(vec3.create(), vec3.create(), anchor));

        this.setScale(mat4.multiply(mat4.create(), this.getScale(), incScaling));

        return this;
    }

    /**
     * Rotates the node by the specified amount about the axis defined by two constrained points.
     *
     * @param {number} degrees The amount to rotate, in degrees.
     * @returns {Node} The current node, for method chaining.
     */
    public rotate(degrees: number): Node {
        const constrainedPoints: vec3[] = [...this.held];

        // If the node is attached to a parent node with an anchor, add it to the list of
        // constrained points.
        if (this.anchor !== null) {
            constrainedPoints.push(this.anchor);
        }

        if (constrainedPoints.length !== 2) {
            throw new Error('Two points needs to be held to know which axis to rotate about!');
        }

        const anchor = vec3ToPoint(constrainedPoints[0]);
        const held = vec3ToPoint(constrainedPoints[1]);
        const scaleMatrix = this.getScale();

        // Rotation gets applied before scale, so we want to undo this node's scale before
        // calculating the new rotation
        vec4.transformMat4(anchor, anchor, scaleMatrix);
        vec4.transformMat4(held, held, scaleMatrix);

        // Compute the axis between the two constrained points
        const heldAxis = vec4.sub(vec4.create(), held, anchor);
        vec4.normalize(heldAxis, heldAxis);

        // Move the center of rotation to the anchor
        const incRotation = mat4.fromTranslation(mat4.create(), vec3From4(anchor));

        // Add a rotation equal to the shortest rotation from the vector of the anchor to the grab
        // point to the vector from the anchor to the target point
        mat4.multiply(
            incRotation,
            mat4.fromRotation(mat4.create(), glMatrix.toRadian(degrees), vec3From4(heldAxis)),
            incRotation
        );

        // Shift the center back again
        mat4.translate(
            incRotation,
            incRotation,
            vec3.sub(vec3.create(), vec3.create(), vec3From4(anchor))
        );

        this.setRotation(mat4.multiply(mat4.create(), this.getRotation(), incRotation));

        return this;
    }

    /**
     * Moves the node so that the grabbed point is aligned with the target point.
     *
     * @param {Point | coord} point The point to move to.
     * @returns {Node} The current node, for method chaining.
     */
    public moveTo(point: Point | coord): Node {
        if (this.anchor !== null) {
            throw new Error("Can't move a node that is anchored to a parent!");
        }
        if (this.held.length > 0) {
            throw new Error("Can't move a node when points are held!");
        }

        const grabbed =
            this.grabbed === null
                ? vec4.fromValues(0, 0, 0, 1) // Default to the origin
                : vec4.copy(vec4.create(), vec3ToPoint(this.grabbed));

        // Bring grab point and target into parent coordinate space
        vec4.transformMat4(grabbed, grabbed, this.transformation.getTransformation());
        const target = this.parentPointCoordinate(point);

        // Add the difference to the current position
        this.setPosition(
            Mapper.vectorToCoord(
                vec3.add(
                    vec3.create(),
                    this.getPosition(),
                    vec3.sub(vec3.create(), target, vec3From4(grabbed))
                )
            )
        );

        return this;
    }

    /**
     * Moves the node from the grabbed point in the direction of the target point by a given
     * amount.
     *
     * @param {Point | coord} point The point to move to.
     * @param {number} amount The distance to move by.
     * @returns {Node} The current node, for method chaining.
     */
    public moveTowards(point: Point | coord, amount: number): Node {
        if (this.anchor !== null) {
            throw new Error("Can't move a node that is anchored to a parent!");
        }
        if (this.held.length > 0) {
            throw new Error("Can't move a node when points are held!");
        }

        const grabbed =
            this.grabbed === null
                ? vec4.fromValues(0, 0, 0, 1) // Default to the origin
                : vec4.copy(vec4.create(), vec3ToPoint(this.grabbed));

        // Bring the grab point and target into parent coordinate space
        vec4.transformMat4(grabbed, grabbed, this.transformation.getTransformation());
        const target = this.parentPointCoordinate(point);

        // Get the direction from grab to target, and scale it to the given length
        const toTarget = vec3.sub(vec3.create(), target, vec3From4(grabbed));
        vec3.normalize(toTarget, toTarget);
        vec3.scale(toTarget, toTarget, amount);

        // Add the scaled direction to the current position
        this.setPosition(
            Mapper.vectorToCoord(vec3.add(vec3.create(), this.getPosition(), toTarget))
        );

        return this;
    }

    /**
     * Moves the node by the given amount in parent coordinates.
     *
     * @param {coord} amount The amount to move in each axis.
     * @returns {Node} The current node, for method chaining.
     */
    public moveBy(point: coord): Node {
        if (this.anchor !== null) {
            throw new Error("Can't move a node that is anchored to a parent!");
        }
        if (this.held.length > 0) {
            throw new Error("Can't move a node when points are held!");
        }

        const amount = Mapper.coordToVector(point);

        this.setPosition(Mapper.vectorToCoord(vec3.add(vec3.create(), this.getPosition(), amount)));

        return this;
    }

    /**
     * Given the current constraints on the node, rotates the node to look at a point.
     *
     * @param {Point | coord} point The point to rotate towards.
     */
    public pointAt(point: Point | coord): Node {
        return this.pointAndstretchTo(point, false);
    }

    /**
     * Given the current constraints on the node, rotates the node to look at a point, and stretches
     * the node until it is aligned with the target.
     *
     * @param {Point | coord} point The point to rotate and stretch towards.
     */
    public stretchTo(point: Point | coord): Node {
        return this.pointAndstretchTo(point, true);
    }

    public addChild(child: Node) {
        this.children.push(child);
        child.parent = this;
    }

    /**
     * Sets a fixed point that must not change position. This is like a held point, but it persists
     * between operations. This is used when the node is added as a child of another node.
     *
     * @param {vec3 | null} position The point to fix in place.
     */
    public setAnchor(position: vec3 | null) {
        this.anchor = position;
    }

    /**
     * Gets the node's rotation.
     *
     * @returns {mat4}
     */
    public getRotation(): mat4 {
        return this.transformation.getRotation();
    }

    /**
     * Sets the rotation for the node by updating the private `transformation`
     * property.
     *
     * @param {mat4} rotation
     */
    public setRotation(rotation: matrix4) {
        this.transformation.setRotation(rotation);
    }

    /**
     * Gets the node's scale.
     *
     * @returns {mat4}
     */
    public getScale(): mat4 {
        return this.transformation.getScale();
    }

    /**
     * Sets the scale for the node by updating the private `transformation` property.
     *
     * @param {mat4} scale
     */
    public setScale(scale: matrix4) {
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
    public setPosition(position: coordFunc) {
        this.transformation.setPosition(Mapper.coordToVector(position));
    }

    /**
     * @returns {mat4} A matrix that brings local coordinate into the parent coordinate space.
     */
    public getTransformation(): mat4 {
        return this.transformation.getTransformation();
    }

    /**
     * @internal
     *
     * @returns {Transformation} The transformation for this node separated into its components
     */
    public getRawTransformation(): Transformation {
        return this.transformation;
    }

    /**
     * @internal
     * Sets the transformation for this node, separated into its components
     */
    public setRawTransformation(transformation: Transformation) {
        this.transformation = transformation;
    }

    /**
     * @returns {mat4} A matrix that brings local coordinates into the global coordinate
     * space.
     */
    public localToGlobalTransform(): mat4 {
        const transform = this.transformation.getTransformation();
        if (this.parent !== null) {
            mat4.multiply(transform, this.parent.localToGlobalTransform(), transform);
        }

        return transform;
    }

    /**
     * @returns {mat4} A matrix that brings global coordinates into the local coordinate
     * space.
     */
    public globalToLocalTransform(): mat4 {
        const transform = this.transformation.getTransformation();
        mat4.invert(transform, transform);

        if (this.parent !== null) {
            mat4.multiply(transform, transform, this.parent.globalToLocalTransform());
        }

        return transform;
    }

    /**
     * Returns an array of `RenderObject`s denoting `GeometryNode`s
     * transformations multiplied by the `coordinateSpace` parameter.
     *
     * @param {mat4} coordinateSpace The coordinate space this node resides in.
     * @param {mat3} coordinateSpace The coordinate space this node resides in.
     * @param {boolean} isRoot Whether or not this node is attached to another armature node.
     * @param {boolean} makeBones Whether or not the armature heirarchy should be visualized.
     * @returns {NodeRenderObject} The geometry for this armature subtree, and possibly geometry
     * representing the armature itself.
     */
    public traverse(
        coordinateSpace: mat4,
        normalTransform: mat3,
        isRoot: boolean,
        makeBones: boolean
    ): NodeRenderObject {
        return this.traverseChildren(coordinateSpace, normalTransform, isRoot, makeBones).objects;
    }

    /**
     * Generates `RenderObject`s for this node's children, plus a bone for this node, if specified.
     * The current node's transformation matrix is also returned so that additional `RenderObject`s
     * can be added to the result if needed without recomputing this matrix.
     */
    protected traverseChildren(
        parentMatrix: mat4,
        parentNormalMatrix: mat3,
        isRoot: boolean,
        makeBones: boolean
    ): { currentMatrix: mat4; currentNormalMatrix: mat3; objects: NodeRenderObject } {
        const currentMatrix = this.transformation.getTransformation();
        const currentNormalMatrix = this.transformation.getNormalTransformation();
        mat4.multiply(currentMatrix, parentMatrix, currentMatrix);
        mat3.multiply(currentNormalMatrix, parentNormalMatrix, currentNormalMatrix);

        const objects: NodeRenderObject = this.children.reduce(
            (accum: NodeRenderObject, child: Node) => {
                const childRenderObject: NodeRenderObject = child.traverse(
                    currentMatrix,
                    currentNormalMatrix,
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
            objects.bones.push(this.boneRenderObject(parentMatrix, parentNormalMatrix));
        }

        return { currentMatrix, currentNormalMatrix, objects };
    }

    /**
     * Create a RenderObject visualizing this armature node relative to its parent.
     *
     * @param {mat4} parentMatrix A matrix to translate points into the coordinate space of the
     * parent node.
     * @returns {RenderObject} A RenderObject for a bone stretching from the parent node's origin
     * to the current node's origin.
     */
    protected boneRenderObject(parentMatrix: mat4, parentNormalMatrix: mat3): RenderObject {
        const position = this.getPosition();

        const transform: mat4 = mat4.scale(
            mat4.create(),

            // Rotate the bone so it points from the parent node's origin to the current node's
            // origin
            mat4.fromQuat(
                mat4.create(),
                quat.rotationTo(
                    quat.create(),
                    vec3.fromValues(1, 0, 0),
                    vec3.normalize(vec3.create(), this.transformation.getPosition())
                )
            ),

            // If you have a child node that is also at the root of the parent, then the bone
            // connecting them has length 0 and its transformation matrix can't be inverted. This
            // `max` is to make sure the bone doesn't entirely disappear into two dimensions.
            vec3.fromValues(Math.max(1e-6, vec3.length(position)), 1, 1)
        );
        const transformationMatrix = mat4.create();
        mat4.multiply(transformationMatrix, parentMatrix, transform);
        const localNormal = mat3.normalFromMat4(mat3.create(), transform);
        if (localNormal === null) {
            throw new Error('Transformation matrix could not be inverted!');
        }

        const normalTransform = mat3.multiply(mat3.create(), parentNormalMatrix, localNormal);

        return {
            geometry: Node.bone,
            transform: transformationMatrix,
            normalTransform,
            isShadeless: true
        };
    }

    /**
     * Given a point, convert it into the local coordinate space of the current node.
     *
     * @param {Point | coord} point The point to convert. A raw vec3 is considered to be in global
     * coordinate space.
     * @returns {vec3} The point in the current node's local coordinate space.
     */
    private localPointCoordinate(point: Point | coord): vec3 {
        const pointRelative = vec3ToPoint(
            // tslint:disable-next-line:no-use-before-declare
            point instanceof Point ? point.position : Mapper.coordToVector(point)
        );

        const pointToLocal = mat4.create();

        // tslint:disable-next-line:no-use-before-declare
        if (point instanceof Point && point.node !== this) {
            // If the point was given in a coordinate space other than this node's space, first bring
            // it out of its own node's space into global space
            mat4.multiply(pointToLocal, point.node.localToGlobalTransform(), pointToLocal);
        }

        // tslint:disable-next-line:no-use-before-declare
        if (!(point instanceof Point) || point.node !== this) {
            // If the point was given in a coordenate space other than this node's space, it is now
            // in global space after the previous matrix multiply, so we now need to bring it from
            // global into this node's local space.
            mat4.multiply(pointToLocal, this.globalToLocalTransform(), pointToLocal);
        }

        const local = vec4.transformMat4(vec4.create(), pointRelative, pointToLocal);

        return vec3From4(local);
    }

    /**
     * Given a point, convert it into the parent coordinate space of the current node.
     *
     * @param {Point | coord} point The point to convert. A raw vec3 is considered to be in global
     * coordinate space.
     * @returns {vec3} The point in the current node's parent coordinate space.
     */
    private parentPointCoordinate(point: Point | coord): vec3 {
        const pointRelative = vec3ToPoint(
            // tslint:disable-next-line:no-use-before-declare
            point instanceof Point ? point.position : Mapper.coordToVector(point)
        );

        const pointToParent = mat4.create();

        // tslint:disable-next-line:no-use-before-declare
        if (point instanceof Point && point.node !== this) {
            // If the point was given in a coordinate space other than this node's space, first bring
            // it out of its own node's space into global space
            mat4.multiply(pointToParent, point.node.localToGlobalTransform(), pointToParent);
        }

        // tslint:disable-next-line:no-use-before-declare
        if (this.parent !== null && (!(point instanceof Point) || point.node !== this)) {
            // If the point was given in a coordenate space other than this node's space, it is now
            // in global space after the previous matrix multiply, so we now need to bring it from
            // global into this node's local space.
            mat4.multiply(pointToParent, this.parent.globalToLocalTransform(), pointToParent);
        }

        // tslint:disable-next-line:no-use-before-declare
        if (point instanceof Point && point.node === this) {
            mat4.multiply(pointToParent, this.transformation.getTransformation(), pointToParent);
        }

        const local = vec4.transformMat4(vec4.create(), pointRelative, pointToParent);

        return vec3From4(local);
    }

    /**
     * Given the current constraints on the node, rotates the node to look at a point, and optionally
     * stretches the node until it is aligned with the target.
     *
     * @param {Point | coord} point The point to rotate and stretch towards.
     * @param {boolean} stretch Whether or not to stretch to the target.
     */
    private pointAndstretchTo(point: Point | coord, stretch: boolean): Node {
        if (this.grabbed === null) {
            throw new Error('You must grab a point before pointing it at something');
        }

        // Constrained points must stay in the same location before and after the rotation
        const constrainedPoints: vec3[] = [...this.held];

        // If the node is attached to a parent node with an anchor, add it to the list of
        // constrained points.
        if (this.anchor !== null) {
            constrainedPoints.push(this.anchor);
        }

        // Bring the target point into local coordinates
        const target3 = this.localPointCoordinate(point);

        // Use the last constrained point as an anchor. If this node was attached to a parent, then
        // this will be `this.anchor`. Otherwise, it will be some other arbitrary held point.
        const anchor3 = constrainedPoints.pop();
        if (anchor3 === undefined) {
            throw new Error('At least one point must be held or attached to another node');
        }

        if (constrainedPoints.length === 0) {
            // After having popped one constrained point, if there are no remaining points, then
            // there are two degrees of freedom
            this.rotateTo2Degrees(anchor3, target3, this.grabbed, stretch);
        } else if (constrainedPoints.length === 1) {
            // After having popped one constrained point, if there is another remaining point, then
            // we only have one degree of freedom, so rotation will be about the axis between the
            // anchor point and the remaining constrained point
            this.rotateTo1Degree(anchor3, target3, this.grabbed, constrainedPoints[0], stretch);
        } else {
            throw new Error(
                `There are too many held points (${
                    constrainedPoints.length
                }), so the node can't be rotated`
            );
        }

        return this;
    }

    private rotateTo1Degree(
        anchor3: vec3,
        target3: vec3,
        grabbed3: vec3,
        held3: vec3,
        stretch: boolean
    ) {
        const target = vec3ToPoint(target3);
        const anchor = vec3ToPoint(anchor3);
        const grabbed = vec3ToPoint(grabbed3);
        const scaleMatrix = this.getScale();

        // Compute the axis between the two constrained points
        const heldAxis = vec4.sub(vec4.create(), vec3ToPoint(held3), anchor);
        vec4.normalize(heldAxis, heldAxis);

        // Get the vector from the axis to the grabbed point
        const closestOnAxisToGrab = closestPointOnLine(grabbed, anchor, heldAxis);
        const toGrabbed = vec4.sub(vec4.create(), grabbed, closestOnAxisToGrab);

        // Get the vector from the axis to the target
        const closestOnAxisToTarget = closestPointOnLine(target, anchor, heldAxis);
        const toTarget = vec4.sub(vec4.create(), target, closestOnAxisToTarget);

        // Rotation gets applied before scale, so we want to undo this node's scale before
        // calculating the new rotation
        vec4.transformMat4(toGrabbed, toGrabbed, scaleMatrix);
        vec4.transformMat4(toTarget, toTarget, scaleMatrix);

        // Normalize direction vectors
        const toGrabbed3 = vec3From4(toGrabbed);
        const toTarget3 = vec3From4(toTarget);
        const toGrabbedUnscaled = vec3.copy(vec3.create(), toGrabbed3);
        const toTargetUnscaled = vec3.copy(vec3.create(), toTarget3);
        vec3.normalize(toGrabbed3, toGrabbed3);
        vec3.normalize(toTarget3, toTarget3);

        // Move the center of rotation to the anchor
        const incRotation = mat4.fromTranslation(mat4.create(), vec3From4(anchor));

        // Add a rotation equal to the shortest rotation from the vector of the anchor to the grab
        // point to the vector from the anchor to the target point
        mat4.multiply(
            incRotation,
            mat4.fromQuat(mat4.create(), quat.rotationTo(quat.create(), toGrabbed3, toTarget3)),
            incRotation
        );

        // Shift the center back again
        mat4.translate(
            incRotation,
            incRotation,
            vec3.sub(vec3.create(), vec3.create(), vec3From4(anchor))
        );

        this.setRotation(mat4.multiply(mat4.create(), this.getRotation(), incRotation));

        if (stretch) {
            const scale = vec3.length(toTargetUnscaled) / vec3.length(toGrabbedUnscaled);
            this.scaleAxis(vec3From4(closestOnAxisToGrab), grabbed3, scale);
        }
    }

    private rotateTo2Degrees(anchor3: vec3, target3: vec3, grabbed3: vec3, stretch: boolean) {
        const scaleMatrix = this.getScale();
        const grabbed = vec3ToPoint(grabbed3);
        const target = vec3ToPoint(target3);
        const anchor = vec3ToPoint(anchor3);

        // Rotation gets applied before scale, so we want to undo this node's scale before
        // calculating the new rotation
        vec4.transformMat4(grabbed, grabbed, scaleMatrix);
        vec4.transformMat4(target, target, scaleMatrix);
        vec4.transformMat4(anchor, anchor, scaleMatrix);

        // Create vectors going from the anchor to the
        const toGrabbed = vec4.sub(vec4.create(), grabbed, anchor);
        const toTarget = vec4.sub(vec4.create(), target, anchor);
        const toGrabbedUnscaled = vec4.copy(vec4.create(), toGrabbed);
        const toTargetUnscaled = vec4.copy(vec4.create(), toTarget);

        // Normalize direction vectors
        const toGrabbed3 = vec3From4(toGrabbed);
        const toTarget3 = vec3From4(toTarget);
        vec3.normalize(toGrabbed3, toGrabbed3);
        vec3.normalize(toTarget3, toTarget3);

        // Move the center of rotation to the anchor
        const incRotation = mat4.fromTranslation(mat4.create(), vec3From4(anchor));

        // Add a rotation equal to the shortest rotation from the vector of the anchor to the grab
        // point to the vector from the anchor to the target point
        mat4.multiply(
            incRotation,
            incRotation,
            mat4.fromQuat(mat4.create(), quat.rotationTo(quat.create(), toGrabbed3, toTarget3))
        );

        // Shift the center back again
        mat4.translate(
            incRotation,
            incRotation,
            vec3.sub(vec3.create(), vec3.create(), vec3From4(anchor))
        );

        this.setRotation(mat4.multiply(mat4.create(), this.getRotation(), incRotation));

        if (stretch) {
            const scale = vec4.length(toTargetUnscaled) / vec4.length(toGrabbedUnscaled);
            this.scaleAxis(anchor3, grabbed3, scale);
        }
    }

    /**
     * Scales along an anchor point to a grabbed point by a given amount.
     *
     * @param {vec3} anchor The point the stretch is centered around.
     * @param {vec3} grabbed The point that should stretch to the target.
     * @param {number} scale The amount to scale by
     */
    private scaleAxis(anchor: vec3, grabbed: vec3, scale: number) {
        // Move the center of rotation to the anchor
        const incScaling = mat4.fromTranslation(mat4.create(), anchor);

        const toGrabbedUnscaled = vec3.sub(vec3.create(), grabbed, anchor);

        // Rotate so that the x axis becomes the line from the held axis to the grabbed point
        mat4.multiply(
            incScaling,
            incScaling,
            mat4.fromQuat(
                mat4.create(),
                quat.rotationTo(quat.create(), vec3.fromValues(1, 0, 0), toGrabbedUnscaled)
            )
        );

        // Scale along the held axis
        mat4.multiply(
            incScaling,
            incScaling,
            mat4.fromScaling(mat4.create(), vec3.fromValues(scale, 1, 1))
        );

        // Rotate back
        mat4.multiply(
            incScaling,
            incScaling,
            mat4.fromQuat(
                mat4.create(),
                quat.rotationTo(quat.create(), toGrabbedUnscaled, vec3.fromValues(1, 0, 0))
            )
        );

        // Shift the center back again
        mat4.translate(incScaling, incScaling, vec3.sub(vec3.create(), vec3.create(), anchor));

        this.setScale(mat4.multiply(mat4.create(), this.getScale(), incScaling));
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
    public traverse(
        coordinateSpace: mat4,
        normalTransform: mat3,
        isRoot: boolean,
        makeBones: boolean
    ): NodeRenderObject {
        const { currentMatrix, currentNormalMatrix, objects } = this.traverseChildren(
            coordinateSpace,
            normalTransform,
            isRoot,
            makeBones
        );
        objects.geometry.push({
            geometry: this.geometry,
            transform: currentMatrix,
            normalTransform: currentNormalMatrix
        });

        return objects;
    }
}

/**
 * A point on an armature that other armature nodes can attach to.
 */
export class Point {
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
        this.node.setAnchor(this.position);
        const vecSub = vec3.subtract(vec3.create(), target.position, this.position);
        this.node.setPosition(Mapper.vectorToCoord(vecSub));
    }

    /**
     * Attaches the specified geometry to the current point on a node.
     *
     * @param {BakedGeometry} geometry The geometry to attach to the current point.
     * @returns {GeometryNode} The node created to hold the geometry.
     */
    public attach(geometry: BakedGeometry): GeometryNode {
        const geometryNode = new GeometryNode(geometry);
        geometryNode.setAnchor(vec3.fromValues(0, 0, 0));
        geometryNode.setPosition(Mapper.vectorToCoord(this.position));
        this.node.addChild(geometryNode);

        return geometryNode;
    }
}
