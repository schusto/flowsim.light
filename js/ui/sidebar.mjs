// Sidebar lists for states & groups (inline editable, tool buttons)
import { state, saveSnapshot, getWorkgroupSettings } from '../store.mjs';

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

export function renderSidebar(){
  console.info('[FlowSim] renderSidebar', {states: state.states.length, groups: state.groups.length});
  // states
  const stateList = $('#stateList'); stateList.innerHTML='';
  state.states.forEach((s, idx) => {
    const li = h('li', {}, [
      h('span', { class:'badge' }, `#${idx+1}`),
      h('span', { class:'name', contenteditable:'true', dataset:{ id:s.id, stateName:'' } }, s.name),
      h('div', { class:'tools' }, [
        h('button', { class:'iconBtn', dataset:{ id:s.id, moveState:'', delta:-1 }, title:'Move left' }, '←'),
        h('button', { class:'iconBtn', dataset:{ id:s.id, moveState:'', delta:1 }, title:'Move right' }, '→'),
        h('button', { class:'iconBtn danger', dataset:{ id:s.id, delState:'' }, title:'Delete' }, '✕'),
      ])
    ]);
    stateList.appendChild(li);
  });
  // groups
  const groupList = $('#groupList'); groupList.innerHTML='';
  state.groups.forEach((g, idx) => {
    const cfg = getWorkgroupSettings(g.id);
    const li = h('li', {}, [
      h('span', { class:'badge' }, `#${idx+1}`),
      h('span', { class:'name', contenteditable:'true', dataset:{ id:g.id, groupName:'' } }, g.name),
      h('div', { class:'tools' }, [
        h('button', { class:'iconBtn', dataset:{ id:g.id, moveGroup:'', delta:-1 }, title:'Move up' }, '↑'),
        h('button', { class:'iconBtn', dataset:{ id:g.id, moveGroup:'', delta:1 }, title:'Move down' }, '↓'),
        h('button', { class:'iconBtn danger', dataset:{ id:g.id, delGroup:'' }, title:'Delete' }, '✕'),
      ]),
      h('div', { class:'row', style:'margin-top:6px; gap:8px' }, [
        h('span', {}, 'Start Day'),
        h('input', { type:'number', value: cfg.startDay, dataset:{ wgStart:g.id }, style:'width:80px' }),
        h('span', {}, 'Frequency'),
        h('input', { type:'number', value: cfg.frequency, dataset:{ wgFreq:g.id }, style:'width:80px' }),
      ])
    ]);
    groupList.appendChild(li);
  });
}
