import{d as r}from"./index-CKvPyGwx.js";/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const o=[["path",{d:"m15.5 7.5 2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L19 4",key:"g0fldk"}],["path",{d:"m21 2-9.6 9.6",key:"1j0ho8"}],["circle",{cx:"7.5",cy:"15.5",r:"5.5",key:"yqb3hr"}]],l=r("key",o),i="gnet_school_api_key:",a="sms:school-api-key-saved";function u(e,t){var n;if(!(!e||!((n=t.secret)!=null&&n.startsWith("gnet_live_"))))try{sessionStorage.setItem(`${i}${e}`,JSON.stringify({...t,savedAt:Date.now()})),window.dispatchEvent(new CustomEvent(a,{detail:{schoolId:e}}))}catch{}}function _(e){var t;if(!e)return null;try{const n=sessionStorage.getItem(`${i}${e}`);if(!n)return null;const s=JSON.parse(n);return(t=s==null?void 0:s.secret)!=null&&t.startsWith("gnet_live_")?s:null}catch{return null}}function y(e){return e.length<=16?"gnet_live_…":`${e.slice(0,14)}…${e.slice(-4)}`}export{l as K,a as S,_ as l,y as m,u as s};
