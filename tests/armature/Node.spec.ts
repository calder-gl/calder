import { vec3, vec4 } from 'gl-matrix';
import { GeometryNode } from '../../src/armature/GeometryNode';
import { Node } from '../../src/armature/Node';
import { BakedGeometry } from '../../src/geometry/BakedGeometry';
import { RenderObject } from '../../src/renderer/interfaces/RenderObject';
import '../glMatrix';

describe('Node', () => {
    describe('traverse', () => {
        it("flattens the parent's coordinate space and returns an array of `RenderObject`s", () => {
            const geometry: BakedGeometry = { vertices: [], normals: [], indices: [], colors: [] };
            const geometryChild = new GeometryNode(geometry);
            const nodeChild = new Node([geometryChild]);
            const root = new Node([nodeChild]);

            // Translate the root node 1 unit in the x-direction.
            root.setPosition(vec3.fromValues(1, 0, 0));

            // Rotate this child matrix 90 degrees about the x-axis.
            nodeChild.setRotation(vec3.fromValues(Math.PI / 2, 0, 0));

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

            const renderObjects: RenderObject[] = root.traverse().renderObjects;

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

            const renderObjects: RenderObject[] = root.traverse().renderObjects;

            expect(renderObjects.length).toBe(1);

            const transformedPoint = vec4.create();
            vec4.transformMat4(transformedPoint, inputPoint, renderObjects[0].transform);
            expect(transformedPoint).toEqualVec4(expectedPoint);
        });
    });
});
