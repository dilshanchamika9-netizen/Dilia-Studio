// Light is the default. A saved choice ("dark" or "light") is applied before the page paints.
(() => { try { const t = localStorage.getItem('dilia-theme'); if (t === 'dark') document.documentElement.dataset.theme = 'dark'; } catch (e) { /* storage blocked: stay light */ } })();
