// Global state + persistence
export const state = {
  sim: { playing:false, day:0, speed:1, lastTick: performance.now(), nextDay:1 },
  states: [],          // [{id,name}]
  groups: [],          // [{id,name}]
  items: new Map(),    // id -> item
  types: [],          // ['Epic','Feature',...]
  nextId: 1,
  rules: [],          // automatic arrival rules
};

export const TYPE_COLORS = { Epic:'#fde68a', Feature:'#93c5fd', Story:'#a7f3d0', Bug:'#fca5a5' };
export const ALL_TYPES = Object.keys(TYPE_COLORS);
export const uid = () => String(state.nextId++);

// Capability rules (by names, simple prototype approach)
export const CAP_RULES = [
  { group: 'LPM Board', types: ['Epic'], states: ['Funnel','Review','Analysis Prio','Prioritized for PIP'] },
  { group: 'Program Board', types: ['Feature'], states: ['Funnel','Review','Analysis Prio','Prioritized for PIP'] },
  { group: 'Exploration Team', types: ['Epic','Feature'], states: ['Quick Check','Ready for prio'] },
  { group: 'Deep Dive Workgroup', types: ['Epic','Feature'], states: ['Deep Dive'] },
  { group: 'Dev Teams', types: ['Feature'], states: ['Ready for Development'] },
];
export function canWork(groupName, stateName, type){
  return CAP_RULES.some(r => r.group===groupName && r.types.includes(type) && r.states.includes(stateName));
}

// ---- Extended config: per-cell rules and workgroup schedule
// cells: Map key = `${groupId}|${stateId}` -> { allowedTypes:[], wip: null, capacityMode:'items'|'complexity', capacityValue:null, exit:{nextStateId:null, threshold:null, highNextStateId:null, doneOnExit:false}, decompose:null|{threshold:null, splitRatio:null} }
export const cells = new Map();
// workgroupSettings: Map groupId -> { startDay:0, frequency:7 }
export const workgroupSettings = new Map();

export function cellKey(groupId, stateId){ return `${groupId}|${stateId}`; }
export function getCell(groupId, stateId){
  const k = cellKey(groupId, stateId);
  if (!cells.has(k)) cells.set(k, { allowedTypes:[], wip:null, capacityMode:'items', capacityValue:null, exit:{ nextStateId:null, threshold:null, highNextStateId:null, doneOnExit:false }, decompose:null });
  return cells.get(k);
}
export function setCell(groupId, stateId, data){
  const k = cellKey(groupId, stateId);
  const cur = getCell(groupId, stateId);
  const merged = { ...cur, ...data, exit: { ...cur.exit, ...(data.exit||{}) } };
  if ('decompose' in data) merged.decompose = data.decompose ? { ...(cur.decompose||{}), ...data.decompose } : null;
  cells.set(k, merged);
}

export function getWorkgroupSettings(groupId){
  if (!workgroupSettings.has(groupId)) workgroupSettings.set(groupId, { startDay:0, frequency:7 });
  return workgroupSettings.get(groupId);
}
export function setWorkgroupSettings(groupId, data){
  const cur = getWorkgroupSettings(groupId);
  workgroupSettings.set(groupId, { ...cur, ...data });
}

// derive workgroup for an item based on its state and type
// returns the groupId or null if not uniquely determined
export function groupFor(stateId, type){
  let found = null;
  for (const g of state.groups){
    const cfg = getCell(g.id, stateId);
    if (cfg.allowedTypes && cfg.allowedTypes.includes(type)){
      if (found !== null) return null; // ambiguous
      found = g.id;
    }
  }
  return found;
}

// persistence
export function saveSnapshot(){
  const snap = {
    sim:{day: state.sim.day},
    states: state.states,
    groups: state.groups,
    items: Array.from(state.items.values()),
    cells: Array.from(cells.entries()),
    workgroupSettings: Array.from(workgroupSettings.entries()),
    types: state.types,
    nextId: state.nextId,
    rules: state.rules,
  };
  localStorage.setItem('flowsim.v2', JSON.stringify(snap));
}

export function loadSnapshot(){
  const raw = localStorage.getItem('flowsim.v2'); if(!raw) return false;
  try{
    const s = JSON.parse(raw);
    state.sim.day = s.sim?.day ?? 0;
    state.sim.nextDay = Math.floor(state.sim.day) + 1;
    state.states = s.states ?? [];
    state.groups = s.groups ?? [];
    state.items = new Map((s.items ?? []).map(it => {
      const { groupId, ...rest } = it || {};
      if (rest.remaining === undefined) rest.remaining = rest.complexity;
      return [rest.id, rest];
    }));
    // load cells & workgroupSettings if present
    try { cells.clear(); (s.cells||[]).forEach(([k,v])=> cells.set(k,v)); } catch {}
    try { workgroupSettings.clear(); (s.workgroupSettings||[]).forEach(([k,v])=> workgroupSettings.set(k,v)); } catch {}
    state.types = s.types ?? [...ALL_TYPES];
    state.nextId = s.nextId ?? 1;
    state.rules = s.rules ?? [];
    return true;
  }catch{ return false; }
}

export const DEFAULT_STATES = ['Funnel','Review','Analysis Prio','Quick Check','Deep Dive','Ready for prio','Prioritized for PIP','Ready for Development'];
export const DEFAULT_GROUPS = ['LPM Board','Program Board','Exploration Team','Deep Dive Workgroup','Dev Teams'];
export const DEFAULT_TYPES = [...ALL_TYPES];

export function isSnapshotValid(){
  try{
    if (!Array.isArray(state.states) || !Array.isArray(state.groups)) return false;
    if (state.states.length === 0 || state.groups.length === 0) return false;
    if (!Array.isArray(state.types) || state.types.length === 0) return false;
    return true;
  }catch{ return false; }
}

export function seedCellsFromRules(){
  const nameToState = new Map(state.states.map(s=>[s.name,s]));
  const nameToGroup = new Map(state.groups.map(g=>[g.name,g]));
  CAP_RULES.forEach(r=>{
    const g = nameToGroup.get(r.group); if (!g) return;
    r.states.forEach(stName => {
      const st = nameToState.get(stName); if (!st) return;
      const cfg = getCell(g.id, st.id);
      const types = Array.from(new Set([...(cfg.allowedTypes||[]), ...r.types.filter(t=>state.types.includes(t))]));
      setCell(g.id, st.id, { allowedTypes: types });
    });
  });
}
