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

    describe('traverse', () => {
        it("flattens the parent's coordinate space and returns an array of `RenderObject`s", () => {
            const geometry: BakedGeometry = { vertices: [], normals: [], indices: [], colors: [] };
            const geometryChild = new GeometryNode(geometry);
            const nodeChild = new Node([geometryChild]);
            const root = new Node([nodeChild]);

            // Translate the root node 1 unit in the x-direction.
            root.setPosition(vec3.fromValues(1, 0, 0));

            // Rotate this child matrix 90 degrees about the x-axis.
            const rotation = quat.fromEuler(quat.create(), 90, 0, 0);
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
