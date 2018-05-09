import { mat4 } from 'gl-matrix';
import { BakedGeometry } from '../../geometry/BakedGeometry';

/*
 * A collection of the properties needed to render something using the default shader
 */
export type RenderObject = BakedGeometry & { transform: mat4 };
