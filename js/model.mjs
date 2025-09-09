// Mutations and item model
import { state, uid, saveSnapshot } from './store.mjs';
import { renderSidebar } from './ui/sidebar.mjs';
import { renderGrid, renderItemsIntoGrid } from './ui/grid.mjs';

export function addState(name='New State'){ state.states.push({id:uid(), name}); renderSidebar(); renderGrid(); saveSnapshot(); }
export function renameState(id, name){ const s=state.states.find(x=>x.id===id); if(!s) return; s.name=name||s.name; renderSidebar(); renderGrid(); saveSnapshot(); }
export function deleteState(id){
  const s = state.states.find(x=>x.id===id); if(!s) return;
  if (!confirm(`Delete state “${s.name}”? Items in this column will move to first state.`)) return;
  const remaining = state.states.filter(x => x.id!==id); if (remaining.length===0){ alert('Cannot delete the last state.'); return; }
  const target = remaining[0].id;
  for (const it of state.items.values()){ if (it.stateId===id){ it.stateId=target; it.stateEnteredAt=state.sim.day; } }
  state.states = remaining; renderSidebar(); renderGrid(); saveSnapshot();
}
export function moveState(id, delta){
  const i=state.states.findIndex(x=>x.id===id); const j=i+delta; if(i<0||j<0||j>=state.states.length) return;
  const [sp]=state.states.splice(i,1); state.states.splice(j,0,sp); renderSidebar(); renderGrid(); saveSnapshot();
}

export function addGroup(name='Workgroup'){ state.groups.push({id:uid(), name}); renderSidebar(); renderGrid(); saveSnapshot(); }
export function renameGroup(id, name){ const g=state.groups.find(x=>x.id===id); if(!g) return; g.name=name||g.name; renderSidebar(); renderGrid(); saveSnapshot(); }
export function deleteGroup(id){
  const g = state.groups.find(x=>x.id===id); if(!g) return;
  if (!confirm(`Delete workgroup “${g.name}”?`)) return;
  const remaining = state.groups.filter(x => x.id!==id); if (remaining.length===0){ alert('Cannot delete the last workgroup.'); return; }
  state.groups = remaining; renderSidebar(); renderGrid(); saveSnapshot();
}
export function moveGroup(id, delta){
  const i=state.groups.findIndex(x=>x.id===id); const j=i+delta; if(i<0||j<0||j>=state.groups.length) return;
  const [gp]=state.groups.splice(i,1); state.groups.splice(j,0,gp); renderSidebar(); renderGrid(); saveSnapshot();
}

export function newItem({type='Story', size=3, complexity=5, stateId}){
  const id = uid(); const now = state.sim.day;
  const it = { id, type, size, complexity, remaining: complexity, stateId, createdAt: now, stateEnteredAt: now };
  state.items.set(id, it); return it;
}
