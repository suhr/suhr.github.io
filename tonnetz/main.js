import * as oxy from "./oxi_wasm.js"

const sin = Math.sin, cos = Math.cos, sqrt = Math.sqrt
const π = Math.PI, τ = 2*Math.PI
const pressed = "-pressed"

function todo() { throw "Not yet implemented" }
function mod(a, b) { return ((a % b) + b) % b }

function toXy(r,a) { return [-r*sin(τ*a), -r*cos(τ*a)] }
function arcCmd(r, a1, a2)
  { return `A ${r} ${r} 0 0 ${a2 >= a1 ? 0 : 1} ${toXy(r,a2)[0]} ${toXy(r,a2)[1]}` }
function rayCmd(r, a) { return `L ${toXy(r,a)[0]} ${toXy(r,a)[1]}` }

function arcRect(r1, r2, a1, a2)
  { const ar1 = arcCmd(r1, a1, a2), l1 = rayCmd(r2, a2);
    const ar2 = arcCmd(r2, a2, a1), l2 = rayCmd(r1, a1);
    return `M ${toXy(r1, a1)[0]} ${toXy(r1, a1)[1]} ${ar1} ${l1} ${ar2} ${l2} Z` }

function toggleEl(el)
  { if (el.style.display != "flex") { el.style.display = "flex" }
    else { el.style.display = "none" }                            }

window.toggleHelp = () => { toggleEl(document.getElementById("help")) }
window.hideHelp = () => { document.getElementById("help").style.display = "none"; }
window.toggleVkbd = () => { toggleEl(document.getElementById("vkbd")) }
window.hideVkbd = () => { document.getElementById("vkbd").style.display = "none"; }

function mkSe(name) { return document.createElementNS('http://www.w3.org/2000/svg', name); }
function setAttr(o, k, v) { o.setAttribute(k, v) }

function noteName(fifths)
  { let i = 0, f = fifths - 14;  while (f < 0) { f += 7; i += 1 }
    return `${"FCGDAEB"[f]}${["𝄪", "♯", "", "♭", "𝄫"][i]}`        }

function drawCof()
  { let cof = document.getElementById("cof")
    for (let i = -5; i < 7; i++)
      { let g = mkSe("g")
        setAttr(g, "class", "cof-key");  setAttr(g, "id", `cof-key-${6-i}`)
        let path = mkSe("path")
        setAttr(path, "d", arcRect(40, 70, -1/24 + i/12, 1/24 + i/12))
        setAttr(path, "stroke", "black");  setAttr(path, "stroke-width", "1")
        g.appendChild(path)
        let text = mkSe("text"), [tx, ty] = toXy(55, i/12)
        setAttr(text, "x", tx);  setAttr(text, "y", ty)
        setAttr(text, "text-anchor", "middle");  setAttr(text, "dominant-baseline", "central")
        text.appendChild(document.createTextNode(noteName(-i + 1)));
        g.appendChild(text);  cof.appendChild(g)                                               } }

let cofSideRight = false;

function flipCof(ev)
  { const rect = ev.currentTarget.getBoundingClientRect();
    const x = ev.clientX - rect.left - 150;
    const y = 150 - (ev.clientY - rect.top);
    if (Math.acos(y / sqrt(x**2 + y**2)) / π + 1/12 < 1)
      { if (x >= 0 && !cofSideRight)
          { document.querySelector("#cof-key-0 text").textContent = "F♯" }
        if (x < 0 && cofSideRight)
          { document.querySelector("#cof-key-0 text").textContent = "G♭" }
        cofSideRight = (x >= 0)                                            } }

function noteToPitch(note, oct) { return 12*oct - 7 + 7*note.ffs + 12*note.octs }

function addUniq(arr, e)
  { const i = arr.indexOf(e);  if (i == -1) { arr.push(e) };  return i == -1 }
function rmSwap(arr, e)
  { const i = arr.indexOf(e);  if (i == -1) {return false}
    const x = arr.pop();  if (i != arr.length) { arr[i] = x; }
    return true                                                }


class Holder
  { dgPressed; dgActive; mkPressed; pedal; playing; pitchToDg; synth; oct;
    vkPressed; pitchToVk;

    constructor()
      { this.dgPressed = [];  this.dgActive = [];  this.mkPressed = []
        this.pedal = 0;  this.playing = []
        this.pitchToDg = new Map();  this.synth = new NoSynth();  this.oct = 4
        this.vkPressed = [];  this.pitchToVk = new Map()                       }

    setSynth(synth) { this.synth.finalize();  this.synth = synth }

    clearDg()
      { this.dgPressed = [];  this.dgActive = [];  this.pitchToDg = new Map() }
    addKey(key, note)
      { const pitch = noteToPitch(note, this.oct);  let keys
        if (! this.pitchToDg.has(pitch)) { keys=[]; this.pitchToDg.set(pitch, keys) }
        else { keys = this.pitchToDg.get(pitch) }
        keys.push(key);  if (this.playing.includes(pitch)) { this.activate(key) }
        key.addEventListener("pointerenter", (e) =>
          { if ((e.buttons & 1) == 1) {this.pressDg(key, note)} })
        key.addEventListener("pointerleave", (e) =>
          { if ((e.buttons & 1) == 1) {this.releaseDg(key, note)} })
        key.addEventListener("pointerdown", (e) =>
          { key.releasePointerCapture(e.pointerId)
            if ((e.buttons & 1) == 1) {this.pressDg(key, note)} })
        key.addEventListener("pointerup", (e) => { this.releaseDg(key, note) })
      }

    clearVk()
      { this.pitchToVk = new Map() }
    addVkKey(key, pitch)
      { this.pitchToVk.set(pitch, key)
        key.addEventListener("pointerenter", (e) =>
          { if ((e.buttons & 1) == 1) {this.pressVk(pitch)} })
        key.addEventListener("pointerleave", (e) =>
          { if ((e.buttons & 1) == 1) {this.releaseVk(pitch)} })
        key.addEventListener("pointerdown", (e) =>
          { key.releasePointerCapture(e.pointerId)
            if ((e.buttons & 1) == 1) {this.pressVk(pitch)} })
        key.addEventListener("pointerup", (e) => { this.releaseVk(pitch) })
      }

    dgOfPitch(pitch) { return this.pitchToDg.get(pitch) ?? [] }

    noteOn(pitch, vel)
      { if (addUniq(this.playing, pitch))
          { this.synth.noteOn(pitch, vel)
            const vk = this.pitchToVk.get(pitch)
            if (vk !== undefined)
              { setAttr(vk, "class", `${vk.getAttribute("class")}${pressed}`) } }
        else { this.noteOff(pitch);  this.noteOn(pitch, vel) }                    }
    noteOff(pitch)
      { if (rmSwap(this.playing, pitch))
          { this.synth.noteOff(pitch)
            const vk = this.pitchToVk.get(pitch)
            if (vk !== undefined)
              { const cl = vk.getAttribute("class").slice(0, -pressed.length)
                setAttr(vk, "class", cl)                                      } } }
    activate(key)
      { if (! addUniq(this.dgActive, key)) { return }
        setAttr(key, "class", `${key.getAttribute("class")}${pressed}`) }
    deactivate(key)
      { if (! rmSwap(this.dgActive, key)) { return };
        setAttr(key, "class", key.getAttribute("class").slice(0, -pressed.length)) }

    pressDg(key, note)
      { if (! addUniq(this.dgPressed, key)) { return }
        this.activate(key);  this.noteOn(noteToPitch(note, this.oct)); }
    pressMk(pitch, vel)
      { if (! addUniq(this.mkPressed, pitch)) { return }
        for (const k of this.dgOfPitch(pitch)) {this.activate(k)}
        this.noteOn(pitch, vel)                                   }
    pressVk(pitch)
      { if (! addUniq(this.vkPressed, pitch)) { return }
        for (const k of this.dgOfPitch(pitch)) {this.activate(k)}
        this.noteOn(pitch, 100)                                   }

    releaseDg(key, note)
      { if (! rmSwap(this.dgPressed, key) || this.pedal > 0) { return }
        let p = noteToPitch(note, this.oct);
        if (this.mkPressed.includes(p) || this.vkPressed.includes(p)) { return }
        this.deactivate(key);  this.noteOff(p)                                   }
    releasePitch(pitch)
      { let pressed = false;  for (const k of this.dgOfPitch(pitch))
          { if (this.dgPressed.includes(k)) {pressed = true} else {this.deactivate(k)} }
        if (! pressed) { this.noteOff(pitch) }                                           }
    releaseMk(pitch)
      { if (! rmSwap(this.mkPressed, pitch) || this.pedal > 0) { return }
        if (this.vkPressed.includes(pitch)) { return }
        this.releasePitch(pitch)                                          }
    releaseVk(pitch)
      { if (! rmSwap(this.vkPressed, pitch) || this.pedal > 0) { return }
        if (this.mkPressed.includes(pitch)) { return }
        this.releasePitch(pitch)                                          }

    pressPedal() { this.pedal += 1 }
    releasePedal()
      { this.pedal -= 1;  if (this.pedal > 0) {return}
        for (const pitch of this.playing.slice())
          { if (! this.mkPressed.includes(pitch) && ! this.vkPressed.includes(pitch))
              { this.releasePitch(pitch)                                              } } }
  }

class NoSynth
  { noteOn(pitch, _) { console.log(`NOTE ON: ${pitch}`) }
    noteOff(pitch) { console.log(`NOTE OFF: ${pitch}`) }
    finalize() {}
  }

class Synth
  { handle; data
    constructor(data) { this.data = data }

    load() {
      this.handle = oxy.start(new Uint8Array(this.data))
      this.data = null
    }

    finalize() { if (this.handle !== undefined) { oxy.stop(this.handle) } }

    noteOn(pitch, vel) {
      if (this.handle === undefined) { this.load() }
      if (vel === undefined) { vel = 100 }
      oxy.noteOn(this.handle, pitch, vel)  }
    noteOff(pitch) { oxy.noteOff(this.handle, pitch) }
  }

class MidiHandler
  { holder; inputs; pedal

    constructor(holder) { this.holder = holder;  this.pedal = false }

    setInputs(inputs)
      { this.inputs = inputs
        for (const [_, input] of inputs)
          { input.onmidimessage = (m) => this.onMidiMsg(m) } }

    onMidiMsg(msg)
      { const [st, d1, d2] = msg.data
        if ((st & 0xF0) == 0x90) { this.holder.pressMk(d1) }
        else if ((st & 0xF0) == 0x80) { this.holder.releaseMk(d1) }
        else if (st == 176 && d1 == 64)
          { if (d2 < 64 && this.pedal) { holder.releasePedal(); this.pedal = false }
            if (d2 >= 64 && ! this.pedal) { holder.pressPedal(); this.pedal = true } } }
  }

let holder = new Holder()
let midi = new MidiHandler(holder)

// Diagram

function qrToXy(sz, q, r, a)
  { const x = sz * (sqrt(3) * q + sqrt(3)/2 * r),  y = sz * 3./2 * r
    return [x*cos(τ*a) - y*sin(τ*a), x*sin(τ*a) + y*cos(τ*a)]                }

function hexPoints(sz, q, r, tx, ty, a)
  { let res = ""
    for (let i = 0; i < 6; i++)
      { const p = toXy(sz, -a + i/6), xy = qrToXy(sz, q, r, a)
        res += `${tx + p[0] + xy[0]},${ty + p[1] + xy[1]} `    }
    return res.trim()                                            }

function keyColor(fs)
  { if (0 <= fs && fs < 7) { return 0 }
    return +(mod(fs, 12) >= 7) + 1   }

function jkKeyColor(fs) { return +(mod(fs, 12) >= 7) * 2 }

function mkKey(q, r, style, layout, val)
  { const { tx, ty, a } = layout
    let g = mkSe("g")
    let poly = mkSe("polygon");
    poly.setAttribute("points", hexPoints(style.keySz, q, r, tx, ty, a))
    poly.setAttribute("stroke", "black")
    poly.setAttribute("stroke-width", style.border)
    g.appendChild(poly)

    let text = mkSe("text")
    let [x, y] = qrToXy(style.keySz, q, r, a)
    text.setAttribute("x", tx+x);
    text.setAttribute("y", ty+y)
    text.setAttribute("text-anchor", "middle")
    text.setAttribute("dominant-baseline", "central")
    text.setAttribute("font-size", style.textSz)
    const note = val(q, r)
    text.appendChild(document.createTextNode(noteName(note.ffs)))
    g.setAttribute("class", `dg-key-${keyColor(note.ffs)}`)
    g.appendChild(text)
    holder.addKey(g, note)
    return g
  }

function mk12Key(q, r, style, layout, val)
  { const { tx, ty, a } = layout
    let g = mkSe("g")
    let poly = mkSe("polygon");
    poly.setAttribute("points", hexPoints(style.keySz, q, r, tx, ty, a))
    poly.setAttribute("stroke", "black")
    poly.setAttribute("stroke-width", style.border)
    g.appendChild(poly)

    let text = mkSe("text")
    let [x, y] = qrToXy(style.keySz, q, r, a)
    text.setAttribute("x", tx+x);
    text.setAttribute("y", ty+y)
    text.setAttribute("text-anchor", "middle")
    text.setAttribute("dominant-baseline", "central")
    text.setAttribute("font-size", style.textSz)
    const note = val(q, r)
    text.appendChild(document.createTextNode(mod(-7 + 7*note.ffs, 12)))
    g.setAttribute("class", `dg-key-${jkKeyColor(note.ffs)}`)
    g.appendChild(text)
    holder.addKey(g, note)
    return g
  }

function drawWh(dg, style, octs)
  { const { keySz: sz, border: bd } = style
    const layout = { tx: bd/2 + sqrt(3)/2*sz, ty: bd/2 - sz/2, a: 0 }
    const val = (q, r) => ({ ffs:  -7 + 2*q + r,  octs: 7 - q - r })
    for (let o = 0; o < octs; o++)
      { for (let i = 0; i < 10; i++)
          { dg.appendChild(mkKey(i - o, 2*o + 1, style, layout, val)) }
        for (let i = 0; i < 11; i++)
          { dg.appendChild(mkKey(i - o - 1, 2*o + 2, style, layout, val)) } }
  }

function drawGk(dg, style, octs)
  { const [x, y] = qrToXy(1, 5, 2, 0),  a = -Math.asin(y / sqrt(x**2 + y**2)) / τ
    const layout = { tx: 1.5*style.keySz,  ty: 4*style.keySz, a: a }
    const val = (q, r) => ({ ffs: 1 + 2*q - 5*r,  octs: -q + 3*r })
    for (let o = 0; o < octs; o++)
      { for (let k = -1; k < 2; k++)
          { for (let i = 0; i < 3; i++)
              { dg.appendChild(mkKey(5*o + i+k, 2*o - k, style, layout, val)) }
            for (let i = 0; i < 4; i++)
              { dg.appendChild(mkKey(5*o + 2+i+k, 2*o + 1 - k, style, layout, val)) } } }
    dg.appendChild(mkKey(5*octs - 1, 2*octs + 1, style, layout, val))
    dg.appendChild(mkKey(5*octs, 2*octs, style, layout, val))
    dg.appendChild(mkKey(5*octs + 1, 2*octs - 1, style, layout, val))
  }

function drawJk(dg, style, octs)
  { const { keySz: sz, border: bd } = style
    const layout = { tx: bd/2 + sqrt(3)*sz, ty: bd/2 + sz, a: 0 }
    const val = (q, r) => ({ ffs: -4 + 2*q - 5*r,  octs: 3 - q + 3*r })
    for (let o = 0; o < octs; o++)
      { for (let q = 0; q < 6; q++)
          { dg.appendChild(mk12Key(6*o + q, 0, style, layout, val)) }
        for (let q = 0; q < 6; q++)
          { dg.appendChild(mk12Key(6*o + q - 1, 1, style, layout, val)) }
        for (let q = 0; q < 6; q++)
          { dg.appendChild(mk12Key(6*o + q - 1, 2, style, layout, val)) }
        for (let q = 0; q < 6; q++)
          { dg.appendChild(mk12Key(6*o + q - 2, 3, style, layout, val)) } }
    dg.appendChild(mk12Key(6*octs - 1, 1, style, layout, val))
    dg.appendChild(mk12Key(6*octs - 2, 3, style, layout, val))
  }

// Virtual keyboard

function drawVkbd(octs, dark)
  { const el = document.getElementById("vkbd-keys")
    const wcl = (i) => (i < 3 || !dark) ? "vkey-0" : "vkey-1"
    const bcl = (i) => (i < 2 || !dark) ? "vkey-1" : "vkey-0"
    const wp = (i) => i*2 - (i >= 3)
    const bp = (i) => 1 + i*2 + (i >= 2)
    const start = 36

    for (let o = 0; o < octs; o++)
      { for (let i = 0; i < 7; i++)
          { let rect = mkSe("rect");
            setAttr(rect, "x", 161*o + 23*i);  setAttr(rect, "y", 0)
            setAttr(rect, "width", 23);  setAttr(rect, "height", 120)
            setAttr(rect, "class", wcl(i))
            el.appendChild(rect);  holder.addVkKey(rect, start + 12*o + wp(i)) }
        for (let [i,x] of [14.33333, 41.66666, 82.25, 108.25, 134.75].entries())
          { let rect = mkSe("rect");
            setAttr(rect, "x", 161*o + x);  setAttr(rect, "y", 0)
            setAttr(rect, "width", 13);  setAttr(rect, "height", 80)
            setAttr(rect, "class", bcl(i))
            el.appendChild(rect);  holder.addVkKey(rect, start + 12*o + bp(i)) } }
    let rect = mkSe("rect");
    setAttr(rect, "x", 161*octs);  setAttr(rect, "y", 0);
    setAttr(rect, "width", 23);  setAttr(rect, "height", 120);
    setAttr(rect, "class", wcl(0));
    el.appendChild(rect);  holder.addVkKey(rect, start + 12*octs)
    el.setAttribute("width", 161*octs + 23);                                       }

let currentLayout;

function changeLayout(layout)
  { const style = { keySz: 40, textSz: 29, border: 2.5 }
    const octs = 3
    holder.clearDg()
    let dg = document.getElementById("diagram")
    dg.textContent = ''
    if (layout == 'wh') { drawWh(dg, style, octs) }
    else if (layout == 'gk') { drawGk(dg, style, octs) }
    else if (layout == 'jk') { drawJk(dg, style, octs) }
    else { todo() }
    currentLayout = layout
    const bb = dg.getBBox()
    dg.setAttribute("width", 2*bb.x + bb.width);
    dg.setAttribute("height", 2*bb.y + bb.height);
  }

async function onLoad()
  { const wasm = await fetch("./oxi_wasm_bg.wasm")
    const compiled = await WebAssembly.compile(await wasm.arrayBuffer())
    oxy.initSync({module: compiled})

    const file = await fetch("./gm.sf2");
    const data = await file.arrayBuffer();

    holder.setSynth(new Synth(data))

    let dark = false
    drawVkbd(5, dark)
    const dbtn = document.getElementById("vkbd-dark")
    dbtn.addEventListener("click", (_) =>
      { dark = !dark;  dbtn.innerText = ["🌙", "☀️"][+dark]
        holder.clearVk();  drawVkbd(5, dark)                })

    drawCof()
    document.getElementById("cof").addEventListener("mouseover", flipCof)
    currentLayout = 'wh'
    changeLayout('wh')
    document.getElementById("layout-selector")
        .addEventListener("change", (e) => changeLayout(e.target.value))
    navigator.requestMIDIAccess().then((ma) => { midi.setInputs(ma.inputs) })
    let pedal = false;
    window.addEventListener("keydown", (e) =>
      { if(e.code == "Space" && e.target == document.body)
          { e.preventDefault();
            if (! pedal) {holder.pressPedal()}  pedal = true; } })
    window.addEventListener("keyup", (e) =>
      { if(e.code == "Space" && e.target == document.body)
          { if (pedal) {holder.releasePedal()}  pedal = false; } })

    let sf_file = document.getElementById("sf-file");
    sf_file.addEventListener("input", async (e) =>
      { const data = await sf_file.files[0].arrayBuffer();
        holder.setSynth(new Synth(data))                   })
  }

addEventListener("DOMContentLoaded", (_) => onLoad())
