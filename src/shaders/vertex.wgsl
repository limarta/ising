struct VertexOutput {
    @builtin(position) pos:vec4f,
    @location(0) cell: vec2f,
}

@group(0) @binding(0) var<uniform> grid: vec2f;
@group(0) @binding(1) var<storage> spins: array<u32>;

fn indexToCell(index: u32) -> vec2f {
    let i = f32(index);
    return vec2f(i % grid.x, floor(i/grid.x));
}

@vertex
fn vertexMain(@location(0) pos: vec2f, @builtin(instance_index) instance: u32) -> VertexOutput {
    let cell = indexToCell(instance);
    let cellOffset = 2*cell/grid;
    let baseSquare = (pos+1)/grid-1;
    let shiftedSquare = baseSquare + cellOffset;
    
    var output: VertexOutput;
    output.pos = vec4f(shiftedSquare,0,1);
    output.cell = cell;
    return output;
}
