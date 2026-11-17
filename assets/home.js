// Home page: logo flow animation and the all-tools columns.
{
inkFlow(document.getElementById('ink'));
  inkFlow(document.getElementById('ink2'), { w: 80, h: 40, start: 31 });
  document.getElementById('cols').innerHTML = DILIA_TOOLS.map(([g, list]) => `
    <div class="col"><h3>${g}</h3><ul>${list.map(t => `
      <li><a href="${t.ready ? t.id + '.html' : 'tools.html#' + t.id}">${diliaIcon(t.icon)}<span>${t.name}</span>${t.ready ? '' : '<em>Coming soon</em>'}</a></li>`).join('')}
    </ul></div>`).join('');
}
