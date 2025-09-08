// Grid rendering + DnD
import { state, TYPE_COLORS, getCell, groupFor } from '../store.mjs';

const $ = s => document.querySelector(s);
const h = (tag, props={}, children=[]) => {
  const el = document.createElement(tag);
  Object.entries(props).forEach(([k,v]) => {
    if (k === 'class') el.className = v;
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (v !== undefined) el.setAttribute(k, v);
  });
  if (!Array.isArray(children)) children = [children];
  children.filter(Boolean).forEach(c => el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c));
  return el;
};

export function renderGrid(){
  console.info('[FlowSim] renderGrid', {states: state.states.length, groups: state.groups.length, items: state.items.size});
  const grid = $('#grid');
  grid.style.gridTemplateColumns = `200px repeat(${state.states.length}, minmax(220px, 1fr))`;
  grid.innerHTML = '';
  grid.appendChild(h('div'));
  for (const s of state.states){ grid.appendChild(h('div', { class:'hdr', role:'columnheader' }, s.name)); }
  for (const g of state.groups){
    grid.appendChild(h('div', { class:'rowhdr', role:'rowheader' }, g.name));
    for (const s of state.states){
      const cell = h('div', { class:'cell', dataset:{ stateId: s.id, groupId: g.id } });
      const cfg = getCell(g.id, s.id);
      if (!cfg.allowedTypes || cfg.allowedTypes.length === 0) cell.classList.add('disallowed');
      const tools = h('div', { class:'cell-tools' }, [ h('button', { class:'tool', dataset:{ editCell:'', stateId: s.id, groupId: g.id } }, '⚙︎') ]);
      cell.appendChild(tools);
      cell.addEventListener('dragover', e => { e.preventDefault(); cell.classList.add('dropTarget'); });
      cell.addEventListener('dragleave', () => cell.classList.remove('dropTarget'));
      cell.addEventListener('drop', e => {
        e.preventDefault(); cell.classList.remove('dropTarget');
        const id = e.dataTransfer.getData('text/plain');
        const it = state.items.get(id); if(!it) return;
        const prev = it.stateId;
        const expected = groupFor(s.id, it.type);
        if (expected !== g.id){
          console.debug('[FlowSim] drop blocked', {expected, target:g.id, stateId:s.id, type:it.type});
          cell.animate([{transform:'translateY(0)'},{transform:'translateY(-3px)'},{transform:'translateY(0)'}], {duration:220});
          return;
        }
        it.stateId = s.id;
        if (prev !== s.id) it.stateEnteredAt = state.sim.day;
        renderItemsIntoGrid();
        localStorage.setItem('flowsim.touch','1');
      });
      grid.appendChild(cell);
    }
  }
  renderItemsIntoGrid();
}

export function renderItemsIntoGrid(){
  console.info('[FlowSim] renderItemsIntoGrid', state.items.size);
  const grid = $('#grid');
  window.__items = state.items;
  grid.querySelectorAll('.cell').forEach(c => c.querySelector('.empty') ? null : c.appendChild(Object.assign(document.createElement('div'), {className:'empty', textContent:'Drop items here…'})));
  grid.querySelectorAll('.cell').forEach(c => { c.querySelectorAll('.wi').forEach(el=>el.remove()); });
  for (const it of state.items.values()){
    const gId = groupFor(it.stateId, it.type);
    if (!gId) continue;
    const selector = `.cell[data-state-id="${it.stateId}"][data-group-id="${gId}"]`;
    const cell = grid.querySelector(selector); if (!cell) continue;
    const empty = cell.querySelector('.empty'); if (empty) empty.remove();
    cell.appendChild(renderItem(it));
  }
  document.getElementById('itemCount').textContent = String(state.items.size);
}

function renderItem(it){
  const tpl = document.getElementById('itemTpl');
  const el = tpl.content.firstElementChild.cloneNode(true);
  el.dataset.id = it.id;
  el.querySelector('.wi-type').textContent = it.type;
  el.querySelector('.wi-state').textContent = getStateName(it.stateId);
  el.querySelector('.wi-size').textContent = it.size;
  el.querySelector('.wi-complexity').textContent = it.complexity;
  el.querySelector('.wi-age').textContent = Math.floor(state.sim.day - it.createdAt);
  el.querySelector('.wi-instate').textContent = Math.floor(state.sim.day - it.stateEnteredAt);
  el.style.borderLeft = `4px solid ${TYPE_COLORS[it.type] || '#94a3b8'}`;
  el.addEventListener('dragstart', e => { e.dataTransfer.setData('text/plain', it.id); e.dataTransfer.effectAllowed = 'move'; });
  return el;
}
function getStateName(id){ return state.states.find(s => s.id===id)?.name ?? '—'; }
