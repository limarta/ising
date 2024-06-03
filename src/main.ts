import './style.css'
import init from './ising';
// import init from './texture';
// import init from './vid';
import { assert } from './utils/util';
import { Pane } from 'tweakpane';

(async () => {
  if (navigator.gpu === undefined) {
    const h = document.querySelector('#title') as HTMLElement;
    h.innerText = 'WebGPU is not supported in this browser.';
    return;
  }
  const adapter = await navigator.gpu.requestAdapter();
  if (adapter === null) {
    const h = document.querySelector('#title') as HTMLElement;
    h.innerText = 'No adapter is available for WebGPU.';
    return;
  }
  const device = await adapter.requestDevice();

  const canvas = document.querySelector<HTMLCanvasElement>('#webgpu-canvas');
  assert(canvas !== null);
  const context = canvas.getContext('webgpu') as GPUCanvasContext;

  // Tweakpane: easily adding tweak control for parameters.
  const PARAMS = {
    level: 0,
    name: 'Inverse Temperature',
    active: true,
  };

  const pane = new Pane({
    title: 'Parameters',
    expanded: true,
  });

  pane.addInput(PARAMS, 'level', {min: .01, max: 2.0});

  init(context, device);
})();