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
 async function walking(coords,alternatives=false){if(!coords.every(pointValid))throw Error('Choose valid starting and destination points.');const path=coords.map(p=>`${p[1]},${p[0]}`).join(';'),url=`https://routing.openstreetmap.de/routed-foot/route/v1/foot/${path}?overview=full&geometries=geojson&steps=true&alternatives=${alternatives}`;const data=await json(url);if(data.code!=='Ok'||!data.routes?.length)throw Error('No walking route found between these places. Try nearby accessible streets.');return data.routes.map(normalize)}
 function segmentDistance(point,a,b){const lat=point[0]*Math.PI/180,sx=111320*Math.cos(lat),sy=110540;const ax=(a[1]-point[1])*sx,ay=(a[0]-point[0])*sy,bx=(b[1]-point[1])*sx,by=(b[0]-point[0])*sy;const dx=bx-ax,dy=by-ay,t=Math.max(0,Math.min(1,-(ax*dx+ay*dy)/(dx*dx+dy*dy||1)));return Math.hypot(ax+t*dx,ay+t*dy)}
 function proximity(coords,point){let d=Infinity;for(let i=1;i<coords.length;i++)d=Math.min(d,segmentDistance(point,[coords[i-1][1],coords[i-1][0]],[coords[i][1],coords[i][0]]));return d}
 function scoreRoute(route,concerns){const nearby=concerns.map(c=>({...c,metres:proximity(route.coordinates,[c.lat,c.lng])})).filter(c=>c.metres<80);return {...route,nearby,concernScore:nearby.reduce((sum,c)=>sum+(c.weight||2)*(1-c.metres/160),0)}}
 function distinct(a,b){let away=0;const step=Math.max(1,Math.floor(a.coordinates.length/50));let n=0;for(let i=0;i<a.coordinates.length;i+=step){n++;const p=a.coordinates[i];if(proximity(b.coordinates,[p[1],p[0]])>25)away++}return away/n>.08}
 async function routes(start,end,via,concerns=[]){
  const raw=await walking([start,end],true);let candidates=raw.map(r=>scoreRoute(r,concerns)),fast=[...candidates].sort((a,b)=>a.duration-b.duration)[0],warning='';
  const problem=[...fast.nearby].sort((a,b)=>(b.weight||2)-(a.weight||2))[0];
  const waypoints=[];if(via)waypoints.push(via);
  if(problem){const lat=(start[0]+end[0])/2,cos=Math.cos(lat*Math.PI/180),dx=(end[1]-start[1])*cos,dy=end[0]-start[0],length=Math.hypot(dx,dy)||1;for(const side of [-1,1]){const offset=side*190/111320;waypoints.push([problem.lat+dx/length*offset,problem.lng-dy/length*offset/cos])}}
  for(const waypoint of waypoints.slice(0,2)){try{const extra=await walking([start,waypoint,end]);candidates.push(...extra.map(r=>scoreRoute(r,concerns)))}catch{warning='Some detours were unavailable.'}}
  fast=[...candidates].sort((a,b)=>a.duration-b.duration)[0];const alternatives=candidates.filter(r=>distinct(r,fast)&&r.duration<=Math.max(fast.duration*1.8,fast.duration+600));
  const ranked=alternatives.sort((a,b)=>a.concernScore-b.concernScore||a.duration-b.duration);let safer=ranked[0]||null;
  if(!safer)warning='Only one distinct walking route was found. Both preferences use the same path.';
  else if(safer.concernScore>=fast.concernScore-.1)warning='No alternative with fewer reported concerns was found. Compare the paths before choosing.';
  return {fast,safer:safer||fast,samePath:!safer,lowerConcern:!!safer&&safer.concernScore<fast.concernScore-.1,source:'live',warning,updatedAt:new Date().toISOString()};
 }
 return {geocode,routes,pointValid,featurePlace,normalize,segmentDistance,proximity,scoreRoute,distinct};
})();
