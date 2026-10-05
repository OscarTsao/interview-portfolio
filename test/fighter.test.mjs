import test from 'node:test';
import assert from 'node:assert/strict';
import {createMatch,idleControls,stepMatch} from '../cloudflare/src/fighter.ts';
const repeat=(match,keys,n)=>{for(let i=0;i<n;i++)stepMatch(match,keys);};
test('original movement, jump, shooting, defense and match duration',()=>{
 const match=createMatch(['a','b']);repeat(match,{a:{...idleControls(),r:true}},5);assert.equal(match.players[0].x,70);
 stepMatch(match,{a:{...idleControls(),j:true}});stepMatch(match,{});assert.ok(match.players[0].y<240);repeat(match,{},60);assert.equal(match.players[0].y,240);
 const shot=createMatch(['a','b']);repeat(shot,{a:{...idleControls(),s:true}},65);assert.ok(shot.players[1].health<100);
 const blocked=createMatch(['a','b']);repeat(blocked,{a:{...idleControls(),s:true},b:{...idleControls(),def:true}},65);assert.equal(blocked.players[1].health,100);
 const finished=createMatch(['a','b']);repeat(finished,{},7200);assert.equal(finished.running,false);assert.equal(finished.winner,'draw');
});
