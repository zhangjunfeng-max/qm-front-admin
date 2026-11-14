import { createApp, h } from 'vue';

import { afterEach, expect, it, vi } from 'vitest';

import { useResource } from '../../views/mobile/use-resource';
import { invalidateContext } from '../context-lifecycle';
let unmount: (()=>void)|undefined;
afterEach(()=>{unmount?.();document.body.innerHTML='';invalidateContext();});
function mount(fetcher:(signal:AbortSignal)=>Promise<string>){
 let resource!:ReturnType<typeof useResource<string>>;
 const root=document.createElement('div');document.body.append(root);
 const app=createApp({setup(){resource=useResource(fetcher);return ()=>h('div',resource.data.value);}});
 app.mount(root);unmount=()=>app.unmount();return resource;
}
it('discards previous-company responses, clears visible data and aborts requests',async()=>{
 let resolve!:(value:string)=>void;let signal!:AbortSignal;
 const resource=mount(s=>{signal=s;return new Promise(r=>{resolve=r;});});
 const work=resource.load();invalidateContext();expect(signal.aborted).toBe(true);
 resolve('previous company customer');await work;expect(resource.data.value).toBeUndefined();expect(resource.failed.value).toBe(false);
});
it('only retains the newest filter request, even if the old request ignores abort',async()=>{
 const resolvers:((value:string)=>void)[]=[];
 const resource=mount(()=>new Promise(r=>resolvers.push(r)));
 const first=resource.load();const second=resource.load();resolvers[1]!('new filter');await second;resolvers[0]!('old filter');await first;expect(resource.data.value).toBe('new filter');
});
it('recovers from errors without showing stale rows and cancels on unmount',async()=>{
 const fetch=vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce('current');
 const resource=mount(fetch);await resource.load();expect(resource.failed.value).toBe(true);await resource.load();expect(resource.failed.value).toBe(false);expect(resource.data.value).toBe('current');unmount?.();expect(resource.data.value).toBeUndefined();
});
