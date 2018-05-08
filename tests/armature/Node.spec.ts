import { vec3, vec4 } from 'gl-matrix';
import { BakedGeometry } from '../../src/geometry/BakedGeometry';
import { GeometryNode } from '../../src/armature/GeometryNode';
import { Node } from '../../src/armature/Node';
import { RenderObject } from '../../src/renderer/interfaces/RenderObject';
import '../glMatrix';

describe('Node', () => {
    describe('traverse', () => {
        it('traverses and return an array of `RenderObject`', () => {
            const geometry: BakedGeometry = { vertices: [], normals: [], indices: [], colors: [] };
            const geometryChild = new GeometryNode(geometry);
            const nodeChild = new Node([geometryChild]);
            const root = new Node([nodeChild]);

            root.setPosition(vec3.fromValues(1, 0, 0));
            nodeChild.setRotation(vec3.fromValues(Math.PI / 2, 0, 0));

            const inputPoint = vec4.fromValues(0, 1, 0, 1);
            const expectedPoint = vec4.fromValues(1, 0, 1, 1);
            const renderObjects: RenderObject[] = root.traverse();

            expect(renderObjects.length).toBe(1);

            const transformedPoint = vec4.create();
            vec4.transformMat4(transformedPoint, inputPoint, renderObjects[0].transform);
            expect(transformedPoint).toEqualVec4(expectedPoint);
        });
    });
});
