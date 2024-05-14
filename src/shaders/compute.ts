import {getSeed, pcg3d, randomUniform, randomGumbel, randomLogBernoulli} from './stochastic'

export const WORKGROUP_SIZE = [8,8]
const THREADS_PER_GROUP = WORKGROUP_SIZE.reduce((y,p) => y*p)


export const isingShader =  `
@group(0) @binding(0) var<uniform> grid: vec2f;
@group(0) @binding(1) var<storage> spinStateOld: array<u32>;
@group(0) @binding(2) var<storage, read_write> spinStateNew: array<u32>;
@group(0) @binding(3) var<uniform> parity: u32;
@group(0) @binding(4) var<storage, read_write> seeds: array<vec3<u32>>;

${getSeed}
${pcg3d}
${randomUniform}
${randomGumbel}
${randomLogBernoulli}

fn cellIndex(cell: vec2u) -> u32 {
    return cell.x % u32(grid.x) + (cell.y % u32(grid.y)) * u32(grid.x);
}

fn cellSpin(x: u32, y:u32) -> i32 {
    let state = spinStateOld[cellIndex(vec2u(x,y))];
    switch state {
        case 0: {
            return -1;
        }
        case 1: {
            return 1;
        }
        default: {
            return -1;
        }
    }
}

@compute
@workgroup_size(${WORKGROUP_SIZE})
fn computeMain(
    @builtin(workgroup_id) workgroup_id: vec3u,
    @builtin(global_invocation_id) cell: vec3u,
    @builtin(local_invocation_index) local_invocation_index:u32,
    @builtin(num_workgroups) num_workgroups: vec3u,
) {
    let workgroup_index = workgroup_id.x +
                        workgroup_id.y * num_workgroups.x +
                        workgroup_id.z * num_workgroups.x * num_workgroups.y;
    let index = workgroup_index * ${THREADS_PER_GROUP} + local_invocation_index;
    let x = index % u32(grid.x);
    let y = index / u32(grid.x);
    let doUpdate = (x+y)%2 == parity;
    
    spinStateNew[index] = 0;
    
    // if random_uniform(vec2u(x,y),0.0, 1.0) < 0.5 {
    //     spinStateNew[cellIndex(vec2u(x,y))] = 1;    
    // }
    // if index == 0 {
    //     let s1 = seeds[u32(0)];
    //     spinStateNew[index] = select(u32(0), u32(1), s1.x == 0 && s1.y == 1 && s1.z == 2);
    // }

    // if index == 1 {
    //     let s1 = seeds[u32(1)];
    //     spinStateNew[index] = select(u32(0), u32(1), s1.x == 4 && s1.y == 5 && s1.z == 6);
    // }

    // if index == 189 {
    //     let s1 = seeds[u32(189)];
    //     spinStateNew[index] = select(u32(0), u32(1), s1.x == 756 && s1.y == 757 && s1.z == 758);
    // }

    // if index == 190 {
    //     let s1 = seeds[u32(190)];
    //     spinStateNew[index] = select(u32(0), u32(1), s1.x == 760 && s1.y == 761 && s1.z == 762);
    // }

    // if index == 191 {
    //     let s1 = seeds[u32(191)];
    //     spinStateNew[index] = select(u32(0), u32(1), s1.x == 764 && s1.y == 765 && s1.z == 766);
    // }

    // if index == 192 {
    //     let s1 = seeds[u32(192)];
    //     spinStateNew[index] = select(u32(0), u32(1), s1.x == 764 && s1.y == 765 && s1.z == 766);
    // }

    // if index == 193 {
    //     let s1 = seeds[u32(193)];
    //     spinStateNew[index] = select(u32(0), u32(1), s1.x == 764 && s1.y == 765 && s1.z == 766);
    // }

    if doUpdate { 
        let energy = -f32(cellSpin(x+1, y) +
                    cellSpin(x,y+1) +
                    cellSpin(x-1,y) +
                    cellSpin(x,y-1));
        
        // let beta = 0.4405; 
        let beta = 0.4407; 
        let probPos = -beta*energy;
        let probNeg = beta*energy;

        // Can we get a shader which samples based off unnormalized logpdf values?
        let categorical = random_log_bernoulli(vec2(x,y), probNeg, probPos);
        spinStateNew[index] = categorical;
    } else {
        spinStateNew[index] = spinStateOld[index];
    }
}
`