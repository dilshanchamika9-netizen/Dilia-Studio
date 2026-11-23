/* Dilia Play board games: computer opponent in a worker. In: {game:'checkers'|'reversi', state, level, tk}. Out: {move, tk}. */
importScripts('boardgames.js');
self.onmessage = function (e) {
  var d = e.data, G = d.game === 'reversi' ? DiliaBoard.RV : DiliaBoard.CK;
  self.postMessage({ move: DiliaBoard.think(G, d.state, d.level, Math.random), tk: d.tk });
};
