import { packComma, printPack } from  "./commas.js"

function renderTable(data)
  { const tbody = document.getElementById('tempTable');
    for (const row of data)
      { const tr = document.createElement('tr');

        const tdName = document.createElement('td');
        tdName.textContent = row.name;
        tr.appendChild(tdName);

        const tdSg = document.createElement('td');
        const span = document.createElement('span');
        span.textContent = row.subgroup;
        tdSg.appendChild(span);
        tr.appendChild(tdSg);

        const tdBasis = document.createElement('td');
        row.basis.forEach((arr, index) => {
          const line = document.createTextNode(`[${arr.join(', ')}]`);
          tdBasis.appendChild(line);
          if (index < row.basis.length - 1) {
            tdBasis.appendChild(document.createElement('br'));
          }
        });
        tr.appendChild(tdBasis);

        const tdBasis2 = document.createElement('td');
        row.basis.forEach((arr, index) => {
          const sg = Array.from(row.subgroup.split('.').map(x => +x))
          const text = printPack(packComma(sg, arr))
          const line = document.createTextNode(text);
          tdBasis2.appendChild(line);
          if (index < row.basis.length - 1) {
            tdBasis2.appendChild(document.createElement('br'));
          }
        });
        tr.appendChild(tdBasis2);

        tbody.appendChild(tr);
      }
  }

async function onLoad()
  { const data = fetch('temps.json').then(x => x.json())
    renderTable(await data);
  }

addEventListener("DOMContentLoaded", (_) => onLoad())
