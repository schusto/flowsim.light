// New Workitem modal + Cell config modal
import { state, canWork, getCell, setCell } from '../store.mjs';
import { newItem } from '../model.mjs';
import { renderSidebar } from './sidebar.mjs';
import { renderItemsIntoGrid, renderGrid } from './grid.mjs';
import { saveSnapshot } from '../store.mjs';

const $ = s => document.querySelector(s);

export function showAddItemModal(){
  const dlg = document.getElementById('itemModal');
  dlg.innerHTML = `
    <form id="itemForm" method="dialog">
      <h3>New Workitem</h3>
      <div class="formRow">
        <label>Type
          <select name="type" required>
            <option>Epic</option><option>Feature</option><option>Story</option><option>Bug</option>
          </select>
        </label>
        <label>Size <input name="size" type="number" min="1" max="20" value="3" required /></label>
        <label>Complexity <input name="complexity" type="number" min="1" max="20" value="5" required /></label>
      </div>
      <div class="formRow">
        <label>Initial State <select name="state" id="stateSelect"></select></label>
        <label>Workgroup <select name="group" id="groupSelect"></select></label>
      </div>
      <menu>
        <button value="cancel" class="btn ghost">Cancel</button>
        <button value="ok" class="btn primary" id="confirmAdd">Add</button>
      </menu>
    </form>`;
  const form = dlg.querySelector('#itemForm');
  const typeSel = form.querySelector('select[name="type"]');
  const stSel = form.querySelector('#stateSelect');
  const gpSel = form.querySelector('#groupSelect');
  stSel.innerHTML=''; state.states.forEach(s=> stSel.appendChild(new Option(s.name, s.id)));
  gpSel.innerHTML=''; state.groups.forEach(g=> gpSel.appendChild(new Option(g.name, g.id)));

  function refreshFilters(){
    const type = typeSel.value;
    const allowedStates = state.states.filter(s => state.groups.some(g => canWork(g.name, s.name, type)));
    const curS = stSel.value; stSel.innerHTML=''; allowedStates.forEach(s=> stSel.appendChild(new Option(s.name, s.id)));
    if (allowedStates.some(s=>s.id===curS)) stSel.value=curS;
    const sName = state.states.find(s=>s.id===stSel.value)?.name;
    const allowedGroups = state.groups.filter(g => canWork(g.name, sName, type));
    const curG = gpSel.value; gpSel.innerHTML=''; allowedGroups.forEach(g=> gpSel.appendChild(new Option(g.name, g.id)));
    if (allowedGroups.some(g=>g.id===curG)) gpSel.value=curG;
    form.querySelector('#confirmAdd').disabled = !(allowedStates.length && allowedGroups.length);
  }
  typeSel.addEventListener('change', refreshFilters);
  stSel.addEventListener('change', refreshFilters);
  refreshFilters();

  dlg.showModal();
  form.addEventListener('submit', e => e.preventDefault());
  form.querySelector('menu .primary').addEventListener('click', () => {
    const fd = new FormData(form);
    const type = fd.get('type'); const stateId = fd.get('state'); const groupId = fd.get('group');
    if (!type || !stateId || !groupId) return;
    newItem({ type, size: Number(fd.get('size')), complexity: Number(fd.get('complexity')), stateId, groupId });
    renderItemsIntoGrid(); saveSnapshot(); dlg.close();
  });
  form.querySelector('menu .ghost').addEventListener('click', () => dlg.close());
}

export function showCellConfigModal(groupId, stateId){
  const dlg = document.getElementById('cellModal');
  const cfg = getCell(groupId, stateId);
  const st = state.states.find(s=>s.id===stateId); const g = state.groups.find(x=>x.id===groupId);
  const allTypes = ['Epic','Feature','Story','Bug'];
  dlg.innerHTML = `
    <form id="cellForm" method="dialog">
      <h3>Cell Settings — ${g?.name||'Group'} × ${st?.name||'State'}</h3>
      <div class="formRow">
        <label style="display:block">Types</label>
        ${allTypes.map(t => `<label style="display:inline-flex;gap:6px;align-items:center;margin-right:10px">
          <input type="checkbox" name="type" value="${t}" ${cfg.allowedTypes?.includes(t)?'checked':''}/> ${t}
        </label>`).join('')}
      </div>
      <div class="formRow">
        <label>WIP <input name="wip" type="number" min="0" placeholder="∞" value="${cfg.wip??''}"/></label>
        <label>Capacity Mode
          <select name="capMode">
            <option ${cfg.capacityMode==='items'?'selected':''} value="items">Items</option>
            <option ${cfg.capacityMode==='complexity'?'selected':''} value="complexity">Complexity</option>
          </select>
        </label>
        <label>Capacity Value <input name="capVal" type="number" min="0" placeholder="Unlimited" value="${cfg.capacityValue??''}"/></label>
      </div>
      <div class="formRow">
        <label>Exit default
          <select name="exitNext">${state.states.map(s=> `<option value="${s.id}" ${cfg.exit?.nextStateId===s.id?'selected':''}>${s.name}</option>`).join('')}</select>
        </label>
        <label>Complexity ≥ <input name="thr" type="number" min="0" value="${cfg.exit?.threshold??''}"/></label>
        <label>High complexity →
          <select name="exitHigh">${state.states.map(s=> `<option value="${s.id}" ${cfg.exit?.highNextStateId===s.id?'selected':''}>${s.name}</option>`).join('')}</select>
        </label>
      </div>
      <div class="formRow">
        <label style="display:inline-flex;gap:6px;align-items:center">
          <input type="checkbox" name="done" ${cfg.exit?.doneOnExit?'checked':''}/> Items leaving this state are considered done
        </label>
      </div>
      <menu>
        <button value="cancel" class="btn ghost">Cancel</button>
        <button value="ok" class="btn primary">Save</button>
      </menu>
    </form>`;
  dlg.showModal();
  const form = dlg.querySelector('#cellForm');
  form.addEventListener('submit', e => e.preventDefault());
  form.querySelector('menu .primary').addEventListener('click', () => {
    const fd = new FormData(form);
    const types = fd.getAll('type');
    const wip = fd.get('wip'); const capMode = fd.get('capMode'); const capVal = fd.get('capVal');
    const exitNext = fd.get('exitNext'); const thr = fd.get('thr'); const exitHigh = fd.get('exitHigh'); const done = fd.get('done')==='on';
    setCell(groupId, stateId, {
      allowedTypes: types,
      wip: wip===''?null:Number(wip),
      capacityMode: capMode,
      capacityValue: capVal===''?null:Number(capVal),
      exit: { nextStateId: exitNext||null, threshold: thr===''?null:Number(thr), highNextStateId: exitHigh||null, doneOnExit: done }
    });
    renderGrid(); saveSnapshot(); dlg.close();
  });
  form.querySelector('menu .ghost').addEventListener('click', () => dlg.close());
}
