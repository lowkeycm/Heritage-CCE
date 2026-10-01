import {readFile,access} from 'node:fs/promises';
const routes=['/','/services','/about','/facility','/peelclear','/contact','/warranty'];
const pages=new Map(await Promise.all(routes.map(async r=>[r,await readFile('dist'+(r==='/'?'':r)+'/index.html','utf8')])));let checked=0;
for(const [route,html]of pages){if((html.match(/<h1[ >]/g)||[]).length!==1)throw Error(route+': expected one h1');if(!html.includes(process.env.VERCEL_ENV==='preview'?'noindex,nofollow':'index,follow'))throw Error('Wrong indexing directive: '+route);if(process.env.VERCEL_ENV!=='preview'&&html.includes('noindex'))throw Error('Public page blocks indexing: '+route);if(!html.includes(`<link rel="canonical" href="https://www.heritagecce.com${route}">`))throw Error('Wrong canonical: '+route);if(/<<\w+>>|data-estimate|data-service=/.test(html))throw Error('Unresolved preview control: '+route);for(const [,url]of html.matchAll(/(?:href|src)="([^"]+)"/g)){if(!url.startsWith('/')&&!url.startsWith('#'))continue;const [pathQuery,hash]=url.split('#');const path=pathQuery.split('?')[0];const target=path||route;if(pages.has(target)){if(hash&&!pages.get(target).includes(`id="${hash}"`))throw Error(`Missing anchor ${route} -> ${url}`);}else{await access('dist'+target);}checked++;}}
const home=pages.get('/');if(!/class="comparison-before" src="\/assets\/after.webp"/.test(home))throw Error('White before photo missing');if(!home.includes('type="range"'))throw Error('Truck slider missing');
const original=JSON.parse(await readFile('src/content/warranty.json','utf8'));const decode=s=>s.replaceAll('&amp;','&').replaceAll('&lt;','<').replaceAll('&quot;','"');const legal=decode(pages.get('/warranty'));for(const x of original)if(!legal.includes(x.text))throw Error('Warranty text changed');
const staff=await readFile('dist/staff/index.html','utf8');if(!staff.includes('noindex,nofollow')||!staff.includes('/staff/staff.js'))throw Error('Staff page missing or unguarded');
const estimate=await readFile('dist/estimate/index.html','utf8');if(!estimate.includes('noindex,nofollow')||!estimate.includes('/estimate/estimate.js'))throw Error('Estimate app missing or unguarded');for(const f of ['estimate/estimate.css','estimate/estimate.js','vendor/zxing/zxing-library-0.23.0.min.js'])await access('dist/'+f);
console.log(`Checked ${routes.length} routes and ${checked} local links/assets; warranty text and truck ordering preserved.`);

const sitemap=await readFile('dist/sitemap.xml','utf8');
const locations=[...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(m=>m[1]);
if(JSON.stringify(locations)!==JSON.stringify(routes.map(r=>'https://www.heritagecce.com'+r)))throw Error('Sitemap must contain exactly the seven public canonical URLs');
const robots=await readFile('dist/robots.txt','utf8');
if(process.env.VERCEL_ENV!=='preview'&&(/^Disallow: \/$/m.test(robots)||!robots.includes('Sitemap: https://www.heritagecce.com/sitemap.xml')))throw Error('Public robots configuration blocks discovery');
const notFound=await readFile('dist/404.html','utf8');if(!notFound.includes('noindex,nofollow'))throw Error('404 must stay excluded');
