import { mat4, quat, vec3, vec4 } from 'gl-matrix';
import { Armature } from '../../src/armature/Armature';
import { GeometryNode, Node } from '../../src/armature/Node';
import { BakedGeometry } from '../../src/geometry/BakedGeometry';
import { RenderObject } from '../../src/renderer/interfaces/RenderObject';
import '../glMatrix';

const bone = Armature.define((root: Node) => {
    root.createPoint('base', vec3.fromValues(0, 0, 0));
    root.createPoint('tip', vec3.fromValues(0, 1, 0));
});

describe('Node', () => {
    describe('globalToLocalTransform', () => {
        it('does nothing if there is no transform', () => {
            const node = bone();
            const point = vec4.fromValues(1, 0, 0, 1);
            vec4.transformMat4(point, point, node.globalToLocalTransform());

            expect(point).toEqualVec4(vec4.fromValues(1, 0, 0, 1));
        });

        it('respects translations', () => {
            const node = bone();
            node.setPosition(vec3.fromValues(1, 1, 1));

            const point = vec4.fromValues(1, 0, 0, 1);
            vec4.transformMat4(point, point, node.globalToLocalTransform());

            expect(point).toEqualVec4(vec4.fromValues(0, -1, -1, 1));
        });

        it('respects rotations', () => {
            const node = bone();
            node.setRotation(mat4.fromQuat(mat4.create(), quat.fromEuler(quat.create(), 0, 90, 0)));

            const point = vec4.fromValues(1, 0, 0, 1);
            vec4.transformMat4(point, point, node.globalToLocalTransform());

            expect(point).toEqualVec4(vec4.fromValues(0, 0, 1, 1));
        });

        it('respects scale', () => {
            const node = bone();
            node.setScale(vec3.fromValues(2, 1, 1));

            const point = vec4.fromValues(1, 0, 0, 1);
            vec4.transformMat4(point, point, node.globalToLocalTransform());

            expect(point).toEqualVec4(vec4.fromValues(0.5, 0, 0, 1));
        });

        it('works with nested bones', () => {
            const parent = bone();
            const node = bone();
            node.point('base').stickTo(parent.point('tip'));

            const point = vec4.fromValues(1, 0, 0, 1);
            vec4.transformMat4(point, point, node.globalToLocalTransform());

            expect(point).toEqualVec4(vec4.fromValues(1, -1, 0, 1));
        });
    });

    describe('localToGlobalTransform', () => {
        it('does nothing if there is no transform', () => {
            const node = bone();
            const point = vec4.fromValues(1, 0, 0, 1);
            vec4.transformMat4(point, point, node.localToGlobalTransform());

            expect(point).toEqualVec4(vec4.fromValues(1, 0, 0, 1));
        });

        it('respects translations', () => {
            const node = bone();
            node.setPosition(vec3.fromValues(1, 1, 1));

            const point = vec4.fromValues(0, -1, -1, 1);
            vec4.transformMat4(point, point, node.localToGlobalTransform());

            expect(point).toEqualVec4(vec4.fromValues(1, 0, 0, 1));
        });

        it('respects rotations', () => {
            const node = bone();
            node.setRotation(mat4.fromQuat(mat4.create(), quat.fromEuler(quat.create(), 0, 90, 0)));

            const point = vec4.fromValues(0, 0, 1, 1);
            vec4.transformMat4(point, point, node.localToGlobalTransform());

            expect(point).toEqualVec4(vec4.fromValues(1, 0, 0, 1));
        });

        it('respects scale', () => {
            const node = bone();
            node.setScale(vec3.fromValues(2, 1, 1));

            const point = vec4.fromValues(0.5, 0, 0, 1);
            vec4.transformMat4(point, point, node.localToGlobalTransform());

            expect(point).toEqualVec4(vec4.fromValues(1, 0, 0, 1));
        });

        it('works with nested bones', () => {
            const parent = bone();
            const node = bone();
            node.point('base').stickTo(parent.point('tip'));

            const point = vec4.fromValues(1, -1, 0, 1);
            vec4.transformMat4(point, point, node.localToGlobalTransform());

            expect(point).toEqualVec4(vec4.fromValues(1, 0, 0, 1));
        });

        it('works with nested bones with transforms applied', () => {
            const parent = bone();
            parent.setRotation(mat4.fromQuat(mat4.create(), quat.fromEuler(quat.create(), 45, 0, 0)));

            const node = bone();
            node.setRotation(mat4.fromQuat(mat4.create(), quat.fromEuler(quat.create(), 45, 0, 0)));
            node.point('base').stickTo(parent.point('tip'));

            const point = vec4.fromValues(0, 1, 0, 1);
            vec4.transformMat4(point, point, node.localToGlobalTransform());

            expect(point).toEqualVec4(vec4.fromValues(0, Math.sin(Math.PI / 4), 1 + Math.cos(Math.PI / 4), 1));
        });
    });

    describe('stickTo', () => {
        it('positions the current node in the proper position in the parent coordinate space', () => {
            const parent = bone();
            const child = bone();

            child.point('base').stickTo(parent.point('tip'));
            expect(parent.children.length).toBe(1);
            expect(child.getPosition()).toEqualVec3(vec3.fromValues(0, 1, 0));
        });
    });

    describe('attach', () => {
        it('creates a GeometryNode for the attached geometry', () => {
            const parent = bone();
            const geometry: BakedGeometry = { vertices: [], normals: [], indices: [], colors: [] };

            parent.point('tip').attach(geometry);
            expect(parent.children.length).toBe(1);
            expect(parent.children[0].getPosition()).toEqualVec3(vec3.fromValues(0, 1, 0));
        });
    });

    describe('pointAt', () => {
        it('rotates a node about an axis', () => {
            const node = bone();
            node.createPoint('handle', vec3.fromValues(1, 0.5, 0));

            /*
             * Node's control points:
             *
             * X      <-- tip
             * |
             * |----X <-- handle
             * |
             * X      <-- base (at the origin)
             *
             */

            node
                .hold(node.point('base'))
                .hold(node.point('tip'))
                .grab(node.point('handle'))
                .pointAt(vec3.fromValues(0, 0, 2))
                .release();

            expect(node.getRotation()).toEqualMat4(mat4.fromQuat(mat4.create(), quat.fromEuler(quat.create(), 0, -90, 0)));
        });

        it('rotates a node with two degrees of freedom', () => {
            const node = bone();
            node
                .hold(node.point('base'))
                .grab(node.point('tip'))
                .pointAt(vec3.fromValues(0, 0, 2))
                .release();

            expect(node.getRotation()).toEqualMat4(mat4.fromQuat(mat4.create(), quat.fromEuler(quat.create(), 90, 0, 0)));
        });

        it('can rotate a node to look at a global coordinate space point', () => {
            const parent = bone();
            const child = bone();
            child.point('base').stickTo(parent.point('tip'));

            parent
                .hold(parent.point('base'))
                .grab(parent.point('tip'))
                .pointAt(vec3.fromValues(0, 0, -2))
                .release();

            expect(parent.getRotation()).toEqualMat4(mat4.fromQuat(mat4.create(), quat.fromEuler(quat.create(), -90, 0, 0)));

            child
                .grab(child.point('tip'))
                .pointAt(vec3.fromValues(0, 1, -1))
                .release();

            expect(child.getRotation()).toEqualMat4(mat4.fromQuat(mat4.create(), quat.fromEuler(quat.create(), 90, 0, 0)));
        });

        fit('can rotate constrained to an axis a node to look at a point in another node', () => {
            const parent = bone();
            const child = bone();
            child.createPoint('handle', vec3.fromValues(1, 0.5, 0));
            child.point('base').stickTo(parent.point('tip'));

            const targetParent = bone();
            const target = bone();
            target.point('base').stickTo(targetParent.point('tip'));
            targetParent.setPosition(vec3.fromValues(0, -1, -1));

            parent
                .hold(parent.point('base'))
                .grab(parent.point('tip'))
                .pointAt(vec3.fromValues(0, 0, -2))
                .release();

            child
                .grab(child.point('tip'))
                .pointAt(target.point('tip'))
                .release();

            child
                .hold(child.point('tip'))
                .grab(child.point('handle'))
                .pointAt(target.point('tip'))
                .release();

            expect(child.getRotation()).toEqualMat4(mat4.fromQuat(mat4.create(), quat.fromEuler(quat.create(), 90, 0, -90)));
        });

        it('can rotate a node to look at a point in another node', () => {
            const parent = bone();
            const child = bone();
            child.point('base').stickTo(parent.point('tip'));

            const target = bone();
            target.setPosition(vec3.fromValues(0, 0, -1));

            parent
                .hold(parent.point('base'))
                .grab(parent.point('tip'))
                .pointAt(vec3.fromValues(0, 0, -2))
                .release();

            child
                .grab(child.point('tip'))
                .pointAt(target.point('tip'))
                .release();

            expect(child.getRotation()).toEqualMat4(mat4.fromQuat(mat4.create(), quat.fromEuler(quat.create(), 90, 0, 0)));
        });

        it('can rotate a node to look at a point in another node while scaled', () => {
            const node = bone();
            node.setScale(vec3.fromValues(1, 2, 1));
            node.setPosition(vec3.fromValues(4, 0, 0));

            const target = bone();

            // The transformation should be stable, so the rotation should not change
            // when we call `pointAt` multiple times in a row
            for (let i = 0; i < 2; i += 1) {
                node
                    .hold(node.point('base'))
                    .grab(node.point('tip'))
                    .pointAt(target.point('tip'))
                    .release();

                expect(node.getRotation()).toEqualMat4(mat4.fromQuat(mat4.create(), quat.fromEuler(quat.create(), 0, 0, Math.atan2(4, 1) / Math.PI * 180)));
            }
        });

        it('can rotate about a point that isn\'t the origin', () => {
            const node = bone();

            node
                .hold(node.point('tip'))
                .grab(node.point('base'))
                .pointAt(vec3.fromValues(1, 1, 0))
                .release();

            const testPoint = vec4.fromValues(0, 0, 0, 1);
            vec4.transformMat4(testPoint, testPoint, node.localToGlobalTransform());

            expect(testPoint).toEqualVec4(vec4.fromValues(1, 1, 0, 1));
        });
    });

    describe('traverse', () => {
        it("flattens the parent's coordinate space and returns an array of `RenderObject`s", () => {
            const geometry: BakedGeometry = { vertices: [], normals: [], indices: [], colors: [] };
            const geometryChild = new GeometryNode(geometry);
            const nodeChild = new Node([geometryChild]);
            const root = new Node([nodeChild]);

            // Translate the root node 1 unit in the x-direction.
            root.setPosition(vec3.fromValues(1, 0, 0));

            // Rotate this child matrix 90 degrees about the x-axis.
            const rotation = mat4.fromQuat(mat4.create(), quat.fromEuler(quat.create(), 90, 0, 0));
            nodeChild.setRotation(rotation);

            /**
             * Here we're defining a test point and what we expect the result of
             * the transformation on that point should be, so that we can assert
             * that applying the returned transformation yields the expected
             * result.
             *
             * Because it does a translation, and then a rotation, we expect the
             * point that was at 0, 1, 0 should now be at 1, 0, 1.
             */
            const inputPoint = vec4.fromValues(0, 1, 0, 1);
            const expectedPoint = vec4.fromValues(1, 0, 1, 1);

            const renderObjects: RenderObject[] = root.traverse(mat4.create(), true, false)
                .geometry;

            expect(renderObjects.length).toBe(1);

            const transformedPoint = vec4.create();
            vec4.transformMat4(transformedPoint, inputPoint, renderObjects[0].transform);
            expect(transformedPoint).toEqualVec4(expectedPoint);
        });

        it('defaults to no transformation', () => {
            const geometry: BakedGeometry = { vertices: [], normals: [], indices: [], colors: [] };
            const geometryChild = new GeometryNode(geometry);
            const nodeChild = new Node([geometryChild]);
            const root = new Node([nodeChild]);

            /**
             * Here we're defining a test point and what we expect the result of
             * the transformation on that point should be, so that we can assert
             * that applying the returned transformation yields the expected
             * result.
             *
             * Because there are no transformations, we expect the point that
             * was at 0, 1, 0 should still be at 0, 1, 0.
             */
            const inputPoint = vec4.fromValues(0, 1, 0, 1);
            const expectedPoint = vec4.fromValues(0, 1, 0, 1);

            const renderObjects: RenderObject[] = root.traverse(mat4.create(), true, false)
                .geometry;

            expect(renderObjects.length).toBe(1);

            const transformedPoint = vec4.create();
            vec4.transformMat4(transformedPoint, inputPoint, renderObjects[0].transform);
            expect(transformedPoint).toEqualVec4(expectedPoint);
        });

        it('shows bones when asked', () => {
            const geometry: BakedGeometry = { vertices: [], normals: [], indices: [], colors: [] };
            const geometryChild = new GeometryNode(geometry);
            const root = new Node([geometryChild]);

            geometryChild.setPosition(vec3.fromValues(1, 1, 0));

            /**
             * The bone should start at the root position (0, 0, 0) and stretch to the base of the
             * geometry node (1, 1, 0). Here we create a point representing the base of the bone
             * (which is (0, 0, 0) in its relative coordinate space) and the tip of the bone (which
             * is (1, 0, 0)), and the expected positions for these points in world space so that we
             * can assert that the endpoints get transformed to the expected world space points.
             */
            const boneSpaceBase = vec4.fromValues(0, 0, 0, 1);
            const boneSpaceTip = vec4.fromValues(1, 0, 0, 1);

            const expectedWorldSpaceBase = vec4.fromValues(0, 0, 0, 1);
            const expectedWorldSpaceTip = vec4.fromValues(1, 1, 0, 1);

            const bones: RenderObject[] = root.traverse(mat4.create(), true, true).bones;
            expect(bones.length).toBe(1);

            const transformedBase = vec4.create();
            vec4.transformMat4(transformedBase, boneSpaceBase, bones[0].transform);
            expect(transformedBase).toEqualVec4(expectedWorldSpaceBase);

            const transformedTip = vec4.create();
            vec4.transformMat4(transformedTip, boneSpaceTip, bones[0].transform);
            expect(transformedTip).toEqualVec4(expectedWorldSpaceTip);
        });
    });
});
