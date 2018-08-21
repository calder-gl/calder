import { Armature, Model, Node, RGBColor, Shape } from '../../src/calder';

const bone = Armature.define((root: Node) => {
    root.createPoint('base', { x: 0, y: 0, z: 0 });
    root.createPoint('tip', { x: 0, y: 1, z: 0 });
});

describe('Model', () => {
    describe('exportOBJ', () => {
        it('generates the expected file for a simple shape', () => {
            const model = Model.create(bone());
            model.add(
                model
                    .root()
                    .point('base')
                    .attach(Shape.sphere())
            );
            const exported = model.exportOBJ('model', RGBColor.fromHex('#000000'));

            // Assert that the given name was used for the model and material
            expect(exported.obj).toEqual(expect.stringMatching(new RegExp('^o model', 'm')));
            expect(exported.obj).toEqual(
                expect.stringMatching(new RegExp('^mtllib model.mtl', 'm'))
            );

            // Check that there is a vertex normal for every vertex
            const vertices = exported.obj.match(new RegExp('^v .*$', 'mg'));
            const normals = exported.obj.match(new RegExp('^vn .*$', 'mg'));
            expect(vertices).not.toBeNull();
            expect(normals).not.toBeNull();
            expect(vertices !== null ? vertices.length : 0).toEqual(
                normals !== null ? normals.length : 0
            );

            const faceRegex = new RegExp('^f (\\d+) (\\d+) (\\d+)$', 'mg');

            // Iterate over each face
            let match: string[] | null = null;
            do {
                match = faceRegex.exec(exported.obj);
                if (match !== null) {
                    for (let i = 1; i <= 3; i += 1) {
                        // Check that faces all refer to real vertices
                        const vertex = parseInt(match[i], 10);
                        expect(vertex).toBeGreaterThan(0);
                        expect(vertex).toBeLessThanOrEqual(vertices !== null ? vertices.length : 0);
                    }
                }
            } while (match !== null);

            // Check that a material was produced
            expect(exported.mtl).toEqual(
                expect.stringMatching(new RegExp('^newmtl material0$', 'm'))
            );
            expect(exported.mtl).toEqual(
                expect.stringMatching(new RegExp('^newmtl material0$', 'm'))
            );
        });
    });
});
