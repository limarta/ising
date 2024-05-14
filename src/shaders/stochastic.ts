export const getSeed = `
fn getSeed(cell: vec2u) -> vec3u {
    let idx = cellIndex(cell);
    return seeds[idx];
}
`

export const pcg3d = `
fn pcg3d(state: vec3u) -> vec3u {
    // Citation: Mark Jarzynski and Marc Olano, Hash Functions for GPU Rendering,
    // Journal of Computer Graphics Techniques (JCGT), vol. 9, no. 3, 21-38, 2020
    // Available online http://jcgt.org/published/0009/03/02/
    
    var v = state * u32(1664525) + u32(1013904223);
    v.x += v.y*v.z; 
    v.y += v.z*v.x;
    v.z += v.x*v.y;
    v = v ^ vec3u(v.x >> u32(16), v.y >> u32(16), v.z >> u32(16));
    v.x += v.y*v.z; 
    v.y += v.z*v.x;
    v.z += v.x*v.y;
    return v;
}
`

export const randomUniform = `
// recovered from de-compiled JAX
fn random_uniform(cell: vec2u, low: f32, high: f32) -> f32 {
    let seed = getSeed(cell);
    seeds[cellIndex(cell)] = pcg3d(seed);
    let a = bitcast<f32>((seed.x >> 9)| 1065353216) - 1.0;
    let diff = high - low;
    let w = diff*a;
    let u = w + low;
    return max(low, u);
}
`

export const randomGumbel = `
fn random_gumbel(cell: vec2u) -> f32 {
    let seed = getSeed(cell);
    let u = random_uniform(cell, 0.0, 1.0);
    return -log(-log(u));
}
`

export const randomLogBernoulli = `
// Source: https://en.wikipedia.org/wiki/Categorical_distribution#Sampling_via_the_Gumbel_distribution
fn random_log_bernoulli(cell: vec2u, log_a:f32, log_b:f32) -> u32 {
    let gumbels = vec2f(log_a + random_gumbel(cell), log_b + random_gumbel(cell));
    if gumbels.x >= gumbels.y {
        return 0;
    } else {
        return 1;
    }
}
`