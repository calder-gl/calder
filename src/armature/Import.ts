import { vec3 } from 'gl-matrix';

import { RGBColor } from '../colors/RGBColor';
import { Face, WorkingGeometry } from '../geometry/WorkingGeometry';
import { Material } from '../renderer/Material';
import { GeometryNode, Node } from './Node';

/**
 * Read data from the import_dir and produce a new model.
 *
 * @return {Model} model A model representing that described in .obj and .mtl format in the
 * import_dir directory.
 */
export function importOBJ(OBJData, MTLData) {
    const data: Data = {lines: OBJData.split('\n')};

    readPreamble(data)

    const vertices = readVertices(data);
    const normals = readNormals(data);
    const groups = readGroups(data);

    const parent = new Node();
    parent.setAnchor(vec3.fromValues(0, 0, 0));

    const materials = readMaterials(MTLData);

    const geoNodes: GeometryNode[] = groups.map(
        (group: Group) =>
            new GeometryNode(
                new WorkingGeometry({
                    vertices: vertices,
                    normals: normals,
                    faces: group.faces,
                    material: <Material>materials.get(group.materialName),
                    controlPoints: []
                }),
                parent
            )
    );
    geoNodes.forEach((node: Node) => node.setAnchor(vec3.fromValues(0, 0, 0)));

    return [parent, ...geoNodes]
}

/**
 * A helper class that specifies a group as stored in the obj files
 */
class Group {
    public groupName: string;
    public materialName: string;
    public faces: Face[];
}

class Data {
    public lines: string[];
}

function readPreamble(data: Data) {
    data.lines[0].split(' '); // [1] is the file name
    data.lines = data.lines.slice(1);
    data.lines[0].split(' '); // [1] is the mtlFileName
    data.lines = data.lines.slice(1);
    return data;
}

function readVertices(data: Data) {
    const vertices: vec3[] = [];
    while (data.lines[0].startsWith('v ')) {
        const vecLine = data.lines[0]
            .split(' ')
            .slice(1)
            .map(parseFloat);
        const vec = vec3.fromValues(vecLine[0], vecLine[1], vecLine[2]);
        vertices.push(vec);
        data.lines.shift();
    }

    return vertices;
}

function readNormals(data: Data) {
    const normals: vec3[] = [];
    while (data.lines[0].startsWith('vn')) {
        const vecLine = data.lines[0]
            .split(' ')
            .slice(1)
            .map(parseFloat);
        const vec = vec3.fromValues(vecLine[0], vecLine[1], vecLine[2]);
        normals.push(vec);
        data.lines.shift();
    }

    return normals;
}


function readGroups(data: Data) {
    const groups: Group[] = [];
    while (data.lines.length > 0 && data.lines[0].startsWith('g')) {
        const groupName = data.lines[0].split(' ')[1];
        data.lines = data.lines.slice(1);
        const materialName = data.lines[0].split(' ')[1];
        data.lines = data.lines.slice(1);
        const faces: Face[] = [];
        while (data.lines.length > 0 && data.lines[0].startsWith('f')) {
            const index: string[][] = data.lines[0]
                .split(' ')
                .slice(1)
                .map((s: string) => s.split('//'));
            // FIXME(pbardea): How to concat three arrays without needing empty array hack.
            const empty: string[] = [];
            const face: number[] = empty
                .concat(...index)
                .filter((_: string, idx: number) => idx % 2 === 0)
                .map((s: string) => parseInt(s, 10) - 1);
            faces.push(new Face(face));
            data.lines = data.lines.slice(1);
        }
        groups.push({
            groupName: groupName,
            materialName: materialName,
            faces: faces
        });
    }

    return groups;
}

function readMaterials(mtlData) {
    let lines = mtlData.split('\n');
    const materials: Map<string, Material> = new Map<string, Material>();
    while (lines.length > 0 && lines[0].startsWith('newmtl')) {
        const materialName = lines[0].split(' ')[1];
        lines = lines.slice(1);
        // Assume the prefixes of the following lines are Ka, Kd, Ks, Ns, illum
        lines[0]
            .split(' ')
            .slice(1)
            .map(parseFloat); // ka
        lines = lines.slice(1);
        const kd = lines[0]
            .split(' ')
            .slice(1)
            .map(parseFloat);
        lines = lines.slice(1);
        lines[0]
            .split(' ')
            .slice(1)
            .map(parseFloat); // ks
        lines = lines.slice(1);
        const ns = parseFloat(lines[0].split(' ')[1]);
        lines = lines.slice(1);
        // Ignore the illumination for now
        lines = lines.slice(1);

        materials.set(
            materialName,
            Material.create({
                color: RGBColor.fromRGB(kd[0] * 255, kd[1] * 255, kd[2] * 255),
                shininess: ns
            })
        );
    }

    return materials;
}
