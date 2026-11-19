const iconPaths={
walk:'<circle cx="14" cy="4" r="2"/><path d="m7 21 4-8m5 8-3-6 1-8-4 4H6m8-4 3 5h4"/>',
car:'<path d="m5 7 2-4h10l2 4 2 3v9h-3v-3H6v3H3v-9Z"/><path d="M5 7h14M3 11h18M6 13h2m8 0h2"/>',

home:'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z"/>',
map:'<path d="m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2Z"/><path d="M9 3v16M15 5v16"/>',
report:'<rect x="3" y="3" width="18" height="18" rx="4"/><path d="M12 7v10M7 12h10"/>',
users:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M22 21v-2a4 4 0 0 0-3-3.87"/><circle cx="9" cy="7" r="4"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
user:'<circle cx="12" cy="7" r="4"/><path d="M4 21v-2a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v2Z"/>',
route:'<circle cx="6" cy="5" r="3"/><circle cx="18" cy="19" r="3"/><path d="M9 5h7a4 4 0 0 1 0 8H8a4 4 0 0 0 0 8h7"/>',
shield:'<path d="m12 3 8 3v5c0 5-8 10-8 10S4 16 4 11V6Z"/><path d="m8 12 3 3 5-6"/>',
store:'<path d="M3 10V5h18v5M5 14v7h14v-7M9 21v-6h6v6M2 10l2-5h16l2 5a3 3 0 0 1-5 2 3 3 0 0 1-5 0 3 3 0 0 1-5 0 3 3 0 0 1-5-2Z"/>',
pin:'<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
bell:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
search:'<circle cx="10.5" cy="10.5" r="7.5"/><path d="m16 16 5 5"/>',
mic:'<rect x="9" y="2" width="6" height="13" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8"/>',
locate:'<path d="m22 2-7 20-4-9-9-4Z"/>',
light:'<path d="M9 18v-2a6 6 0 1 1 6 0v2M9 18h6M10 21h4"/>',
streetlight:'<path d="M6 22V8a5 5 0 0 1 5-5h7M14 3v3h7V3M15 10l-1 2M20 10l1 2"/>',
warning:'<path d="m10.3 3.9-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3.1l-8-14a2 2 0 0 0-3.4 0Z"/><path d="M12 9v5M12 17h.01"/>',
message:'<path d="M21 14a3 3 0 0 1-3 3h-7l-6 5v-5a3 3 0 0 1-3-3V5a3 3 0 0 1 3-3h13a3 3 0 0 1 3 3Z"/><path d="M7 9h.01M12 9h.01M17 9h.01"/>',
camera:'<path d="M14 8l7-4v16l-7-4"/><rect x="2" y="6" width="12" height="12" rx="3"/>',
photo:'<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="2"/><path d="m21 15-5-5L5 21"/>',
anonymous:'<path d="M4 9h16M7 9l1-6h8l1 6"/><circle cx="6" cy="17" r="4"/><circle cx="18" cy="17" r="4"/><path d="M10 16h4"/>',
check:'<path d="m5 12 4 4L19 6"/>',
arrow:'<path d="M4 12h16m-6-6 6 6-6 6"/>',
expand:'<path d="M8 3H3v5M16 3h5v5M21 16v5h-5M8 21H3v-5"/>',
collapse:'<path d="M3 8h5V3M16 3v5h5M21 16h-5v5M8 21v-5H3"/>',
layers:'<path d="m12 2 10 6-10 6L2 8Zm-9 11 9 5 9-5M3 18l9 5 9-5"/>',
close:'<path d="m6 6 12 12M6 18 18 6"/>',
heart:'<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>'};
function icon(name,cls=''){return `<svg class="ui-icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconPaths[name]||iconPaths.pin}</svg>`}
const symbolIcons={'◈':'pin','⌂':'home','◫':'map','⊞':'report','♧':'users','♙':'user','♡':'heart','♢':'shield','⌁':'route','⌕':'search','⌖':'locate','◎':'pin','◉':'pin','☼':'light','▤':'message','△':'warning','▧':'photo','▣':'camera','↗':'arrow','→':'arrow','✓':'check','×':'close'};
function polishIcons(root=document.body){const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);const texts=[];while(walker.nextNode()){const n=walker.currentNode;if(!['SCRIPT','STYLE','TEXTAREA','INPUT','SVG','PATH'].includes(n.parentElement?.tagName?.toUpperCase())&&[...n.textContent].some(c=>symbolIcons[c]))texts.push(n)}for(const n of texts){const fragment=document.createDocumentFragment();for(const c of n.textContent){if(symbolIcons[c]){const t=document.createElement('template');t.innerHTML=icon(symbolIcons[c]);fragment.append(t.content)}else fragment.append(document.createTextNode(c))}n.replaceWith(fragment)}}
