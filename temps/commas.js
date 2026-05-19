const sgn = Math.sign, min = Math.min, max = Math.max, abs = Math.abs
const floor = Math.floor, log2 = Math.log2

function todo() { throw "TODO" }

function rmEls(arr, ...ix)
  { ix.sort()
    for (let i = 0; i < ix.length; i++) { arr.splice(ix[i] - i, 1) } }

// TODO: testing

function pairComma(sg, comma)
  { const three = sg.includes(3)
    const pos = Array.from(comma.entries().filter(x => x[1] > 0)
        .map(([i,x]) => [x, sg[i], 1]))
    const neg = Array.from(comma.entries().filter(x => x[1] < 0)
        .map(([i,x]) => [-x, 1, sg[i]]))
    let res = []
    outer: while (true)  // VARIANT: min(pos.length, neg.length)
      { let found = false
        for (let i = 0; i < pos.length; i++)
          { for (let j = 0; j < neg.length; j++)
              { if (three && (pos[i][1] == 3) && (pos[i][0] == 2*neg[j][0]))
                  { found = true
                    pos.splice(i, 1)
                    let [y] = neg.splice(j, 1);  res.push([y[0], 9, y[2]])
                    continue outer
                  }
                else if (three && neg[j][2] == 3 && 2*pos[i][0] == neg[j][0])
                  { found = true
                    neg.splice(j, 1)
                    let [x] = pos.splice(i, 1);  res.push([x[0], x[1], 9])
                    continue outer
                  }
                else if (pos[i][0] == neg[j][0])
                  { found = true
                    let [x] = pos.splice(i, 1), [y] = neg.splice(j, 1)
                    res.push([x[0], x[1], y[2]])
                    continue outer                                     }      } }
        break                                                                     }
    if (pos.length == 0 && neg.length == 0) { return res }
    // TODO: 9 = 3*3
    outer: while (true)  // VARIANT: min(pos.length, neg.length)
      { let found = false
        for (let i = 0; i < pos.length; i++)
          { const a = pos[i]
            for (let j1 = 0; j1 < neg.length; j1++)
              { for (let j2 = j1 + 1; j2 < neg.length; j2++)
                  { const b1 = neg[j1], b2 = neg[j2]
                    if (a[0] == b1[0] + b2[0])
                      { res.push( [b1[0], a[1], b1[2]] )
                        res.push( [b2[0], a[1], b2[2]] )
                        rmEls(pos, i);  rmEls(neg, j1, j2)
                        continue outer                       } } } }
        for (let j = 0; j < neg.length; j++)
          { const b = neg[j]
            for (let i1 = 0; i1 < pos.length; i1++)
              { for (let i2 = i1 + 1; i2 < pos.length; i2++)
                  { const a1 = pos[i1], a2 = pos[i2]
                    if (b[0] == a1[0] + a2[0])
                      { res.push( [a1[0], a1[1], b[2]] )
                        res.push( [a2[0], a2[1], b[2]] )
                        rmEls(pos, i1, i2);  rmEls(neg, j)
                        continue outer                       } } } }
        break                                                        }
    return [...res, ...pos, ...neg]
  }

export function packComma(sg, comma)
  { const two = sg.includes(2),  three = sg.includes(3)
    const sga = two ? sg.slice(1) : sg
    const ct = two ? comma.slice(1) : comma
    const chunks = pairComma(sga, ct)
        .map(([i, a, b]) => a >= b ? [i, a, b] : [-i, b, a])
    let ix3 = chunks.findIndex(([_, a, b]) => a == 3 && b == 1)
    if (ix3 != -1)
      { const n = chunks[ix3][0]
        if (n % 2 == 0) { chunks[ix3] = [n/2, 9, 1] }
        else
          { let i = chunks.findIndex(([k, _, d]) =>
                (d == 1 || d == 3) && sgn(k) == -sgn(n)
                && abs(k) < abs(n) && (k % 2 != 0)     )
            if (i != -1)
              { chunks[i][2] *= 3;  chunks[ix3][0] += chunks[i][0]
                chunks[ix3] = [chunks[ix3][0]/2, 9, 1]             } } }
    if (two)
      { let octs = comma[0]
        for (let i = 0; i < chunks.length; i++)
          { const [n, u, l] = chunks[i],  o = max(0, floor(log2(u / l)))
            chunks[i] = [n, u, 2**o * l];  octs += n * o                 }
        while (octs != 0)
          { var i = null, nm = 0
            for (let j = 0; j < chunks.length; j++)
              { const [n, u, l] = chunks[j]
                if (sgn(n) == -sgn(octs) && log2(u/l) > 0.5 &&
                    abs(n) <= abs(octs) && abs(nm) < abs(n)   )
                  { nm = n;  i = j }                            }
            if (i == null) { break }
            const [n, u, l] = chunks[i]
            chunks[i] = [-n, 2*l, u];  octs += n                  }
        if (octs != 0) { chunks.push([octs, 2, 1]) }                       }
    // Make sure it is not wrong
      { let gold = 1
        for (let i = 0; i < sg.length; i++) { gold *= sg[i] ** comma[i] }
        let ref = 1
        for (let [n, u, d] of chunks) { ref *= (u/d) ** n }
        console.assert(abs(ref - gold) < 1e-9, ref, gold)                 }
    return chunks
  }

export function printPack(pack)
  { if (pack.length == 0) { return "[1/1]" }
    let pos = pack.findIndex(x => x[0] > 0)
    if (pos != -1) { const t = pack[0];  pack[0] = pack[pos];  pack[pos] = t }
    let res = ''
    const ch = pack[0]
    if (ch[0] == -1) { res += `−` }
    else if (ch[0] < 0) { res += `−${-ch[0]} ` }
    else if (ch[0] != 1) { res += `${ch[0]} ` }
    res += `[${ch[1]}/${ch[2]}]`
    for (let i = 1; i < pack.length; i++)
      { const ch = pack[i]
        if (ch[0] == -1) { res += ` − ` }
        else if (ch[0] == 1) { res += ` + ` }
        else if (ch[0] < 0) { res += ` − ${-ch[0]} ` }
        else { res += ` + ${ch[0]} ` }
        res += `[${ch[1]}/${ch[2]}]`
      }
    return res
  }
