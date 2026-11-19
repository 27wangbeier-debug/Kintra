// Public OSM services: submit-only search, cached responses, <=1 request/second/host.
const KintraServices=(()=>{
 const cache=new Map(),queues=new Map(),last=new Map();
 async function json(url){
  if(cache.has(url))return cache.get(url);
  const host=new URL(url).host,prior=queues.get(host)||Promise.resolve();
  const task=prior.catch(()=>{}).then(async()=>{
   const delay=Math.max(0,1100-(Date.now()-(last.get(host)||0)));if(delay)await new Promise(r=>setTimeout(r,delay));
   last.set(host,Date.now());const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),18000);
   try{const res=await fetch(url,{signal:ctrl.signal,referrerPolicy:'strict-origin-when-cross-origin'});if(!res.ok)throw Error(res.status===429?'The map service is busy. Please wait a moment and try again.':'The map service is unavailable. Please try again.');const data=await res.json();cache.set(url,data);return data}finally{clearTimeout(timer)}
  });queues.set(host,task);return task;
 }
 const pointValid=p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite)&&Math.abs(p[0])<=90&&Math.abs(p[1])<=180;
 function featurePlace(f){const p=f.properties||{},c=f.geometry?.coordinates;if(!c||!pointValid([c[1],c[0]]))return null;const street=[p.housenumber,p.street].filter(Boolean).join(' '),name=p.name||street||p.city||'Map location',context=[street!==name?street:null,p.city||p.town||p.village,p.state,p.country].filter(Boolean);return {label:name,detail:[...new Set(context)].join(', '),coords:[c[1],c[0]]}}
 async function geocode(query,bias){
  const q=query.trim();if(q.length<2)throw Error('Enter a place name or street address.');
  const pair=q.match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);if(pair){const coords=pair.slice(1).map(Number);if(!pointValid(coords))throw Error('Those coordinates are outside the map.');return[{label:q,detail:'Coordinates',coords}]}
  const params=new URLSearchParams({q,limit:'5',lang:'en'});if(pointValid(bias)){params.set('lat',bias[0]);params.set('lon',bias[1])}
  const data=await json('https://photon.komoot.io/api/?'+params);const places=(data.features||[]).map(featurePlace).filter(Boolean);if(!places.length)throw Error('No places found. Try adding the city or a nearby street.');return places;
 }
 function normalize(r){if(!r.geometry?.coordinates?.length||!Number.isFinite(r.duration)||!Number.isFinite(r.distance))throw Error('The route service returned an incomplete route.');return {coordinates:r.geometry.coordinates,duration:r.duration,distance:r.distance,steps:(r.legs||[]).flatMap(l=>l.steps||[])}}
 async function walking(coords,alternatives=false,mode='walk'){if(!['walk','drive'].includes(mode))throw Error('Choose Walk or Drive.');const profile=mode==='drive'?'car':'foot',apiMode=mode==='drive'?'driving':'foot';if(!coords.every(pointValid))throw Error('Choose valid starting and destination points.');const path=coords.map(p=>`${p[1]},${p[0]}`).join(';'),url=`https://routing.openstreetmap.de/routed-${profile}/route/v1/${apiMode}/${path}?overview=full&geometries=geojson&steps=true&alternatives=${alternatives}`;const data=await json(url);if(data.code!=='Ok'||!data.routes?.length)throw Error(`No ${mode==='drive'?'driving':'walking'} route found between these places. Try nearby accessible streets.`);return data.routes.map(normalize)}
 function segmentDistance(point,a,b){const lat=point[0]*Math.PI/180,sx=111320*Math.cos(lat),sy=110540;const ax=(a[1]-point[1])*sx,ay=(a[0]-point[0])*sy,bx=(b[1]-point[1])*sx,by=(b[0]-point[0])*sy;const dx=bx-ax,dy=by-ay,t=Math.max(0,Math.min(1,-(ax*dx+ay*dy)/(dx*dx+dy*dy||1)));return Math.hypot(ax+t*dx,ay+t*dy)}
 function proximity(coords,point){let d=Infinity;for(let i=1;i<coords.length;i++)d=Math.min(d,segmentDistance(point,[coords[i-1][1],coords[i-1][0]],[coords[i][1],coords[i][0]]));return d}
 function scoreRoute(route,concerns){const nearby=concerns.map(c=>({...c,metres:proximity(route.coordinates,[c.lat,c.lng])})).filter(c=>c.metres<80);return {...route,nearby,concernScore:nearby.reduce((sum,c)=>sum+(c.weight||2)*(1-c.metres/160),0)}}
 function samplePath(coordinates,count=60){const segments=[],cos=Math.cos(coordinates[0][1]*Math.PI/180);let total=0;for(let i=1;i<coordinates.length;i++){const a=coordinates[i-1],b=coordinates[i],length=Math.hypot((b[0]-a[0])*111320*cos,(b[1]-a[1])*110540);segments.push(length);total+=length}if(!total)return Array(count).fill(coordinates[0]);const samples=[];let segment=0,walked=0;for(let n=0;n<count;n++){const target=total*n/(count-1);while(segment<segments.length-1&&walked+segments[segment]<target){walked+=segments[segment++]}const a=coordinates[segment],b=coordinates[segment+1],t=segments[segment]?Math.min(1,(target-walked)/segments[segment]):0;samples.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t])}return samples}
 function distinct(a,b){const samples=samplePath(a.coordinates);return samples.filter(p=>proximity(b.coordinates,[p[1],p[0]])>35).length/samples.length>.12}
 function detourWaypoints(route,offset,side){const samples=samplePath(route.coordinates),a=samples[18],b=samples[40],lat=(a[1]+b[1])/2,cos=Math.max(.1,Math.cos(lat*Math.PI/180)),dx=(b[0]-a[0])*111320*cos,dy=(b[1]-a[1])*110540,length=Math.hypot(dx,dy)||1;return [a,b].map(p=>[p[1]+dx/length*offset*side/110540,p[0]-dy/length*offset*side/(111320*cos)])}
 async function routes(start,end,via,concerns=[],mode='walk'){if(mode==='drive')concerns=[];
  const raw=await walking([start,end],true,mode);let candidates=raw.map(r=>scoreRoute(r,concerns)),fast=[...candidates].sort((a,b)=>a.duration-b.duration)[0];
  const acceptable=r=>distinct(r,fast)&&r.duration<=Math.max(fast.duration*2.5,fast.duration+1800);
  const problem=[...fast.nearby].sort((a,b)=>(b.weight||2)-(a.weight||2))[0];const attempts=[];
  if(via)attempts.push([via]);
  if(problem){const mid=fast.coordinates[Math.floor(fast.coordinates.length/2)],cos=Math.max(.1,Math.cos(mid[1]*Math.PI/180));for(const side of [-1,1])attempts.push([[problem.lat+side*180/110540,problem.lng+side*180/(111320*cos)]])}
  const baseOffset=Math.max(180,Math.min(1800,fast.distance*.055));for(const factor of [1,2.2])for(const side of [-1,1])attempts.push(detourWaypoints(fast,baseOffset*factor,side));
  let attempted=0;for(const waypoints of attempts){if(candidates.some(acceptable)&&(!problem||attempted>=2))break;try{const extra=await walking([start,...waypoints,end],false,mode);candidates.push(...extra.map(r=>scoreRoute(r,concerns)))}catch{}attempted++}
  fast=[...candidates].sort((a,b)=>a.duration-b.duration)[0];const alternatives=candidates.filter(acceptable).sort((a,b)=>a.concernScore-b.concernScore||a.duration-b.duration),safer=alternatives[0]||null;
  const lowerConcern=!!safer&&safer.concernScore<fast.concernScore-.1;const warning=!safer?`No different ${mode==='drive'?'driving':'walking'} route was available for these points. Move a pin or try nearby streets.`:lowerConcern?'Alternative passes fewer mapped concerns. Safety is not verified.':`Alternative follows a different ${mode==='drive'?'driving':'walking'} path; it is not a verified safer route.`;
  return {fast,safer,samePath:false,lowerConcern,source:'live',transport:mode,warning,updatedAt:new Date().toISOString()};
 }
 return {geocode,routes,pointValid,featurePlace,normalize,segmentDistance,proximity,scoreRoute,distinct,samplePath,detourWaypoints};
})();
