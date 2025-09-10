// New Workitem modal + Cell config modal
import { state, getCell, setCell, groupFor } from '../store.mjs';
import { newItem } from '../model.mjs';
import { renderItemsIntoGrid, renderGrid } from './grid.mjs';
import { saveSnapshot } from '../store.mjs';

const $ = s => document.querySelector(s);

// Quick presets for new workitems
const itemPresets = [
  { label: 'Small Bug', type: 'Bug', size: 1, complexity: 2 },
  { label: 'Medium Story', type: 'Story', size: 3, complexity: 5 },
  { label: 'Large Feature', type: 'Feature', size: 8, complexity: 13 }
];

export function showAddItemModal(){
  const dlg = document.getElementById('itemModal');
  dlg.innerHTML = `
    <form id="itemForm" method="dialog">
      <h3>New Workitem</h3>
      <div class="formRow">
        <label>Preset
          <select id="presetSelect"><option value="">Custom</option></select>
        </label>
      </div>
      <div class="formRow">
        <label>Type
          <select name="type" required id="typeSelect"></select>
        </label>
        <label>Size <input name="size" type="number" min="1" max="20" value="3" required /></label>
      </div>
      <details>
        <summary>Advanced</summary>
        <div class="formRow">
          <label>Complexity <input name="complexity" type="number" min="1" max="20" value="5" required /></label>
        </div>
      </details>
      <div class="formRow">
        <label>Initial State <select name="state" id="stateSelect"></select></label>
      </div>
      <menu>
        <button value="cancel" class="btn ghost">Cancel</button>
        <button value="ok" class="btn primary" id="confirmAdd">Add</button>
      </menu>
    </form>`;
  const form = dlg.querySelector('#itemForm');
  const typeSel = form.querySelector('#typeSelect');
  const stSel = form.querySelector('#stateSelect');
  const presetSel = form.querySelector('#presetSelect');
  stSel.innerHTML=''; state.states.forEach(s=> stSel.appendChild(new Option(s.name, s.id)));
  typeSel.innerHTML=''; state.types.forEach(t=> typeSel.appendChild(new Option(t, t)));
  const availablePresets = itemPresets.filter(p => !p.type || state.types.includes(p.type));
  availablePresets.forEach((p, i) => presetSel.appendChild(new Option(p.label, i)));

  function refreshFilters(){
    const type = typeSel.value;
    const allowedStates = state.states.filter(s => groupFor(s.id, type));
    const curS = stSel.value; stSel.innerHTML=''; allowedStates.forEach(s=> stSel.appendChild(new Option(s.name, s.id)));
    if (allowedStates.some(s=>s.id===curS)) stSel.value=curS;
    form.querySelector('#confirmAdd').disabled = !allowedStates.length;
  }
  typeSel.addEventListener('change', refreshFilters);
  stSel.addEventListener('change', refreshFilters);
  presetSel.addEventListener('change', () => {
    const idx = presetSel.value;
    if (idx === '') return;
    const pre = availablePresets[idx];
    if (pre.type && state.types.includes(pre.type)) typeSel.value = pre.type;
    if (pre.size !== undefined) form.elements['size'].value = pre.size;
    if (pre.complexity !== undefined) form.elements['complexity'].value = pre.complexity;
    refreshFilters();
    if (pre.stateId) {
      if ([...stSel.options].some(o=>o.value===pre.stateId)) stSel.value = pre.stateId;
      else stSel.selectedIndex = 0;
    } else {
      stSel.selectedIndex = 0;
    }
  });
  refreshFilters();

  dlg.showModal();
  form.addEventListener('submit', e => e.preventDefault());
  form.querySelector('menu .primary').addEventListener('click', () => {
    const fd = new FormData(form);
    const type = fd.get('type'); const stateId = fd.get('state');
    if (!type || !stateId) return;
    newItem({ type, size: Number(fd.get('size')), complexity: Number(fd.get('complexity')), stateId });
    renderItemsIntoGrid(); saveSnapshot(); dlg.close();
  });
  form.querySelector('menu .ghost').addEventListener('click', () => dlg.close());
}

export function showCellConfigModal(groupId, stateId){
  const dlg = document.getElementById('cellModal');
  const cfg = getCell(groupId, stateId);
  const st = state.states.find(s=>s.id===stateId); const g = state.groups.find(x=>x.id===groupId);
  const allTypes = state.types;

  dlg.innerHTML = `
    <form id="cellForm" method="dialog">
      <h3>Cell Settings — <span class="gName"></span> × <span class="sName"></span></h3>
      <div class="formRow">
        <label style="display:block">Types</label>
        <div class="typeWrap"></div>
      </div>
      <div class="formRow">
        <label>WIP <input name="wip" type="number" min="0" placeholder="∞"/></label>
        <label>Capacity Mode
          <select name="capMode">
            <option value="items">Items</option>
            <option value="complexity">Complexity</option>
          </select>
        </label>
        <label>Capacity Value <input name="capVal" type="number" min="0" placeholder="Unlimited"/></label>
      </div>
      <details>
        <summary>Advanced</summary>
        <div class="formRow">
          <label>Exit default
            <select name="exitNext"></select>
          </label>
          <label>Complexity ≥ <input name="thr" type="number" min="0"/></label>
          <label>High complexity →
            <select name="exitHigh"></select>
          </label>
        </div>
        <div class="formRow">
          <label style="display:inline-flex;gap:6px;align-items:center">
            <input type="checkbox" name="decompose"/> Split items above complexity
          </label>
          <label class="decomposeOpts" style="display:none">Threshold
            <input name="threshold" type="number" min="0"/>
          </label>
          <label class="decomposeOpts" style="display:none">Children per point
            <input name="splitRatio" type="number" min="1"/>
          </label>
        </div>
        <div class="formRow">
          <label style="display:inline-flex;gap:6px;align-items:center">
            <input type="checkbox" name="done"/> Items leaving this state are considered done
          </label>
        </div>
      </details>
      <menu>
        <button value="cancel" class="btn ghost">Cancel</button>
        <button value="ok" class="btn primary">Save</button>
      </menu>
    </form>`;

  dlg.showModal();
  const form = dlg.querySelector('#cellForm');
  form.querySelector('.gName').textContent = g?.name || 'Group';
  form.querySelector('.sName').textContent = st?.name || 'State';

  // Build type checkboxes safely
  const typeWrap = form.querySelector('.typeWrap');
  allTypes.forEach(t => {
    const label = document.createElement('label');
    label.style.display='inline-flex'; label.style.gap='6px'; label.style.alignItems='center'; label.style.marginRight='10px';
    const input = document.createElement('input');
    input.type='checkbox'; input.name='type'; input.value=t;
    if (cfg.allowedTypes?.includes(t)) input.checked = true;
    label.appendChild(input);
    const span = document.createElement('span');
    span.textContent = t;
    label.appendChild(span);
    typeWrap.appendChild(label);
  });

  // Populate selects
  const exitNextSel = form.querySelector('select[name="exitNext"]');
  const exitHighSel = form.querySelector('select[name="exitHigh"]');
  state.states.forEach(s => {
    const opt1 = document.createElement('option');
    opt1.value = s.id; opt1.textContent = s.name;
    if (cfg.exit?.nextStateId===s.id) opt1.selected = true;
    exitNextSel.appendChild(opt1);
    const opt2 = document.createElement('option');
    opt2.value = s.id; opt2.textContent = s.name;
    if (cfg.exit?.highNextStateId===s.id) opt2.selected = true;
    exitHighSel.appendChild(opt2);
  });

  // Set input values
  form.elements['wip'].value = cfg.wip ?? '';
  form.elements['capMode'].value = cfg.capacityMode ?? 'items';
  form.elements['capVal'].value = cfg.capacityValue ?? '';
  form.elements['thr'].value = cfg.exit?.threshold ?? '';
  form.elements['done'].checked = cfg.exit?.doneOnExit ?? false;
  form.elements['decompose'].checked = cfg.decompose ? true : false;
  form.elements['threshold'].value = cfg.decompose?.threshold ?? '';
  form.elements['splitRatio'].value = cfg.decompose?.splitRatio ?? '';

  form.addEventListener('submit', e => e.preventDefault());
  form.querySelector('menu .primary').addEventListener('click', () => {
    const fd = new FormData(form);
    const types = fd.getAll('type');
    const wip = fd.get('wip'); const capMode = fd.get('capMode'); const capVal = fd.get('capVal');
    const exitNext = fd.get('exitNext'); const thr = fd.get('thr'); const exitHigh = fd.get('exitHigh'); const done = fd.get('done')==='on';
    const decompose = fd.get('decompose')==='on'; const thr2 = fd.get('threshold'); const splitRatio = fd.get('splitRatio');
    setCell(groupId, stateId, {
      allowedTypes: types,
      wip: wip===''?null:Number(wip),
      capacityMode: capMode,
      capacityValue: capVal===''?null:Number(capVal),
      exit: { nextStateId: exitNext||null, threshold: thr===''?null:Number(thr), highNextStateId: exitHigh||null, doneOnExit: done },
      decompose: decompose ? { threshold: thr2===''?null:Number(thr2), splitRatio: splitRatio===''?null:Number(splitRatio) } : null
    });
    renderGrid(); saveSnapshot(); dlg.close();
  });
  form.querySelector('menu .ghost').addEventListener('click', () => dlg.close());

  const decChk = form.querySelector('input[name="decompose"]');
  const decOpts = form.querySelectorAll('.decomposeOpts');
  function toggleDecompose(){ decOpts.forEach(el => el.style.display = decChk.checked ? '' : 'none'); }
  decChk.addEventListener('change', toggleDecompose);
  toggleDecompose();
}
