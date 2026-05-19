import { packComma, printPack } from  "./commas.js"

const sgn = Math.sign, min = Math.min, max = Math.max, abs = Math.abs
const floor = Math.floor, log2 = Math.log2

function parseRatio(input)
  { try
      { const arr = input.split("/").map(x => +x)
        if (arr.length != 2 || isNaN(arr[0]) || isNaN(arr[1])) { return null }
        let [u, l] = arr
        if (floor(l) != l || floor(u) != u || l <= 0 || u < l) { return null }
        let sg = [], mz = []
        while (u > 1 || l > 1)
          { for (let n = 2; n <= max(u, l); n++)
              { if (u % n == 0)
                  { let i = sg.findIndex(x => x == n);
                    if (i == -1) { i = sg.length;  sg.push(n);  mz.push(0) }
                    while (u % n == 0) { mz[i]++;  u /= n }                  }
                if (l % n == 0)
                  { let i = sg.findIndex(x => x == n);
                    if (i == -1) { i = sg.length;  sg.push(n);  mz.push(0) }
                    while (l % n == 0) { mz[i]--;  l /= n }                  }
                if (n > 31) { return null }                                    } }
      return [arr[0], arr[1], sg, mz]                                              }
    catch { return null }
  }

function process(input)
  { let parsed = parseRatio(input)
    if (parsed === null) { return }
    let [u, l, sg, mz] = parsed
    document.getElementById("ratio").textContent = `${u} / ${l}`
    document.getElementById("subgroup").textContent = sg.join(".")
    document.getElementById("monzo").textContent = `[${mz.join(" ")}⟩`
    document.getElementById("interval-sum").textContent =
        printPack(packComma(sg, mz))
    document.getElementById("cents").textContent =
      input.split("/").map(x => +x).reduce((x, y) => 1200*log2(x/y))

    const url = new URL(window.location);
    url.searchParams.set('ratio', `${u}/${l}`);
    window.history.replaceState({}, '', url);
  }

async function onLoad()
  { const params = new URLSearchParams(window.location.search);
    const ratio = params.get('ratio'); // "81/10" or null

    const input = document.getElementById('input');
    if (ratio)
      { document.getElementById('input').value = ratio;
        process(ratio)
      }

    input.addEventListener('input', (e) => { process(e.target.value) });
  }

addEventListener("DOMContentLoaded", (_) => onLoad())
