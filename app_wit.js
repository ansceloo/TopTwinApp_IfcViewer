//WIT+selector+highlight

//MAIN INPUT
//ifc url
const ifcUrl = "../../../IFC/ENG.ifc";
//selection materials
const preselectMat = new MeshLambertMaterial({
  transparent: true,
  opacity: 0.3,
  color: 0x097dc1,
  depthTest: false
})
const selectMat = new MeshLambertMaterial({
  transparent: true,
  opacity: 1,
  color: 0xff7a7a,
  depthTest: false
})
//HTML elements
const elementID = document.getElementById("elementID");

//import libraries
import {
  AmbientLight,
  AxesHelper,
  DirectionalLight,
  GridHelper,
  PerspectiveCamera,
  Scene,
  MeshLambertMaterial,
  Raycaster,
  Vector2,
  WebGLRenderer,
} from "three";
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls";
import {IFCLoader} from "web-ifc-three/IFCLoader";
import {
  acceleratedRaycast,
  computeBoundsTree,
  disposeBoundsTree
} from 'three-mesh-bvh';
import { Value } from "web-ifc";

//Creates the Three.js scene
const scene = new Scene();

//Object to store the size of the viewport
const size = {
  width: window.innerWidth,
  height: window.innerHeight,
};

//Creates the camera (point of view of the user)
const camera = new PerspectiveCamera(75, size.width / size.height);
camera.position.z = 15;
camera.position.y = 13;
camera.position.x = 8;

//Creates the lights of the scene
const lightColor = 0xffffff;

const ambientLight = new AmbientLight(lightColor, 0.5);
scene.add(ambientLight);

const directionalLight = new DirectionalLight(lightColor, 1);
directionalLight.position.set(0, 10, 0);
directionalLight.target.position.set(-5, 0, 0);
scene.add(directionalLight);
scene.add(directionalLight.target);

//Sets up the renderer, fetching the canvas of the HTML
const threeCanvas = document.getElementById("three-canvas");
const renderer = new WebGLRenderer({canvas: threeCanvas, alpha: true});
renderer.setSize(size.width, size.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

//Creates grids and axes in the scene
const grid = new GridHelper(50, 30);
scene.add(grid);

const axes = new AxesHelper();
axes.material.depthTest = false;
axes.renderOrder = 1;
scene.add(axes);

//Creates the orbit controls (to navigate the scene)
const controls = new OrbitControls(camera, threeCanvas);
controls.enableDamping = true;
controls.target.set(-2, 0, 0);

//Animation loop
const animate = () => {
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
};

animate();

//Adjust the viewport to the size of the browser
window.addEventListener("resize", () => {
  (size.width = window.innerWidth), (size.height = window.innerHeight);
  camera.aspect = size.width / size.height;
  camera.updateProjectionMatrix();
  renderer.setSize(size.width, size.height);
});

//Sets up the IFC loading
const ifcModels = [];
const ifcLoader = new IFCLoader();

async function loadIFC() {
  await ifcLoader.ifcManager.setWasmPath("wasm_wit/");
  const model = await ifcLoader.loadAsync(ifcUrl);
  scene.add(model);
  ifcModels.push(model);
}

loadIFC();

// Sets up optimized picking
ifcLoader.ifcManager.setupThreeMeshBVH(
  computeBoundsTree,
  disposeBoundsTree,
  acceleratedRaycast);

const raycaster = new Raycaster();
raycaster.firstHitOnly = true;
const mouse = new Vector2();

function cast(event) {

  // Computes the position of the mouse on the screen
  const bounds = threeCanvas.getBoundingClientRect();

  const x1 = event.clientX - bounds.left;
  const x2 = bounds.right - bounds.left;
  mouse.x = (x1 / x2) * 2 - 1;

  const y1 = event.clientY - bounds.top;
  const y2 = bounds.bottom - bounds.top;
  mouse.y = -(y1 / y2) * 2 + 1;

  // Places it on the camera pointing to the mouse
  raycaster.setFromCamera(mouse, camera);

  // Casts a ray
  return raycaster.intersectObjects(ifcModels);
}

const ifc = ifcLoader.ifcManager;
// References to the previous selections
const highlightModel = { id: - 1};
const selectModel = { id: - 1};

function highlight(event, material, model, multiple = true) {
  const found = cast(event)[0];
  if (found) {

      // Gets model ID
      model.id = found.object.modelID;

      // Gets Express ID
      const index = found.faceIndex;
      const geometry = found.object.geometry;
      const id = ifc.getExpressId(geometry, index);

      // Creates subset
      ifcLoader.ifcManager.createSubset({
          modelID: model.id,
          ids: [id],
          material: material,
          scene: scene,
          removePrevious: multiple
      })
  } else {
      // Remove previous highlight
      ifc.removeSubset(model.id, scene, material);
  }
}

async function pick(event, getProps) {
  const found = cast(event)[0];
  if (found) {
      const index = found.faceIndex;
      const geometry = found.object.geometry;
      const ifc = ifcLoader.ifcManager;
      const id = ifc.getExpressId(geometry, index);
      const modelID = found.object.modelID;
      const props = await ifc.getItemProperties(modelID, id);
      elementID.textContent = ["Element ID: "+id]; //show element id in the canvas when event is cast

      //get IFC properties
      if(getProps) {
        console.log(props);
        const psets = await ifc.getPropertySets(modelID, id);
        
        for(const pset of psets){ //per ogni pset dei psets dell'oggetto selezionato...
          const realValues = []; //...crea un array vuoto...

          for(const prop of pset.HasProperties) { //... per ogni propriet?? del pset...
            const id = prop.value; //...prendi il valore identificativo della propriet??....
            const value = await ifcLoader.ifcManager.getItemProperties(found.object.modelID, id); //...carica la propriet?? dal suo id...
            realValues.push(value); //... appendi la propriet?? all'array iniziale
          }
          pset.HasProperties = realValues; //sostituisco la linea ifc relativa al pset con un array di propriet?? del pset
        }
        console.log(psets);
        console.log(psets[0]);
        console.log(psets[0].HasProperties[2]);
      }
    }
}

//set events
window.onmousemove = (event) => highlight(event, preselectMat, highlightModel);
window.onclick = (event) => highlight(event, selectMat, highlightModel);
threeCanvas.ondblclick = (event) => pick(event, true);




