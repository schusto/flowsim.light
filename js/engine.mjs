// Simulation engine: per-day processing of work items
import { state, getCell, getWorkgroupSettings, groupFor } from './store.mjs';
import { newItem } from './model.mjs';
import { renderItemsIntoGrid } from './ui/grid.mjs';

const randInt = (min,max)=>Math.floor(Math.random()*(max-min+1))+min;

// Process a single simulation day
export function processDay(day){
  let changed = false;
  // Generate new items based on arrival rules
  for (const rule of state.rules){
    if (!rule.enabled) continue;
    if (rule.nextDay === undefined) rule.nextDay = day;
    if (day >= rule.nextDay){
      const qty = randInt(rule.qtyMin, rule.qtyMax);
      for (let i=0;i<qty;i++){
        const size = randInt(rule.sizeMin, rule.sizeMax);
        const complexity = randInt(rule.complexityMin, rule.complexityMax);
        newItem({ type: rule.type, size, complexity, stateId: rule.stateId });
      }
      rule.nextDay = day + randInt(rule.freqMin, rule.freqMax);
      changed = true;
    }
  }
  for (const g of state.groups){
    const sched = getWorkgroupSettings(g.id);
    if (day < sched.startDay) continue;
    if ((day - sched.startDay) % sched.frequency !== 0) continue; // not a working day for this group

    for (const s of state.states){
      const cfg = getCell(g.id, s.id);
      let items = Array.from(state.items.values()).filter(it => it.stateId === s.id && groupFor(s.id, it.type) === g.id);
      if (items.length === 0) continue;

      // Decompose oversized items before processing
      if (cfg.decompose && cfg.decompose.threshold != null){
        for (const it of [...items]){
          if (it.complexity > cfg.decompose.threshold){
            const ratio = cfg.decompose.splitRatio || 2;
            const childComplexity = Math.ceil(it.complexity / ratio);
            const childSize = Math.ceil(it.size / ratio);
            for (let i=0;i<ratio;i++){
              const child = newItem({ type: it.type, size: childSize, complexity: childComplexity, stateId: it.stateId });
              child.createdAt = it.createdAt;
              child.stateEnteredAt = it.stateEnteredAt;
              child.remaining = child.complexity;
            }
            state.items.delete(it.id);
            changed = true;
          }
        }
        // refresh items after decomposition
        items = Array.from(state.items.values()).filter(it => it.stateId === s.id && groupFor(s.id, it.type) === g.id);
      }

      // Sort items by time in state for fairness
      items.sort((a,b)=>a.stateEnteredAt - b.stateEnteredAt);

      const wipLimit = cfg.wip ?? Infinity;
      let capacityLeft = cfg.capacityValue ?? Infinity;
      let processed = 0;

      for (const it of items){
        if (processed >= wipLimit) break;
        if (capacityLeft <= 0) break;
        if (it.remaining === undefined) it.remaining = it.complexity;

        if (cfg.capacityMode === 'complexity'){
          const work = Math.min(it.remaining, capacityLeft);
          it.remaining -= work;
          capacityLeft -= work;
        }else{ // 'items'
          it.remaining -= 1;
          capacityLeft -= 1;
        }
        processed++;
        changed = true;

        if (it.remaining <= 0){
          const exit = cfg.exit || {};
          let target = exit.nextStateId;
          if (exit.threshold != null && exit.highNextStateId && it.complexity >= exit.threshold){
            target = exit.highNextStateId;
          }
          if (exit.doneOnExit){
            state.items.delete(it.id);
          }else if (target){
            it.stateId = target;
            it.stateEnteredAt = state.sim.day;
            it.remaining = it.complexity;
          }
        }
      }
    }
  }
  if (changed) renderItemsIntoGrid();
}
