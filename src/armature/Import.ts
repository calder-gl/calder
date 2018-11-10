import { vec3 } from 'gl-matrix';

import { RGBColor } from '../colors/RGBColor';
import { Face, WorkingGeometry } from '../geometry/WorkingGeometry';
import { Material, MaterialParams } from '../renderer/Material';
import { GeometryNode, Node } from './Node';

import { mapValues } from 'lodash';

/**
 * A helper class that specifies a group as stored in the obj files
 */
interface Group {
    groupName: string;
    materialName: string;
    faces: Face[];
}

/**
 * A class to store the string and read information of a multiline string.
 */
class Data {
    public lines: string[];

    constructor(rawData: string) {
        this.lines = rawData.split('\n');
    }

    public parse() {
        const vertices: vec3[] = [];
        const normals: vec3[] = [];
        const groups: Group[] = [];
        let materialName = '';

        while (this.lines.length > 0) {
            const [command, ...args] = (<string>this.lines.shift()).split(/\s+/);

            if (command === 'v') {
                const vecLine = args.map(parseFloat)
                const vec = vec3.fromValues(vecLine[0], vecLine[1], vecLine[2]);
                vertices.push(vec);
            } else if (command === 'vn') {
                const vecLine = args.map(parseFloat)
                const vec = vec3.fromValues(vecLine[0], vecLine[1], vecLine[2]);
                normals.push(vec);
            } else if (command === 'g') {
                groups.push({ groupName: args[0], materialName, faces: [] });
            } else if (command === 'f') {
                const faceData: number[][] = args
                    .map((s: string) => s.split('/').map((i: string) => parseInt(i, 10)));

                if (groups.length === 0) {
                    groups.push({ groupName: 'group', materialName, faces: [] });
                }
                const lastGroup = groups[groups.length - 1];

                lastGroup.faces.push(new Face(
                    faceData.map((vertexInfo: number[]) => vertexInfo[0] - 1),
                    faceData.map((vertexInfo: number[]) => vertexInfo[2] - 1)
                ));
            } else if (command === 'usemtl') {
                materialName = args[0];
                if (groups.length > 0) {
                    groups[groups.length - 1].materialName = materialName;
                }
            }
        };

        return {vertices, normals, groups};
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

    const {vertices, normals, groups} = data.parse();

    const parent = new Node();
    parent.setAnchor(vec3.fromValues(0, 0, 0));
    const geoNodes: GeometryNode[] = groups.map(
        (group: Group) =>
            new GeometryNode(
                new WorkingGeometry({
                    vertices: vertices,
                    normals: normals,
                    faces: group.faces,
                    material: materials[group.materialName],
                    controlPoints: []
                }),
                parent
            )
    );
    geoNodes.forEach((node: Node) => node.setAnchor(vec3.fromValues(0, 0, 0)));

    return [parent, ...geoNodes];
}



function readMaterials(mtlData: string) {
    const lines = mtlData.split('\n');
    const materials: {[name: string]: MaterialParams} = {};

    let lastMaterial: MaterialParams | undefined;

    while (lines.length > 0) {
        const line = <string>lines.shift();
        const [command, ...args] = line.split(/\s+/);

        if (command === 'newmtl') {
            const newMaterial = { color: RGBColor.fromRGB(0, 0, 0), shininess: 0 };
            lastMaterial = newMaterial;
            materials[args[0]] = newMaterial;
        } else if (command === 'Kd') {
            if (lastMaterial === undefined) {
                throw new Error('Material data provided before declaring a material.');
            }
            lastMaterial.color = RGBColor.fromRGB(parseFloat(args[0])*255, parseFloat(args[1])*255, parseFloat(args[2])*255);
        } else if (command === 'Ns') {
            if (lastMaterial === undefined) {
                throw new Error('Material data provided before declaring a material.');
            }
            lastMaterial.shininess = parseFloat(args[0]);
        }
    }

    return mapValues(materials, (params: MaterialParams) => Material.create(params));
}
