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

// ---- dates ----
const Y=x=>M.ymd(x);const I=M.iso;
if(M.ymd('2026-02-30')||M.ymd('2026-13-01')||M.ymd('26-1-1')||M.ymd('')||M.ymd('0999-01-01')||M.ymd('2026-11-21x')){f++;console.log('FAIL ymd bad')}
eq('wd',M.weekday(Y('2026-11-21')),6);eq('wd2',M.weekday(Y('2000-01-01')),6);eq('wd3',M.weekday(Y('2024-02-29')),4);
eq('doy',M.dayOfYear(Y('2024-12-31')),366);eq('doy2',M.dayOfYear(Y('2026-12-31')),365);eq('doy3',M.dayOfYear(Y('2026-03-01')),60);
let w=M.isoWeek(Y('2026-01-01'));eq('w1',w.week,1);w=M.isoWeek(Y('2021-01-03'));eq('w53',w.week,53);eq('w53y',w.year,2020);w=M.isoWeek(Y('2024-12-30'));eq('w1b',w.week,1);eq('w1by',w.year,2025);w=M.isoWeek(Y('2026-11-21'));eq('w47',w.week,47);
eq('dd',M.diffYMD(Y('2000-01-01'),Y('2026-11-21')).totalDays,9821);let d=M.diffYMD(Y('2000-01-01'),Y('2026-11-21'));eq('dy',d.years,26);eq('dm',d.months,10);eq('dd2',d.days,20);
d=M.diffYMD(Y('2026-01-31'),Y('2026-03-01'));eq('j31y',d.years,0);eq('j31m',d.months,1);eq('j31d',d.days,1);eq('j31t',d.totalDays,29);
d=M.diffYMD(Y('2020-02-29'),Y('2021-02-28'));eq('leapy',d.years,1);eq('leapd',d.days,0);d=M.diffYMD(Y('2026-11-21'),Y('2026-11-21'));eq('same',d.totalDays,0);eq('same2',d.days,0);
let a=M.addDate(Y('2026-01-31'),0,1,0).date;eq('am',a.m,2);eq('ad',a.d,28);a=M.addDate(Y('2024-01-31'),0,1,0).date;eq('am2',a.d,29);a=M.addDate(Y('2026-11-21'),0,0,100).date;if(I(a)!=='2027-03-01'){f++;console.log('FAIL +100',I(a))}
a=M.addDate(Y('2026-03-01'),0,0,-1).date;if(I(a)!=='2026-02-28'){f++;console.log('FAIL -1')}a=M.addDate(Y('2026-11-21'),1,2,3).date;if(I(a)!=='2028-01-24'){f++;console.log('FAIL +1y2m3d',I(a))}
a=M.addDate(Y('2024-02-29'),1,0,0).date;if(I(a)!=='2025-02-28'){f++;console.log('FAIL leap+1y',I(a))}if(!M.addDate(Y('9999-12-31'),0,0,1).error||!M.addDate(Y('1000-01-01'),0,0,-1).error){f++;console.log('FAIL range')}
// property: adding the difference back always lands on the end date
let seed=12345;const rnd=n=>{seed=(seed*1103515245+12345)&0x7fffffff;return seed%n};
for(let i=0;i<3000;i++){const x=M.fromNum(M.num_({y:1900,m:1,d:1})+rnd(60000)),y=M.fromNum(M.num_(x)+rnd(40000));const r=M.diffYMD(x,y);const b=M.addDate(x,r.years,r.months,r.days).date;if(I(b)!==I(y)||r.days<0||r.days>31||r.months>11){f++;console.log('FAIL prop',I(x),I(y),r);break}}
let g=M.ageOn(Y('1990-05-15'),Y('2026-11-21'));eq('ageY',g.years,36);eq('ageM',g.months,6);eq('ageD',g.days,6);eq('btd',g.daysToBirthday,175);if(I(g.nextBirthday)!=='2027-05-15'){f++;console.log('FAIL nextbd')}
g=M.ageOn(Y('2026-11-21'),Y('2026-11-21'));eq('birthday today',g.daysToBirthday,0);g=M.ageOn(Y('2000-02-29'),Y('2026-02-28'));eq('leap age',g.years,26);if(I(g.nextBirthday)!=='2026-02-28'){f++;console.log('FAIL leap nbd',I(g.nextBirthday))}
if(!M.ageOn(Y('2027-01-01'),Y('2026-01-01')).error){f++;console.log('FAIL future dob')}
const sat=new Set([0,6]),frisat=new Set([5,6]);let wd=M.workdays(Y('2026-11-16'),Y('2026-11-22'),sat,null);eq('wk5',wd.workdays,5);eq('wke',wd.weekendDays,2);
wd=M.workdays(Y('2026-11-16'),Y('2026-11-22'),frisat,null);eq('wkfs',wd.workdays,5);wd=M.workdays(Y('2026-11-16'),Y('2026-11-22'),sat,new Set(['2026-11-18','2026-11-21']));eq('wkh',wd.workdays,4);eq('wkhd',wd.holidayDays,1);
wd=M.workdays(Y('2026-11-21'),Y('2026-11-21'),sat,null);eq('wk sat',wd.workdays,0);wd=M.workdays(Y('2026-01-01'),Y('2026-12-31'),sat,null);eq('wk year',wd.workdays,261);wd=M.workdays(Y('2026-01-01'),Y('2026-12-31'),new Set(),null);eq('noweekend',wd.workdays,365);
if(!M.workdays(Y('2026-02-01'),Y('2026-01-01'),sat,null).error||!M.workdays(Y('1900-01-01'),Y('2026-01-01'),sat,null).error){f++;console.log('FAIL workdays errs')}
// ---- UAE gratuity ----
let gr=M.gratuity(10000,Y('2019-01-01'),Y('2025-12-31'),0);eq('g elig',gr.eligible?1:0,1);eq('g days',gr.gratuityDays,21*5+30*(2557/365-5),1e-9);eq('g amt',gr.amount,M.r2(10000/30*gr.gratuityDays),0.005);eq('g round',gr.amount,55054.79,0.01);
gr=M.gratuity(10000,Y('2024-01-01'),Y('2024-12-31'),0);eq('1y',gr.eligible?1:0,1);eq('1y amt',gr.amount,M.r2(10000/30*21*366/365),0.005);
gr=M.gratuity(10000,Y('2025-01-01'),Y('2025-12-30'),0);eq('364 days no',gr.eligible?1:0,0);gr=M.gratuity(10000,Y('2025-01-01'),Y('2025-12-31'),0);eq('365 yes',gr.eligible?1:0,1);eq('365 amt',gr.amount,7000,0.005);
gr=M.gratuity(10000,Y('2025-01-01'),Y('2025-12-31'),1);eq('unpaid pushes under',gr.eligible?1:0,0);gr=M.gratuity(10000,Y('2020-01-01'),Y('2024-12-31'),30);eq('unpaid reduces',gr.serviceDays,1827-30);
gr=M.gratuity(10000,Y('1985-01-01'),Y('2025-12-31'),0);eq('capped',gr.capped?1:0,1);eq('cap amt',gr.amount,240000);if(!(gr.uncapped>240000)){f++;console.log('FAIL uncapped')}
gr=M.gratuity(3000,Y('2016-06-01'),Y('2026-05-31'),0);eq('10y',gr.gratuityDays,21*5+30*(gr.years-5),1e-9);eq('10y amt',gr.amount,M.r2(3000/30*gr.gratuityDays),0.005);eq('10y amt approx',gr.amount,3000/30*(105+150),20);
if(!M.gratuity(0,Y('2020-01-01'),Y('2025-01-01'),0).error||!M.gratuity(1000,Y('2025-01-01'),Y('2020-01-01'),0).error||!M.gratuity(1000,Y('2020-01-01'),Y('2021-01-01'),-1).error||!M.gratuity(1000,Y('2020-01-01'),Y('2020-01-10'),50).error){f++;console.log('FAIL gratuity errs')}
// ---- time zones ----
const dub=Date.UTC(2026,10,21,8,0);eq('dubai off',M.offsetMin('Asia/Dubai',dub),240);eq('colombo off',M.offsetMin('Asia/Colombo',dub),330);eq('kolkata',M.offsetMin('Asia/Kolkata',dub),330);eq('kathmandu',M.offsetMin('Asia/Kathmandu',dub),345);
eq('lon jan',M.offsetMin('Europe/London',Date.UTC(2026,0,15)),0);eq('lon jul',M.offsetMin('Europe/London',Date.UTC(2026,6,15)),60);eq('ny jan',M.offsetMin('America/New_York',Date.UTC(2026,0,15)),-300);eq('ny jul',M.offsetMin('America/New_York',Date.UTC(2026,6,15)),-240);
let t=M.wallToUtc('Asia/Dubai',2026,11,21,12,0);eq('dub->utc',t.ms,Date.UTC(2026,10,21,8,0));t=M.wallToUtc('Asia/Colombo',2026,11,21,23,45);eq('col->utc',t.ms,Date.UTC(2026,10,21,18,15));
t=M.wallToUtc('America/New_York',2026,3,8,2,30);if(!t.error){f++;console.log('FAIL nonexistent NY')}t=M.wallToUtc('Europe/London',2026,3,29,1,30);if(!t.error){f++;console.log('FAIL nonexistent LON')}
t=M.wallToUtc('America/New_York',2026,11,1,1,30);eq('ambig',t.ambiguous?1:0,1);eq('ambig first',t.ms,Date.UTC(2026,10,1,5,30));t=M.wallToUtc('America/New_York',2026,11,1,3,0);eq('after fall back',t.ambiguous?1:0,0);eq('after fb ms',t.ms,Date.UTC(2026,10,1,8,0));
t=M.wallToUtc('Pacific/Auckland',2026,12,25,9,0);eq('auckland',t.ms,Date.UTC(2026,11,24,20,0));t=M.wallToUtc('Pacific/Kiritimati',2026,6,1,0,0);eq('kiritimati +14',t.ms,Date.UTC(2026,4,31,10,0));
for(let i=0;i<300;i++){const z=['Asia/Dubai','Europe/London','America/New_York','Australia/Lord_Howe','Asia/Kolkata','America/St_Johns'][rnd(6)],ms=Date.UTC(2026,rnd(12),1+rnd(28),rnd(24),rnd(60));const p=M.parts(z,ms);const r=M.wallToUtc(z,p.y,p.m,p.d,p.h,p.mi);if(r.error||(r.ms!==ms&&!r.ambiguous)){f++;console.log('FAIL tz roundtrip',z,new Date(ms).toISOString(),r);break}}
console.log(f?f+' FAILED':'unit OK');process.exit(f?1:0)
