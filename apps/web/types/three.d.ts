declare module 'three' {
  export const SRGBColorSpace: unknown;
  export const PCFSoftShadowMap: unknown;

  export class Vector2 {
    constructor(x?: number, y?: number);
    x: number;
    y: number;
  }

  export class Vector3 {
    constructor(x?: number, y?: number, z?: number);
    x: number;
    y: number;
    z: number;
    set(x: number, y: number, z: number): this;
    copy(vector: Vector3): this;
    lerpVectors(from: Vector3, to: Vector3, alpha: number): this;
  }

  export class Euler {
    constructor(x?: number, y?: number, z?: number);
    x: number;
    y: number;
    z: number;
    copy(euler: Euler): this;
  }

  export class Object3D {
    position: Vector3;
    rotation: Euler;
    userData: Record<string, unknown>;
    add(object: Object3D): void;
    traverse(callback: (object: Object3D) => void): void;
  }

  export class Group extends Object3D {}

  export class Scene extends Object3D {
    fog: Fog | null;
  }

  export class Fog {
    constructor(color: number, near: number, far: number);
  }

  export class PerspectiveCamera extends Object3D {
    constructor(fov: number, aspect: number, near: number, far: number);
    aspect: number;
    updateProjectionMatrix(): void;
    lookAt(x: number, y: number, z: number): void;
  }

  export class Shape {
    moveTo(x: number, y: number): void;
    lineTo(x: number, y: number): void;
    quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): void;
  }

  export class BufferGeometry {
    center(): void;
    dispose(): void;
  }

  export class ExtrudeGeometry extends BufferGeometry {
    constructor(shape: Shape, options: Record<string, unknown>);
  }

  export class TorusGeometry extends BufferGeometry {
    constructor(radius: number, tube: number, radialSegments: number, tubularSegments: number);
  }

  export class CircleGeometry extends BufferGeometry {
    constructor(radius: number, segments: number);
  }

  export class Texture {
    colorSpace: unknown;
    dispose(): void;
  }

  export class CanvasTexture extends Texture {
    constructor(canvas: HTMLCanvasElement);
  }

  export class Material {
    dispose(): void;
  }

  export class MeshStandardMaterial extends Material {
    constructor(options?: Record<string, unknown>);
  }

  export class Mesh extends Object3D {
    constructor(geometry: BufferGeometry, material: Material | Material[]);
    geometry: BufferGeometry;
    material: Material | Material[];
    castShadow: boolean;
    receiveShadow: boolean;
  }

  export class WebGLRenderer {
    constructor(options: Record<string, unknown>);
    shadowMap: { enabled: boolean; type: unknown };
    setPixelRatio(value: number): void;
    setSize(width: number, height: number, updateStyle?: boolean): void;
    render(scene: Scene, camera: PerspectiveCamera): void;
    dispose(): void;
  }

  export class Light extends Object3D {}

  export class SpotLight extends Light {
    constructor(color: number, intensity: number, distance?: number, angle?: number, penumbra?: number, decay?: number);
    castShadow: boolean;
  }

  export class PointLight extends Light {
    constructor(color: number, intensity: number, distance?: number);
  }

  export class AmbientLight extends Light {
    constructor(color: number, intensity?: number);
  }
}
