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

const cv=(c,a,b,v)=>M.convert(c,a,b,v).value;
// reference values from NIST SP 811 / SI brochure / IEC 80000-13, written out independently of the factor table
eq('mi-km',cv('length','mi','km',1),1.609344);eq('ft-m',cv('length','ft','m',1),0.3048);eq('in-mm',cv('length','in','mm',1),25.4);eq('nmi',cv('length','nmi','km',1),1.852);eq('100m-ft',cv('length','m','ft',100),328.0839895,1e-6);
eq('lb-g',cv('weight','lb','g',1),453.59237);eq('oz-g',cv('weight','oz','g',1),28.349523125);eq('kg-lb',cv('weight','kg','lb',1),2.2046226218,1e-9);eq('st-lb',cv('weight','st','lb',1),14,1e-9);
eq('ac-m2',cv('area','ac','m2',1),4046.8564224);eq('ha-ac',cv('area','ha','ac',1),2.4710538147,1e-9);eq('ft2-m2',cv('area','ft2','m2',1),0.09290304);eq('mi2-km2',cv('area','mi2','km2',1),2.589988110336);
eq('gal-l',cv('volume','gal','l',1),3.785411784);eq('igal',cv('volume','igal','l',1),4.54609);eq('cup-ml',cv('volume','cup','ml',1),236.5882365);eq('gal-floz',cv('volume','gal','floz',1),128,1e-9);eq('ft3-l',cv('volume','ft3','l',1),28.316846592);
eq('mph-kmh',cv('speed','mph','kmh',1),1.609344,1e-9);eq('kn-kmh',cv('speed','kn','kmh',1),1.852,1e-9);eq('ms-kmh',cv('speed','ms','kmh',10),36,1e-9);
eq('d-h',cv('time','d','h',1),24);eq('wk-d',cv('time','wk','d',1),7);eq('yr-d',cv('time','yr','d',1),365.25,1e-9);eq('mo-d',cv('time','mo','d',1),30.4375,1e-9);
eq('GB-MB',cv('data','GB','MB',1),1000);eq('GiB-MiB',cv('data','GiB','MiB',1),1024);eq('GiB-B',cv('data','GiB','B',1),1073741824);eq('B-bit',cv('data','B','bit',1),8);eq('TB-GiB',cv('data','TB','GiB',1),931.3225746,1e-6);
eq('kWh-MJ',cv('energy','kWh','kJ',1),3600);eq('kcal-kJ',cv('energy','kcal','kJ',1),4.184);eq('kWh-btu',cv('energy','kWh','btu',1),3412.141633,1e-5);eq('Wh-J',cv('energy','Wh','J',1),3600);
eq('atm-Pa',cv('pressure','atm','Pa',1),101325);eq('atm-psi',cv('pressure','atm','psi',1),14.69594878,1e-7);eq('bar-kPa',cv('pressure','bar','kPa',1),100);eq('atm-mmHg',cv('pressure','atm','mmHg',1),760,1e-3);
eq('c-f',cv('temperature','C','F',100),212);eq('f-c',cv('temperature','F','C',-40),-40);eq('c-k',cv('temperature','C','K',0),273.15);eq('k-c',cv('temperature','K','C',0),-273.15);eq('f-k',cv('temperature','F','K',32),273.15);eq('body',cv('temperature','C','F',37),98.6,1e-9);
if(!M.convert('temperature','C','F',-300).error||!M.convert('temperature','K','C',-1).error){f++;console.log('FAIL abs zero')}
eq('absz',cv('temperature','C','K',-273.15),0,1e-9);
// every unit round-trips and every pair is consistent
for(const [k,c] of Object.entries(M.UNITS)){ if(c.special)continue; for(const a of c.u)for(const b of c.u){const x=cv(k,a[0],b[0],12.5);const y=cv(k,b[0],a[0],x);eq('rt '+k+a[0]+b[0],y,12.5,1e-9*12.5);} }
if(M.convert('length','m','zz',1).error===undefined||M.convert('nope','m','m',1).error===undefined){f++;console.log('FAIL unknown')}
console.log(f?f+' FAILED':'unit OK');process.exit(f?1:0)
