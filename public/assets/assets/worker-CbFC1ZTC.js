(function(){"use strict";function c(s){return s.split(`
`).map((t,o)=>({id:`line-${o}`,text:t,index:o}))}self.onmessage=function(s){const{type:e,text:n}=s.data;if(e==="process"){const t=c(n);self.postMessage({type:"result",blocks:t})}}})();
