const menu=document.querySelector('.menu-toggle');
const nav=document.querySelector('#navigation');
const serviceToggle=document.querySelector('.services-toggle');
const serviceLinks=document.querySelector('#services-menu');
const serviceDisclosure=document.querySelector('.nav-services');
const closeServices=()=>{serviceToggle?.setAttribute('aria-expanded','false');if(serviceLinks)serviceLinks.hidden=true;};
serviceToggle?.addEventListener('click',()=>{const open=serviceToggle.getAttribute('aria-expanded')!=='true';serviceToggle.setAttribute('aria-expanded',String(open));serviceLinks.hidden=!open;});
serviceDisclosure?.addEventListener('keydown',e=>{if(e.key==='Escape'&&!serviceLinks.hidden){e.preventDefault();e.stopPropagation();closeServices();serviceToggle.focus();}});
serviceDisclosure?.addEventListener('focusout',e=>{if(!serviceDisclosure.contains(e.relatedTarget))closeServices();});
document.addEventListener('click',e=>{if(!serviceDisclosure?.contains(e.target))closeServices();});
nav?.addEventListener('click',e=>{if(e.target.closest('a'))closeServices();});
if(location.pathname.replace(/\/$/,'')==='/services')document.querySelector('.nav-services-heading>a')?.setAttribute('aria-current','page');
const closeMenu=()=>{menu?.setAttribute('aria-expanded','false');nav?.classList.remove('open');};
menu?.addEventListener('click',()=>{const open=menu.getAttribute('aria-expanded')!=='true';menu.setAttribute('aria-expanded',String(open));nav.classList.toggle('open',open);});
nav?.addEventListener('click',e=>{if(e.target.closest('a'))closeMenu();});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&nav?.classList.contains('open')){closeMenu();menu.focus();}});
document.addEventListener('click',e=>{if(!e.target.closest('.header'))closeMenu();});
document.querySelectorAll('.comparison-range').forEach(input=>{const update=()=>{input.closest('.comparison-slider').style.setProperty('--split',`${input.value}%`);input.setAttribute('aria-valuetext',`${input.value}% before, ${100-Number(input.value)}% after`);};input.addEventListener('input',update);update();});
const tiles=[...document.querySelectorAll('[data-gallery]')];const dialog=document.querySelector('#gallery-dialog');let current=0;
function showPhoto(index){current=(index+tiles.length)%tiles.length;const img=tiles[current].querySelector('img');const full=document.querySelector('#gallery-image');full.src=img.src;full.alt=img.alt;document.querySelector('#gallery-caption').textContent=img.alt;document.querySelector('#gallery-count').textContent=`${current+1} / ${tiles.length}`;}
tiles.forEach((tile,i)=>tile.addEventListener('click',()=>{showPhoto(i);dialog.showModal();}));
dialog?.querySelector('.close').addEventListener('click',()=>dialog.close());
document.querySelector('[data-gallery-prev]')?.addEventListener('click',()=>showPhoto(current-1));
document.querySelector('[data-gallery-next]')?.addEventListener('click',()=>showPhoto(current+1));
dialog?.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'){e.preventDefault();showPhoto(current-1);}if(e.key==='ArrowRight'){e.preventDefault();showPhoto(current+1);}});
dialog?.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const serviceStack=document.querySelector('.service-stack');
if(serviceStack&&window.ScrollCraft){ScrollCraft.mount(serviceStack);}
// Keep layered panels readable at large text sizes and short viewport heights.
if(serviceStack){const fitPanels=()=>{const height=Math.max(...[...serviceStack.querySelectorAll('.service-panel-surface')].map(el=>el.scrollHeight));serviceStack.classList.toggle('stack-fits',height+130<innerHeight);};new ResizeObserver(fitPanels).observe(serviceStack);addEventListener('resize',fitPanels);fitPanels();}
const progress=document.createElement('div');progress.className='scroll-progress';progress.setAttribute('aria-hidden','true');document.body.append(progress);
if('IntersectionObserver'in window){const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('in-view');observer.unobserve(entry.target);}}),{threshold:.04});document.querySelectorAll('.section-head,.service-card,.service-row,.values li,.gallery-item,.story>div,.finish-options>div,.steps article').forEach(el=>{el.classList.add('reveal');observer.observe(el);});document.body.classList.add('motion-ready');}
let scheduled=false;
function paintScroll(){scheduled=false;const y=scrollY,max=document.documentElement.scrollHeight-innerHeight;document.documentElement.style.setProperty('--scroll-progress',max>0?y/max:0);if(!reduced.matches&&innerWidth>850){const hero=document.querySelector('.hero');if(hero&&y<hero.offsetHeight+150){hero.style.setProperty('--photo-shift',`${y*.04}px`);hero.style.setProperty('--detail-shift',`${y*-.035}px`);hero.style.setProperty('--word-shift',`${y*-.04}px`);}}const steps=[...document.querySelectorAll('.steps article')];let active=steps.reduce((best,s)=>Math.abs(s.getBoundingClientRect().top-innerHeight*.42)<Math.abs(best.getBoundingClientRect().top-innerHeight*.42)?s:best,steps[0]);steps.forEach(s=>s.classList.toggle('is-current',s===active));}
addEventListener('scroll',()=>{if(!scheduled){scheduled=true;requestAnimationFrame(paintScroll);}},{passive:true});paintScroll();

// Focus on a covered panel returns to its natural document position.
serviceStack?.addEventListener('focusin',e=>{const panel=e.target.closest('.service-panel');if(!panel)return;const next=panel.nextElementSibling?.nextElementSibling;if(next&&next.getBoundingClientRect().top<e.target.getBoundingClientRect().bottom)panel.previousElementSibling.scrollIntoView({block:'start',behavior:'instant'});});
