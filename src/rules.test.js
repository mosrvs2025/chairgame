import test from 'node:test';
import assert from 'node:assert/strict';
import {sitPoints,within,clamp,SHIFTS} from './rules.js';
test('combos cap at five and VIPs double rewards',()=>{assert.equal(sitPoints(1,false),100);assert.equal(sitPoints(3,true),600);assert.equal(sitPoints(9,false),500)});
test('collision radius and movement bounds',()=>{assert.equal(within({x:0,z:0},{x:3,z:4},5),false);assert.equal(within({x:0,z:0},{x:3,z:4},5.1),true);assert.equal(clamp(20,-13,13),13)});
test('shifts escalate while remaining achievable',()=>{assert.equal(SHIFTS.length,3);assert.ok(SHIFTS.every(s=>s.target<=12&&s.time>=s.target*2.2));assert.ok(SHIFTS[2].speed>SHIFTS[0].speed)});
