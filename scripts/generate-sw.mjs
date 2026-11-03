import { readdir, readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import path from 'node:path'
async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  return (await Promise.all(entries.map(entry => entry.isDirectory() ? walk(path.join(dir, entry.name)) : path.join(dir, entry.name)))).flat()
}
const files = (await walk('dist')).filter(file => !file.endsWith('/sw.js'))
const hash = createHash('sha256')
for (const file of files) hash.update(await readFile(file))
const cache = 'fastivalle-react-' + hash.digest('hex').slice(0, 12)
const assets = ['./', ...files.map(file => './' + path.relative('dist', file).split(path.sep).join('/'))]
// Static precached files are identical across Origin headers. Vite preview varies
// responses by Origin, while module requests and precache requests differ here.
await writeFile('dist/sw.js', `const CACHE=${JSON.stringify(cache)};const ASSETS=${JSON.stringify(assets)};
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)));self.skipWaiting()});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>(key.startsWith('fastivalle-'))&&key!==CACHE).map(key=>caches.delete(key)))));self.clients.claim()});
self.addEventListener('fetch',event=>{if(event.request.method!=='GET'||new URL(event.request.url).origin!==location.origin)return;event.respondWith(caches.open(CACHE).then(cache=>cache.match(event.request,{ignoreVary:true})).then(cached=>cached||fetch(event.request).catch(()=>event.request.mode==='navigate'?caches.match('./index.html'):Response.error()))) });
`)
console.log(`PWA generated: ${cache}, ${assets.length} cached assets`)
