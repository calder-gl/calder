import { vec3 } from 'gl-matrix';

import { RGBColor } from '../colors/RGBColor';
import { Face, WorkingGeometry } from '../geometry/WorkingGeometry';
import { Material } from '../renderer/Material';
import { GeometryNode, Node } from './Node';

import { flatten } from 'lodash';

/**
 * A helper class that specifies a group as stored in the obj files
 */
class Group {
    public groupName: string;
    public materialName: string;
    public faces: Face[];
}

/**
 * A class to store the string and read information of a multiline string.
 */
class Data {
    public lines: string[];

    constructor(rawData: string) {
        this.lines = rawData.split('\n');
    }

    public readLine() {
        let line = this.lines[0].split(' ');
        this.lines.shift();
        // Skip comments and empty lines.
        while (line.length < 1 || line[0].startsWith('#')) {
            line = this.lines[0].split(' ');
            this.lines.shift();
        }

        return line;
    }

    // TODO: Refactor to handle each line type individually and multipblex
    // (so we're not reliant on a particular order)
    public getLinesWithPrefix(prefix: string) {
        const lines: string[][] = [];
        while (this.lines[0].startsWith(prefix)) {
            lines.push(this.readLine());
        }

        return lines;
    }
}

/**
 * Convert raw OBJData and MTLData from .obj and .mtl files into an array of nodes.
 *
 * @return {Node[]} nodes An array of nodes representing the nodes in a modle
 * as described in the OBJData and MTLData.
 */
export function importObj(objData: string, mtlData: string) {
    const materials = readMaterials(mtlData);
    const data = new Data(objData);

    readPreamble(data);
    const vertices = readVertices(data);
    const normals = readNormals(data);
    const groups = readGroups(data);

    const parent = new Node();
    parent.setAnchor(vec3.fromValues(0, 0, 0));
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

    return [parent, ...geoNodes];
}

function readPreamble(data: Data) {
    data.readLine(); // Read the obj file name
    data.readLine(); // Read the mtl file name

    return data;
}

function readVertices(data: Data) {
    const vertices: vec3[] = [];
    data.getLinesWithPrefix('v ').map((line: string[]) => {
        const vecLine = line.map(parseFloat).slice(1);
        const vec = vec3.fromValues(vecLine[0], vecLine[1], vecLine[2]);
        vertices.push(vec);
    });

    return vertices;
}

function readNormals(data: Data) {
    const normals: vec3[] = [];
    data.getLinesWithPrefix('vn ').map((line: string[]) => {
        const vecLine = line.map(parseFloat).slice(1);
        const vec = vec3.fromValues(vecLine[0], vecLine[1], vecLine[2]);
        normals.push(vec);
    });

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
            const face: number[] = flatten([...index])
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

function readMaterials(mtlData: string) {
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
