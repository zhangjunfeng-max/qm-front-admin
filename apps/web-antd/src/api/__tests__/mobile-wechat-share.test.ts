import { afterEach, expect, it, vi } from 'vitest';

import { configureWechatShare, resetWechatShare } from '../../views/mobile/wechat-share';
afterEach(()=>{delete window.wx;});
it('enables the native menu only for current metadata and hides it on disposal',async()=>{
 let ready=()=>{};
 const hide=vi.fn(); const show=vi.fn();
 window.wx={config:()=>ready(),ready:fn=>{ready=fn;},error:()=>{},hideMenuItems:hide,showMenuItems:show,updateAppMessageShareData:v=>v.success(),updateTimelineShareData:v=>v.success()};
 const data={title:'A活动',desc:'活动',link:'https://zjfyun.cn/?c=AbCdEfGh1234_-56',imgUrl:''};
 await configureWechatShare({appId:'wx',timestamp:1,nonceStr:'n',signature:'s'},data,data,new AbortController().signal);
 expect(show).toHaveBeenCalledTimes(1);resetWechatShare();expect(hide).toHaveBeenCalled();
});
it('never enables stale share menus when the view has already been aborted',async()=>{
 const hide=vi.fn(); const show=vi.fn();let ready=()=>{};
 window.wx={config:()=>{},ready:fn=>{ready=fn;},error:()=>{},hideMenuItems:hide,showMenuItems:show,updateAppMessageShareData:v=>v.success(),updateTimelineShareData:v=>v.success()};
 const active=new AbortController();const data={title:'A',desc:'',link:'https://zjfyun.cn/',imgUrl:''};
 const promise=configureWechatShare({appId:'wx',timestamp:1,nonceStr:'n',signature:'s'},data,data,active.signal);
 await Promise.resolve();active.abort();ready();await expect(promise).rejects.toThrow();expect(show).not.toHaveBeenCalled();
});
