import test from 'node:test';
import assert from 'node:assert/strict';
import {monthlyRows,linkedCaseIds} from '../src/services/viewData.js';
test('monthly response envelope produces renderable chart rows',()=>{
 const rows=monthlyRows({year:2026,monthly:[{month:1,count:3}],totalDisposed:3});
 assert.equal(rows.reduce((sum,row)=>sum+row.count,0),3);
 assert.deepEqual(monthlyRows(null),[]);
});
test('link payload uses loaded detail members, excludes dismissed cases',()=>{
 assert.deepEqual(linkedCaseIds({id:1,caseCount:2}),[]);
 assert.deepEqual(linkedCaseIds({members:[{caseId:'RB/2026/1',memberState:'DETECTED'},{caseId:'PGRC/2026/2',memberState:'LINKED'},{caseId:'RO/2026/3',memberState:'NOT_RELATED'}]}),['RB/2026/1','PGRC/2026/2']);
});
