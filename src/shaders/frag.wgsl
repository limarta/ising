@group(0) @binding(0) var<uniform> grid:vec2f;
@group(0) @binding(1) var<storage> spins: array<u32>;

fn cellIndex(cell: vec2u) -> u32 {
    return (cell.y % u32(grid.y)) * u32(grid.x) + (cell.x % u32(grid.x));
}

@fragment
fn fragmentMain(@location(0) cell: vec2f) -> @location(0) vec4f {
    let idx = vec2u(u32(cell.x), u32(cell.y));
    let spin = f32(spins[cellIndex(idx)]);
    let c = 1-spin;
    return vec4f(c,c,c,1);
}