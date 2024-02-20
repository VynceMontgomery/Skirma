import React from 'react';
import { render, numberSetting } from '@boardzilla/core';
import { default as setup, Space, Figure, Square } from '../game/index.js';

import './style.scss';
import '@boardzilla/core/index.css';

render(setup, {
  layout: board => {
    board.appearance({
      render: () => 
      <style>
      --player0-color: {board.game.players[0].color};
      --player1-color: {board.game.players[1].color};
      </style>
    });

    board.layout('chessboard', {
      aspectRatio: 1,
      area: {
        top: 18,
        left: 14,
        width: 72,
        height: 72,
      },
      showBoundingBox: true,
    });

    board.layout('box', {
      // aspectRatio: 5,
      area: {
        top: 5,
        left: 30,
        width: 40,
        height: 10,
      },
      showBoundingBox: true,
    });

    board.all(Space, 'box').appearance({
      render: () =>
      <div style={{
        '--player0-color': board.game.players[0].color,
        '--player1-color': board.game.players[1].color,
      }}>Skirma</div>
      ,

      info: () => 
      <>
      <div> Skirma is a territory control game. 
      </div><div>
      The goal is to either eliminate your opponent (there is no checkmate) 
      or have influence over all the low pieces. At any given time, your 
      "high" pieces describe your zone of potential influence. 
      </div><div>
      You can always move your high pieces (Queens and Generals, if you get any); they belong to you.
      You can also move whichever piece you moved most recently, which is called your agent.
      And you can move any pieces in your zone that aren't opponent agents or high pieces.
      </div><div>
      Most pieces move like in Chess, with a few small exceptions. Pawns aren't stuck to one side of
      the conflict, so they also aren't stuck facing one direction. They promote if they are moved 
      to <em>any</em> edge of the board, outside your zone. They cannot become Queens - you only get the two you
      start with, so use them wisely. They can promote to "General" - a high piece that moves like 
      either a knight or a king.
      </div><div>
      And it's a harsh world, with little mercy. Any piece can take any piece - regardless of 
      who owns it or has influence over it. The small mercy? A Queen will never capture another Queen.
      </div><div>
      Enjoy!
      </div>
      </>
    })

    board.all(Space, 'box').all(Figure).appearance({
      render: () => null
    })

    board.all(Space, 'box').layout(Piece, {
      aspectRatio: 1,
    })

    board.all(Space, 'chessboard').appearance({
      render: () => null
    })

    board.all(Space, 'chessboard').layout(Square, {
      aspectRatio: 1,
    })

    board.layout(Space, {
      gap: 1,
      margin: 1
    });

    board.all(Space).layout(Figure, {
      gap: 1,
      margin: .25,
    });

    // square display logic
    board.all(Square).forEach(s => {
      s.gridparity = ['even', 'odd'].at((s.row + s.column)%2);

      if (s.inZones().length) { 
        const cmrf = (s, p, i) => `color-mix(in xyz, ${p.color} ${100*(1/(i+1))}%, ${s} ${100*((i)/(i+1))}%)`;

        const zoneColor = s.inZones().reduce(cmrf, "#8888");
        s.zoneColor = zoneColor;

        const zoneTop    = s.inZones().filter(p => s.row === p.zone().top);
        s.zoneTop    = zoneTop.length    ?    zoneTop.reduce(cmrf, "#8888") : undefined;
        const zoneBottom = s.inZones().filter(p => s.row === p.zone().bottom);
        s.zoneBottom = zoneBottom.length ? zoneBottom.reduce(cmrf, "#8888") : undefined;
        const zoneLeft   = s.inZones().filter(p => s.column === p.zone().left);
        s.zoneLeft   = zoneLeft.length   ?   zoneLeft.reduce(cmrf, "#8888") : undefined;
        const zoneRight  = s.inZones().filter(p => s.column === p.zone().right);
        s.zoneRight  = zoneRight.length  ?  zoneRight.reduce(cmrf, "#8888") : undefined;
      } else {
        delete s.zoneColor;
      }

      let move = board.lastMove();
      if (move && s.row === move.from.row && s.column === move.from.column) {
        board.all(Square, {traceColor: move.player.color}).forEach(sq => 
          {delete sq.traceColor; delete sq.traceFigure});

        s.traceColor = move.player.color;
        s.traceFigure = move.figure;        // does nothing until moveLog has that
      } else if (move && s.row === move.to.row && s.column === move.to.column) {
        board.all(Square, {attention: move.player.color}).forEach(sq => 
          {delete sq.attention; delete sq.alarm});

        s.attention = move.player.color;
        s.alarm = (move.capture || 'banana');
      }

    });

    // figure display logic
    board.all(Figure).forEach(f => {
      const cpm = {'Q': 9819, 'R': 9814, 'B': 9815, 'N': 9816, 'P': 9817, 'G': 9733};
      let codePoint = cpm[f.name];

      if (f.agentOf) {
        f.agentColor = f.agentOf.color;
        if (f.rank === 'low') codePoint += 6;
      } else {
        delete f.agentColor;
        codePoint = cpm[f.name];
      }

      f.icon = String.fromCodePoint(codePoint);

      // const zoneColor = f.influence().reduce((s, p, i) => `color-mix(in xyz, ${p.color} 50%, ${s} ${50*(i)}%)`, "rgb(none none none / 75%)");
      // if (f.influence().length) console.log(`got a ${f} with ${zoneColor}`);
      // if (f.influence().length) f.zoneColor = zoneColor;
    })

    board.all(Square).appearance({
      render: (sq) => {
        if (sq.zoneColor) {
          return (
            <div className="ColorMule" style={{
              '--zone-color'  : sq.zoneColor,
              '--zone-top'    : sq.zoneTop,
              '--zone-bottom' : sq.zoneBottom,
              '--zone-left'   : sq.zoneLeft,
              '--zone-right'  : sq.zoneRight,
              '--trace-color' : sq.traceColor,
              '--attn-color'  : sq.attention,
              '--alarm'       : sq.alarm,
            }}>
            </div>
          );
        } else {
          return (
            <div className="ColorMule" style={{
              '--trace-color' : sq.traceColor,
              '--attn-color'  : sq.attention,
              '--alarm'       : sq.alarm,
            }}>
            </div>
          );
          // return (<div>{ sq.locString() }</div>);
        }
      }
    });

    board.all(Figure).appearance({
      render: (fig) =>
        <div className="ColorMule" style={{
          '--zone-color': fig.square()?.zoneColor,
          '--agent-color': (fig.agentColor ? fig.agentColor : '')
        }}>
          {fig.icon}
        </div>
    });

  }
});
