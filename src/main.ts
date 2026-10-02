import './style.css';
import { startApp } from './app';
import type { Bank } from './core/types';
import { setStatus } from './ui/view';

async function loadBank(): Promise<Bank> {
  const res = await fetch(`${import.meta.env.BASE_URL}bank.json?v=${__BUILD_ID__}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const bank = (await res.json()) as Bank;
  if (!Array.isArray(bank?.songs) || bank.songs.length === 0) throw new Error('題庫是空的');
  return bank;
}

loadBank()
  .then(bank => startApp(bank.songs))
  .catch(e => {
    console.error('[bank]', e);
    setStatus(`題庫載入失敗（${e instanceof Error ? e.message : e}），請重新整理頁面。`, 'error');
  });
