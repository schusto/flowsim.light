// Entry: wire UI, boot state, start sim
import { state, saveSnapshot, loadSnapshot, uid, DEFAULT_STATES, DEFAULT_GROUPS, DEFAULT_TYPES, isSnapshotValid, seedCellsFromRules, cells, workgroupSettings, groupFor } from './store.mjs';
import { addState, renameState, deleteState, moveState, addGroup, renameGroup, deleteGroup, moveGroup, newItem } from './model.mjs';
import { renderGrid, renderItemsIntoGrid } from './ui/grid.mjs';
import { renderConfig, showConfigModal } from './ui/config.mjs';
import { showAddItemModal, showCellConfigModal } from './ui/modal.mjs';
import { startSim, setSpeed, togglePlay } from './sim.mjs';

const $ = s => document.querySelector(s);

function exportJSON(){
  const blob = new Blob([ JSON.stringify({
    sim:{ day: Math.floor(state.sim.day) },
    states: state.states,
    groups: state.groups,
    items: Array.from(state.items.values()),
    cells: Array.from(cells.entries()),
    workgroupSettings: Array.from(workgroupSettings.entries()),
    types: state.types
  }, null, 2) ], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'flowsim-config.json'; a.click();
  URL.revokeObjectURL(url);
}
function importJSON(file){
  const reader = new FileReader();
  reader.onload = async () => {
    try{
      const data = JSON.parse(reader.result);
      state.sim.day = Number(data.sim?.day ?? 0);
      state.sim.nextDay = Math.floor(state.sim.day) + 1;
      state.states = data.states ?? [];
      state.groups = data.groups ?? [];
      state.items = new Map((data.items ?? []).map(it => {
        const { groupId, ...rest } = it || {};
        if (rest.remaining === undefined) rest.remaining = rest.complexity;
        return [rest.id, rest];
      }));
      // cells & workgroup settings
      const store = await import('./store.mjs');
      store.cells.clear(); (data.cells||[]).forEach(([k,v])=> store.cells.set(k,v));
      store.workgroupSettings.clear(); (data.workgroupSettings||[]).forEach(([k,v])=> store.workgroupSettings.set(k,v));
      state.types = data.types ?? [...store.ALL_TYPES];
      // fix next id
      const maxItemId = Math.max(0, ...Array.from(state.items.keys()).map(Number).filter(n => !Number.isNaN(n)));
      const maxStateId = Math.max(0, ...state.states.map(s => Number(s.id)).filter(n => !Number.isNaN(n)));
      const maxGroupId = Math.max(0, ...state.groups.map(g => Number(g.id)).filter(n => !Number.isNaN(n)));
      state.nextId = Math.max(maxItemId, maxStateId, maxGroupId) + 1;
      $('#simDay').textContent = String(Math.floor(state.sim.day));
      renderConfig();
      renderGrid();
      saveSnapshot();
    }catch(e){ alert('Invalid JSON'); }
  };
  reader.readAsText(file);
}

// Local named configs
function listLocalConfigs(){ try{ return Object.keys(JSON.parse(localStorage.getItem('flowsim.saved')||'{}')); }catch{return [];} }
async function saveLocalConfig(name){
  const data={ sim:{ day: Math.floor(state.sim.day) }, states: state.states, groups: state.groups, items: Array.from(state.items.values()), cells: Array.from(cells.entries()), workgroupSettings: Array.from(workgroupSettings.entries()), types: state.types };
  const all = JSON.parse(localStorage.getItem('flowsim.saved')||'{}'); all[name]=data; localStorage.setItem('flowsim.saved', JSON.stringify(all));
}
async function loadLocalConfig(name){
  const all = JSON.parse(localStorage.getItem('flowsim.saved')||'{}'); const data=all[name]; if(!data) return false;
  state.sim.day = Number(data.sim?.day ?? 0);
  state.sim.nextDay = Math.floor(state.sim.day) + 1;
  state.states = data.states ?? []; state.groups = data.groups ?? [];
  state.items = new Map((data.items ?? []).map(it => {
    const { groupId, ...rest } = it || {};
    if (rest.remaining === undefined) rest.remaining = rest.complexity;
    return [rest.id, rest];
  }));
  const store = await import('./store.mjs');
  state.types = data.types ?? [...store.ALL_TYPES];
  store.cells.clear(); (data.cells||[]).forEach(([k,v])=> store.cells.set(k,v));
  store.workgroupSettings.clear(); (data.workgroupSettings||[]).forEach(([k,v])=> store.workgroupSettings.set(k,v));
  return true;
}

function wireUI(){
  console.info('[FlowSim] wireUI');
  $('#playPauseBtn').addEventListener('click', () => {
    togglePlay();
    $('#playPauseBtn').textContent = state.sim.playing ? '⏸ Pause' : '▶︎ Play';
  });
  $('#resetBtn').addEventListener('click', () => {
    loadSnapshot();
    state.sim.playing = false;
    $('#playPauseBtn').textContent = '▶︎ Play';
    $('#simDay').textContent = String(Math.floor(state.sim.day));
    renderConfig();
    renderGrid();
    saveSnapshot();
  });
  document.addEventListener('keydown', e => {
    if (e.code === 'Space' && !e.repeat && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA'){
      e.preventDefault();
      $('#playPauseBtn').click();
    }
  });
  const speed = $('#speed'); const speedVal = $('#speedVal');
  function updateSpeed(){ setSpeed(Number(speed.value)); speedVal.textContent = `${speed.value}×`; }
  speed.addEventListener('input', updateSpeed); updateSpeed();

  document.addEventListener('click', (e)=>{
    if (e.target instanceof HTMLElement) {
      const ds=[...e.target.getAttributeNames()].filter(n=>n.startsWith('data-')).map(n=>`${n}=${e.target.getAttribute(n)}`).join(' ');
      console.debug('[FlowSim] click', e.target.tagName, e.target.id||'', e.target.className||'', ds);
    }
    const t = e.target;
    if (!(t instanceof HTMLElement)) return;
    // States
    if (t.matches('[data-add-state]')) { const name = prompt('State name:', 'New State'); if (name) addState(name); }
    if (t.matches('[data-del-state]')) { deleteState(t.dataset.id); }
    if (t.matches('[data-move-state]')) { moveState(t.dataset.id, Number(t.dataset.delta||0)); }
    // Groups
    if (t.matches('[data-add-group]')) { const name = prompt('Workgroup name:', 'Workgroup'); if (name) addGroup(name); }
    if (t.matches('[data-del-group]')) { deleteGroup(t.dataset.id); }
    if (t.matches('[data-move-group]')) { moveGroup(t.dataset.id, Number(t.dataset.delta||0)); }
    // Items
    if (t.matches('#addRandomItemBtn')){
      const types = ['Epic','Feature','Story','Bug'];
      const type = types[Math.floor(Math.random()*types.length)];
      const validStates = state.states.filter(s => groupFor(s.id, type));
      if (validStates.length){
        const s = validStates[Math.floor(Math.random()*validStates.length)];
        newItem({ type, size: 1+Math.floor(Math.random()*8), complexity: 1+Math.floor(Math.random()*8), stateId: s.id });
        renderItemsIntoGrid(); saveSnapshot();
      }
    }
    if (t.matches('#addItemBtn')) showAddItemModal();

    // Local configs
    if (t.matches('#saveLocalBtn')){ const name = prompt('Save as name:'); if(name){ saveLocalConfig(name).then(()=>console.info('[FlowSim] saved local config', name)); } }
    if (t.matches('#loadLocalBtn')){ const names = listLocalConfigs(); const name = prompt('Load which?\n' + names.join('\n')); if(name){ loadLocalConfig(name).then(ok=>{ if(ok){ renderConfig(); renderGrid(); saveSnapshot(); }}); } }
    if (t.matches('#configBtn')){ showConfigModal(); }
    if (t.matches('#listLocalBtn')){ console.table(listLocalConfigs()); }
    // Cell config
    if (t.matches('[data-edit-cell]')){ const gid=t.dataset.groupId, sid=t.dataset.stateId; showCellConfigModal(gid, sid); }

    if (t.matches('#exportBtn')) exportJSON();
    if (t.matches('#importBtn')) $('#importFile').click();
  });

  // commit inline edits on Enter (blur triggers rename)
  document.addEventListener('keydown', (e) => {
    const el = e.target;
    if (!(el instanceof HTMLElement)) return;
    if (e.key === 'Enter' && (el.matches('[data-state-name]') || el.matches('[data-group-name]'))) {
      e.preventDefault(); el.blur();
    }
  });

  document.addEventListener('blur', async (e)=>{
    if (e.target instanceof HTMLElement) {
      console.debug('[FlowSim] blur', e.target.tagName, e.target.dataset);
      if (e.target.matches('[data-state-name]')) { const id = e.target.dataset.id; const name = e.target.textContent.trim(); if (name) renameState(id, name); }
      if (e.target.matches('[data-group-name]')) { const id = e.target.dataset.id; const name = e.target.textContent.trim(); if (name) renameGroup(id, name); }
      if (e.target.matches('input[data-wg-start]')){ const id=e.target.dataset.wgStart; (await import('./store.mjs')).setWorkgroupSettings(id, { startDay: Number(e.target.value)||0 }); saveSnapshot(); }
      if (e.target.matches('input[data-wg-freq]')){ const id=e.target.dataset.wgFreq; (await import('./store.mjs')).setWorkgroupSettings(id, { frequency: Number(e.target.value)||7 }); saveSnapshot(); }
    }
  }, true);

  $('#importFile').addEventListener('change', e => {
    const file = e.target.files[0]; if (file) importJSON(file);
    e.target.value = '';
  });
}

function boot(){
  console.info('[FlowSim] boot start');
  const loaded = loadSnapshot();
  if (!loaded || !isSnapshotValid()){
    state.types = DEFAULT_TYPES;
    DEFAULT_STATES.forEach(n => addState(n));
    DEFAULT_GROUPS.forEach(n => addGroup(n));
    seedCellsFromRules();
    const pick = arr => arr[Math.floor(Math.random()*arr.length)];
    for (let i=0;i<8;i++){
      const t = pick(['Epic','Feature','Story','Bug']);
      const validStates = state.states.filter(s => groupFor(s.id, t));
      if (!validStates.length) continue;
      const s = pick(validStates);
      newItem({ type:t, size:1+Math.floor(Math.random()*8), complexity:1+Math.floor(Math.random()*8), stateId:s.id });
    }
    saveSnapshot();
  }
  document.getElementById('simDay').textContent = String(Math.floor(state.sim.day));
  renderConfig();
  renderGrid();
  wireUI();
  console.info('[FlowSim] wireUI attached');
  console.info('[FlowSim] boot render done');
  startSim();
}

boot();
