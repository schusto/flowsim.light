import { state, saveSnapshot, ALL_TYPES, uid } from '../store.mjs';

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

export function showRuleModal(){
  renderRules();
  $('#ruleModal').showModal();
}

export function renderRules(){
  const dlg = $('#ruleModal');
  if (!dlg.dataset.init){
    dlg.dataset.init = '1';
    const form = h('form', { method:'dialog' }, [
      h('h3', {}, [
        'Auto Workitem Rules ',
        h('button', { type:'button', class:'iconBtn', id:'ruleHelp', title:'Help' }, '❔')
      ]),
      h('ul', { id:'ruleList', class:'list' }),
      h('button', { class:'btn small', type:'button', id:'addRuleBtn' }, '+ Rule'),
      h('menu', {}, [
        h('button', { class:'btn ghost', value:'cancel' }, 'Close')
      ])
    ]);
    dlg.appendChild(form);
    form.querySelector('#addRuleBtn').addEventListener('click', () => {
      const defaultState = state.states[0]?.id || '';
      const defaultType = state.types[0] || ALL_TYPES[0];
      state.rules.push({ id: uid(), enabled: true, freqMin:1, freqMax:1, qtyMin:1, qtyMax:1, stateId: defaultState, type: defaultType, sizeMin:1, sizeMax:5, complexityMin:1, complexityMax:5, nextDay: state.sim.day + 1 });
      renderRules(); saveSnapshot();
    });
    form.querySelector('#ruleHelp').addEventListener('click', () => {
      alert('Enable Rule – Toggle rule activation so users can draft without triggering generation.\nFrequency Interval – [minDays, maxDays] range; each generation randomly picks a day gap within the interval.\nQuantity Interval – [minItems, maxItems] range; batch size randomly chosen per generation.\nInitial State – Starting column for new items.\nType – Work-item category.\nSize Range – Min/max size for new items.\nComplexity Range – Min/max complexity for new items.');
    });
  }
  const list = dlg.querySelector('#ruleList'); list.innerHTML='';
  state.rules.forEach(rule => {
    const li = h('li', { class:'rule' }, [
      h('div', { class:'row', style:'justify-content:space-between;align-items:center' }, [
        h('label', {}, [
          h('input', { type:'checkbox', checked: rule.enabled, onchange: e=>{ rule.enabled=e.target.checked; saveSnapshot(); } }),
          ' Enabled'
        ]),
        h('button', { class:'iconBtn danger', type:'button', title:'Delete', onclick:()=>{ state.rules = state.rules.filter(r=>r.id!==rule.id); renderRules(); saveSnapshot(); } }, '✕')
      ]),
      h('div', { class:'row', style:'margin-top:6px; gap:6px; align-items:center' }, [
        h('span',{},'Frequency Interval'),
        h('input',{ type:'number', value:rule.freqMin, min:1, style:'width:60px', onchange:e=>{ rule.freqMin=Number(e.target.value)||1; saveSnapshot(); } }),
        h('span',{},'to'),
        h('input',{ type:'number', value:rule.freqMax, min:rule.freqMin, style:'width:60px', onchange:e=>{ rule.freqMax=Number(e.target.value)||rule.freqMin; saveSnapshot(); } }),
        h('span',{},'days')
      ]),
      h('div', { class:'row', style:'margin-top:6px; gap:6px; align-items:center' }, [
        h('span',{},'Quantity Interval'),
        h('input',{ type:'number', value:rule.qtyMin, min:1, style:'width:60px', onchange:e=>{ rule.qtyMin=Number(e.target.value)||1; saveSnapshot(); } }),
        h('span',{},'to'),
        h('input',{ type:'number', value:rule.qtyMax, min:rule.qtyMin, style:'width:60px', onchange:e=>{ rule.qtyMax=Number(e.target.value)||rule.qtyMin; saveSnapshot(); } })
      ]),
      h('div', { class:'row', style:'margin-top:6px; gap:6px; align-items:center' }, [
        h('span',{},'State'),
        h('select', { value:rule.stateId, onchange:e=>{ rule.stateId=e.target.value; saveSnapshot(); } }, state.states.map(s=>h('option',{value:s.id},s.name)))
      ]),
      h('div', { class:'row', style:'margin-top:6px; gap:6px; align-items:center' }, [
        h('span',{},'Type'),
        h('select', { value:rule.type, onchange:e=>{ rule.type=e.target.value; saveSnapshot(); } }, state.types.map(t=>h('option',{value:t},t)))
      ]),
      h('div', { class:'row', style:'margin-top:6px; gap:6px; align-items:center' }, [
        h('span',{},'Size'),
        h('input',{ type:'number', value:rule.sizeMin, min:1, style:'width:60px', onchange:e=>{ rule.sizeMin=Number(e.target.value)||1; saveSnapshot(); } }),
        h('span',{},'to'),
        h('input',{ type:'number', value:rule.sizeMax, min:rule.sizeMin, style:'width:60px', onchange:e=>{ rule.sizeMax=Number(e.target.value)||rule.sizeMin; saveSnapshot(); } })
      ]),
      h('div', { class:'row', style:'margin-top:6px; gap:6px; align-items:center' }, [
        h('span',{},'Complexity'),
        h('input',{ type:'number', value:rule.complexityMin, min:1, style:'width:60px', onchange:e=>{ rule.complexityMin=Number(e.target.value)||1; saveSnapshot(); } }),
        h('span',{},'to'),
        h('input',{ type:'number', value:rule.complexityMax, min:rule.complexityMin, style:'width:60px', onchange:e=>{ rule.complexityMax=Number(e.target.value)||rule.complexityMin; saveSnapshot(); } })
      ])
    ]);
    list.appendChild(li);
  });
}
