export interface WechatConfig {
  appId: string;
  timestamp: number;
  nonceStr: string;
  signature: string;
}
interface ShareData {
  title: string;
  desc: string;
  link: string;
  imgUrl: string;
}
interface WechatSDK {
  hideMenuItems:(value:{menuList:string[]})=>void;
  showMenuItems:(value:{menuList:string[]})=>void;
  config: (
    value: WechatConfig & { debug: boolean; jsApiList: string[] },
  ) => void;
  ready: (fn: () => void) => void;
  error: (fn: () => void) => void;
  updateAppMessageShareData: (
    value: ShareData & { success: () => void; fail: () => void },
  ) => void;
  updateTimelineShareData: (
    value: ShareData & { success: () => void; fail: () => void },
  ) => void;
}
declare global {
  interface Window {
    wx?: WechatSDK;
  }
}
let sdkPromise: Promise<WechatSDK> | undefined;
export function isWechat() {
  return /MicroMessenger/i.test(navigator.userAgent);
}
function loadSDK(): Promise<WechatSDK> {
  if (window.wx) return Promise.resolve(window.wx);
  if (sdkPromise) return sdkPromise;
  sdkPromise = new Promise<WechatSDK>((resolve, reject) => {
    const script = document.createElement('script');
    const timer = setTimeout(() => {
      script.remove();
      reject(new Error('微信分享加载超时'));
    }, 10000);
    script.src = 'https://res.wx.qq.com/open/js/jweixin-1.6.0.js';
    script.async = true;
    script.onload = () => {
      clearTimeout(timer);
      window.wx ? resolve(window.wx) : reject(new Error('微信分享暂不可用'));
    };
    script.onerror = () => {
      clearTimeout(timer);
      script.remove();
      reject(new Error('微信分享暂不可用'));
    };
    document.head.append(script);
  }).catch((error) => {
    sdkPromise = undefined;
    throw error;
  });
  return sdkPromise;
}
const menuList=['menuItem:share:appMessage','menuItem:share:timeline'];
export function resetWechatShare(){window.wx?.hideMenuItems({menuList});}
export async function configureWechatShare(
  config: WechatConfig,
  friend: ShareData,
  timeline: ShareData,
  signal: AbortSignal,
) {
  const wx = await loadSDK();
  resetWechatShare();
  if (signal.aborted) throw new Error('分享已关闭');
  await new Promise<void>((resolve, reject) => {
    let done = false;
    const finish = (error?: Error) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      signal.removeEventListener('abort', abort);
      error ? reject(error) : resolve();
    };
    const abort = () => finish(new Error('分享已关闭'));
    const timer = setTimeout(
      () => finish(new Error('微信分享配置超时')),
      10000,
    );
    signal.addEventListener('abort', abort, { once: true });
    wx.error(() => finish(new Error('微信分享暂不可用')));
    wx.ready(() => {
      if (done || signal.aborted) return;
      let remaining = 2;
      const success = () => {
        if(done||signal.aborted)return;
        if (--remaining === 0) {wx.showMenuItems({menuList});finish();}
      };
      const fail = () => finish(new Error('微信分享暂不可用'));
      wx.updateAppMessageShareData({ ...friend, success, fail });
      wx.updateTimelineShareData({ ...timeline, success, fail });
    });
    wx.config({
      ...config,
      debug: false,
      jsApiList: ['updateAppMessageShareData', 'updateTimelineShareData','hideMenuItems','showMenuItems'],
    });
  });
}
