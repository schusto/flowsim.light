import { state, saveSnapshot, getWorkgroupSettings, ALL_TYPES } from '../store.mjs';
import { renderGrid } from './grid.mjs';

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

export function showConfigModal(){
  renderConfig();
  $('#configModal').showModal();
}

export function renderConfig(){
  console.info('[FlowSim] renderConfig', {states: state.states.length, groups: state.groups.length});
  const dlg = $('#configModal');
  if (!dlg.dataset.init){
    dlg.dataset.init = '1';
    const form = h('form', { method:'dialog' }, [
      h('div', { class:'tabs' }, [
        h('button', { type:'button', class:'tab active', dataset:{ tab:'states' } }, 'States'),
        h('button', { type:'button', class:'tab', dataset:{ tab:'groups' } }, 'Workgroups'),
        h('button', { type:'button', class:'tab', dataset:{ tab:'types' } }, 'Types')
      ]),
      h('section', { id:'tab-states', class:'tabPanel active' }, [
        h('ul', { id:'stateList', class:'list' }),
        h('button', { class:'btn small', dataset:{ addState:'' } }, '+ State')
      ]),
      h('section', { id:'tab-groups', class:'tabPanel' }, [
        h('ul', { id:'groupList', class:'list' }),
        h('button', { class:'btn small', dataset:{ addGroup:'' } }, '+ Workgroup')
      ]),
      h('section', { id:'tab-types', class:'tabPanel' }, [
        h('ul', { id:'typeList', class:'list' })
      ]),
      h('menu', {}, [
        h('button', { class:'btn ghost', value:'cancel' }, 'Close')
      ])
    ]);
    dlg.appendChild(form);
    // tab switching
    form.querySelectorAll('.tab').forEach(btn => {
      btn.addEventListener('click', () => {
        form.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        form.querySelectorAll('.tabPanel').forEach(p => p.classList.remove('active'));
        form.querySelector('#tab-' + btn.dataset.tab).classList.add('active');
      });
    });
  }
  // lists
  const stateList = dlg.querySelector('#stateList'); stateList.innerHTML='';
  state.states.forEach((s, idx) => {
    const li = h('li', {}, [
      h('span', { class:'badge' }, `#${idx+1}`),
      h('span', { class:'name', contenteditable:'true', dataset:{ id:s.id, stateName:'' } }, s.name),
      h('div', { class:'tools' }, [
        h('button', { class:'iconBtn', dataset:{ id:s.id, moveState:'', delta:-1 }, title:'Move left' }, '←'),
        h('button', { class:'iconBtn', dataset:{ id:s.id, moveState:'', delta:1 }, title:'Move right' }, '→'),
        h('button', { class:'iconBtn danger', dataset:{ id:s.id, delState:'' }, title:'Delete' }, '✕')
      ])
    ]);
    stateList.appendChild(li);
  });
  const groupList = dlg.querySelector('#groupList'); groupList.innerHTML='';
  state.groups.forEach((g, idx) => {
    const cfg = getWorkgroupSettings(g.id);
    const li = h('li', {}, [
      h('span', { class:'badge' }, `#${idx+1}`),
      h('span', { class:'name', contenteditable:'true', dataset:{ id:g.id, groupName:'' } }, g.name),
      h('div', { class:'tools' }, [
        h('button', { class:'iconBtn', dataset:{ id:g.id, moveGroup:'', delta:-1 }, title:'Move up' }, '↑'),
        h('button', { class:'iconBtn', dataset:{ id:g.id, moveGroup:'', delta:1 }, title:'Move down' }, '↓'),
        h('button', { class:'iconBtn danger', dataset:{ id:g.id, delGroup:'' }, title:'Delete' }, '✕')
      ]),
      h('div', { class:'row', style:'margin-top:6px; gap:8px' }, [
        h('span', {}, 'Start Day'),
        h('input', { type:'number', value: cfg.startDay, dataset:{ wgStart:g.id }, style:'width:80px' }),
        h('span', {}, 'Frequency'),
        h('input', { type:'number', value: cfg.frequency, dataset:{ wgFreq:g.id }, style:'width:80px' })
      ])
    ]);
    groupList.appendChild(li);
  });
  const typeList = dlg.querySelector('#typeList'); typeList.innerHTML='';
  ALL_TYPES.forEach(t => {
    const li = h('li', {}, [
      h('label', { style:'display:flex;align-items:center;gap:6px' }, [
        h('input', { type:'checkbox', checked: state.types.includes(t), onchange:(e)=>{
          if (e.target.checked){ if(!state.types.includes(t)) state.types.push(t); }
          else { state.types = state.types.filter(x=>x!==t); }
          renderGrid(); saveSnapshot();
        }}),
        t
      ])
    ]);
    typeList.appendChild(li);
  });
}
