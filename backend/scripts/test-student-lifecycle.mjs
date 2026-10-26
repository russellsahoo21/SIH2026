import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { pool } from '../src/db/connection.js';
// This explicit integration test creates labelled synthetic users and a disposed case
// in the configured database. It never resets or deletes existing data.
if (!process.argv.includes('--allow-test-records')) throw new Error('Pass --allow-test-records to create synthetic workflow records in the configured database.');
const app=createApp(), suffix=Date.now();
const username='qa.student.'+suffix;
const call=(method,path,token,body)=>{let r=request(app)[method]('/api'+path);if(token)r=r.set('Authorization','Bearer '+token);return body?r.send(body):r;};
const expect=(r,status)=>assert.equal(r.status,status,JSON.stringify(r.body));
let student,other,caseId;
try{
 let r=await call('post','/auth/register',null,{username,fullName:'QA lifecycle student',password:'QA-Student-2026!',role:'ADMIN'});expect(r,400);
 r=await call('post','/auth/register',null,{username,fullName:'QA lifecycle student',password:'QA-Student-2026!'});expect(r,201);student=r.body.data;
 assert.equal(student.user.role,'STUDENT');assert.equal(student.user.bureau,null);
 r=await call('post','/auth/register',null,{username:username+'.other',fullName:'QA isolation student',password:'QA-Student-2026!'});expect(r,201);other=r.body.data;
 const login=async username=>{const r=await call('post','/auth/login',null,{username,password:'Demo@123'});expect(r,200);return r.body.data.token;};
 const rb=await login('officer.rb1'),head=await login('head.rb');
 r=await call('get','/student/institutions',student.token);expect(r,200);const institutionId=r.body.data[0].id;
 r=await call('post','/student/cases',student.token,{institutionId,category:'OTHER',bureau:'RB',description:'QA TEST ONLY: Synthetic lifecycle verification. No actual grievance or allegation.'});expect(r,201);caseId=r.body.data.case.id;
 r=await call('get','/student/cases',student.token);expect(r,200);assert.ok(r.body.data.some(c=>c.id===caseId));
 const path='/cases/'+encodeURIComponent(caseId);
 r=await call('get',path,rb);expect(r,200);let version=r.body.data.version;
 r=await call('post',path+'/status',rb,{toStatus:'UNDER_PROCESS',version});expect(r,200);
 r=await call('post',path+'/status',rb,{toStatus:'PENDING',version});expect(r,409);
 r=await call('post',path+'/remarks',rb,{remark:'PRIVATE QA STAFF NOTE',visibility:'INTERNAL'});expect(r,201);
 r=await call('get',path,rb);version=r.body.data.version;
 r=await call('post',path+'/status',rb,{toStatus:'PENDING',version});expect(r,200);
 r=await call('get',path,rb);version=r.body.data.version;
 r=await call('post',path+'/escalate',rb,{remark:'QA escalation',version});expect(r,200);
 r=await call('get',path,rb);version=r.body.data.version;
 r=await call('post',path+'/dispose',rb,{version});expect(r,403);
 r=await call('post',path+'/dispose',head,{remark:'QA test resolved',version});expect(r,200);
 r=await call('get','/student'+path,student.token);expect(r,200);assert.equal(r.body.data.status,'DISPOSED');assert.ok(r.body.data.history.some(a=>a.status==='PENDING'));assert.ok(!JSON.stringify(r.body).includes('PRIVATE QA STAFF NOTE'));
 r=await call('get','/student'+path,other.token);expect(r,404);
 for(const endpoint of [path,'/cases','/institutions/1/cases','/overlaps','/dashboard/summary','/users',path+'/actions',path+'/documents']){r=await call('get',endpoint,student.token);expect(r,403);}
 r=await call('get',path,head);version=r.body.data.version;
 r=await call('post',path+'/reopen',head,{remark:'QA reopen verification',version});expect(r,200);
 r=await call('get',path,head);version=r.body.data.version;assert.equal(r.body.data.disposedOn,null);
 r=await call('post',path+'/dispose',head,{remark:'QA test complete',version});expect(r,200);
 console.log('PASS: registration, privilege rejection, RB processing, pending, escalation, head disposal, reopen, stale-version rejection, student tracking and isolation. Case '+caseId);
}finally{await pool.end();}
