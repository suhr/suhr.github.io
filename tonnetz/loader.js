const wasm = await fetch("./oxi_wasm_bg.wasm")
const compiled = await WebAssembly.compile(await wasm.arrayBuffer())
const file = await fetch("./gm.sf2");
const data = await file.arrayBuffer();
postMessage({compiled, data})
