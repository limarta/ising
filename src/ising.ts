import vertShader from './shaders/vertex.wgsl';
import fragShader from './shaders/frag.wgsl';
// import WORKGROUP_SIZE, } from './shaders/compute'
import {isingShader, WORKGROUP_SIZE} from './shaders/compute'

const GRID_SIZE = 1<<10;
const SQUARE_VERTICES = new Float32Array([
  -1.0, -1.0,
  1.0, -1.0,
  -1.0, 1.0,
  1.0, 1.0,
]);

const SQUARE_INDICES = new Uint16Array([
    0,1,3,
    0,2,3,
])

const SQUARE_INPUT_LOCATION = 0;
const squareLayout = {
    arrayStride: 8, // 4+4
    attributes: [{
        format: "float32x2" as GPUVertexFormat, 
        offset: 0, 
        shaderLocation: SQUARE_INPUT_LOCATION
    }],
};

export default function init(
  context: GPUCanvasContext,
  device: GPUDevice
): void {
  const canvasFormat = navigator.gpu.getPreferredCanvasFormat();
  context.configure({
    device,
    format: canvasFormat,
    alphaMode: 'opaque',
  });



  const spins = new Uint32Array(GRID_SIZE*GRID_SIZE);
  for(var i=0 ; i < spins.length; i++) {
      spins[i] = Math.random() < 0.5 ? 1 : 0;
  }
  
  const dimensions = new Float32Array([GRID_SIZE, GRID_SIZE]);
  var beta = new Float32Array([1.0]);
  var parity = new Uint32Array([1]);
  const seedState = new Uint32Array(4*GRID_SIZE*GRID_SIZE);
  console.log(3*GRID_SIZE*GRID_SIZE);
  for(var i = 0 ; i < seedState.length ; i++) {
    // seedState[i] = Math.random()*100000000 | 0;
    seedState[i] = i;
  }
  
  // buffers
  // ------
  const squareBuffer = device.createBuffer({
      label: "Square Vertices Buffer",
      size: SQUARE_VERTICES.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  });
  const indexBuffer = device.createBuffer({
      label: "Index Buffer",
      size: SQUARE_INDICES.byteLength,
      usage: GPUBufferUsage.INDEX  | GPUBufferUsage.COPY_DST,
  });
  
  // uniforms and storage
  const seedStorage = device.createBuffer({
    label: "Seed State Storage",
    size: seedState.byteLength,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
  })
  const spinStateOld = device.createBuffer({
      label: "Old Spin State Storage",
      size: spins.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
  });
  const spinStateNew = device.createBuffer({
      label: "New Spin State Storage",
      size: spins.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
  })
  const dimensionUniform = device.createBuffer({
      label: "Dimension Uniform",
      size: dimensions.byteLength,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
  })
  const parityUniform = device.createBuffer({
      label: "Parity Uniform",
      size: parity.byteLength,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
  })
  const betaUniform = device.createBuffer({
      label: "Inverse Temperature",
      size: beta.byteLength,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
  })
  
  // create initialization and load buffers to GPU
  // -------------------
  device.queue.writeBuffer(squareBuffer, 0, SQUARE_VERTICES);
  device.queue.writeBuffer(indexBuffer, 0, SQUARE_INDICES);
  device.queue.writeBuffer(spinStateOld, 0, spins);
  device.queue.writeBuffer(spinStateNew, 0, spins);
  device.queue.writeBuffer(dimensionUniform, 0, dimensions);
  device.queue.writeBuffer(parityUniform, 0, parity);
  device.queue.writeBuffer(seedStorage, 0, seedState);
  
  
  // configure shaders
  // -----------------
  const vertexShaderModule =  device.createShaderModule({
      label: "Vertex Shader Module",
      code: vertShader,
  });

  const fragmentShaderModule = device.createShaderModule({
    label: "Fragment Shader Module",
    code: fragShader,
  })
  
  const isingShaderModule = device.createShaderModule({
      label: "Even Ising Model Simulation Compute Shader",
      code: isingShader
  });
  
  // configure bind group layout
  // ---------------------------
  const bindGroupLayout = device.createBindGroupLayout({
      label: "bind group layout",
      entries: [
      {
          binding: 0, // Grid
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE,
          buffer: {
              type: "uniform"
          }
      },{
          binding: 1, // Ping buffer
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE,
          buffer: {
              type: "read-only-storage"
          }
      },{
          binding: 2, // Pong buffer
          visibility: GPUShaderStage.COMPUTE,
          buffer: {
              type: "storage"
          }
      },{
          binding: 3, // parity
          visibility: GPUShaderStage.COMPUTE,
          buffer: {
              type: "uniform"
          }
      },{
          binding: 4, // seed
          visibility: GPUShaderStage.COMPUTE,
          buffer: {
            type: "storage"
          }
      }]
  });
  
  // two different binds to ping pong between the two storage arrays
  // ---------------------------------------------------------------
  const bindGroups = 
  [
      device.createBindGroup({
          label: "bind group 1",
          layout: bindGroupLayout,
          entries: [
          {
              binding: 0,
              resource: {
                  buffer: dimensionUniform
              }
          },{
              binding: 1,
              resource: {
                  buffer: spinStateOld
              } 
          },{
              binding: 2,
              resource: {
                  buffer: spinStateNew
              }
          },{
            binding: 3,
            resource: {
                buffer: parityUniform
            }
          },{
            binding: 4,
            resource: {
              buffer: seedStorage
            }
          }],
      }),
      device.createBindGroup({
          label: "bind group 2",
          layout: bindGroupLayout,
          entries: [{
              binding: 0,
              resource: {
                  buffer: dimensionUniform
              }
          },
          {
              binding: 1,
              resource: {
                  buffer: spinStateNew
              }
          },
          {
              binding: 2,
              resource: {
                buffer: spinStateOld
              }
          },
          {
              binding: 3,
              resource: {
                buffer: parityUniform
              }
          },
          {
            binding: 4,
            resource: {
              buffer: seedStorage
            }
          }
          ] 
      })
  ];
  
  // configure visualization pipeline
  // --------------------------------
  const pipelineLayout = device.createPipelineLayout({
      label: "Pipeline Layout",
      bindGroupLayouts: [
          bindGroupLayout // @group(0)
      ]
  });
  
  const renderPipeline = device.createRenderPipeline({
      label: "Spin Visualization Pipeline",
      layout: pipelineLayout,
      vertex: {
          entryPoint: "vertexMain",
          module: vertexShaderModule,
          buffers: [squareLayout],
      },
      fragment: {
          module: fragmentShaderModule,
          entryPoint: "fragmentMain",
          targets: [{
              format: canvasFormat
          }],
          
      },
  });
  
  // configure simulation pipeline
  // -----------------------------
  const simulationPipeline = 
      device.createComputePipeline({
          label: "Ising Simulation Pipeline",
          layout: pipelineLayout,
          compute: {
              module: isingShaderModule,
              entryPoint: "computeMain",
          }
      });
  
  // SIMULATE
  // --------
  let step = 0;
  let lastFrameTime = performance.now();
  const framerateDisplay = document.getElementById('framerate');

  function updateGrid() {
    const encoder = device.createCommandEncoder({label: "command encoder"})

    // MODEL UPDATE
    // ------------
    const DISPATCH_COUNT = WORKGROUP_SIZE.map((s) =>GRID_SIZE / s)

      // set the uniform???
    const computePass = encoder.beginComputePass();
    parity[0] = (step%2);
    device.queue.writeBuffer(parityUniform, 0, parity, 0);
    computePass.setPipeline(simulationPipeline)
    computePass.setBindGroup(0, bindGroups[step % 2]);
    computePass.dispatchWorkgroups(DISPATCH_COUNT[0], DISPATCH_COUNT[1]);
    computePass.end();
      
    // RENDER
    // ------
    const renderPass = encoder.beginRenderPass({
        colorAttachments: [
        {
            view: context.getCurrentTexture().createView(),
            loadOp: "clear",
            clearValue: {r: 0.5, g:0.0, b:0, a:1},
            storeOp: "store",
        }],
    });
      
    renderPass.setPipeline(renderPipeline);
    renderPass.setBindGroup(0, bindGroups[step%2]);
    renderPass.setVertexBuffer(0, squareBuffer);
    renderPass.setIndexBuffer(indexBuffer, "uint16");
    renderPass.drawIndexed(SQUARE_INDICES.length, GRID_SIZE*GRID_SIZE);
    renderPass.end();
    
    device.queue.submit([encoder.finish()]);

    step++;
    let fps = 1 / ((performance.now() - lastFrameTime) / 1000);
    framerateDisplay.textContent = `FPS: ${fps.toFixed(2)}`;
    lastFrameTime = performance.now();
    console.log("fps: ", fps);
  }
  
  const FPS = 0.0001;
  // requestAnimationFrame(updateGrid);
  setInterval(updateGrid, FPS); 
}
