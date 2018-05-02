import REGL = require('regl');

export interface LightMetadata {
    lightPositions: REGL.Vec3[];
    lightColors: REGL.Vec3[];
    lightIntensities: number[];
}

export const blankLightMetadata: LightMetadata = {
    lightPositions: [0, 0, 0],
    lightIntensities: [0, 0, 0],
    lightColors: [0, 0, 0]
}
