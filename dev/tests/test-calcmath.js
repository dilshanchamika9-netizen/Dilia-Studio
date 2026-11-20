const M=require('../../assets/calcmath.js');let f=0;
const eq=(n,a,b,t=1e-6)=>{if(!(Math.abs(a-b)<=t)){f++;console.log('FAIL',n,a,b)}};
eq('p1',M.parse('1,250.50'),1250.5);eq('p2',M.parse(' .5 '),0.5);if(!isNaN(M.parse('1.2.3'))||!isNaN(M.parse('abc'))||!isNaN(M.parse(''))||!isNaN(M.parse('1e5'))||!isNaN(M.parse('1e400'))){f++;console.log('FAIL parse bad')}
eq('of',M.percent('of',15,200).value,30);eq('is',M.percent('is',30,200).value,15);eq('chg',M.percent('chg',80,100).value,25);eq('chg-',M.percent('chg',100,80).value,-20);eq('chgneg',M.percent('chg',-50,-25).value,50);
eq('up',M.percent('up',10,200).value,220);eq('down',M.percent('down',10,200).value,180);if(!M.percent('is',1,0).error||!M.percent('chg',0,1).error){f++;console.log('FAIL div0')}
let v=M.vat('add',100,5);eq('vat+',v.gross,105);eq('vat+v',v.vat,5);v=M.vat('remove',105,5);eq('vat-',v.net,100);eq('vat-v',v.vat,5);v=M.vat('add',100,0);eq('v0',v.gross,100);
let l=M.loan(100000,6,360);eq('emi',l.payment,599.55);eq('rows',l.rows.length,360);eq('lastbal',l.rows[359].balance,0);eq('sumprin',l.rows.reduce((a,r)=>a+r.principal,0),100000,0.005);
eq('totpaid',l.totalPaid,l.rows.reduce((a,r)=>a+r.payment,0),0.005);eq('totint',l.totalInterest,l.totalPaid-100000,0.01);eq('ti',l.totalInterest,115838.19,5);
l=M.loan(1200,0,12);eq('zero',l.payment,100);eq('zi',l.totalInterest,0);l=M.loan(1000,12,1);eq('1m',l.rows[0].payment,1010);eq('1b',l.rows[0].balance,0);
for(const [a,b,c] of [[5000,3.5,7],[250000,7.25,300],[99.99,19.9,5],[1e9,4,240]]){l=M.loan(a,b,c);eq('bal'+a,l.rows[l.rows.length-1].balance,0);eq('sp'+a,l.rows.reduce((x,r)=>x+r.principal,0),a,0.01);}
if(!M.loan(0,5,12).error||!M.loan(100,5,0).error||!M.loan(100,5,12.5).error||!M.loan(100,-1,12).error||!M.loan(100,5,1201).error){f++;console.log('FAIL loan errs')}
let c=M.compound(1000,5,10,12,0);eq('c1',c.balance,1000*Math.pow(1+0.05/12,120),1e-6);c=M.compound(1000,5,10,1,0);eq('c2',c.balance,1000*Math.pow(1.05,10),1e-6);
c=M.compound(0,6,1,12,100);eq('c3',c.balance,100*((Math.pow(1.005,12)-1)/0.005),1e-6);c=M.compound(1000,0,5,12,50);eq('c4',c.balance,4000);eq('c4i',c.interest,0);eq('rows',c.rows.length,5);
c=M.compound(1000,5,2.5,12,0);eq('c5',c.rows.length,3);eq('c5y',c.rows[2].year,2.5);if(!M.compound(0,5,5,12,0).error||!M.compound(1,5,0,12,0).error||!M.compound(1,5,101,12,0).error){f++;console.log('FAIL comp errs')}
console.log(f?f+' FAILED':'unit OK');process.exit(f?1:0)
