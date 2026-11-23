/* Dilia Play chess: engine worker. Message in: {fen, moves:[uci], level:1..4}. Message out: {move:'e2e4', score, depth, nodes}. */
importScripts('chess-core.js', 'chess-engine.js');
var eng = new DiliaChess.Engine();
var LEVELS = DiliaChess.LEVELS;
self.onmessage = function (e) {
  var d = e.data;
  if (d.type === 'new') { eng.clear(); return; }
  var pos = new DiliaChess.Pos(d.fen);
  for (var i = 0; i < (d.moves || []).length; i++) { var m = pos.fromUci(d.moves[i]); if (!m || !pos.make(m)) break; }
  var r = DiliaChess.think(eng, pos, d.level || 3, Math.random);
  self.postMessage({ move: r.move ? pos.uci(r.move) : '', score: r.score, depth: r.depth, nodes: r.nodes, tk: d.tk });
};
