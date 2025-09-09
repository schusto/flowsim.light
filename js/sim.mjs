// Simulation loop
import { state } from './store.mjs';
import { processDay } from './engine.mjs';

const $ = s => document.querySelector(s);

export function startSim(){
  state.sim.nextDay = Math.floor(state.sim.day) + 1;
  const raf = (now)=>{
    const dt = now - state.sim.lastTick;
    state.sim.lastTick = now;
    if (state.sim.playing){
      const deltaDays = (dt / 1000) * state.sim.speed;
      state.sim.day += deltaDays;
      const curDay = Math.floor(state.sim.day);
      while (state.sim.nextDay <= curDay){
        processDay(state.sim.nextDay);
        state.sim.nextDay++;
      }
      $('#simDay').textContent = String(curDay);
      document.querySelectorAll('.wi').forEach(el=>{
        const id = el.dataset.id;
        const it = window.__items?.get(id); if(!it) return;
        el.querySelector('.wi-age').textContent = Math.floor(state.sim.day - it.createdAt);
        el.querySelector('.wi-instate').textContent = Math.floor(state.sim.day - it.stateEnteredAt);
      });
    }
    requestAnimationFrame(raf);
  };
  requestAnimationFrame(t=>{ state.sim.lastTick=t; raf(t); });
}
export function setSpeed(v){ state.sim.speed = Number(v)||1; }
export function togglePlay(){ state.sim.playing = !state.sim.playing; }
