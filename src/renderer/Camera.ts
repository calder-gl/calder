import { mat4, quat, vec3 } from 'gl-matrix';
import { coord } from '../calder';
import { Mapper } from '../utils/mapper';

/**
 * This represents the orientation of the camera in a scene, defined by a position for the camera and
 * a target for the camera to look at.
 */
export class Camera {
    public static readonly up: vec3 = vec3.fromValues(0, 1, 0);
    public static readonly defaultDirection: vec3 = vec3.fromValues(0, 0, -1);

    public readonly position: vec3 = vec3.fromValues(0, 0, 0);
    public readonly target: vec3 = vec3.copy(vec3.create(), Camera.defaultDirection);

    // `transform` is only updated when getTransform is called. The `dirty` flag is used to signal
    // that an update has occurred and the cached transform value needs to be recomputed.
    private transform: mat4 = mat4.create();
    private dirty: boolean = true;

    /**
     * @param {coord} positionCoord The world-space coordinate to move the camera to, preserving rotation.
     */
    public moveTo(positionCoord: coord) {
        const position = Mapper.coordToVector(positionCoord);
        const direction = vec3.subtract(vec3.create(), position, this.position);
        vec3.add(this.target, this.target, direction);
        vec3.copy(this.position, position);
        this.dirty = true;
    }

    /**
     * @param {amount} A number to scale the (target - position) vector by, which will then be added
     * to the camera's position. This should not be exactly 1, because then the camera will be
     * at the same location as the target and will no longer have a direction vector.
     */
    public moveTowardsTarget(amount: number) {
        const direction = vec3.sub(vec3.create(), this.target, this.position);
        vec3.scale(direction, direction, amount);
        vec3.add(this.position, this.position, direction);
        this.dirty = true;
    }

    /**
     * @param {coord} positionCoord The world-space coordinate to move the camera to, keeping the camera
     * rotated towards its previous target.
     */
    public moveToWithFixedTarget(positionCoord: coord) {
        const position = Mapper.coordToVector(positionCoord);
        vec3.copy(this.position, position);
        this.dirty = true;
    }

    /**
     * @param {coord} directionCoord A world-space direction vector that will be added to the camera's
     * position, preserving its existing rotation.
     */
    public moveBy(directionCoord: coord) {
        const direction = Mapper.coordToVector(directionCoord);
        vec3.add(this.position, this.position, direction);
        vec3.add(this.target, this.target, direction);
        this.dirty = true;
    }

    /**
     * @param {coord} directionCoord A world-space direction vector that will be added to the camera's
     * position, keeping the camera pointed towards its previous target.
     */
    public moveByWithFixedTarget(directionCoord: coord) {
        const direction = Mapper.coordToVector(directionCoord);
        vec3.add(this.position, this.position, direction);
        this.dirty = true;
    }

    /**
     * @param {coord} targetCoord A world-space coordinate that the camera will rotate to face.
     */
    public lookAt(targetCoord: coord) {
        vec3.copy(this.target, Mapper.coordToVector(targetCoord));
        this.dirty = true;
    }

    /**
     * @param {quat} rotation A quaternion that will be applied to the camera's current rotation.
     */
    public rotate(rotation: quat) {
        const direction = vec3.subtract(vec3.create(), this.target, this.position);
        vec3.transformQuat(direction, direction, rotation);
        vec3.add(this.target, this.position, direction);
        this.dirty = true;
    }

    /**
     * @param {quat} rotation A quaternion that will be applied to the camera's current rotation
     * about its target.
     */
    public rotateAboutTarget(rotation: quat) {
        const direction = vec3.subtract(vec3.create(), this.position, this.target);
        vec3.transformQuat(direction, direction, rotation);
        vec3.add(this.position, this.target, direction);
        this.dirty = true;
    }

    /**
     * @param {quat} rotation A quaternion that will replace the camera's current rotation.
     */
    public setRotation(rotation: quat) {
        const direction = vec3.copy(vec3.create(), Camera.defaultDirection);
        vec3.transformQuat(direction, direction, rotation);
        vec3.add(this.target, this.position, direction);
        this.dirty = true;
    }

    /**
     * Using the current position and target of the camera, produces a transformation matrix to
     * bring world space coordinates into camera space.
     */
    public getTransform(): mat4 {
        if (this.dirty) {
            this.updateTransform();
        }

        return this.transform;
    }

    private updateTransform() {
        mat4.lookAt(this.transform, this.position, this.target, Camera.up);
        this.dirty = false;
    }
}
