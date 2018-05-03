// tslint:disable-next-line:import-name
import REGL = require('regl');

export interface Light {
    lightPosition: REGL.Vec3[];
    lightColor: REGL.Vec3[];
    lightIntensity: number;
}

export const blankLight: Light = {
    lightPosition: [0, 0, 0],
    lightColor: [0, 0, 0],
    lightIntensity: 0
};
