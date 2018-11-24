import {
    Armature,
    Generator,
    GeneratorInstance,
    Light,
    Material,
    Model,
    Node,
    PerfStats,
    Point,
    Renderer,
    RGBColor,
    Shape,
    Silhouette
} from '../calder';

import { mtlData, objData } from '../import_dir/ImportDataLeaf';

// Create the renderer
const ambientLightColor = RGBColor.fromRGB(90, 90, 90);
const renderer: Renderer = new Renderer({
    width: 800,
    height: 600,
    maxLights: 2,
    ambientLightColor,
    backgroundColor: RGBColor.fromHex('#FFDDFF')
});

// Create light sources for the renderer
const light1: Light = Light.create({
    position: { x: 10, y: 10, z: 10 },
    color: RGBColor.fromHex('#FFFFFF'),
    strength: 200
});

// Add lights to the renderer
renderer.addLight(light1);

///////////////////////////////////////////////////////////////////////////////////////////////////
// Step 1: create geometry
///////////////////////////////////////////////////////////////////////////////////////////////////

// Setup leaf
const leafModel = Model.importObj(objData, mtlData);

// Setup branch
const branchColor = RGBColor.fromRGB(102, 76.5, 76.5);
const branchShape = Shape.cylinder(Material.create({ color: branchColor, shininess: 1 }));

///////////////////////////////////////////////////////////////////////////////////////////////////
// Step 2: create armature
///////////////////////////////////////////////////////////////////////////////////////////////////

const bone = Armature.define((root: Node) => {
    root.createPoint('base', { x: 0, y: 0, z: 0 });
    root.createPoint('mid', { x: 0, y: 0.5, z: 0 });
    root.createPoint('tip', { x: 0, y: 1, z: 0 });
    root.createPoint('handle', { x: 1, y: 0, z: 0 });
});

const treeGen = Armature.generator();
treeGen
    .define('branch', (root: Point) => {
        const node = bone();
        node.point('base').stickTo(root);
        node.scale(Math.random() * 0.4 + 0.9);
        node
            .hold(node.point('tip'))
            .rotate(Math.random() * 360)
            .release();
        node
            .hold(node.point('handle'))
            .rotate(Math.random() * 85)
            .release();
        node.scale(0.8); // Shrink a bit

        const trunk = node.point('mid').attach(branchShape);
        trunk.scale({ x: 0.2, y: 1, z: 0.2 });

        Generator.addDetail({ component: 'branchOrLeaf', at: node.point('tip') });
    })
    .defineWeighted('branchOrLeaf', 1, (root: Point) => {
        Generator.addDetail({ component: 'leaf', at: root });
    })
    .defineWeighted('branchOrLeaf', 4, (root: Point) => {
        Generator.addDetail({ component: 'branch', at: root });
        Generator.addDetail({ component: 'maybeBranch', at: root });
        Generator.addDetail({ component: 'maybeBranch', at: root });
    })
    .define('leaf', (root: Point) => {
        const leafBone = bone();
        leafBone.createPoint('leafAnchor', { x: 0.6, y: 0.2, z: 0.9 });
        leafBone
            .hold(leafBone.point('base'))
            .grab(leafBone.point('tip'))
            .pointAt({ x: 0, y: 0, z: -20 })
            .release();
        leafBone.point('leafAnchor').attachModel(leafModel);
        leafBone.scale(Math.random() + 0.4);
        leafBone.point('base').stickTo(root);
    })
    .maybe('maybeBranch', (root: Point) => {
        Generator.addDetail({ component: 'branch', at: root });
    })
    .wrapUpMany(['branch', 'branchOrLeaf', 'maybeBranch', 'leaf'], Generator.replaceWith('leaf'))
    .thenComplete(['leaf']);

const time = document.createElement('p');

let tree: Model | null = null;

const img = new Image();
// Can't do getImageData for local images; I converted the PNG to base64 to avoid this
img.src =
    'data:image/png;base64,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';
img.addEventListener('load', () => {
    // Get pixel data
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = <CanvasRenderingContext2D>canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, img.width, img.height);
    const imageData = ctx.getImageData(0, 0, img.width, img.height);

    const silhouette = new Silhouette(imageData, false);
    treeGen
        .generateSOSMC(
            {
                start: 'branch',
                sosmcDepth: 40,
                samples: 800,
                costFn: silhouette,
                iterationHook: (instances: GeneratorInstance[]) => {
                    // Log the best cost in each iteration, for debugging
                    // tslint:disable-next-line:no-console
                    console.log(
                        instances
                            .map((instance: GeneratorInstance) => instance.getCost().realCost)
                            .sort((a: number, b: number) => a - b)[0]
                    );
                }
            },
            1 / 30
        )
        .then((model: Model, { realTime, cpuTime }: PerfStats) => {
            silhouette.done();
            tree = model;
            time.innerText = `Generated in ${realTime.toFixed(4)}s real time, ${cpuTime.toFixed(
                4
            )}s CPU time`;
        });
});

///////////////////////////////////////////////////////////////////////////////////////////////////
// Step 3: set up renderer
///////////////////////////////////////////////////////////////////////////////////////////////////

document.body.appendChild(renderer.stage);
document.body.appendChild(time);

renderer.camera.lookAt({ x: 0, y: 0, z: -1 });
renderer.camera.moveToWithFixedTarget({ x: 0, y: 0, z: 0 });
renderer.camera.moveTo({ x: 0, y: 1, z: 15 });

const draw = () => {
    return {
        objects: tree === null ? [] : [tree],
        debugParams: {
            drawAxes: true,
            drawArmatureBones: false
        }
    };
};

// Apply the constraints each frame.
renderer.eachFrame(draw);

///////////////////////////////////////////////////////////////////////////////////////////////////
// Step 4: add .obj export
///////////////////////////////////////////////////////////////////////////////////////////////////

const exportBtn = document.createElement('button');
exportBtn.innerText = 'Export .obj';
exportBtn.addEventListener('click', () => {
    if (tree === null) {
        return;
    }

    const obj = tree.exportOBJ('calderExport', ambientLightColor);

    const objLink = document.createElement('a');
    objLink.style.display = 'none';
    document.body.appendChild(objLink);

    // Download obj
    objLink.setAttribute('href', `data:text/plain;charset=utf-8,${encodeURIComponent(obj.obj)}`);
    objLink.setAttribute('download', 'calderExport.obj');
    objLink.click();
    document.body.removeChild(objLink);
});
document.body.appendChild(exportBtn);

const exportMTLBtn = document.createElement('button');
exportMTLBtn.innerText = 'Export .mtl';
exportMTLBtn.addEventListener('click', () => {
    if (tree === null) {
        return;
    }

    const obj = tree.exportOBJ('calderExport', ambientLightColor);

    const mtlLink = document.createElement('a');
    mtlLink.style.display = 'non';
    document.body.appendChild(mtlLink);

    // Download mtl
    mtlLink.setAttribute('href', `data:text/plain;charset=utf-8,${encodeURIComponent(obj.mtl)}`);
    mtlLink.setAttribute('download', 'calderExport.mtl');
    mtlLink.click();
    document.body.removeChild(mtlLink);
});
document.body.appendChild(exportMTLBtn);
